from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
import json as _json
from pathlib import Path

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
        if not result.get("output_dir"):
            result["output_dir"] = (
                f"output/eval_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            )
        if "predict" in result:
            result["do_predict"] = result.pop("predict")
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
    # Build a training-compatible config for evaluation
    eval_cfg: Dict[str, Any] = {
        "model_name_or_path": config.model_name_or_path,
        "template": config.template,
        "finetuning_type": config.finetuning_type,
        "dataset": config.dataset,
        "dataset_dir": config.dataset_dir,
        "cutoff_len": config.cutoff_len,
        "max_samples": config.max_samples,
        "do_eval": True,
        "per_device_eval_batch_size": config.batch_size,
        "report_to": ["none"],
    }
    if config.checkpoint_dir:
        eval_cfg["adapter_name_or_path"] = config.checkpoint_dir
    if config.predict:
        eval_cfg["do_predict"] = True
        eval_cfg["predict_with_generate"] = True
        eval_cfg["max_new_tokens"] = config.max_new_tokens
        eval_cfg["temperature"] = config.temperature
        eval_cfg["top_p"] = config.top_p
    if config.output_dir:
        eval_cfg["output_dir"] = config.output_dir

    return {
        "command": "llamafactory-cli train <eval_config.yaml>  # with do_eval=True",
        "config": eval_cfg,
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


@router.get("/results/{output_dir:path}")
async def get_evaluation_results(output_dir: str):
    """Read evaluation results from output directory."""
    output_path = settings.core_path / output_dir
    results = {"found": False, "metrics": {}}

    for filename in [
        "all_results.json",
        "eval_results.json",
        "predict_results.json",
        "train_results.json",
    ]:
        file_path = output_path / filename
        if file_path.exists():
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    data = _json.load(f)
                    results[filename.replace(".json", "")] = data
                    results["found"] = True
                    # Merge metrics
                    for k, v in data.items():
                        if isinstance(v, (int, float)):
                            results["metrics"][k] = v
            except:
                continue

    # Also read trainer_log.jsonl for eval loss history
    log_path = output_path / "trainer_log.jsonl"
    if log_path.exists():
        eval_history = []
        try:
            with open(log_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line:
                        try:
                            entry = _json.loads(line)
                            if "eval_loss" in entry or "eval_accuracy" in entry:
                                eval_history.append(entry)
                        except:
                            continue
        except:
            pass
        results["eval_history"] = eval_history

    return results


@router.get("/outputs")
async def list_training_outputs():
    """List all training output directories."""
    output_base = settings.core_path / "output"
    if not output_base.exists():
        return {"outputs": []}

    outputs = []
    for item in output_base.iterdir():
        if item.is_dir():
            has_checkpoint = (
                any("checkpoint" in f.name for f in item.iterdir())
                if item.exists()
                else False
            )
            outputs.append(
                {
                    "name": item.name,
                    "path": str(item.relative_to(settings.core_path)),
                    "has_checkpoints": has_checkpoint,
                }
            )

    outputs.sort(key=lambda x: x["name"], reverse=True)
    return {"outputs": outputs}
