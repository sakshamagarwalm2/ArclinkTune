import os
from pathlib import Path
from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    app_name: str = "ArclinkTune API"
    debug: bool = False
    
    core_path: Path = Path(__file__).parent.parent / "core" / "LlamaFactory"
    models_dir: Path = Path.home() / "models"
    data_dir: Path = Path(__file__).parent.parent / "core" / "LlamaFactory" / "data"
    
    api_host: str = "127.0.0.1"
    api_port: int = 8000
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

@lru_cache()
def get_settings() -> Settings:
    return Settings()
