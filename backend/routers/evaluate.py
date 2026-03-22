from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

from config import get_settings

settings = get_settings()

from services.evaluate_service import get_evaluate_service

evaluate_service = get_evaluate_service(settings.core_path, settings.get_venv_python())

router = APIRouter()


class EvaluateConfig(BaseModel):
    model_name_or_path: str = ""
    template: str = "default"
    finetuning_type: str = "lora"
    checkpoint_dir: Optional[str] = None
    dataset: str = ""
    dataset_dir: str = "data"
    cutoff_len: int = 1024
    max_samples: int = 100000
    batch_size: int = 2
    predict: bool = True
    max_new_tokens: int = 512
    temperature: float = 0.95
    top_p: float = 0.7
    output_dir: str = ""

    def to_dict(self) -> Dict[str, Any]:
        result = self.model_dump(exclude_none=True)
        if not result.get('output_dir'):
            result['output_dir'] = f"output/eval_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        if 'predict' in result:
            result['do_predict'] = result.pop('predict')
        if 'max_new_tokens' in result:
            result['max_new_tokens'] = result.pop('max_new_tokens')
        return result


class RunInfo(BaseModel):
    run_id: str
    status: str
    progress: int
    start_time: str
    config_summary: Dict[str, str]


@router.get("/config", response_model=EvaluateConfig)
async def get_default_config():
    return EvaluateConfig(
        output_dir=f"output/eval_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    )


@router.get("/runs", response_model=List[RunInfo])
async def list_runs():
    return evaluate_service.list_runs()


@router.post("/preview")
async def preview_evaluation(config: EvaluateConfig):
    cfg = config.to_dict()
    cmd_parts = ["llamafactory-cli eval"]
    for key, value in cfg.items():
        if value is not None and value != "":
            if isinstance(value, bool):
                if value:
                    cmd_parts.append(f"--{key}")
            else:
                cmd_parts.append(f"--{key} {value}")
    
    return {
        "command": " ".join(cmd_parts),
        "config": cfg
    }


@router.post("/start")
async def start_evaluation(config: EvaluateConfig):
    try:
        cfg = config.to_dict()
        run_id = evaluate_service.start_evaluation(cfg)
        return {"run_id": run_id, "success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/status/{run_id}")
async def get_evaluation_status(run_id: str):
    return evaluate_service.get_status(run_id)


@router.post("/stop/{run_id}")
async def stop_evaluation(run_id: str):
    success = evaluate_service.stop_evaluation(run_id)
    return {"success": success}


@router.get("/logs/{run_id}")
async def get_evaluation_logs(run_id: str, lines: int = 100):
    logs = evaluate_service.get_logs(run_id, lines)
    return {"logs": logs, "count": len(logs)}


@router.delete("/runs/{run_id}")
async def delete_run(run_id: str):
    success = evaluate_service.delete_run(run_id)
    return {"success": success}
