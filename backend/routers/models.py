from fastapi import APIRouter, BackgroundTasks, Query
from typing import List, Optional, Dict
from pydantic import BaseModel
from pathlib import Path
import time

from llamafactory_data import LLAMAFACTORY_TEMPLATES, LLAMAFACTORY_MODELS
from services.download_service import get_download_service

router = APIRouter()


class Model(BaseModel):
    name: str
    path: str
    template: Optional[str] = None
    downloaded: bool = False
    size: Optional[str] = None
    downloads: Optional[int] = 0
    likes: Optional[int] = 0


class LocalModel(BaseModel):
    name: str
    path: str
    size: str
    local_path: str


class DownloadTaskResponse(BaseModel):
    task_id: str
    model_path: str
    model_name: str
    status: str
    progress: float
    downloaded: str
    total: str
    speed: str
    eta: str
    error: Optional[str] = None


@router.get("/", response_model=Dict)
async def list_models(hub: str = Query("huggingface", description="Model hub: huggingface, modelscope")):
    download_service = get_download_service()
    local_paths = {m["local_path"] for m in download_service.get_local_models()}
    
    if isinstance(LLAMAFACTORY_MODELS, dict):
        grouped = {}
        for group_name, models in LLAMAFACTORY_MODELS.items():
            grouped[group_name] = [
                Model(
                    name=m["name"],
                    path=m["path"],
                    template=m.get("template", "default"),
                    downloaded=m["path"] in local_paths,
                    downloads=m.get("downloads", 0),
                    likes=m.get("likes", 0)
                )
                for m in models
            ]
        return {"groups": grouped, "total": sum(len(m) for m in grouped.values())}
    else:
        models = [
            Model(
                name=m["name"],
                path=m["path"],
                template=m.get("template", "default"),
                downloaded=m["path"] in local_paths
            )
            for m in LLAMAFACTORY_MODELS
        ]
        return {"groups": {"All": models}, "total": len(models)}


@router.get("/flat", response_model=List[Model])
async def list_models_flat():
    download_service = get_download_service()
    local_paths = {m["local_path"] for m in download_service.get_local_models()}
    
    if isinstance(LLAMAFACTORY_MODELS, dict):
        all_models = []
        for models in LLAMAFACTORY_MODELS.values():
            all_models.extend(models)
        return [
            Model(
                name=m["name"],
                path=m["path"],
                template=m.get("template", "default"),
                downloaded=m["path"] in local_paths
            )
            for m in all_models
        ]
    else:
        return [
            Model(
                name=m["name"],
                path=m["path"],
                template=m.get("template", "default"),
                downloaded=m["path"] in local_paths
            )
            for m in LLAMAFACTORY_MODELS
        ]


@router.get("/groups")
async def get_model_groups():
    if isinstance(LLAMAFACTORY_MODELS, dict):
        return {"groups": list(LLAMAFACTORY_MODELS.keys())}
    return {"groups": ["All"]}


@router.get("/supported")
async def get_supported_models():
    if isinstance(LLAMAFACTORY_MODELS, dict):
        return [m["name"] for models in LLAMAFACTORY_MODELS.values() for m in models]
    return [m["name"] for m in LLAMAFACTORY_MODELS]


@router.get("/local", response_model=List[LocalModel])
async def get_local_models():
    download_service = get_download_service()
    return [
        LocalModel(
            name=m["name"].replace('_', '/'),
            path=m["name"],
            size=m["size"],
            local_path=m["local_path"]
        )
        for m in download_service.get_local_models()
    ]


@router.get("/templates")
async def get_templates():
    return LLAMAFACTORY_TEMPLATES


@router.get("/templates/count")
async def get_templates_count():
    return {"count": len(LLAMAFACTORY_TEMPLATES), "templates": LLAMAFACTORY_TEMPLATES[:20]}


@router.get("/hubs")
async def get_hubs():
    return [
        {"id": "huggingface", "name": "HuggingFace", "icon": "HF"},
        {"id": "modelscope", "name": "ModelScope", "icon": "MS"},
    ]


@router.post("/download")
async def download_model(body: dict):
    model_path = body.get("model_name")
    hub = body.get("hub", "huggingface")
    
    if not model_path:
        return {"error": "model_name is required"}
    
    download_service = get_download_service()
    task_id = download_service.create_task(str(model_path), hub)
    download_service.start_download(task_id)
    
    return {"task_id": task_id}


@router.get("/download/{task_id}", response_model=DownloadTaskResponse)
async def get_download_status(task_id: str):
    download_service = get_download_service()
    task = download_service.get_task(task_id)
    
    if not task:
        return DownloadTaskResponse(
            task_id=task_id,
            model_path="",
            model_name="",
            status="not_found",
            progress=0,
            downloaded="0 B",
            total="0 B",
            speed="0 B/s",
            eta="N/A"
        )
    
    return DownloadTaskResponse(
        task_id=task.id,
        model_path=task.model_path,
        model_name=task.model_name,
        status=task.status,
        progress=task.progress,
        downloaded=download_service._format_size(task.downloaded_bytes),
        total=download_service._format_size(task.total_bytes),
        speed=task.speed,
        eta=task.eta,
        error=task.error
    )


@router.get("/downloads")
async def get_all_downloads():
    download_service = get_download_service()
    tasks = download_service.get_all_tasks()
    return [
        {
            "task_id": t.id,
            "model_path": t.model_path,
            "model_name": t.model_name,
            "status": t.status,
            "progress": t.progress,
            "downloaded": download_service._format_size(t.downloaded_bytes),
            "total": download_service._format_size(t.total_bytes),
            "speed": t.speed,
            "eta": t.eta,
            "error": t.error,
            "local_path": t.local_path
        }
        for t in tasks
    ]


@router.delete("/download/{task_id}")
async def cancel_download(task_id: str):
    download_service = get_download_service()
    success = download_service.cancel_download(task_id)
    return {"success": success}


@router.delete("/download/{task_id}/delete")
async def delete_download(task_id: str):
    download_service = get_download_service()
    success = download_service.delete_task(task_id)
    return {"success": success}


@router.delete("/downloads/clear")
async def clear_downloads():
    download_service = get_download_service()
    download_service.clear_completed()
    return {"success": True}


@router.get("/models_dir")
async def get_models_dir():
    download_service = get_download_service()
    return {"path": str(download_service.models_dir)}


@router.delete("/local/{local_path:path}")
async def delete_local_model(local_path: str):
    import shutil
    path = Path(local_path)
    try:
        if path.exists():
            shutil.rmtree(path)
            return {"success": True, "message": f"Deleted {local_path}"}
        return {"success": False, "message": "Path does not exist"}
    except Exception as e:
        return {"success": False, "message": str(e)}
