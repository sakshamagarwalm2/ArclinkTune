import subprocess
import os
import yaml
import threading
import queue
import signal
import re
from pathlib import Path
from typing import Dict, Any, Optional, List
from datetime import datetime

os.environ["DISABLE_VERSION_CHECK"] = "1"


class EvaluateProcess:
    def __init__(self, run_id: str, config: Dict[str, Any], process: subprocess.Popen):
        self.run_id = run_id
        self.config = config
        self.process = process
        self.status = "running"
        self.progress = 0
        self.current_task = 0
        self.total_tasks = 0
        self.results: Dict[str, Any] = {}
        self.log_lines: List[str] = []
        self.start_time = datetime.now()
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


class EvaluateService:
    def __init__(self, llamafactory_path: Path, venv_python: str):
        self.llamafactory_path = llamafactory_path
        self.venv_python = venv_python
        self.src_path = llamafactory_path / "src"
        self.runs: Dict[str, EvaluateProcess] = {}

    def create_config_file(self, config: Dict[str, Any], output_dir: Path) -> Path:
        output_dir.mkdir(parents=True, exist_ok=True)
        config_path = output_dir / "eval_config.yaml"
        
        with open(config_path, 'w', encoding='utf-8') as f:
            yaml.dump(config, f, default_flow_style=False, allow_unicode=True)
        
        return config_path

    def parse_log_line(self, line: str) -> Optional[Dict[str, Any]]:
        task_pattern = r"Evaluating\|(\d+)/(\d+)"
        result_pattern = r"'([^']+)':\s*([0-9.]+)"
        
        result = {}
        match_task = re.search(task_pattern, line)
        match_result = re.search(result_pattern, line)
        
        if match_task:
            result['current_task'] = int(match_task.group(1))
            result['total_tasks'] = int(match_task.group(2))
        if match_result:
            result['metric'] = match_result.group(1)
            result['value'] = float(match_result.group(2))
        
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
                                if 'current_task' in parsed:
                                    run.current_task = parsed['current_task']
                                if 'total_tasks' in parsed:
                                    run.total_tasks = parsed['total_tasks']
                                    if run.total_tasks > 0:
                                        run.progress = int(run.current_task / run.total_tasks * 100)
                                if 'metric' in parsed:
                                    run.results[parsed['metric']] = parsed['value']
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

    def start_evaluation(self, config: Dict[str, Any]) -> str:
        run_id = f"eval_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        output_dir = Path(config.get('output_dir', f'output/{run_id}'))
        
        config_path = self.create_config_file(config, output_dir)
        
        cmd = [
            self.venv_python,
            '-m', 'llamafactory.cli', 'eval',
            str(config_path)
        ]
        
        env = os.environ.copy()
        env['PYTHONPATH'] = str(self.src_path)
        
        try:
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                env=env,
                cwd=str(self.llamafactory_path),
                preexec_fn=os.setsid if os.name != 'nt' else None
            )
            
            run = EvaluateProcess(run_id, config, process)
            self.runs[run_id] = run
            
            reader = threading.Thread(target=self._read_logs, args=(run_id,), daemon=True)
            reader.start()
            
            return run_id
        except Exception as e:
            raise RuntimeError(f"Failed to start evaluation: {e}")

    def get_status(self, run_id: str) -> Dict[str, Any]:
        run = self.runs.get(run_id)
        if not run:
            return {"error": "Run not found"}
        
        return {
            "run_id": run_id,
            "status": run.status,
            "progress": run.progress,
            "current_task": run.current_task,
            "total_tasks": run.total_tasks,
            "results": run.results,
            "elapsed_seconds": run.get_elapsed_time(),
        }

    def get_logs(self, run_id: str, lines: int = 100) -> List[str]:
        run = self.runs.get(run_id)
        if not run:
            return []
        return run.log_lines[-lines:]

    def stop_evaluation(self, run_id: str) -> bool:
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


_evaluate_service: Optional[EvaluateService] = None

def get_evaluate_service(llamafactory_path: Optional[Path] = None, venv_python: Optional[str] = None) -> EvaluateService:
    global _evaluate_service
    if _evaluate_service is None:
        from config import get_settings
        settings = get_settings()
        if llamafactory_path is None:
            llamafactory_path = settings.core_path
        if venv_python is None:
            venv_python = settings.get_venv_python()
        _evaluate_service = EvaluateService(llamafactory_path, venv_python)
    return _evaluate_service
