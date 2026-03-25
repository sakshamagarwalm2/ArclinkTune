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
        self.num_examples = 0
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
            r"(\d+)/(\d+)\s*(?:steps?|epochs?)",
            r"\[(\d+)/(\d+)\]",
        ]
        num_examples_patterns = [
            r"Num examples\s*=\s*([0-9,]+)",
            r"num_examples\s*=\s*([0-9,]+)",
            r"Found\s+([0-9,]+)\s+examples",
        ]
        total_steps_patterns = [
            r"Total optimization steps\s*=\s*([0-9,]+)",
            r"total_steps\s*=\s*([0-9,]+)",
            r"Total training steps\s*=\s*([0-9,]+)",
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

        for pattern in num_examples_patterns:
            match_examples = re.search(pattern, line, re.IGNORECASE)
            if match_examples:
                result["num_examples"] = int(match_examples.group(1).replace(",", ""))
                break

        for pattern in total_steps_patterns:
            match_total = re.search(pattern, line, re.IGNORECASE)
            if match_total:
                result["total_steps"] = int(match_total.group(1).replace(",", ""))
                break

        return result if result else None

    def _calculate_progress_from_checkpoints(self, output_dir: str) -> int:
        """Calculate progress based on saved checkpoints."""
        import glob

        output_path = Path(output_dir)
        if not output_path.exists():
            return 0

        checkpoint_dirs = glob.glob(str(output_path / "checkpoint-*"))
        if not checkpoint_dirs:
            return 0

        try:
            steps = sorted(
                [
                    int(Path(cp).name.replace("checkpoint-", ""))
                    for cp in checkpoint_dirs
                    if cp.split("-")[-1].isdigit()
                ],
                reverse=True,
            )

            if steps and self.runs:
                for run in self.runs.values():
                    if run.total_steps > 0:
                        return min(100, int(steps[0] / run.total_steps * 100))
        except:
            pass
        return 0

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
                                if "num_examples" in parsed:
                                    run.num_examples = parsed["num_examples"]
                    elif run.process.poll() is not None:
                        break
                else:
                    break
        except Exception as e:
            print(f"Log reader error for {run_id}: {e}")
        finally:
            if run.status == "running":
                return_code = run.process.returncode
                if return_code is not None and return_code != 0:
                    run.status = "failed"
                    print(
                        f"[TrainingService] Training {run_id} failed with exit code {return_code}"
                    )
                    # Print last 10 log lines for debugging
                    if run.log_lines:
                        print("[TrainingService] Last log lines:")
                        for line in run.log_lines[-10:]:
                            print(f"  {line}")
                else:
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

        progress = run.progress
        if progress == 0 and run.status == "running":
            output_dir = run.config.get("output_dir", "")
            if output_dir:
                progress = self._calculate_progress_from_checkpoints(output_dir)
                if progress > 0:
                    run.progress = progress

        status = {
            "run_id": run_id,
            "status": run.status,
            "progress": progress,
            "current_step": run.current_step,
            "total_steps": run.total_steps,
            "num_examples": run.num_examples,
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

    def stop_training(self, run_id: str, save_checkpoint: bool = True) -> bool:
        run = self.runs.get(run_id)
        if not run:
            return False

        if save_checkpoint:
            run.status = "saving"
            output_dir = run.config.get("output_dir", "")
            if output_dir:
                print(f"[TrainingService] Saving checkpoint before stop...")
                self._save_final_checkpoint(output_dir)

                import glob

                output_path = Path(output_dir)
                if output_path.exists():
                    checkpoint_dirs = glob.glob(str(output_path / "checkpoint-*"))
                    if not checkpoint_dirs:
                        adapter_files = list(output_path.glob("*.safetensors")) + list(
                            output_path.glob("*.bin")
                        )
                        if adapter_files:
                            ckpt_dir = output_path / "checkpoint-partial"
                            ckpt_dir.mkdir(exist_ok=True)
                            try:
                                import shutil

                                for f in adapter_files:
                                    shutil.copy2(f, ckpt_dir / f.name)
                                config_files = list(output_path.glob("*.json"))
                                for f in config_files:
                                    shutil.copy2(f, ckpt_dir / f.name)
                                print(
                                    f"[TrainingService] Saved partial checkpoint to: {ckpt_dir}"
                                )
                            except Exception as e:
                                print(
                                    f"[TrainingService] Error saving partial checkpoint: {e}"
                                )

        run.stop()
        return True

    def _save_final_checkpoint(self, output_dir: str):
        import glob

        output_path = Path(output_dir)
        if not output_path.exists():
            return

        checkpoints = sorted(
            glob.glob(str(output_path / "checkpoint-*")),
            key=lambda x: int(x.split("-")[-1]) if x.split("-")[-1].isdigit() else 0,
            reverse=True,
        )

        if checkpoints:
            final_checkpoint = output_path / "checkpoint-final"
            latest_checkpoint = Path(checkpoints[0])
            try:
                import shutil

                if final_checkpoint.exists():
                    shutil.rmtree(final_checkpoint)
                shutil.copytree(latest_checkpoint, final_checkpoint)
                print(
                    f"[TrainingService] Saved final checkpoint to: {final_checkpoint}"
                )
            except Exception as e:
                print(f"[TrainingService] Error saving final checkpoint: {e}")

    def list_checkpoints(self, output_dir: str) -> List[Dict[str, Any]]:
        output_path = Path(output_dir)
        if not output_path.exists():
            return []

        import glob

        checkpoints = []

        checkpoint_dirs = sorted(
            glob.glob(str(output_path / "checkpoint-*")),
            key=lambda x: (
                int(x.split("-")[-1]) if x.split("-")[-1].isdigit() else -1,
                x,
            ),
            reverse=True,
        )

        for ckpt_dir in checkpoint_dirs:
            ckpt_path = Path(ckpt_dir)
            step_num = ckpt_path.name.replace("checkpoint-", "")

            files = list(ckpt_path.glob("*"))
            has_adapter = any(
                f.name
                in [
                    "adapter_config.json",
                    "adapter_model.safetensors",
                    "adapter_model.bin",
                ]
                for f in files
            )

            checkpoints.append(
                {
                    "path": str(ckpt_path),
                    "step": step_num,
                    "has_adapter": has_adapter,
                }
            )

        final_checkpoint = output_path / "checkpoint-final"
        if final_checkpoint.exists():
            checkpoints.insert(
                0,
                {
                    "path": str(final_checkpoint),
                    "step": "final",
                    "has_adapter": True,
                },
            )

        return checkpoints

    def resume_training(self, output_dir: str) -> Optional[str]:
        output_path = Path(output_dir)
        if not output_path.exists():
            return None

        config_path = output_path / "train_config.yaml"
        if not config_path.exists():
            config_path = output_path / "sft_config.yaml"

        if not config_path.exists():
            return None

        import yaml

        with open(config_path, "r", encoding="utf-8") as f:
            config = yaml.safe_load(f)

        config["resume_from_checkpoint"] = "latest"

        config_path_new = output_path / "train_config_resume.yaml"
        with open(config_path_new, "w", encoding="utf-8") as f:
            yaml.dump(config, f, default_flow_style=False, allow_unicode=True)

        cmd = [
            self.venv_python,
            "-m",
            "llamafactory.cli",
            "train",
            str(config_path_new),
        ]

        env = os.environ.copy()
        env["PYTHONPATH"] = str(self.src_path)
        env["LLAMABOARD_ENABLED"] = "1"
        env["LLAMABOARD_WORKDIR"] = str(output_path)

        try:
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                env=env,
                cwd=str(self.llamafactory_path),
                preexec_fn=os.setsid if os.name != "nt" else None,
            )

            run_id = f"resume_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            run = TrainingProcess(run_id, config, process)
            self.runs[run_id] = run

            reader = threading.Thread(
                target=self._read_logs, args=(run_id,), daemon=True
            )
            reader.start()

            return run_id
        except Exception as e:
            raise RuntimeError(f"Failed to resume training: {e}")

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
