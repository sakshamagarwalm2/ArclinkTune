import subprocess
import os
import yaml
import threading
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
            except Exception:
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

    def _build_eval_config(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Build a LlamaFactory-compatible config for evaluation.

        Uses the training pipeline with do_eval=True / do_predict=True,
        since llamafactory-cli eval is deprecated.
        """
        eval_config: Dict[str, Any] = {}

        # Core model settings
        eval_config['model_name_or_path'] = config.get('model_name_or_path', '')
        eval_config['template'] = config.get('template', 'default')
        eval_config['finetuning_type'] = config.get('finetuning_type', 'lora')

        # Adapter checkpoint if provided
        checkpoint_dir = config.get('checkpoint_dir')
        if checkpoint_dir:
            eval_config['adapter_name_or_path'] = checkpoint_dir

        # Dataset settings
        eval_config['dataset'] = config.get('dataset', '')
        eval_config['dataset_dir'] = config.get('dataset_dir', 'data')
        eval_config['cutoff_len'] = config.get('cutoff_len', 1024)
        eval_config['max_samples'] = config.get('max_samples', 100000)

        # Output
        eval_config['output_dir'] = config.get('output_dir', f"output/eval_{datetime.now().strftime('%Y%m%d_%H%M%S')}")

        # Evaluation mode flags
        do_predict = config.get('predict', config.get('do_predict', True))
        eval_config['do_eval'] = True
        if do_predict:
            eval_config['do_predict'] = True
            eval_config['predict_with_generate'] = True

        # Batch size
        eval_config['per_device_eval_batch_size'] = config.get('batch_size', 2)

        # Generation settings
        if do_predict:
            eval_config['max_new_tokens'] = config.get('max_new_tokens', 512)
            eval_config['temperature'] = config.get('temperature', 0.95)
            eval_config['top_p'] = config.get('top_p', 0.7)

        # Logging
        eval_config['report_to'] = ['none']

        return eval_config

    def create_config_file(self, config: Dict[str, Any], output_dir: Path) -> Path:
        output_dir.mkdir(parents=True, exist_ok=True)
        config_path = output_dir / "eval_config.yaml"

        with open(config_path, 'w', encoding='utf-8') as f:
            yaml.dump(config, f, default_flow_style=False, allow_unicode=True)

        return config_path

    def parse_log_line(self, line: str) -> Optional[Dict[str, Any]]:
        result: Dict[str, Any] = {}

        # Parse eval metrics like: {'eval_loss': 1.234, 'eval_accuracy': 0.85}
        metric_pattern = r"'(eval_\w+)':\s*([0-9.]+)"
        for match in re.finditer(metric_pattern, line):
            result[match.group(1)] = float(match.group(2))

        # Parse predict metrics like: {'predict_loss': 1.234}
        predict_pattern = r"'(predict_\w+)':\s*([0-9.]+)"
        for match in re.finditer(predict_pattern, line):
            result[match.group(1)] = float(match.group(2))

        # Parse progress: Step 50/100
        step_pattern = r"Step\s+(\d+)/(\d+)"
        match = re.search(step_pattern, line)
        if match:
            result['_current_step'] = int(match.group(1))
            result['_total_steps'] = int(match.group(2))

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
                                # Update progress from step info
                                if '_current_step' in parsed and '_total_steps' in parsed:
                                    total = parsed['_total_steps']
                                    if total > 0:
                                        run.progress = int(parsed['_current_step'] / total * 100)

                                # Store actual metrics
                                for key, value in parsed.items():
                                    if not key.startswith('_'):
                                        run.results[key] = value
                    elif run.process.poll() is not None:
                        break
                else:
                    break
        except Exception as e:
            print(f"Log reader error for {run_id}: {e}")
        finally:
            if run.status == "running":
                exit_code = run.process.poll()
                run.status = "completed" if exit_code == 0 else "failed"
                run.progress = 100

    def start_evaluation(self, config: Dict[str, Any]) -> str:
        run_id = f"eval_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        output_dir = Path(config.get('output_dir', f'output/{run_id}'))

        # Build a training-compatible config with do_eval=True
        eval_config = self._build_eval_config(config)
        config_path = self.create_config_file(eval_config, output_dir)

        # Use 'train' command with do_eval=True (not the broken 'eval' command)
        cmd = [
            self.venv_python,
            '-m', 'llamafactory.cli', 'train',
            str(config_path)
        ]

        env = os.environ.copy()
        env['PYTHONPATH'] = str(self.src_path)
        env['DISABLE_VERSION_CHECK'] = '1'

        try:
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                env=env,
                cwd=str(self.llamafactory_path),
                preexec_fn=os.setsid if os.name != 'nt' else None
            )

            run = EvaluateProcess(run_id, eval_config, process)
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
