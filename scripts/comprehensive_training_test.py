"""
ArclinkTune - Comprehensive Training Test Suite
Tests all training options by running actual training and verifying outputs
"""

import os
import sys
import json
import time
import subprocess
import yaml
from pathlib import Path
from datetime import datetime

# Configuration
ROOT = Path(r"C:\Users\Astrallink\Desktop\AstralLink\ArclinkTune")
VENV_PYTHON = ROOT / "core" / ".venv" / "Scripts" / "python.exe"
LLAMA_DIR = ROOT / "core" / "LlamaFactory"
DATA_DIR = ROOT / "data"
MODEL_PATH = r"C:\Users\Astrallink\models\arclink\Qwen_Qwen2.5-0.5B-Instruct"
OUTPUT_BASE = ROOT / "output" / "comprehensive_test"
MAX_STEPS = 2
TIMEOUT_SEC = 180
EPOCHS = 0.01

# ANSI colors
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
BLUE = "\033[94m"
RESET = "\033[0m"


def log(msg, color=""):
    print(f"{color}{msg}{RESET}")


def run_training(test_name, config, output_dir):
    """Run training with given config and return result"""
    output_dir.mkdir(parents=True, exist_ok=True)
    config_path = output_dir / "train_config.yaml"

    # Write config
    with open(config_path, "w", encoding="utf-8") as f:
        yaml.dump(config, f, default_flow_style=False, allow_unicode=True)

    log(f"  Config: {config_path.name}")

    # Prepare environment
    env = os.environ.copy()
    env["PYTHONPATH"] = str(LLAMA_DIR / "src")
    env["PYTHONIOENCODING"] = "utf-8"

    log(f"  Starting training...")

    # Run training
    try:
        result = subprocess.run(
            [str(VENV_PYTHON), "-m", "llamafactory.cli", "train", str(config_path)],
            cwd=str(LLAMA_DIR),
            env=env,
            capture_output=True,
            timeout=TIMEOUT_SEC,
        )

        # Decode with errors='replace' to handle special characters
        stdout = (
            result.stdout.decode("utf-8", errors="replace") if result.stdout else ""
        )
        stderr = (
            result.stderr.decode("utf-8", errors="replace") if result.stderr else ""
        )

        # Write logs
        log_path = output_dir / "training_log.txt"
        with open(log_path, "w", encoding="utf-8") as f:
            f.write(stdout)
            f.write("\n--- STDERR ---\n")
            f.write(stderr)

        # Analyze results
        has_loss = "loss" in stdout.lower() or "'loss'" in stdout
        has_step = "step" in stdout.lower() or "Step" in stdout
        has_error = "error" in stderr.lower() or "exception" in stderr.lower()

        result_data = {
            "test_name": test_name,
            "exit_code": result.returncode,
            "has_loss": has_loss,
            "has_step": has_step,
            "has_error": has_error,
            "stdout_sample": stdout[:500] if stdout else "",
            "stderr_sample": stderr[:500] if stderr else "",
        }

        with open(output_dir / "result.json", "w") as f:
            json.dump(result_data, f, indent=2)

        if result.returncode == 0 and has_loss:
            return "PASS", result_data
        elif result.returncode == 0:
            return "WARNING", result_data
        else:
            return "FAIL", result_data

    except subprocess.TimeoutExpired:
        log(f"  TIMEOUT after {TIMEOUT_SEC}s", YELLOW)
        return "TIMEOUT", {}
    except Exception as e:
        log(f"  ERROR: {e}", RED)
        return "ERROR", {"error": str(e)}


def check_environment():
    """Check if all prerequisites are available"""
    log("=" * 60, BLUE)
    log("ENVIRONMENT CHECK", BLUE)
    log("=" * 60, BLUE)
    log("")

    checks = []

    # Python
    try:
        result = subprocess.run(
            [str(VENV_PYTHON), "--version"], capture_output=True, text=True
        )
        log(f"  Python: {result.stdout.strip()}")
        checks.append(("Python", True))
    except Exception as e:
        log(f"  Python: FAIL - {e}", RED)
        checks.append(("Python", False))

    # PyTorch & CUDA
    try:
        result = subprocess.run(
            [
                str(VENV_PYTHON),
                "-c",
                "import torch; print(f'PyTorch: {torch.__version__}'); print(f'CUDA: {torch.cuda.is_available()}')",
            ],
            capture_output=True,
            text=True,
        )
        for line in result.stdout.strip().split("\n"):
            log(f"  {line}")
        checks.append(("PyTorch/CUDA", True))
    except Exception as e:
        log(f"  PyTorch/CUDA: FAIL - {e}", RED)
        checks.append(("PyTorch/CUDA", False))

    # Model
    if Path(MODEL_PATH).exists():
        log(f"  Model: OK ({MODEL_PATH})", GREEN)
        checks.append(("Model", True))
    else:
        log(f"  Model: MISSING", RED)
        checks.append(("Model", False))

    # Dataset
    if (DATA_DIR / "alpaca_sample.json").exists():
        log(f"  Dataset: OK", GREEN)
        checks.append(("Dataset", True))
    else:
        log(f"  Dataset: MISSING", RED)
        checks.append(("Dataset", False))

    # dataset_info.json
    if (DATA_DIR / "dataset_info.json").exists():
        log(f"  dataset_info.json: OK", GREEN)
        checks.append(("dataset_info.json", True))
    else:
        log(f"  dataset_info.json: MISSING", RED)
        checks.append(("dataset_info.json", False))

    log("")
    all_passed = all(c[1] for c in checks)
    if all_passed:
        log("Environment check: PASSED", GREEN)
        return True
    else:
        log("Environment check: FAILED", RED)
        return False


def get_base_config():
    """Get base training config"""
    return {
        "stage": "sft",
        "model_name_or_path": MODEL_PATH,
        "template": "qwen",
        "finetuning_type": "lora",
        "dataset": "alpaca_sample",
        "dataset_dir": str(DATA_DIR),
        "output_dir": str(OUTPUT_BASE / "test"),
        "num_train_epochs": EPOCHS,
        "per_device_train_batch_size": 1,
        "gradient_accumulation_steps": 4,
        "learning_rate": 5e-5,
        "cutoff_len": 256,
        "max_grad_norm": 1.0,
        "warmup_ratio": 0.1,
        "logging_steps": 1,
        "save_steps": 1000,
        "bf16": True,
        "fp16": False,
    }


def main():
    log("=" * 60, BLUE)
    log("ArclinkTune - Comprehensive Training Test Suite", BLUE)
    log("=" * 60, BLUE)
    log("")

    # Check environment first
    if not check_environment():
        log("\nEnvironment check failed. Please fix the issues above.", RED)
        return

    log("")
    log("Starting training tests...", GREEN)
    log(f"Output directory: {OUTPUT_BASE}")
    log(f"Max steps per test: {MAX_STEPS}")
    log(f"Timeout per test: {TIMEOUT_SEC}s")
    log("")

    # Create output directory
    OUTPUT_BASE.mkdir(parents=True, exist_ok=True)

    # Define all tests
    tests = [
        {
            "name": "01_Basic_LoRA",
            "config": {
                **get_base_config(),
                "finetuning_type": "lora",
                "lora_rank": 8,
                "lora_alpha": 16,
            },
        },
        {
            "name": "02_Full_Parameter",
            "config": {
                **get_base_config(),
                "finetuning_type": "full",
            },
        },
        {
            "name": "03_Freeze_Training",
            "config": {
                **get_base_config(),
                "finetuning_type": "freeze",
                "freeze_trainable_layers": 2,
            },
        },
        {
            "name": "04_LoRA_4bit_Quant",
            "config": {
                **get_base_config(),
                "finetuning_type": "lora",
                "lora_rank": 8,
                "quantization_bit": 4,
            },
        },
        {
            "name": "05_Flash_Attention",
            "config": {
                **get_base_config(),
                "finetuning_type": "lora",
                "flash_attn": "fa2",
            },
        },
        {
            "name": "06_R_SLoRA",
            "config": {
                **get_base_config(),
                "finetuning_type": "lora",
                "use_rslora": True,
            },
        },
        {
            "name": "07_DoRA",
            "config": {
                **get_base_config(),
                "finetuning_type": "lora",
                "use_dora": True,
            },
        },
        {
            "name": "08_GaLore",
            "config": {
                **get_base_config(),
                "finetuning_type": "lora",
                "use_galore": True,
                "galore_rank": 16,
            },
        },
        {
            "name": "09_FP16_Mode",
            "config": {
                **get_base_config(),
                "finetuning_type": "lora",
                "bf16": False,
                "fp16": True,
            },
        },
        {
            "name": "10_Higher_LR",
            "config": {
                **get_base_config(),
                "finetuning_type": "lora",
                "learning_rate": 1e-4,
            },
        },
        {
            "name": "11_Larger_Batch",
            "config": {
                **get_base_config(),
                "finetuning_type": "lora",
                "per_device_train_batch_size": 2,
                "gradient_accumulation_steps": 2,
            },
        },
        {
            "name": "12_Longer_Context",
            "config": {
                **get_base_config(),
                "finetuning_type": "lora",
                "cutoff_len": 512,
            },
        },
    ]

    # Run all tests
    results = []
    for i, test in enumerate(tests, 1):
        log(f"\n{'=' * 60}", BLUE)
        log(f"TEST {i}/{len(tests)}: {test['name']}", BLUE)
        log(f"{'=' * 60}", BLUE)

        test_dir = OUTPUT_BASE / test["name"]

        status, data = run_training(test["name"], test["config"], test_dir)

        if status == "PASS":
            log(f"  Result: PASS", GREEN)
            results.append((test["name"], "PASS", data))
        elif status == "WARNING":
            log(f"  Result: WARNING (completed but no loss detected)", YELLOW)
            results.append((test["name"], "WARNING", data))
        elif status == "TIMEOUT":
            log(f"  Result: TIMEOUT", YELLOW)
            results.append((test["name"], "TIMEOUT", data))
        else:
            log(f"  Result: FAIL", RED)
            results.append((test["name"], "FAIL", data))

        # Small delay between tests
        time.sleep(1)

    # Summary
    log(f"\n{'=' * 60}", BLUE)
    log("TEST SUMMARY", BLUE)
    log(f"{'=' * 60}", BLUE)
    log("")

    passed = sum(1 for r in results if r[1] == "PASS")
    warning = sum(1 for r in results if r[1] == "WARNING")
    failed = sum(1 for r in results if r[1] == "FAIL")
    timeout = sum(1 for r in results if r[1] == "TIMEOUT")

    log(f"Total Tests: {len(results)}")
    log(f"  {GREEN}Passed: {passed}{RESET}")
    log(f"  {YELLOW}Warnings: {warning}{RESET}")
    log(f"  {RED}Failed: {failed}{RESET}")
    log(f"  {YELLOW}Timeouts: {timeout}{RESET}")
    log("")

    # List failed tests
    failed_tests = [r for r in results if r[1] in ("FAIL", "TIMEOUT")]
    if failed_tests:
        log("Failed/Timeout tests:", RED)
        for name, status, data in failed_tests:
            log(f"  - {name}: {status}")
            if data.get("stderr_sample"):
                log(f"    Error: {data['stderr_sample'][:200]}...")

    log("")
    log(f"Results saved to: {OUTPUT_BASE}", BLUE)
    log("")


if __name__ == "__main__":
    main()
