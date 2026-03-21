import subprocess
import os
import yaml
import threading
import queue
import signal
from pathlib import Path
from typing import Dict, Any, Optional, List, Callable
from datetime import datetime
import re


class TrainingProcess:
    def __init__(self, run_id: str, config: Dict[str, Any], process: subprocess.Popen):
        self.run_id = run_id
        self.config = config
        self.process = process
        self.status = "running"
        self.progress = 0
        self.current_step = 0
        self.total_steps = 0
        self.loss_history: List[float] = []
        self.log_lines: List[str] = []
        self.start_time = datetime.now()
        self.log_queue: queue.Queue = queue.Queue()
        self._stop_event = threading.Event()

    def is_running(self) -> bool:
        return self.process.poll() is None and self.status != "stopped"

    def stop(self):
        self._stop_event.set()
        self.status = "stopping"
        if self.process.poll() is None:
            try:
                if os.name == 'nt':
                    self.process.terminate()
                else:
                    os.killpg(os.getpgid(self.process.pid), signal.SIGTERM)
            except:
                self.process.kill()
        self.status = "stopped"

    def get_elapsed_time(self) -> int:
        return int((datetime.now() - self.start_time).total_seconds())


class TrainingService:
    def __init__(self, llamafactory_path: Path):
        self.llamafactory_path = llamafactory_path
        self.cli_path = llamafactory_path / "llamafactory-cli.py"
        self.runs: Dict[str, TrainingProcess] = {}
        self._log_reader_thread: Optional[threading.Thread] = None

    def create_config_file(self, config: Dict[str, Any], output_dir: Path) -> Path:
        output_dir.mkdir(parents=True, exist_ok=True)
        config_path = output_dir / "train_config.yaml"
        
        with open(config_path, 'w', encoding='utf-8') as f:
            yaml.dump(config, f, default_flow_style=False, allow_unicode=True)
        
        return config_path

    def parse_log_line(self, line: str) -> Optional[Dict[str, Any]]:
        loss_pattern = r"'loss':\s*([0-9.]+)"
        step_pattern = r"Step\s*(\d+)/(\d+)"
        match_loss = re.search(loss_pattern, line)
        match_step = re.search(step_pattern, line)
        
        result = {}
        if match_loss:
            result['loss'] = float(match_loss.group(1))
        if match_step:
            result['current_step'] = int(match_step.group(1))
            result['total_steps'] = int(match_step.group(2))
        
        return result if result else None

    def _read_logs(self, run_id: str):
        run = self.runs.get(run_id)
        if not run:
            return

        try:
            while run.is_running() and not run._stop_event.is_set():
                if run.process.stdout:
                    line = run.process.stdout.readline()
                    if line:
                        line = line.decode('utf-8', errors='replace').strip()
                        if line:
                            run.log_lines.append(line)
                            parsed = self.parse_log_line(line)
                            if parsed:
                                if 'loss' in parsed:
                                    run.loss_history.append(parsed['loss'])
                                if 'current_step' in parsed:
                                    run.current_step = parsed['current_step']
                                if 'total_steps' in parsed:
                                    run.total_steps = parsed['total_steps']
                                    if run.total_steps > 0:
                                        run.progress = int(run.current_step / run.total_steps * 100)
                    elif run.process.poll() is not None:
                        break
                else:
                    break
        except Exception as e:
            print(f"Log reader error for {run_id}: {e}")
        finally:
            if run.status == "running":
                run.status = "completed"
                run.progress = 100

    def start_training(self, config: Dict[str, Any]) -> str:
        run_id = f"run_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        output_dir = Path(config.get('output_dir', f'output/{run_id}'))
        
        config_path = self.create_config_file(config, output_dir)
        
        cmd = ['python', str(self.cli_path), 'train', str(config_path)]
        
        env = os.environ.copy()
        env['PYTHONPATH'] = str(self.llamafactory_path / 'src')
        
        try:
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                env=env,
                cwd=str(self.llamafactory_path),
                preexec_fn=os.setsid if os.name != 'nt' else None
            )
            
            run = TrainingProcess(run_id, config, process)
            self.runs[run_id] = run
            
            reader = threading.Thread(target=self._read_logs, args=(run_id,), daemon=True)
            reader.start()
            
            return run_id
        except Exception as e:
            raise RuntimeError(f"Failed to start training: {e}")

    def get_status(self, run_id: str) -> Dict[str, Any]:
        run = self.runs.get(run_id)
        if not run:
            return {"error": "Run not found"}
        
        status = {
            "run_id": run_id,
            "status": run.status,
            "progress": run.progress,
            "current_step": run.current_step,
            "total_steps": run.total_steps,
            "loss_history": run.loss_history[-100:],
            "elapsed_seconds": run.get_elapsed_time(),
        }
        
        if run.status == "completed":
            status["message"] = "Training completed successfully"
        elif run.status == "stopped":
            status["message"] = "Training was stopped by user"
        elif run.status == "running":
            status["message"] = f"Training in progress: Step {run.current_step}/{run.total_steps}"
        
        return status

    def get_logs(self, run_id: str, lines: int = 100) -> List[str]:
        run = self.runs.get(run_id)
        if not run:
            return []
        return run.log_lines[-lines:]

    def stop_training(self, run_id: str) -> bool:
        run = self.runs.get(run_id)
        if not run:
            return False
        
        run.stop()
        return True

    def list_runs(self) -> List[Dict[str, Any]]:
        return [
            {
                "run_id": run_id,
                "status": run.status,
                "progress": run.progress,
                "start_time": run.start_time.isoformat(),
                "config_summary": {
                    "stage": run.config.get("stage", "unknown"),
                    "model": run.config.get("model_name_or_path", "unknown"),
                }
            }
            for run_id, run in self.runs.items()
        ]

    def delete_run(self, run_id: str) -> bool:
        if run_id in self.runs:
            run = self.runs[run_id]
            if run.is_running():
                run.stop()
            del self.runs[run_id]
            return True
        return False
