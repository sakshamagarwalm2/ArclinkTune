#!/usr/bin/env python3
"""
ArclinkTune - Dataset Browser Test
Tests the complete dataset browsing, analysis, and configuration workflow.
Also verifies LlamaFactory can load the configured datasets.

Usage:
    python scripts/test_dataset_browser.py
"""

import sys
import os
import json
import tempfile
import shutil
from pathlib import Path

ROOT = Path(__file__).parent.parent
BACKEND = ROOT / "backend"
LLAMAFACTORY = ROOT / "core" / "LlamaFactory"

sys.path.insert(0, str(BACKEND))
sys.path.insert(0, str(LLAMAFACTORY / "src"))
os.environ["DISABLE_VERSION_CHECK"] = "1"
os.environ["PYTHONPATH"] = str(LLAMAFACTORY / "src")

GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
BOLD = "\033[1m"
END = "\033[0m"

passed = 0
failed = 0


def test(name, condition, detail=""):
    global passed, failed
    if condition:
        passed += 1
        status = f"{GREEN}PASS{END}"
    else:
        failed += 1
        status = f"{RED}FAIL{END}"
    print(f"  [{status}] {name}")
    if detail:
        print(f"          {str(detail)[:120]}")
    return condition


def section(name):
    print(f"\n{YELLOW}{name}{END}")


# ============================================================
# Create test data
# ============================================================
def create_test_data(tmp_dir):
    """Create test dataset files in various formats."""
    data_dir = Path(tmp_dir)
    data_dir.mkdir(parents=True, exist_ok=True)

    # Alpaca format JSON
    alpaca_data = [
        {"instruction": "What is Python?", "input": "", "output": "Python is a programming language."},
        {"instruction": "Explain ML", "input": "in simple terms", "output": "ML is teaching computers to learn."},
        {"instruction": "Define AI", "input": "", "output": "AI is simulated intelligence."},
    ]
    with open(data_dir / "alpaca_train.json", "w", encoding="utf-8") as f:
        json.dump(alpaca_data, f, indent=2)

    # ShareGpt format JSONL
    sharegpt_data = [
        {"conversations": [{"from": "human", "value": "Hi"}, {"from": "gpt", "value": "Hello!"}]},
        {"conversations": [{"from": "human", "value": "How are you?"}, {"from": "gpt", "value": "I'm fine!"}]},
    ]
    with open(data_dir / "sharegpt_train.jsonl", "w", encoding="utf-8") as f:
        for item in sharegpt_data:
            f.write(json.dumps(item) + "\n")

    # CSV format
    with open(data_dir / "csv_data.csv", "w", encoding="utf-8") as f:
        f.write("instruction,input,output\n")
        f.write('"What is ML?","","Machine learning is..."')
        f.write("\n")

    # OpenAI messages format
    openai_data = [
        {"messages": [{"role": "user", "content": "Hello"}, {"role": "assistant", "content": "Hi there!"}]},
    ]
    with open(data_dir / "openai_chat.json", "w", encoding="utf-8") as f:
        json.dump(openai_data, f)

    # Plain text
    with open(data_dir / "raw_text.txt", "w", encoding="utf-8") as f:
        f.write("This is line one.\nThis is line two.\n")

    # Unsupported file
    with open(data_dir / "readme.md", "w", encoding="utf-8") as f:
        f.write("# This is markdown\n")

    return data_dir


# ============================================================
# Tests
# ============================================================
def test_format_detection():
    section("[1] Format Detection (Analyze Logic)")

    from routers.datasets import _read_samples, _detect_format, _get_column_samples, SUPPORTED_EXTENSIONS

    tmp = tempfile.mkdtemp()
    try:
        data_dir = create_test_data(tmp)

        # Test Alpaca detection
        samples = _read_samples(data_dir / "alpaca_train.json")
        fmt, cols, tags = _detect_format(samples)
        test("Alpaca JSON detected as 'alpaca'", fmt == "alpaca", f"Got: {fmt}")
        test("Alpaca columns mapped", cols.get("prompt") == "instruction" and cols.get("response") == "output",
             f"Got: {cols}")
        test("Alpaca input column", cols.get("query") == "input", f"Got: {cols}")

        # Test ShareGpt detection
        samples = _read_samples(data_dir / "sharegpt_train.jsonl")
        fmt, cols, tags = _detect_format(samples)
        test("ShareGpt JSONL detected as 'sharegpt'", fmt == "sharegpt", f"Got: {fmt}")
        test("ShareGpt messages column", cols.get("messages") == "conversations", f"Got: {cols}")
        test("ShareGpt role_tag", tags.get("role_tag") == "from", f"Got: {tags}")
        test("ShareGpt content_tag", tags.get("content_tag") == "value", f"Got: {tags}")
        test("ShareGpt user_tag", tags.get("user_tag") in ("human", "user"), f"Got: {tags}")
        test("ShareGpt assistant_tag", tags.get("assistant_tag") in ("gpt", "assistant"), f"Got: {tags}")

        # Test CSV detection
        samples = _read_samples(data_dir / "csv_data.csv")
        fmt, cols, tags = _detect_format(samples)
        test("CSV with instruction/output detected", fmt == "alpaca", f"Got: {fmt}")
        test("CSV columns mapped", cols.get("prompt") == "instruction", f"Got: {cols}")

        # Test OpenAI messages format
        samples = _read_samples(data_dir / "openai_chat.json")
        fmt, cols, tags = _detect_format(samples)
        test("OpenAI messages format detected", fmt == "sharegpt", f"Got: {fmt}")
        test("OpenAI role/content tags", tags.get("role_tag") == "role", f"Got: {tags}")

        # Test plain text
        samples = _read_samples(data_dir / "raw_text.txt")
        fmt, cols, tags = _detect_format(samples)
        test("Plain text has samples", len(samples) == 2)
        test("Plain text has text column", samples[0].get("text") is not None)

        # Test unsupported extension
        from routers.datasets import SUPPORTED_EXTENSIONS as exts
        test("Supported extensions include json", ".json" in exts)
        test("Supported extensions include jsonl", ".jsonl" in exts)
        test("Supported extensions include csv", ".csv" in exts)
        test("Supported extensions include parquet", ".parquet" in exts)
        test("Supported extensions include txt", ".txt" in exts)
        test("Unsupported .md not in extensions", ".md" not in exts)

    finally:
        shutil.rmtree(tmp)


def test_sample_counting():
    section("[2] Sample Counting")

    from routers.datasets import _read_samples

    tmp = tempfile.mkdtemp()
    try:
        data_dir = create_test_data(tmp)

        samples = _read_samples(data_dir / "alpaca_train.json")
        test("Alpaca JSON sample count", len(samples) == 3, f"Got: {len(samples)}")

        samples = _read_samples(data_dir / "sharegpt_train.jsonl")
        test("ShareGpt JSONL sample count", len(samples) == 2, f"Got: {len(samples)}")

    finally:
        shutil.rmtree(tmp)


def test_dataset_info_management():
    section("[3] Dataset Info Management")

    from routers.datasets import _load_dataset_info, _save_dataset_info

    tmp = tempfile.mkdtemp()
    try:
        # Monkey-patch _get_data_dir
        import routers.datasets as ds_module
        original_get_data_dir = ds_module._get_data_dir
        ds_module._get_data_dir = lambda: Path(tmp)

        # Test loading empty
        info = _load_dataset_info()
        test("Empty dataset_info loads", info == {})

        # Test saving
        test_info = {
            "my_dataset": {
                "file_name": "train.json",
                "formatting": "alpaca",
                "columns": {"prompt": "instruction", "response": "output"},
            }
        }
        _save_dataset_info(test_info)

        # Test loading saved
        loaded = _load_dataset_info()
        test("Saved dataset_info loads correctly", loaded == test_info)
        test("Dataset entry preserved", loaded["my_dataset"]["formatting"] == "alpaca")

        # Test file exists
        config_path = Path(tmp) / "dataset_info.json"
        test("dataset_info.json created", config_path.exists())

        # Restore
        ds_module._get_data_dir = original_get_data_dir

    finally:
        shutil.rmtree(tmp)


def test_column_samples():
    section("[4] Column Sample Extraction")

    from routers.datasets import _get_column_samples

    samples = [
        {"instruction": "What is Python?", "input": "", "output": "Python is a language."},
        {"instruction": "Explain ML", "input": "simple", "output": "ML is learning."},
    ]
    columns = {"prompt": "instruction", "query": "input", "response": "output"}

    result = _get_column_samples(samples, columns)
    test("Column samples extracted", len(result) == 3)
    test("First column is prompt", "prompt" in result[0].name)
    test("First column has sample", len(result[0].sample_values) > 0)
    test("First sample value correct", result[0].sample_values[0] == "What is Python?")


def test_lamafactory_integration():
    section("[5] LlamaFactory Dataset Loading Integration")

    tmp = tempfile.mkdtemp()
    try:
        data_dir = create_test_data(tmp)

        # Create dataset_info.json
        info = {
            "test_alpaca": {
                "file_name": "alpaca_train.json",
                "formatting": "alpaca",
                "columns": {"prompt": "instruction", "query": "input", "response": "output"},
            },
            "test_sharegpt": {
                "file_name": "sharegpt_train.jsonl",
                "formatting": "sharegpt",
                "columns": {"messages": "conversations"},
                "tags": {"role_tag": "from", "content_tag": "value", "user_tag": "human", "assistant_tag": "gpt"},
            },
        }
        with open(data_dir / "dataset_info.json", "w") as f:
            json.dump(info, f)

        # Test LlamaFactory can parse the dataset config
        from llamafactory.data.parser import get_dataset_list, DatasetAttr

        datasets = get_dataset_list(["test_alpaca"], str(data_dir))
        test("LlamaFactory parses alpaca config", len(datasets) == 1)
        if datasets:
            test("Dataset name correct", datasets[0].dataset_name == "alpaca_train.json")
            test("Dataset format correct", datasets[0].formatting == "alpaca")
            test("Dataset load_from correct", datasets[0].load_from == "file")
            test("Prompt column mapped", datasets[0].prompt == "instruction")
            test("Response column mapped", datasets[0].response == "output")

        datasets = get_dataset_list(["test_sharegpt"], str(data_dir))
        test("LlamaFactory parses sharegpt config", len(datasets) == 1)
        if datasets:
            test("ShareGpt messages column", datasets[0].messages == "conversations")
            test("ShareGpt role_tag", datasets[0].role_tag == "from")

    except Exception as e:
        test("LlamaFactory integration", False, str(e))
    finally:
        shutil.rmtree(tmp)


def test_training_config_with_dataset():
    section("[6] Training Config with Dataset")

    from routers.training import TrainingConfig

    config = TrainingConfig(
        model_name_or_path="test",
        dataset="test_alpaca",
        dataset_dir="data",
        stage="sft",
    )
    result = config.to_dict()

    test("Dataset name in config", result.get("dataset") == "test_alpaca")
    test("Dataset dir in config", result.get("dataset_dir") == "data")

    # Verify the config would work with LlamaFactory
    try:
        from llamafactory.hparams import get_train_args
        test_cfg = dict(result)
        test_cfg['do_train'] = True
        model_args, data_args, training_args, finetuning_args, gen_args = get_train_args(test_cfg)
        test("LlamaFactory accepts dataset config",
             data_args.dataset == ["test_alpaca"] or data_args.dataset == "test_alpaca")
        test("LlamaFactory accepts dataset_dir", data_args.dataset_dir == "data")
    except Exception as e:
        test("LlamaFactory accepts dataset config", False, str(e)[:100])


def test_backend_api_endpoints():
    section("[7] Backend API Endpoints Exist")

    from routers import datasets

    routes = {r.path: list(r.methods) for r in datasets.router.routes if hasattr(r, 'methods')}

    test("POST /browse exists", any("/browse" in p for p in routes))
    test("POST /analyze exists", any("/analyze" in p for p in routes))
    test("POST /configure exists", any("/configure" in p for p in routes))
    test("GET /info exists", any("/info" in p and "{" not in p for p in routes))
    test("DELETE /info/{name} exists", any("/info/" in p and "{" in p for p in routes))
    test("GET /supported-formats exists", any("/supported-formats" in p for p in routes))


def test_end_to_end():
    section("[8] End-to-End: Browse -> Analyze -> Configure -> Train")

    tmp = tempfile.mkdtemp()
    try:
        data_dir = create_test_data(tmp)

        # Monkey-patch
        import routers.datasets as ds_module
        original_get_data_dir = ds_module._get_data_dir
        ds_module._get_data_dir = lambda: data_dir

        from routers.datasets import (
            BrowseRequest, AnalyzeRequest, ConfigureRequest,
            browse_files, analyze_dataset, configure_dataset, get_dataset_info
        )
        import asyncio

        loop = asyncio.new_event_loop()

        # Step 1: Browse
        browse_resp = loop.run_until_complete(browse_files(BrowseRequest(path=None)))
        test("Browse returns entries", len(browse_resp.entries) > 0)
        test("Browse shows data_dir", bool(browse_resp.data_dir))
        supported_files = [e for e in browse_resp.entries if e.is_supported and not e.is_directory]
        test("Browse shows supported files", len(supported_files) > 0, f"Found: {len(supported_files)}")

        # Step 2: Analyze alpaca file
        analyze_resp = loop.run_until_complete(analyze_dataset(AnalyzeRequest(file_path="alpaca_train.json")))
        test("Analyze detects format", analyze_resp.format == "alpaca")
        test("Analyze counts samples", analyze_resp.sample_count == 3)
        test("Analyze maps columns", "prompt" in analyze_resp.columns or "instruction" in analyze_resp.columns)
        test("Analyze provides preview", len(analyze_resp.preview) > 0)
        test("Analyze suggests name", bool(analyze_resp.suggested_name))

        # Step 3: Configure
        config_resp = loop.run_until_complete(configure_dataset(ConfigureRequest(
            file_path="alpaca_train.json",
            dataset_name="test_e2e_dataset",
            formatting="alpaca",
            columns={"prompt": "instruction", "query": "input", "response": "output"},
        )))
        test("Configure succeeds", config_resp.success)
        test("Configure returns name", config_resp.dataset_name == "test_e2e_dataset")

        # Step 4: Verify dataset_info.json
        info_resp = loop.run_until_complete(get_dataset_info())
        test("Info lists configured dataset", any(d.name == "test_e2e_dataset" for d in info_resp.datasets))
        ds_entry = next((d for d in info_resp.datasets if d.name == "test_e2e_dataset"), None)
        if ds_entry:
            test("Info has correct file_name", ds_entry.file_name == "alpaca_train.json")
            test("Info has correct format", ds_entry.formatting == "alpaca")

        # Step 5: LlamaFactory can load it
        from llamafactory.data.parser import get_dataset_list
        lf_datasets = get_dataset_list(["test_e2e_dataset"], str(data_dir))
        test("LlamaFactory loads configured dataset", len(lf_datasets) == 1)

        # Step 6: Training config references it
        from routers.training import TrainingConfig
        tc = TrainingConfig(dataset="test_e2e_dataset", dataset_dir=str(data_dir))
        tc_dict = tc.to_dict()
        test("Training config has dataset", tc_dict.get("dataset") == "test_e2e_dataset")

        loop.close()
        ds_module._get_data_dir = original_get_data_dir

    except Exception as e:
        test("End-to-end workflow", False, str(e))
    finally:
        shutil.rmtree(tmp)


# ============================================================
# Main
# ============================================================
def main():
    global passed, failed

    print(f"\n{BOLD}{'='*70}")
    print(f"  ArclinkTune - Dataset Browser Test")
    print(f"{'='*70}{END}")

    test_format_detection()
    test_sample_counting()
    test_dataset_info_management()
    test_column_samples()
    test_lamafactory_integration()
    test_training_config_with_dataset()
    test_backend_api_endpoints()
    test_end_to_end()

    print(f"\n{BOLD}{'='*70}")
    print(f"  Results: {GREEN}{passed} passed{END}, {RED}{failed} failed{END}")
    print(f"{'='*70}{END}\n")

    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
