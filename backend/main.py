import sys
import os
from pathlib import Path

backend_dir = Path(__file__).parent
project_root = backend_dir.parent
sys.path.insert(0, str(backend_dir))
sys.path.insert(0, str(project_root / "core" / "LlamaFactory" / "src"))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import models, training, chat, system
from config import get_settings

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    description="Backend API for ArclinkTune - Desktop LLM Fine-tuning Application",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(models.router, prefix="/api/models", tags=["Models"])
app.include_router(training.router, prefix="/api/training", tags=["Training"])
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])
app.include_router(system.router, prefix="/api/system", tags=["System"])

@app.get("/")
async def root():
    return {"message": "ArclinkTune API", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=settings.api_host, port=settings.api_port)
