from fastapi import APIRouter
from typing import List, Optional
from pydantic import BaseModel

router = APIRouter()

class Model(BaseModel):
    name: str
    path: str
    template: Optional[str] = None
    downloaded: bool = False
    size: Optional[str] = None

class LocalModel(BaseModel):
    name: str
    path: str
    size: str

@router.get("/", response_model=List[Model])
async def list_models():
    return [
        Model(name="Llama-3.1-8B-Instruct", path="meta-llama/Llama-3.1-8B-Instruct", downloaded=False),
        Model(name="Qwen2.5-7B-Instruct", path="Qwen/Qwen2.5-7B-Instruct", downloaded=False),
        Model(name="DeepSeek-R1-7B-Distill", path="deepseek-ai/DeepSeek-R1-Distill-Qwen-7B", downloaded=False),
        Model(name="Gemma-3-4B-Instruct", path="google/gemma-3-4b-it", downloaded=False),
    ]

@router.get("/supported")
async def get_supported_models():
    return [
        "Llama-3.1-8B-Instruct",
        "Qwen2.5-7B-Instruct",
        "DeepSeek-R1-7B-Distill",
        "Gemma-3-4B-Instruct",
        "Qwen2.5-Coder-7B-Instruct",
        "Mistral-7B-Instruct",
    ]

@router.get("/local", response_model=List[LocalModel])
async def get_local_models():
    return []

@router.get("/templates")
async def get_templates():
    return [
        "default", "llama3", "qwen", "chatglm3", "mixtral", "llama2_zh"
    ]

@router.post("/download")
async def download_model(body: dict):
    model_name = body.get("model_name")
    hub = body.get("hub", "huggingface")
    return {"task_id": f"download_{model_name}_{hub}"}

@router.get("/download/{task_id}")
async def get_download_status(task_id: str):
    return {
        "status": "downloading",
        "progress": 45,
        "speed": "2.5 MB/s",
        "eta": "5m 30s"
    }

@router.delete("/download/{task_id}")
async def cancel_download(task_id: str):
    return {"success": True}
