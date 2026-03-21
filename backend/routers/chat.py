from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter()

class Message(BaseModel):
    role: str
    content: str

chat_state = {
    "loaded": False,
    "model": None,
}

@router.post("/load")
async def load_model(body: dict):
    model_path = body.get("model_path")
    finetuning_type = body.get("finetuning_type", "lora")
    
    chat_state["loaded"] = True
    chat_state["model"] = model_path
    
    return {"success": True, "model": model_path}

@router.post("/unload")
async def unload_model():
    chat_state["loaded"] = False
    chat_state["model"] = None
    return {"success": True}

@router.post("/chat")
async def chat(body: dict):
    messages = body.get("messages", [])
    max_tokens = body.get("max_tokens", 1024)
    temperature = body.get("temperature", 0.95)
    top_p = body.get("top_p", 0.7)
    
    if not chat_state["loaded"]:
        return {"error": "No model loaded"}
    
    user_message = messages[-1]["content"] if messages else ""
    
    response_content = f"This is a simulated response to: {user_message[:50]}... (Model: {chat_state['model']})"
    
    return {"content": response_content}

@router.get("/status")
async def get_chat_status():
    return chat_state
