from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter()

class Message(BaseModel):
    role: str
    content: str

from services.chat_service import get_chat_service

chat_service = get_chat_service()

@router.post("/load")
async def load_model(body: dict):
    model_path = str(body.get("model_path", ""))
    template = str(body.get("template", "default"))
    finetuning_type = str(body.get("finetuning_type", "lora"))
    checkpoint_path = body.get("checkpoint_path")
    infer_backend = str(body.get("infer_backend", "huggingface"))
    infer_dtype = str(body.get("infer_dtype", "auto"))
    system_prompt = body.get("system_prompt")
    enable_thinking = body.get("enable_thinking")
    
    result = chat_service.start_api(
        model_path, template, finetuning_type,
        checkpoint_path=checkpoint_path,
        infer_backend=infer_backend,
        infer_dtype=infer_dtype,
        system_prompt=system_prompt,
        enable_thinking=enable_thinking,
    )
    return result

@router.post("/unload")
async def unload_model():
    chat_service.stop_api()
    return {"success": True}

@router.post("/chat")
async def chat(body: dict):
    messages = body.get("messages", [])
    max_tokens = body.get("max_tokens", 1024)
    temperature = body.get("temperature", 0.95)
    top_p = body.get("top_p", 0.7)
    repetition_penalty = body.get("repetition_penalty", 1.0)
    
    status = chat_service.get_status()
    if not status["loaded"]:
        return {"error": "No model loaded"}
    
    response = chat_service.chat(
        messages=messages,
        max_tokens=max_tokens,
        temperature=temperature,
        top_p=top_p,
        repetition_penalty=repetition_penalty,
    )
    
    return response

@router.get("/status")
async def get_chat_status():
    return chat_service.get_status()
