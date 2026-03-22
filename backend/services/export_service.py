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


class ExportProcess:
    def __init__(self, run_id: str, config: Dict[str, Any], process: subprocess.Popen):
        self.run_id = run_id
        self.config = config
        self.process = process
        self.status = "running"
        self.progress = 0
        self.stage = ""
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


class ExportService:
    def __init__(self, llamafactory_path: Path, venv_python: str):
        self.llamafactory_path = llamafactory_path
        self.venv_python = venv_python
        self.src_path = llamafactory_path / "src"
        self.runs: Dict[str, ExportProcess] = {}

    def parse_log_line(self, line: str) -> Optional[Dict[str, Any]]:
        progress_pattern = r"(\d+)%\|"
        stage_pattern = r"Exporting\s+(.+?)(?:\s|$)"
        
        result = {}
        match_progress = re.search(progress_pattern, line)
        match_stage = re.search(stage_pattern, line)
        
        if match_progress:
            result['progress'] = int(match_progress.group(1))
        if match_stage:
            result['stage'] = match_stage.group(1)
        
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
                                if 'progress' in parsed:
                                    run.progress = parsed['progress']
                                if 'stage' in parsed:
                                    run.stage = parsed['stage']
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

    def start_export(self, model_path: str, export_dir: str, finetuning_type: str = "lora", 
                    checkpoint_dir: Optional[str] = None, **kwargs) -> str:
        run_id = f"export_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        cmd = [
            self.venv_python,
            '-m', 'llamafactory.cli', 'export',
            '--model_name_or_path', model_path,
            '--export_dir', export_dir,
            '--finetuning_type', finetuning_type,
        ]
        
        if checkpoint_dir:
            cmd.extend(['--checkpoint_dir', checkpoint_dir])
        
        for key, value in kwargs.items():
            if value is not None and value != "":
                cmd.extend([f'--{key}', str(value)])
        
        env = os.environ.copy()
        env['PYTHONPATH'] = str(self.src_path)
        
        config = {
            'model_name_or_path': model_path,
            'export_dir': export_dir,
            'finetuning_type': finetuning_type,
            'checkpoint_dir': checkpoint_dir,
            **kwargs
        }
        
        try:
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                env=env,
                cwd=str(self.llamafactory_path),
                preexec_fn=os.setsid if os.name != 'nt' else None
            )
            
            run = ExportProcess(run_id, config, process)
            self.runs[run_id] = run
            
            reader = threading.Thread(target=self._read_logs, args=(run_id,), daemon=True)
            reader.start()
            
            return run_id
        except Exception as e:
            raise RuntimeError(f"Failed to start export: {e}")

    def get_status(self, run_id: str) -> Dict[str, Any]:
        run = self.runs.get(run_id)
        if not run:
            return {"error": "Run not found"}
        
        return {
            "run_id": run_id,
            "status": run.status,
            "progress": run.progress,
            "stage": run.stage,
            "elapsed_seconds": run.get_elapsed_time(),
        }

    def get_logs(self, run_id: str, lines: int = 100) -> List[str]:
        run = self.runs.get(run_id)
        if not run:
            return []
        return run.log_lines[-lines:]

    def stop_export(self, run_id: str) -> bool:
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
                    "export_dir": run.config.get("export_dir", "unknown"),
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


_export_service: Optional[ExportService] = None

def get_export_service(llamafactory_path: Optional[Path] = None, venv_python: Optional[str] = None) -> ExportService:
    global _export_service
    if _export_service is None:
        from config import get_settings
        settings = get_settings()
        if llamafactory_path is None:
            llamafactory_path = settings.core_path
        if venv_python is None:
            venv_python = settings.get_venv_python()
        _export_service = ExportService(llamafactory_path, venv_python)
    return _export_service
