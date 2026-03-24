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
                if os.name == "nt":
                    self.process.terminate()
                else:
                    os.killpg(os.getpgid(self.process.pid), signal.SIGTERM)
            except:
                self.process.kill()
        self.status = "stopped"

    def get_elapsed_time(self) -> int:
        return int((datetime.now() - self.start_time).total_seconds())


class TrainingService:
    def __init__(self, llamafactory_path: Path, venv_python: str):
        self.llamafactory_path = llamafactory_path
        self.venv_python = venv_python
        self.src_path = llamafactory_path / "src"
        self.runs: Dict[str, TrainingProcess] = {}
        self._log_reader_thread: Optional[threading.Thread] = None

    def create_config_file(self, config: Dict[str, Any], output_dir: Path) -> Path:
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)
        config_path = output_dir / "train_config.yaml"

        config_copy = dict(config)

        dataset_dir = config_copy.get("dataset_dir", "")
        if dataset_dir and not Path(dataset_dir).is_absolute():
            config_copy["dataset_dir"] = str(self.llamafactory_path / dataset_dir)

        model_path = config_copy.get("model_name_or_path", "")
        if (
            model_path
            and not Path(model_path).is_absolute()
            and not model_path.startswith("Qwen")
        ):
            config_copy["model_name_or_path"] = str(self.llamafactory_path / model_path)

        print(f"[TrainingService] Creating config at: {config_path}")
        print(f"[TrainingService] Config dataset_dir: {config_copy.get('dataset_dir')}")
        print(f"[TrainingService] Config exists: {config_path.exists()}")

        with open(config_path, "w", encoding="utf-8") as f:
            yaml.dump(config_copy, f, default_flow_style=False, allow_unicode=True)

        print(f"[TrainingService] Config file written: {config_path.exists()}")
        return config_path

    def parse_log_line(self, line: str) -> Optional[Dict[str, Any]]:
        loss_patterns = [
            r"'loss':\s*([0-9.]+)",
            r'"loss":\s*([0-9.]+)',
            r"loss\s*=\s*([0-9.]+)",
            r"loss:\s*([0-9.]+)",
        ]
        step_patterns = [
            r"Step\s*(\d+)/(\d+)",
            r"(\d+)/(\d+)\s*\[",
            r"step:\s*(\d+)",
        ]

        result = {}

        for pattern in loss_patterns:
            match_loss = re.search(pattern, line, re.IGNORECASE)
            if match_loss:
                result["loss"] = float(match_loss.group(1))
                break

        for pattern in step_patterns:
            match_step = re.search(pattern, line, re.IGNORECASE)
            if match_step:
                if len(match_step.groups()) >= 2:
                    result["current_step"] = int(match_step.group(1))
                    result["total_steps"] = int(match_step.group(2))
                else:
                    result["current_step"] = int(match_step.group(1))
                break

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
                        line = line.decode("utf-8", errors="replace").strip()
                        if line:
                            run.log_lines.append(line)
                            parsed = self.parse_log_line(line)
                            if parsed:
                                if "loss" in parsed:
                                    run.loss_history.append(parsed["loss"])
                                if "current_step" in parsed:
                                    run.current_step = parsed["current_step"]
                                if "total_steps" in parsed:
                                    run.total_steps = parsed["total_steps"]
                                    if run.total_steps > 0:
                                        run.progress = int(
                                            run.current_step / run.total_steps * 100
                                        )
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

    def start_training(self, config: Dict[str, Any]) -> tuple:
        run_id = f"run_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        output_dir_str = config.get("output_dir", f"output/{run_id}")

        print(f"[TrainingService] start_training called")
        print(f"[TrainingService] output_dir from config: {output_dir_str}")
        print(f"[TrainingService] run_id: {run_id}")

        output_dir = Path(output_dir_str)
        if not output_dir.is_absolute():
            output_dir = self.llamafactory_path / output_dir

        print(f"[TrainingService] final output_dir: {output_dir}")

        config_path = self.create_config_file(config, output_dir)

        cmd = [self.venv_python, "-m", "llamafactory.cli", "train", str(config_path)]

        print(f"[TrainingService] Full command: {' '.join(cmd)}")
        print(f"[TrainingService] Working directory: {self.llamafactory_path}")
        print(f"[TrainingService] Config path: {config_path}")
        print(f"[TrainingService] Config path exists: {config_path.exists()}")

        env = os.environ.copy()
        env["PYTHONPATH"] = str(self.src_path)
        env["LLAMABOARD_ENABLED"] = "1"  # Enable loss logging to stdout
        env["LLAMABOARD_WORKDIR"] = str(
            output_dir
        )  # Required when LLAMABOARD_ENABLED=1

        try:
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                env=env,
                cwd=str(self.llamafactory_path),
                preexec_fn=os.setsid if os.name != "nt" else None,
            )

            run = TrainingProcess(run_id, config, process)
            self.runs[run_id] = run

            reader = threading.Thread(
                target=self._read_logs, args=(run_id,), daemon=True
            )
            reader.start()

            return run_id, str(output_dir)
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
            status["message"] = (
                f"Training in progress: Step {run.current_step}/{run.total_steps}"
            )

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
                },
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
