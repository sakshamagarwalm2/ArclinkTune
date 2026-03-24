#!/usr/bin/env python
"""Quick test script for ArclinkTune fixes - no model loading required."""

import sys
import os
from pathlib import Path

RESULTS = []


def test(name, passed, details=""):
    status = "PASS" if passed else "FAIL"
    RESULTS.append((name, passed, details))
    print(f"  [{status}] {name}")
    if details:
        print(f"        -> {details}")


print("=" * 60)
print("ArclinkTune Fix Verification (Quick Tests)")
print("=" * 60)

# TEST 1: Check adapter.py has filtering logic
print("\n--- TEST 1: adapter.py filtering logic ---")
adapter_path = "C:/Users/Astrallink/Desktop/AstralLink/ArclinkTune/core/LlamaFactory/src/llamafactory/model/adapter.py"
with open(adapter_path, "r") as f:
    adapter_code = f.read()

test(
    "1a. Has empty string filtering",
    "for t in finetuning_args.additional_target if t" in adapter_code
    or "additional_targets" in adapter_code
    and "if t" in adapter_code,
    "Filters empty strings from additional_target",
)

test(
    "1b. Has target_modules exclusion",
    "short_name not in target_set" in adapter_code or "target_set" in adapter_code,
    "Excludes modules that are in target_modules from modules_to_save",
)

# TEST 2: Check evaluate_service.py has val_size
print("\n--- TEST 2: evaluate_service.py val_size ---")
eval_path = "C:/Users/Astrallink/Desktop/AstralLink/ArclinkTune/backend/services/evaluate_service.py"
with open(eval_path, "r") as f:
    eval_code = f.read()

test(
    "2a. val_size in eval config",
    "val_size" in eval_code and "do_eval" in eval_code,
    "Sets val_size for evaluation",
)

test(
    "2b. Has absolute path conversion for dataset_dir",
    "dataset_dir" in eval_code and "is_absolute" in eval_code,
    "Converts relative paths to absolute",
)

# TEST 3: Check training_service.py has LLAMABOARD_ENABLED
print("\n--- TEST 3: LLAMABOARD_ENABLED env var ---")
train_path = "C:/Users/Astrallink/Desktop/AstralLink/ArclinkTune/backend/services/training_service.py"
with open(train_path, "r") as f:
    train_code = f.read()

test(
    "3a. Training service has LLAMABOARD_ENABLED",
    "LLAMABOARD_ENABLED" in train_code,
    "Enables webui_mode for loss logging",
)

test(
    "3b. Training service has LLAMABOARD_WORKDIR",
    "LLAMABOARD_WORKDIR" in train_code,
    "Required when LLAMABOARD_ENABLED=1",
)

test(
    "3c. Evaluate service has LLAMABOARD_ENABLED",
    "LLAMABOARD_ENABLED" in eval_code,
    "Enables webui_mode for eval logging",
)

test(
    "3d. Evaluate service has LLAMABOARD_WORKDIR",
    "LLAMABOARD_WORKDIR" in eval_code,
    "Required when LLAMABOARD_ENABLED=1",
)

# TEST 4: Check LlamaFactory callback uses LLAMABOARD_ENABLED
print("\n--- TEST 4: LlamaFactory callback ---")
callback_path = "C:/Users/Astrallink/Desktop/AstralLink/ArclinkTune/core/LlamaFactory/src/llamafactory/train/callbacks.py"
with open(callback_path, "r") as f:
    callback_code = f.read()

test(
    "4a. Callback checks LLAMABOARD_ENABLED",
    "LLAMABOARD_ENABLED" in callback_code and "webui_mode" in callback_code,
    "Callback uses webui_mode flag",
)

test(
    "4b. Callback logs loss when webui_mode",
    "'loss':" in callback_code and "log_str" in callback_code,
    "Loss is logged in format: 'loss': 1.2345",
)

# TEST 5: Check frontend lora_target default
print("\n--- TEST 5: Frontend lora_target default ---")
train_page_path = "C:/Users/Astrallink/Desktop/AstralLink/ArclinkTune/app/src/renderer/pages/TrainPage.tsx"
with open(train_page_path, "r") as f:
    train_page_code = f.read()

test(
    "5a. lora_target not 'all'",
    "lora_target: 'all'" not in train_page_code,
    "Default changed from 'all' to specific modules",
)

test(
    "5b. Has specific target modules",
    "q_proj" in train_page_code and "k_proj" in train_page_code,
    "Uses specific module names",
)

# TEST 6: Check AppContext model persistence
print("\n--- TEST 6: Model selection persistence ---")
context_path = "C:/Users/Astrallink/Desktop/AstralLink/ArclinkTune/app/src/renderer/contexts/AppContext.tsx"
with open(context_path, "r") as f:
    context_code = f.read()

test(
    "6a. Has SELECTED_MODEL_KEY",
    "SELECTED_MODEL_KEY" in context_code,
    "Has localStorage key constant",
)

test(
    "6b. Saves model to localStorage",
    "localStorage.setItem(SELECTED_MODEL_KEY" in context_code,
    "Saves selected model",
)

test(
    "6c. Loads model from localStorage",
    "localStorage.getItem(SELECTED_MODEL_KEY" in context_code,
    "Loads selected model on init",
)

# TEST 7: Check dataset files exist in LlamaFactory/data
print("\n--- TEST 7: Dataset files in LlamaFactory/data ---")
llamafactory_data = Path(
    "C:/Users/Astrallink/Desktop/AstralLink/ArclinkTune/core/LlamaFactory/data"
)

test(
    "7a. dataset_info.json exists",
    (llamafactory_data / "dataset_info.json").exists(),
    "Dataset config file exists",
)

test(
    "7b. alpaca_sample.json exists",
    (llamafactory_data / "alpaca_sample.json").exists(),
    "Sample dataset file exists",
)

test(
    "7c. sharegpt_sample.json exists",
    (llamafactory_data / "sharegpt_sample.json").exists(),
    "ShareGPT sample dataset exists",
)

# TEST 8: Check TrainingResult includes dataset fields
print("\n--- TEST 8: TrainingResult includes dataset fields ---")
with open("app/src/renderer/contexts/AppContext.tsx", "r") as f:
    app_context_code = f.read()

test(
    "8a. TrainingResult has dataset field",
    "dataset:" in app_context_code and "datasetDir:" in app_context_code,
    "TrainingResult includes dataset and datasetDir",
)

test(
    "8b. TrainingResult has template field",
    "template:" in app_context_code and "string" in app_context_code,
    "TrainingResult includes template",
)

# TEST 9: Check EvaluatePage loads dataset from training result
print("\n--- TEST 9: EvaluatePage loads dataset from training result ---")
with open("app/src/renderer/pages/EvaluatePage.tsx", "r", encoding="utf-8") as f:
    eval_page_code = f.read()

test(
    "9a. EvaluatePage sets dataset from training result",
    "lastTrainingResult.dataset" in eval_page_code,
    "EvaluatePage loads dataset from training result",
)

test(
    "9b. EvaluatePage has dataset dropdown",
    'SelectItem value="alpaca_sample"' in eval_page_code,
    "EvaluatePage has dataset selection dropdown",
)

# TEST 10: Check evaluate_service validates dataset
print("\n--- TEST 10: Evaluate service validates dataset ---")
with open("backend/services/evaluate_service.py", "r") as f:
    eval_service_code = f.read()

test(
    "10a. Evaluate service validates dataset",
    "Dataset is required" in eval_service_code,
    "Evaluate service validates dataset is not empty",
)

# TEST 11: Check checkpoint path fix
print("\n--- TEST 11: Checkpoint path uses output_dir ---")
with open("app/src/renderer/pages/TrainPage.tsx", "r", encoding="utf-8") as f:
    train_page_code = f.read()

# The checkpoint path should use config.output_dir directly, not checkpoint-*
has_wildcard = "checkpoint-*" in train_page_code
has_direct_path = "const checkpointPath = config.output_dir" in train_page_code
test(
    "11a. Checkpoint path uses output_dir directly",
    has_direct_path and not has_wildcard,
    "Checkpoint path does not use wildcard pattern",
)

# Summary
print("\n" + "=" * 60)
print("TEST SUMMARY")
print("=" * 60)

passed = sum(1 for _, p, _ in RESULTS if p)
failed = sum(1 for _, p, _ in RESULTS if not p)
total = len(RESULTS)

print(f"\nTotal: {total} | Passed: {passed} | Failed: {failed}\n")

if failed > 0:
    print("Failed tests:")
    for name, p, details in RESULTS:
        if not p:
            print(f"  - {name}")
    print()

status = "ALL TESTS PASSED!" if failed == 0 else f"{failed} TEST(S) FAILED!"
print(status)
print("=" * 60)

sys.exit(0 if failed == 0 else 1)
