import os
import sys
import platform
from pathlib import Path
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    app_name: str = "ArclinkTune API"
    debug: bool = False
    
    core_path: Path = Path(__file__).parent.parent / "core" / "LlamaFactory"
    venv_path: Path = Path(__file__).parent.parent / "core" / ".venv"
    models_dir: Path = Path.home() / "models"
    data_dir: Path = Path(__file__).parent.parent / "data"
    
    api_host: str = "127.0.0.1"
    api_port: int = 8000
    
    def get_venv_python(self) -> str:
        if platform.system() == "Windows":
            return str(self.venv_path / "Scripts" / "python.exe")
        else:
            return str(self.venv_path / "bin" / "python")
    
    def get_venv_pip(self) -> str:
        if platform.system() == "Windows":
            return str(self.venv_path / "Scripts" / "pip.exe")
        else:
            return str(self.venv_path / "bin" / "pip")
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
