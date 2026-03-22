from fastapi import APIRouter, BackgroundTasks
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Union
from datetime import datetime
from pathlib import Path
import json as _json

from config import get_settings

settings = get_settings()

from services.training_service import TrainingService

training_service = TrainingService(settings.core_path, settings.get_venv_python())

router = APIRouter()


# DeepSpeed stage configs (generated on-the-fly)
_DEEPSPEED_CONFIGS = {
    "2": {
        "train_batch_size": "auto",
        "train_micro_batch_size_per_gpu": "auto",
        "gradient_accumulation_steps": "auto",
        "zero_optimization": {
            "stage": 2,
            "offload_optimizer": {"device": "none"},
            "allgather_partitions": True,
            "allgather_bucket_size": 5e8,
            "reduce_scatter": True,
            "reduce_bucket_size": 5e8,
        },
    },
    "3": {
        "train_batch_size": "auto",
        "train_micro_batch_size_per_gpu": "auto",
        "gradient_accumulation_steps": "auto",
        "zero_optimization": {
            "stage": 3,
            "offload_optimizer": {"device": "none"},
            "offload_param": {"device": "none"},
            "allgather_partitions": True,
            "allgather_bucket_size": 5e8,
            "reduce_scatter": True,
            "reduce_bucket_size": 5e8,
            "contiguous_gradients": True,
        },
    },
}


class TrainingConfig(BaseModel):
    # Core settings
    stage: str = "sft"
    model_name_or_path: str = ""
    template: str = "default"
    finetuning_type: str = "lora"
    dataset: str = ""
    dataset_dir: str = "data"
    max_samples: Optional[int] = None
    learning_rate: float = 5e-5
    num_train_epochs: float = 3.0
    cutoff_len: int = 2048
    per_device_train_batch_size: int = 2
    gradient_accumulation_steps: int = 8
    max_grad_norm: float = 1.0
    warmup_steps: int = 0
    lr_scheduler_type: str = "cosine"
    logging_steps: int = 5
    save_steps: int = 100
    val_size: float = 0.0
    output_dir: str = ""
    bf16: bool = True
    fp16: bool = False
    pure_bf16: bool = False

    # Quantization
    quantization_bit: Optional[int] = None
    quantization_method: Optional[str] = "bnb"

    # Booster maps to flash_attn / use_unsloth / enable_liger_kernel
    booster: Optional[str] = "auto"

    # Model
    rope_scaling: Optional[str] = None
    resize_vocab: bool = False

    # LoRA
    lora_rank: int = 8
    lora_alpha: int = 16
    lora_dropout: float = 0.05
    lora_target: str = "all"
    loraplus_lr_ratio: Optional[float] = None
    use_rslora: bool = False
    use_dora: bool = False
    pissa_init: bool = False
    create_new_adapter: bool = False
    additional_target: Optional[str] = None

    # Freeze
    freeze_trainable_layers: int = 2
    freeze_trainable_modules: str = "all"

    # RLHF
    pref_beta: float = 0.1
    pref_loss: str = "sigmoid"
    pref_ftx: float = 0.0
    ppo_score_norm: bool = False
    ppo_whiten_rewards: bool = False

    # GaLore
    use_galore: bool = False
    galore_rank: int = 16
    galore_update_interval: int = 200
    galore_scale: float = 2.0
    galore_target: str = "all"

    # Apollo
    use_apollo: bool = False
    apollo_rank: int = 16
    apollo_scale: float = 32.0
    apollo_target: str = "all"
    apollo_update_interval: int = 200

    # BAdam
    use_badam: bool = False
    badam_mode: str = "layer"
    badam_switch_mode: str = "ascending"
    badam_switch_interval: int = 50
    badam_update_ratio: float = 0.05

    # Training extras
    neftune_alpha: Optional[float] = None
    packing: bool = False
    train_on_prompt: bool = False
    mask_history: bool = False
    report_to: Optional[str] = "none"
    project: Optional[str] = None

    # DeepSpeed
    ds_stage: Optional[str] = "none"
    ds_offload: bool = False

    # Misc
    batch_size: int = 2
    extra_args: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        result = self.model_dump(exclude_none=True)

        # Ensure output_dir
        if not result.get('output_dir'):
            result['output_dir'] = f"output/train_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

        # Always set do_train so LlamaFactory actually runs training
        result['do_train'] = True

        # Remove fields that are not LlamaFactory args
        for key in ['batch_size', 'extra_args', 'booster', 'ds_stage', 'ds_offload']:
            result.pop(key, None)

        # Map booster to actual LlamaFactory model args
        booster = self.booster
        if booster == 'flashattn2':
            result['flash_attn'] = 'fa2'
        elif booster == 'unsloth':
            result['use_unsloth'] = True
        elif booster == 'liger_kernel':
            result['enable_liger_kernel'] = True
        # 'auto' uses default flash attn, no extra flag needed

        # Map ds_stage to deepspeed config path or inline config
        if self.ds_stage and self.ds_stage != "none":
            ds_config = _DEEPSPEED_CONFIGS.get(self.ds_stage, _DEEPSPEED_CONFIGS.get("2"))
            if self.ds_offload:
                ds_config = _json.loads(_json.dumps(ds_config))  # deep copy
                ds_config["zero_optimization"]["offload_optimizer"] = {"device": "cpu", "pin_memory": True}
                if "offload_param" in ds_config["zero_optimization"]:
                    ds_config["zero_optimization"]["offload_param"] = {"device": "cpu", "pin_memory": True}
            result['deepspeed'] = ds_config

        # report_to: convert string to list (LlamaFactory expects a list)
        report_to = result.get('report_to')
        if isinstance(report_to, str):
            result['report_to'] = [report_to]

        # Merge extra_args if provided
        if self.extra_args:
            result.update(self.extra_args)

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
    cmd_parts = ["llamafactory-cli train <config.yaml>"]
    
    # Show a simplified preview (the actual training uses YAML config, not CLI flags)
    for key, value in cfg.items():
        if key in ('do_train', 'deepspeed'):
            continue  # skip internal/complex fields
        if value is not None and value != "":
            if isinstance(value, bool):
                if value:
                    cmd_parts.append(f"--{key}")
            elif isinstance(value, (dict, list)):
                import json as _json
                cmd_parts.append(f"--{key} '{_json.dumps(value)}'")
            else:
                cmd_parts.append(f"--{key} {value}")
    
    return {
        "command": " ".join(cmd_parts),
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
