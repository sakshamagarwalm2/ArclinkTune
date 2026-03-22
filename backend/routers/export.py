from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from config import get_settings

settings = get_settings()

from services.export_service import get_export_service

export_service = get_export_service(settings.core_path, settings.get_venv_python())

router = APIRouter()


class ExportConfig(BaseModel):
    model_name_or_path: str = ""
    checkpoint_dir: Optional[str] = None
    export_dir: str = ""
    finetuning_type: str = "lora"
    template: str = "default"
    export_size: int = 10
    export_quant_bit: Optional[int] = None
    export_quant_method: str = "bnb"
    export_device: str = "auto"
    export_legacy_format: bool = False
    export_hub_model_id: Optional[str] = None
    hub_private_repo: bool = False

    def to_export_kwargs(self) -> Dict[str, Any]:
        kwargs = {}
        if self.export_quant_bit:
            kwargs['export_quant_bit'] = self.export_quant_bit
            kwargs['export_quant_method'] = self.export_quant_method
        if self.export_hub_model_id:
            kwargs['hub_model_id'] = self.export_hub_model_id
            kwargs['hub_private_repo'] = self.hub_private_repo
        if self.export_legacy_format:
            kwargs['use_safetensors'] = 'false'
        kwargs['max_shard_size'] = f"{self.export_size}G"
        return kwargs


class RunInfo(BaseModel):
    run_id: str
    status: str
    progress: int
    start_time: str
    config_summary: Dict[str, str]


@router.get("/runs", response_model=List[RunInfo])
async def list_runs():
    return export_service.list_runs()


@router.post("/preview")
async def preview_export(config: ExportConfig):
    cmd_parts = [
        "llamafactory-cli export",
        f"--model_name_or_path {config.model_name_or_path}",
        f"--export_dir {config.export_dir}",
        f"--finetuning_type {config.finetuning_type}",
    ]
    
    if config.checkpoint_dir:
        cmd_parts.append(f"--checkpoint_dir {config.checkpoint_dir}")
    if config.template:
        cmd_parts.append(f"--template {config.template}")
    if config.export_quant_bit:
        cmd_parts.append(f"--export_quant_bit {config.export_quant_bit}")
    if config.export_hub_model_id:
        cmd_parts.append(f"--hub_model_id {config.export_hub_model_id}")
    if config.hub_private_repo:
        cmd_parts.append("--hub_private_repo")
    
    return {
        "command": " ".join(cmd_parts),
        "config": config.model_dump()
    }


@router.post("/start")
async def start_export(config: ExportConfig):
    if not config.model_name_or_path:
        return {"success": False, "error": "model_name_or_path is required"}
    if not config.export_dir:
        return {"success": False, "error": "export_dir is required"}
    
    try:
        kwargs = config.to_export_kwargs()
        run_id = export_service.start_export(
            model_path=config.model_name_or_path,
            export_dir=config.export_dir,
            finetuning_type=config.finetuning_type,
            checkpoint_dir=config.checkpoint_dir,
            template=config.template,
            **kwargs
        )
        return {"run_id": run_id, "success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/status/{run_id}")
async def get_export_status(run_id: str):
    return export_service.get_status(run_id)


@router.post("/stop/{run_id}")
async def stop_export(run_id: str):
    success = export_service.stop_export(run_id)
    return {"success": success}


@router.get("/logs/{run_id}")
async def get_export_logs(run_id: str, lines: int = 100):
    logs = export_service.get_logs(run_id, lines)
    return {"logs": logs, "count": len(logs)}


@router.delete("/runs/{run_id}")
async def delete_run(run_id: str):
    success = export_service.delete_run(run_id)
    return {"success": success}
