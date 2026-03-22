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
    adapter_name_or_path: Optional[str] = None
    export_dir: str = ""
    finetuning_type: str = "lora"
    template: str = "default"
    export_size: int = 10
    export_quant_bit: Optional[int] = None
    export_quantization_dataset: Optional[str] = None
    export_device: str = "auto"
    export_legacy_format: bool = False
    export_hub_model_id: Optional[str] = None
    extra_args: Optional[Dict[str, Any]] = None

    def to_export_kwargs(self) -> Dict[str, Any]:
        kwargs: Dict[str, Any] = {}

        # Export size (shard size in GB)
        kwargs['export_size'] = self.export_size

        # Device
        if self.export_device:
            kwargs['export_device'] = self.export_device

        # Legacy format (safetensors vs bin)
        if self.export_legacy_format:
            kwargs['export_legacy_format'] = True

        # Quantization
        if self.export_quant_bit:
            kwargs['export_quantization_bit'] = self.export_quant_bit
            kwargs['quantization_method'] = "bnb"
            if self.export_quantization_dataset:
                kwargs['export_quantization_dataset'] = self.export_quantization_dataset

        # HuggingFace Hub
        if self.export_hub_model_id:
            kwargs['export_hub_model_id'] = self.export_hub_model_id

        # Extra args
        if self.extra_args:
            kwargs.update(self.extra_args)

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

    if config.adapter_name_or_path:
        cmd_parts.append(f"--adapter_name_or_path {config.adapter_name_or_path}")
    if config.template:
        cmd_parts.append(f"--template {config.template}")
    if config.export_size != 10:
        cmd_parts.append(f"--export_size {config.export_size}")
    if config.export_device and config.export_device != "auto":
        cmd_parts.append(f"--export_device {config.export_device}")
    if config.export_legacy_format:
        cmd_parts.append("--export_legacy_format")
    if config.export_quant_bit:
        cmd_parts.append(f"--export_quantization_bit {config.export_quant_bit}")
        if config.export_quantization_dataset:
            cmd_parts.append(f"--export_quantization_dataset {config.export_quantization_dataset}")
    if config.export_hub_model_id:
        cmd_parts.append(f"--export_hub_model_id {config.export_hub_model_id}")

    return {
        "command": " ".join(cmd_parts),
        "config": config.model_dump(exclude_none=True)
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
            adapter_name_or_path=config.adapter_name_or_path,
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
