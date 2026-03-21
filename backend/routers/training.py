from fastapi import APIRouter, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
from pathlib import Path

from config import get_settings

settings = get_settings()

from services.training_service import TrainingService

training_service = TrainingService(settings.core_path)

router = APIRouter()


class TrainingConfig(BaseModel):
    stage: str = "sft"
    model_name_or_path: str = ""
    template: str = "default"
    finetuning_type: str = "lora"
    dataset: str = ""
    dataset_dir: str = "data"
    learning_rate: float = 5e-5
    num_train_epochs: float = 3.0
    cutoff_len: int = 2048
    per_device_train_batch_size: int = 2
    gradient_accumulation_steps: int = 8
    lr_scheduler_type: str = "cosine"
    max_grad_norm: float = 1.0
    logging_steps: int = 5
    save_steps: int = 100
    warmup_steps: int = 0
    output_dir: str = ""
    bf16: bool = True
    fp16: bool = False
    pure_bf16: bool = False
    lora_rank: int = 8
    lora_alpha: int = 16
    lora_dropout: float = 0.05
    lora_target: str = "all"
    ddp: bool = False
    batch_size: int = 2

    def to_dict(self) -> Dict[str, Any]:
        result = self.model_dump()
        if not result.get('output_dir'):
            result['output_dir'] = f"output/train_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        return result


class Dataset(BaseModel):
    name: str
    path: str


class RunInfo(BaseModel):
    run_id: str
    status: str
    progress: int
    start_time: str
    config_summary: Dict[str, str]


@router.get("/config", response_model=TrainingConfig)
async def get_default_config():
    return TrainingConfig(
        output_dir=f"output/train_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    )


@router.get("/datasets", response_model=List[Dataset])
async def get_datasets():
    data_dir = settings.data_dir
    datasets = []
    
    if data_dir.exists():
        for item in data_dir.iterdir():
            if item.is_dir() or item.suffix in ['.json', '.jsonl', '.yaml', '.csv']:
                datasets.append(Dataset(
                    name=item.stem if item.is_dir() else item.name,
                    path=str(item.relative_to(data_dir))
                ))
    
    if not datasets:
        datasets = [
            Dataset(name="alpaca", path="alpaca"),
            Dataset(name="openassistant", path="oasst1"),
        ]
    
    return datasets


@router.get("/runs", response_model=List[RunInfo])
async def list_runs():
    return training_service.list_runs()


@router.post("/preview")
async def preview_training(config: TrainingConfig):
    cfg = config.to_dict()
    return {
        "command": f"llamafactory-cli train --stage {cfg['stage']} --model_name_or_path {cfg['model_name_or_path']}",
        "config": cfg
    }


@router.post("/start")
async def start_training(config: TrainingConfig):
    try:
        cfg = config.to_dict()
        run_id = training_service.start_training(cfg)
        return {"run_id": run_id, "success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/status/{run_id}")
async def get_training_status(run_id: str):
    return training_service.get_status(run_id)


@router.post("/stop/{run_id}")
async def stop_training(run_id: str):
    success = training_service.stop_training(run_id)
    return {"success": success}


@router.get("/logs/{run_id}")
async def get_training_logs(run_id: str, lines: int = 100):
    logs = training_service.get_logs(run_id, lines)
    return {"logs": logs, "count": len(logs)}


@router.get("/loss/{run_id}")
async def get_loss_history(run_id: str):
    status = training_service.get_status(run_id)
    return {"loss_history": status.get("loss_history", [])}


@router.delete("/runs/{run_id}")
async def delete_run(run_id: str):
    success = training_service.delete_run(run_id)
    return {"success": success}


@router.post("/save")
async def save_config(config: TrainingConfig, path: str):
    import yaml
    cfg = config.to_dict()
    save_path = Path(path)
    save_path.parent.mkdir(parents=True, exist_ok=True)
    with open(save_path, 'w', encoding='utf-8') as f:
        yaml.dump(cfg, f, default_flow_style=False)
    return {"success": True, "path": path}


@router.post("/load")
async def load_config(path: str):
    import yaml
    with open(path, 'r', encoding='utf-8') as f:
        cfg = yaml.safe_load(f)
    return cfg
