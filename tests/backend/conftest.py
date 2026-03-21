import pytest
from fastapi.testclient import TestClient
import sys
from pathlib import Path

project_root = Path(__file__).parent.parent.parent
backend_dir = project_root / "backend"
sys.path.insert(0, str(backend_dir))
sys.path.insert(0, str(project_root / "core" / "llamafactory" / "src"))

from main import app

@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def sample_training_config():
    return {
        "stage": "sft",
        "model_name_or_path": "meta-llama/Llama-3.1-8B-Instruct",
        "template": "llama3",
        "finetuning_type": "lora",
        "dataset": "alpaca",
        "dataset_dir": "data",
        "learning_rate": 5e-5,
        "num_train_epochs": 3.0,
        "cutoff_len": 2048,
        "per_device_train_batch_size": 2,
        "gradient_accumulation_steps": 8,
        "lr_scheduler_type": "cosine",
        "max_grad_norm": 1.0,
        "logging_steps": 5,
        "save_steps": 100,
        "warmup_steps": 0,
        "output_dir": "output/test_run",
        "bf16": True,
        "fp16": False,
        "pure_bf16": False,
        "lora_rank": 8,
        "lora_alpha": 16,
        "lora_dropout": 0.05,
        "lora_target": "all",
    }


@pytest.fixture
def sample_chat_message():
    return {
        "messages": [
            {"role": "user", "content": "Hello, how are you?"}
        ],
        "max_tokens": 1024,
        "temperature": 0.95,
        "top_p": 0.7
    }


@pytest.fixture
def sample_model_download_request():
    return {
        "model_name": "meta-llama/Llama-3.1-8B-Instruct",
        "hub": "huggingface"
    }