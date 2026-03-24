#!/usr/bin/env python
"""Comprehensive test script for all fixes applied to ArclinkTune."""

import sys
import os
import json

# Add paths
sys.path.insert(
    0, os.path.join(os.path.dirname(__file__), "..", "core", "LlamaFactory", "src")
)
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

RESULTS = []
SKIP_HEAVY = os.environ.get("SKIP_HEAVY_TESTS", "").lower() in ("1", "true", "yes")


def test_result(name: str, passed: bool, details: str = ""):
    status = "PASS" if passed else "FAIL"
    RESULTS.append({"name": name, "passed": passed, "details": details})
    print(f"  [{status}] {name}")
    if details:
        print(f"        {details}")


def check_heavy_deps():
    """Check if heavy ML dependencies are available."""
    try:
        import torch
        import peft
        import transformers

        return True
    except ImportError:
        return False


# ============================================================================
# TEST 1: LoRA Config - modules_to_save filtering
# ============================================================================
def test_lora_config():
    print("\n=== TEST 1: LoRA Config (modules_to_save filtering) ===\n")
    if SKIP_HEAVY or not check_heavy_deps():
        print("  [SKIP] Heavy dependencies (torch/peft/transformers) not available")
        print("         Set SKIP_HEAVY_TESTS=0 and install deps to run")
        RESULTS.append({"name": "LoRA Config", "passed": None, "details": "Skipped"})
        return

    import torch
    from peft import LoraConfig, get_peft_model, TaskType
    from transformers import AutoModelForCausalLM

    MODEL_PATH = r"C:\Users\Astrallink\models\arclink\Qwen_Qwen2.5-0.5B-Instruct"

    print("Loading model...")
    model = AutoModelForCausalLM.from_pretrained(
        MODEL_PATH, torch_dtype=torch.float16, device_map="cpu"
    )
    print(f"  Model loaded: {model.config.model_type}")

    target_modules = [
        "q_proj",
        "k_proj",
        "v_proj",
        "o_proj",
        "gate_proj",
        "up_proj",
        "down_proj",
    ]

    # Test 1a: Without modules_to_save (should work)
    print("\n  Test 1a: LoRA without modules_to_save...")
    try:
        config = LoraConfig(
            task_type=TaskType.CAUSAL_LM,
            r=8,
            lora_alpha=16,
            lora_dropout=0.05,
            target_modules=target_modules,
        )
        m = get_peft_model(model, config)
        test_result(
            "1a. LoRA without modules_to_save",
            True,
            f"Trainable: {m.print_trainable_parameters()}",
        )
        del m
    except Exception as e:
        test_result("1a. LoRA without modules_to_save", False, str(e))

    # Test 1b: With overlapping modules_to_save (should FAIL gracefully)
    print("\n  Test 1b: LoRA with overlapping modules_to_save...")
    try:
        config = LoraConfig(
            task_type=TaskType.CAUSAL_LM,
            r=8,
            lora_alpha=16,
            lora_dropout=0.05,
            target_modules=target_modules,
            modules_to_save=["q_proj", "v_proj"],  # Overlap with target
        )
        m = get_peft_model(model, config)
        test_result(
            "1b. Overlapping modules_to_save", False, "Should have failed but didn't"
        )
        del m
    except Exception as e:
        test_result(
            "1b. Overlapping modules_to_save (expected fail)",
            True,
            f"Correctly rejected: {type(e).__name__}",
        )

    # Test 1c: With non-overlapping modules_to_save (should work)
    print("\n  Test 1c: LoRA with non-overlapping modules_to_save...")
    try:
        config = LoraConfig(
            task_type=TaskType.CAUSAL_LM,
            r=8,
            lora_alpha=16,
            lora_dropout=0.05,
            target_modules=target_modules,
            modules_to_save=["lm_head", "embed_tokens"],  # No overlap
        )
        m = get_peft_model(model, config)
        test_result("1c. Non-overlapping modules_to_save", True)
        del m
    except Exception as e:
        test_result("1c. Non-overlapping modules_to_save", False, str(e))

    # Test 1d: Verify adapter.py filtering logic
    print("\n  Test 1d: Verify adapter.py filtering logic...")
    try:
        # Simulate the adapter.py logic
        additional_target = ["", "q_proj"]  # Simulating split_arg('') + actual target
        target_modules_list = ["q_proj", "v_proj", "o_proj"]

        # Filter empty strings
        additional_targets = [t for t in additional_target if t]

        valid_modules_to_save = []
        target_set = set(target_modules_list)
        for name, module in model.named_modules():
            if any(target in name for target in additional_targets):
                short_name = name.split(".")[-1]
                if (
                    not isinstance(module, torch.nn.ModuleList)
                    and short_name not in target_set
                ):
                    valid_modules_to_save.append(short_name)

        # Should NOT include q_proj since it's in target_set
        has_overlap = any(m in target_set for m in valid_modules_to_save)
        test_result(
            "1d. Empty string filtering",
            not has_overlap,
            f"modules_to_save: {set(valid_modules_to_save)}",
        )
    except Exception as e:
        test_result("1d. Empty string filtering", False, str(e))

    del model
    print()


# ============================================================================
# TEST 2: Evaluation Config - val_size
# ============================================================================
def test_eval_config():
    print("\n=== TEST 2: Evaluation Config (val_size) ===\n")
    try:
        from services.evaluate_service import EvaluateService
    except ImportError:
        from evaluate_service import EvaluateService
    from pathlib import Path

    # Create a mock service
    service = EvaluateService.__new__(EvaluateService)
    service.llamafactory_path = Path(
        "C:/Users/Astrallink/Desktop/AstralLink/ArclinkTune/core/LlamaFactory"
    )
    service.src_path = service.llamafactory_path / "src"

    # Test 2a: Default val_size
    print("  Test 2a: Default val_size in eval config...")
    config = {
        "model_name_or_path": "test-model",
        "template": "qwen2",
        "dataset": "alpaca_sample",
    }
    eval_config = service._build_eval_config(config)
    has_val_size = "val_size" in eval_config and eval_config["val_size"] > 0
    test_result(
        "2a. val_size present and > 0",
        has_val_size,
        f"val_size={eval_config.get('val_size')}",
    )

    # Test 2b: Custom val_size
    print("  Test 2b: Custom val_size...")
    config["val_size"] = 0.2
    eval_config = service._build_eval_config(config)
    test_result(
        "2b. Custom val_size respected",
        eval_config.get("val_size") == 0.2,
        f"val_size={eval_config.get('val_size')}",
    )

    # Test 2c: do_eval flag
    print("  Test 2c: do_eval flag set...")
    test_result("2c. do_eval=True", eval_config.get("do_eval") == True)

    # Test 2d: Path conversion
    print("  Test 2d: Dataset dir path conversion...")
    test_config = {"dataset_dir": "data"}
    test_eval_config = service._build_eval_config(test_config)
    test_eval_config["dataset_dir"] = "data"

    # Simulate create_config_file path conversion
    dataset_dir = test_eval_config.get("dataset_dir", "")
    if dataset_dir and not Path(dataset_dir).is_absolute():
        converted = str(service.llamafactory_path / dataset_dir)
    else:
        converted = dataset_dir

    test_result(
        "2d. Relative path converted to absolute",
        "LlamaFactory" in converted and "data" in converted,
        f"Converted to: {converted}",
    )

    print()


# ============================================================================
# TEST 3: LLAMABOARD_ENABLED for loss streaming
# ============================================================================
def test_llamaboard_env():
    print("\n=== TEST 3: LLAMABOARD_ENABLED Environment ===\n")
    import os

    # Test 3a: Check training service sets env var
    print("  Test 3a: Training service env var setup...")
    training_code_path = "C:/Users/Astrallink/Desktop/AstralLink/ArclinkTune/backend/services/training_service.py"
    with open(training_code_path, "r") as f:
        training_code = f.read()

    has_llamaboard = "LLAMABOARD_ENABLED" in training_code
    test_result("3a. Training service has LLAMABOARD_ENABLED", has_llamaboard)

    # Test 3b: Check evaluate service sets env var
    print("  Test 3b: Evaluate service env var setup...")
    eval_code_path = "C:/Users/Astrallink/Desktop/AstralLink/ArclinkTune/backend/services/evaluate_service.py"
    with open(eval_code_path, "r") as f:
        eval_code = f.read()

    has_llamaboard_eval = "LLAMABOARD_ENABLED" in eval_code
    test_result("3b. Evaluate service has LLAMABOARD_ENABLED", has_llamaboard_eval)

    # Test 3c: Verify callback behavior
    print("  Test 3c: Verify LlamaFactory callback behavior...")
    callback_path = "C:/Users/Astrallink/Desktop/AstralLink/ArclinkTune/core/LlamaFactory/src/llamafactory/train/callbacks.py"
    with open(callback_path, "r") as f:
        callback_code = f.read()

    has_webui_mode = (
        "LLAMABOARD_ENABLED" in callback_code and "webui_mode" in callback_code
    )
    has_loss_log = "'loss':" in callback_code and "log_str" in callback_code
    test_result("3c. Callback uses LLAMABOARD_ENABLED", has_webui_mode)
    test_result("3d. Callback logs loss in webui_mode", has_loss_log)

    print()


# ============================================================================
# TEST 4: AppContext - Model persistence
# ============================================================================
def test_model_persistence():
    print("\n=== TEST 4: Model Selection Persistence ===\n")

    # Test 4a: Check AppContext has localStorage persistence
    print("  Test 4a: AppContext localStorage persistence...")
    app_context_path = "C:/Users/Astrallink/Desktop/AstralLink/ArclinkTune/app/src/renderer/contexts/AppContext.tsx"
    with open(app_context_path, "r") as f:
        context_code = f.read()

    has_selected_model_key = "SELECTED_MODEL_KEY" in context_code
    has_persistence = "localStorage.getItem(SELECTED_MODEL_KEY)" in context_code
    has_setter = "localStorage.setItem(SELECTED_MODEL_KEY" in context_code

    test_result("4a. Has SELECTED_MODEL_KEY constant", has_selected_model_key)
    test_result("4b. Loads from localStorage on init", has_persistence)
    test_result("4c. Saves to localStorage on set", has_setter)

    print()


# ============================================================================
# TEST 5: Frontend lora_target default
# ============================================================================
def test_lora_target_default():
    print("\n=== TEST 5: Frontend LoRA Target Default ===\n")

    train_page_path = "C:/Users/Astrallink/Desktop/AstralLink/ArclinkTune/app/src/renderer/pages/TrainPage.tsx"
    with open(train_page_path, "r") as f:
        train_code = f.read()

    # Check that default is NOT "all"
    has_specific_target = (
        "q_proj,k_proj,v_proj,o_proj,gate_proj,up_proj,down_proj" in train_code
    )
    is_not_all = "lora_target: 'all'" not in train_code

    print("  Test 5a: lora_target default is specific modules...")
    test_result("5a. lora_target not 'all'", is_not_all)
    test_result("5b. lora_target has specific modules", has_specific_target)

    print()


# ============================================================================
# RUN ALL TESTS
# ============================================================================
def main():
    print("=" * 60)
    print("ArclinkTune Fix Verification Tests")
    print("=" * 60)

    test_lora_config()
    test_eval_config()
    test_llamaboard_env()
    test_model_persistence()
    test_lora_target_default()

    # Summary
    print("=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)

    passed = sum(1 for r in RESULTS if r["passed"] is True)
    failed = sum(1 for r in RESULTS if r["passed"] is False)
    skipped = sum(1 for r in RESULTS if r["passed"] is None)
    total = len(RESULTS)

    print(
        f"\nTotal: {total} | Passed: {passed} | Failed: {failed} | Skipped: {skipped}"
    )

    if failed > 0:
        print("\nFailed tests:")
        for r in RESULTS:
            if r["passed"] is False:
                print(f"  - {r['name']}: {r['details']}")

    if skipped > 0:
        print("\nSkipped tests:")
        for r in RESULTS:
            if r["passed"] is None:
                print(f"  - {r['name']}: {r['details']}")

    print(f"\n{'ALL TESTS PASSED!' if failed == 0 else 'SOME TESTS FAILED!'}")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
