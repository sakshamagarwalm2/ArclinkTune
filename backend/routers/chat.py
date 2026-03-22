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
    
    result = chat_service.start_api(model_path, template, finetuning_type)
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
    
    status = chat_service.get_status()
    if not status["loaded"]:
        return {"error": "No model loaded"}
    
    # Forward the simplified messages to the Chat API
    response = chat_service.chat(
        messages=messages,
        max_tokens=max_tokens,
        temperature=temperature,
        top_p=top_p
    )
    
    return response

@router.get("/status")
async def get_chat_status():
    return chat_service.get_status()
