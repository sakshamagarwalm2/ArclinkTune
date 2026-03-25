from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from pathlib import Path
import json
import httpx
import asyncio
import time

from models.autotune_models import AIProviderConfig, AppSettings

router = APIRouter()

SETTINGS_DIR = Path(__file__).parent.parent.parent / "config"
SETTINGS_FILE = SETTINGS_DIR / "app_settings.json"

GEMINI_MODELS = [
    {
        "id": "gemini-1.5-flash",
        "description": "Fast and cost-effective, good for structured tasks",
    },
    {"id": "gemini-1.5-pro", "description": "More capable reasoning, higher cost"},
    {
        "id": "gemini-2.0-flash",
        "description": "Latest fast model with improved capabilities",
    },
    {"id": "gemini-2.5-pro", "description": "Most capable, best reasoning quality"},
]


def _load_settings() -> Dict[str, Any]:
    if SETTINGS_FILE.exists():
        with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


def _save_settings(data: Dict[str, Any]):
    SETTINGS_DIR.mkdir(parents=True, exist_ok=True)
    with open(SETTINGS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


@router.get("")
async def get_settings():
    data = _load_settings()
    return data


@router.put("")
async def update_settings(update: Dict[str, Any]):
    current = _load_settings()
    current.update(update)
    _save_settings(current)
    return current


@router.get("/ai-provider")
async def get_ai_provider():
    data = _load_settings()
    return data.get("ai_provider", {"provider": "none"})


@router.put("/ai-provider")
async def update_ai_provider(config: AIProviderConfig):
    data = _load_settings()
    data["ai_provider"] = config.model_dump()
    _save_settings(data)
    return data["ai_provider"]


class GeminiTestRequest(BaseModel):
    api_key: str
    model: str = "gemini-1.5-flash"


@router.post("/test-gemini")
async def test_gemini(req: GeminiTestRequest):
    start = time.time()
    try:
        import google.generativeai as genai

        genai.configure(api_key=req.api_key)
        model = genai.GenerativeModel(req.model)

        response = await asyncio.to_thread(
            model.generate_content,
            "Respond with exactly: OK",
            generation_config=genai.GenerationConfig(
                temperature=0.1,
                max_output_tokens=10,
            ),
        )

        latency_ms = int((time.time() - start) * 1000)
        text = response.text.strip() if response.text else ""
        return {"success": True, "response": text, "latency_ms": latency_ms}
    except ImportError:
        return {
            "success": False,
            "error": "google-generativeai package not installed. Run: pip install google-generativeai",
        }
    except Exception as e:
        latency_ms = int((time.time() - start) * 1000)
        return {"success": False, "error": str(e), "latency_ms": latency_ms}


class OllamaTestRequest(BaseModel):
    base_url: str = "http://localhost:11434"
    model: str = "llama3.1:8b"


@router.post("/test-ollama")
async def test_ollama(req: OllamaTestRequest):
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            tags_resp = await client.get(f"{req.base_url}/api/tags")
            tags_resp.raise_for_status()
            models_data = tags_resp.json()
            available = [m["name"] for m in models_data.get("models", [])]
            model_ready = req.model in available

            return {
                "success": True,
                "models_available": available,
                "model_ready": model_ready,
            }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "models_available": [],
            "model_ready": False,
        }


@router.get("/ollama-models")
async def get_ollama_models(base_url: str = "http://localhost:11434"):
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(f"{base_url}/api/tags")
            resp.raise_for_status()
            data = resp.json()
            return {
                "models": [m["name"] for m in data.get("models", [])],
                "available": True,
            }
    except Exception:
        return {"models": [], "available": False}


@router.get("/gemini-models")
async def get_gemini_models():
    return {"models": GEMINI_MODELS}
