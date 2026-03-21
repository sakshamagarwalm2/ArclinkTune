import os
import threading
import time
from pathlib import Path
from typing import Dict, Optional, Any
from dataclasses import dataclass, field
from datetime import datetime

try:
    from huggingface_hub import HfApi, hf_hub_download
    HF_AVAILABLE = True
except ImportError:
    HF_AVAILABLE = False


@dataclass
class DownloadTask:
    id: str
    model_path: str
    model_name: str
    hub: str
    status: str = "pending"
    progress: float = 0.0
    downloaded_bytes: int = 0
    total_bytes: int = 0
    speed: str = "0 B/s"
    eta: str = "calculating..."
    error: Optional[str] = None
    started_at: Optional[str] = None
    local_path: Optional[str] = None
    _cancel_event: threading.Event = field(default_factory=threading.Event)
    _thread: Optional[Any] = None


class DownloadService:
    def __init__(self, models_dir: Path):
        self.models_dir = models_dir
        self.models_dir.mkdir(parents=True, exist_ok=True)
        self.tasks: Dict[str, DownloadTask] = {}
        self._lock = threading.Lock()
    
    def _format_size(self, size: int) -> str:
        if size < 0:
            return "Unknown"
        for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
            if size < 1024:
                return f"{size:.1f} {unit}"
            size /= 1024
        return f"{size:.1f} PB"
    
    def _format_time(self, seconds: float) -> str:
        if seconds < 0:
            return "calculating..."
        if seconds < 60:
            return f"{int(seconds)}s"
        elif seconds < 3600:
            return f"{int(seconds // 60)}m {int(seconds % 60)}s"
        else:
            return f"{int(seconds // 3600)}h {int((seconds % 3600) // 60)}m"
    
    def create_task(self, model_path: str, hub: str = "huggingface") -> str:
        task_id = f"download_{model_path.replace('/', '_')}_{int(time.time())}"
        
        with self._lock:
            self.tasks[task_id] = DownloadTask(
                id=task_id,
                model_path=model_path,
                model_name=model_path.split('/')[-1],
                hub=hub,
                status="pending",
                started_at=datetime.now().isoformat()
            )
        
        return task_id
    
    def start_download(self, task_id: str) -> bool:
        if not HF_AVAILABLE:
            with self._lock:
                if task_id in self.tasks:
                    self.tasks[task_id].status = "failed"
                    self.tasks[task_id].error = "huggingface_hub not installed"
            return False
        
        with self._lock:
            if task_id not in self.tasks:
                return False
            task = self.tasks[task_id]
            task.status = "downloading"
            task._cancel_event.clear()
        
        thread = threading.Thread(target=self._download_thread, args=(task_id,), daemon=True)
        with self._lock:
            self.tasks[task_id]._thread = thread
        thread.start()
        return True
    
    def _download_thread(self, task_id: str):
        task = self.tasks.get(task_id)
        if not task:
            return
        
        local_path = self.models_dir / task.model_path.replace('/', '_')
        local_path.mkdir(parents=True, exist_ok=True)
        
        try:
            api = HfApi()
            
            model_info = api.model_info(repo_id=task.model_path)
            total_bytes = 0
            if model_info.siblings:
                for s in model_info.siblings:
                    if s.size:
                        total_bytes += s.size
            task.total_bytes = total_bytes
            
            files = []
            if model_info.siblings:
                files = [s.rfilename for s in model_info.siblings if s.rfilename]
            
            total_files = len(files)
            
            for i, file_path in enumerate(files):
                if task._cancel_event.is_set():
                    raise Exception("Download cancelled by user")
                
                try:
                    hf_hub_download(
                        repo_id=task.model_path,
                        filename=file_path,
                        local_dir=str(local_path),
                        local_dir_use_symlinks=False,
                    )
                except Exception as e:
                    if "cancelled" in str(e).lower():
                        raise
                    continue
                
                downloaded_file = local_path / file_path
                if downloaded_file.exists():
                    with self._lock:
                        task.downloaded_bytes += downloaded_file.stat().st_size
                        if task.total_bytes > 0:
                            task.progress = (task.downloaded_bytes / task.total_bytes) * 100
                        
                        start_ts = datetime.fromisoformat(task.started_at).timestamp() if task.started_at else time.time()
                        elapsed = time.time() - start_ts
                        if elapsed > 0 and task.downloaded_bytes > 0:
                            speed = task.downloaded_bytes / elapsed
                            task.speed = self._format_size(int(speed)) + "/s"
                            remaining = (task.total_bytes - task.downloaded_bytes) / speed if speed > 0 and task.total_bytes > 0 else 0
                            task.eta = self._format_time(remaining)
                
                with self._lock:
                    if task.total_bytes <= 0:
                        task.progress = ((i + 1) / total_files * 100) if total_files > 0 else 0
            
            with self._lock:
                task.status = "completed"
                task.progress = 100
                task.local_path = str(local_path)
                task.eta = "Done"
            
        except Exception as e:
            with self._lock:
                if task._cancel_event.is_set():
                    task.status = "cancelled"
                    task.error = "Download cancelled"
                else:
                    task.status = "failed"
                    task.error = str(e)
    
    def cancel_download(self, task_id: str) -> bool:
        with self._lock:
            if task_id not in self.tasks:
                return False
            task = self.tasks[task_id]
            task._cancel_event.set()
            task.status = "cancelled"
            task.error = "Cancelled by user"
        return True
    
    def get_task(self, task_id: str) -> Optional[DownloadTask]:
        return self.tasks.get(task_id)
    
    def get_all_tasks(self) -> list:
        with self._lock:
            return list(self.tasks.values())
    
    def delete_task(self, task_id: str) -> bool:
        with self._lock:
            if task_id in self.tasks:
                task = self.tasks[task_id]
                task._cancel_event.set()
                
                if task.local_path and Path(task.local_path).exists():
                    import shutil
                    try:
                        shutil.rmtree(task.local_path)
                    except:
                        pass
                
                del self.tasks[task_id]
                return True
        return False
    
    def clear_completed(self):
        with self._lock:
            completed_ids = [
                tid for tid, task in self.tasks.items()
                if task.status in ["completed", "cancelled", "failed"]
            ]
            for tid in completed_ids:
                del self.tasks[tid]
    
    def get_local_models(self) -> list:
        if not self.models_dir.exists():
            return []
        
        models = []
        for item in self.models_dir.iterdir():
            if item.is_dir():
                models.append({
                    "name": item.name.replace('_', '/'),
                    "path": item.name,
                    "size": self._get_folder_size(item),
                    "local_path": str(item)
                })
        return models
    
    def _get_folder_size(self, path: Path) -> str:
        total = 0
        try:
            for item in path.rglob('*'):
                if item.is_file():
                    total += item.stat().st_size
        except:
            pass
        return self._format_size(total)


download_service: Optional[DownloadService] = None

def get_download_service(models_dir: Optional[Path] = None) -> DownloadService:
    global download_service
    if download_service is None:
        if models_dir is None:
            from pathlib import Path
            models_dir = Path.home() / "models" / "arclink"
        download_service = DownloadService(models_dir)
    return download_service
