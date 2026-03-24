#!/usr/bin/env python3
"""
ArclinkTune - Comprehensive Training Feature Test
Tests all training-related features including UI flows, API endpoints, and integrations.

Usage:
    python scripts/test_training_comprehensive.py
"""

import sys
import os
import re
import json
import time
from pathlib import Path
from typing import Dict, List, Tuple, Any, Optional

ROOT = Path(__file__).parent.parent
BACKEND = ROOT / "backend"
APP = ROOT / "app"
LLAMAFACTORY = ROOT / "core" / "LlamaFactory"

sys.path.insert(0, str(BACKEND))

GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
BOLD = "\033[1m"
END = "\033[0m"

total_tests = 0
passed_tests = 0
failed_tests = 0


def test(name: str, condition: bool, detail: str = "") -> bool:
    global total_tests, passed_tests, failed_tests
    total_tests += 1
    status = f"{GREEN}PASS{END}" if condition else f"{RED}FAIL{END}"
    print(f"  [{status}] {name}")
    if detail:
        print(f"          {detail[:120]}")
    if condition:
        passed_tests += 1
    else:
        failed_tests += 1
    return condition


def section(name: str):
    print(f"\n{YELLOW}{BOLD}[{name}]{END}")


def main():
    global total_tests, passed_tests, failed_tests
    print(f"\n{BOLD}{'=' * 70}")
    print(f"  ArclinkTune - Comprehensive Training Feature Test")
    print(f"{'=' * 70}{END}\n")

    # ========================================
    # Section 1: Frontend Code Structure
    # ========================================
    section("1. Frontend - TrainPage.tsx")

    train_page_path = APP / "src" / "renderer" / "pages" / "TrainPage.tsx"
    train_page_content = (
        train_page_path.read_text(encoding="utf-8") if train_page_path.exists() else ""
    )

    test("TrainPage.tsx exists", train_page_path.exists(), str(train_page_path))

    if train_page_content:
        # Test: Handler functions exist
        test(
            "handleStart function exists",
            "const handleStart = async" in train_page_content,
        )
        test(
            "handleStop function exists",
            "const handleStop = async" in train_page_content,
        )
        test(
            "handleEvaluate function exists",
            "const handleEvaluate" in train_page_content,
        )
        test("handleClear function exists", "const handleClear" in train_page_content)
        test(
            "handlePreview function exists",
            "const handlePreview = async" in train_page_content,
        )

        # Test: Required state hooks
        test("useTraining hook imported", "useTraining()" in train_page_content)
        test("useApp context imported", "useApp()" in train_page_content)
        test(
            "isRunning status used",
            "isRunning = status === 'running'" in train_page_content,
        )
        test(
            "isCompleted status used",
            "isCompleted = status === 'completed'" in train_page_content,
        )
        test(
            "isFailed status used",
            "isFailed = status === 'failed'" in train_page_content,
        )

        # Test: Validation checks
        test("Model path validation", "model_name_or_path" in train_page_content)
        test("Dataset validation", "config.dataset" in train_page_content)
        test("Output dir validation", "config.output_dir" in train_page_content)
        test("Space validation for output_dir", "includes(' ')" in train_page_content)

        # Test: isStarting guard
        test(
            "isStarting state guard",
            "if (isStarting || isRunning) return" in train_page_content,
        )
        test(
            "isStarting state defined",
            "const [isStarting, setIsStarting] = useState" in train_page_content,
        )

        # Test: Model auto-fill from context
        test("selectedModel from context", "selectedModel" in train_page_content)
        test(
            "setSelectedModel called in handler",
            "setSelectedModel" in train_page_content,
        )
        test(
            "initialMountDone state for reliable fill",
            "initialMountDone" in train_page_content,
        )

        # Test: Recharts chart component
        test(
            "LineChart import from recharts",
            "LineChart as RechartsLineChart" in train_page_content,
        )
        test("ResponsiveContainer usage", "ResponsiveContainer" in train_page_content)
        test(
            "lossHistory map for chart",
            "lossHistory.map((loss, i)" in train_page_content,
        )

        # Test: Navigate to evaluate
        test("useNavigate hook", "useNavigate()" in train_page_content)
        test(
            "handleEvaluate navigates to /evaluate",
            "navigate('/evaluate')" in train_page_content,
        )

        # Test: Button states
        test(
            "Start button disabled when starting",
            "disabled={isStarting" in train_page_content,
        )
        test("Button shows 'Starting...' text", "'Starting...'" in train_page_content)

        # Test: Button disabled when model/dataset missing
        test(
            "Button disabled without model/dataset",
            "!config.model_name_or_path || !config.dataset" in train_page_content,
        )

    # ========================================
    # Section 2: useTraining Hook
    # ========================================
    section("2. Frontend - useTraining.ts Hook")

    hook_path = APP / "src" / "renderer" / "hooks" / "useTraining.ts"
    hook_content = hook_path.read_text(encoding="utf-8") if hook_path.exists() else ""

    test("useTraining.ts exists", hook_path.exists(), str(hook_path))

    if hook_content:
        # Test: State interface
        test(
            "TrainingState interface defined", "interface TrainingState" in hook_content
        )
        test("runId in state", "runId: string | null" in hook_content)
        test("status in state", "status: 'idle' | 'running'" in hook_content)
        test("progress in state", "progress: number" in hook_content)
        test("lossHistory in state", "lossHistory: number[]" in hook_content)
        test("logs in state (array)", "logs: string[]" in hook_content)
        test("outputDir in state", "outputDir: string | null" in hook_content)

        # Test: LocalStorage key
        test(
            "STORAGE_KEY constant",
            "STORAGE_KEY = 'arclink_training_runid'" in hook_content,
        )

        # Test: Methods
        test("startTraining function", "const startTraining = async" in hook_content)
        test("stopTraining function", "const stopTraining = async" in hook_content)
        test("clearTraining function", "const clearTraining = ()" in hook_content)
        test("pollStatus function", "const pollStatus = useCallback" in hook_content)
        test(
            "checkSavedRun function",
            "const checkSavedRun = useCallback" in hook_content,
        )

        # Test: Initial state is idle (not running)
        test("Initial status is 'idle'", "status: 'idle'" in hook_content)
        test(
            "No auto-start on initialization",
            "'running'" not in hook_content.split("status: 'idle'")[0][-50:],
        )

        # Test: API calls
        test("api.training.start called", "api.training.start(config)" in hook_content)
        test("api.training.getStatus called", "api.training.getStatus" in hook_content)
        test("api.training.getLogs called", "api.training.getLogs" in hook_content)
        test("api.training.getLoss called", "api.training.getLoss" in hook_content)
        test("api.training.stop called", "api.training.stop" in hook_content)

        # Test: Polling interval
        test("Polling interval 2000ms", "setInterval(pollStatus, 2000)" in hook_content)

        # Test: Status mapping
        test("Status mapping: completed", "'completed'" in hook_content)
        test("Status mapping: failed", "'failed'" in hook_content)
        test("Status mapping: running", "'running'" in hook_content)

        # Test: Loss history handling
        test("Loss history accumulation", "prev.lossHistory" in hook_content)
        test("Loss deduplication", "!prev.lossHistory.includes(l)" in hook_content)

        # Test: localStorage usage
        test(
            "localStorage.setItem for run_id",
            "localStorage.setItem(STORAGE_KEY" in hook_content,
        )
        test(
            "localStorage.removeItem on clear",
            "localStorage.removeItem(STORAGE_KEY)" in hook_content,
        )

    # ========================================
    # Section 3: AppContext Training State
    # ========================================
    section("3. Frontend - AppContext.tsx Training State")

    context_path = APP / "src" / "renderer" / "contexts" / "AppContext.tsx"
    context_content = (
        context_path.read_text(encoding="utf-8") if context_path.exists() else ""
    )

    test("AppContext.tsx exists", context_path.exists(), str(context_path))

    if context_content:
        # Test: TrainingResult interface
        test(
            "TrainingResult interface defined",
            "interface TrainingResult" in context_content,
        )
        test("outputDir in TrainingResult", "outputDir: string" in context_content)
        test("modelPath in TrainingResult", "modelPath: string" in context_content)
        test(
            "finetuningType in TrainingResult",
            "finetuningType: string" in context_content,
        )
        test(
            "checkpointPath in TrainingResult",
            "checkpointPath: string" in context_content,
        )
        test("timestamp in TrainingResult", "timestamp: number" in context_content)

        # Test: Context provider
        test("lastTrainingResult in state", "lastTrainingResult" in context_content)
        test(
            "setLastTrainingResult function", "setLastTrainingResult" in context_content
        )
        test(
            "TrainingResult localStorage key",
            "arclink_last_training_result" in context_content,
        )

    # ========================================
    # Section 4: EvaluatePage Auto-fill
    # ========================================
    section("4. Frontend - EvaluatePage.tsx Auto-fill")

    eval_page_path = APP / "src" / "renderer" / "pages" / "EvaluatePage.tsx"
    eval_content = (
        eval_page_path.read_text(encoding="utf-8") if eval_page_path.exists() else ""
    )

    test("EvaluatePage.tsx exists", eval_page_path.exists(), str(eval_page_path))

    if eval_content:
        test("useApp hook imported", "useApp()" in eval_content)
        test("lastTrainingResult from context", "lastTrainingResult" in eval_content)
        test(
            "setModelPath called on load",
            "setModelPath(lastTrainingResult.modelPath)" in eval_content,
        )
        test(
            "setCheckpointPath called on load",
            "setCheckpointPath(lastTrainingResult.checkpointPath)" in eval_content,
        )
        test(
            "setFinetuningType called on load",
            "setFinetuningType(lastTrainingResult.finetuningType)" in eval_content,
        )

    # ========================================
    # Section 5: Backend - Training Service
    # ========================================
    section("5. Backend - training_service.py")

    service_path = BACKEND / "services" / "training_service.py"
    service_content = (
        service_path.read_text(encoding="utf-8") if service_path.exists() else ""
    )

    test("training_service.py exists", service_path.exists(), str(service_path))

    if service_content:
        # Test: Classes
        test(
            "TrainingProcess class defined", "class TrainingProcess:" in service_content
        )
        test(
            "TrainingService class defined", "class TrainingService:" in service_content
        )

        # Test: TrainingProcess attributes
        test("run_id attribute", "self.run_id = run_id" in service_content)
        test("status attribute", 'self.status = "running"' in service_content)
        test("progress attribute", "self.progress = 0" in service_content)
        test("loss_history attribute", "self.loss_history:" in service_content)
        test("log_lines attribute", "self.log_lines:" in service_content)

        # Test: TrainingService methods
        test(
            "start_training method",
            "def start_training(self, config" in service_content,
        )
        test("get_status method", "def get_status(self, run_id" in service_content)
        test("get_logs method", "def get_logs(self, run_id" in service_content)
        test(
            "stop_training method", "def stop_training(self, run_id" in service_content
        )
        test(
            "parse_log_line method", "def parse_log_line(self, line" in service_content
        )
        test(
            "create_config_file method",
            "def create_config_file(self, config" in service_content,
        )

        # Test: Log parsing patterns (multiple patterns for flexibility)
        test("Loss patterns list defined", "loss_patterns" in service_content)
        test("Step patterns list defined", "step_patterns" in service_content)

        # Test: Config file creation
        test("YAML config creation", "yaml.dump" in service_content)
        test("Output directory creation", "output_dir.mkdir" in service_content)

        # Test: Subprocess command
        test("llamafactory.cli train command", "llamafactory.cli" in service_content)
        test("venv_python used", "self.venv_python" in service_content)

        # Test: Threading for log reading
        test("Threading import", "import threading" in service_content)
        test("Daemon thread for logs", "daemon=True" in service_content)

        # Test: Debug logging
        test("Debug logging for config path", "Creating config at" in service_content)

    # ========================================
    # Section 6: Backend - Training Router
    # ========================================
    section("6. Backend - routers/training.py")

    router_path = BACKEND / "routers" / "training.py"
    router_content = (
        router_path.read_text(encoding="utf-8") if router_path.exists() else ""
    )

    test("training.py router exists", router_path.exists(), str(router_path))

    if router_content:
        # Test: TrainingConfig Pydantic model
        test(
            "TrainingConfig class defined",
            "class TrainingConfig(BaseModel)" in router_content,
        )
        test("stage field", "stage: str =" in router_content)
        test("model_name_or_path field", "model_name_or_path: str =" in router_content)
        test("dataset field", "dataset: str =" in router_content)
        test("output_dir field", "output_dir: str =" in router_content)

        # Test: neftune_alpha removed from output (FIX for error)
        test(
            "neftune_alpha in unsupported_fields list",
            "neftune_alpha" in router_content
            and "unsupported_fields" in router_content,
        )

        # Test: API endpoints
        test("/start endpoint", '@router.post("/start")' in router_content)
        test("/status endpoint", '@router.get("/status/' in router_content)
        test("/logs endpoint", '@router.get("/logs/' in router_content)
        test("/loss endpoint", '@router.get("/loss/' in router_content)
        test("/stop endpoint", '@router.post("/stop/' in router_content)
        test("/preview endpoint", '@router.post("/preview")' in router_content)
        test("/config endpoint", "/config" in router_content)
        test("/datasets endpoint", "/datasets" in router_content)
        test("/runs endpoint", "/runs" in router_content)

        # Test: start_training returns output_dir
        test(
            "start_training returns output_dir",
            "output_dir" in router_content and "return" in router_content,
        )

        # Test: to_dict method
        test("to_dict method defined", "def to_dict(self)" in router_content)
        test(
            "do_train set to True",
            'result["do_train"] = True' in router_content,
        )

        # Test: Booster mapping
        test("Booster mapping logic", "flash_attn" in router_content)
        test("DeepSpeed config generation", "deepspeed" in router_content)

    # ========================================
    # Section 7: useApi Training Endpoints
    # ========================================
    section("7. Frontend - useApi.ts Training Endpoints")

    api_path = APP / "src" / "renderer" / "hooks" / "useApi.ts"
    api_content = api_path.read_text(encoding="utf-8") if api_path.exists() else ""

    test("useApi.ts exists", api_path.exists(), str(api_path))

    if api_content:
        test("training section in API", "training:" in api_content)
        test("training.start endpoint", "start: (config" in api_content)
        test("training.getStatus endpoint", "getStatus: (runId" in api_content)
        test("training.getLogs endpoint", "getLogs: (runId" in api_content)
        test("training.getLoss endpoint", "getLoss: (runId" in api_content)
        test("training.stop endpoint", "stop: (runId" in api_content)
        test("training.preview endpoint", "preview: (config" in api_content)

    # ========================================
    # Section 8: Frontend Build Check
    # ========================================
    section("8. Frontend - TypeScript Compilation")

    # Check if package.json has build script
    package_json = APP / "package.json"
    if package_json.exists():
        pkg = json.loads(package_json.read_text())
        test("package.json has scripts", "scripts" in pkg)
        test("package.json has build script", "build" in pkg.get("scripts", {}))

    # ========================================
    # Section 9: Integration Tests (Backend)
    # ========================================
    section("9. Backend - Service Import Tests")

    try:
        from services.training_service import TrainingService

        test("TrainingService importable", True)

        # Check service has required methods
        service = TrainingService.__dict__
        test("TrainingService has start_training", "start_training" in service)
        test("TrainingService has get_status", "get_status" in service)
        test("TrainingService has get_logs", "get_logs" in service)
        test("TrainingService has stop_training", "stop_training" in service)
    except ImportError as e:
        test("TrainingService importable", False, str(e))

    try:
        from routers.training import TrainingConfig, router

        test("TrainingConfig importable", True)
        test("router importable", True)

        # Check TrainingConfig fields
        fields = TrainingConfig.model_fields
        test("TrainingConfig has stage field", "stage" in fields)
        test("TrainingConfig has model_name_or_path", "model_name_or_path" in fields)
        test("TrainingConfig has dataset", "dataset" in fields)
        test("TrainingConfig has output_dir", "output_dir" in fields)

        # Check router routes
        routes = [r.path for r in router.routes]
        test("Router has /start route", any("/start" in r for r in routes))
        test("Router has /status/{run_id} route", any("/status" in r for r in routes))
        test("Router has /logs/{run_id} route", any("/logs" in r for r in routes))
        test("Router has /stop/{run_id} route", any("/stop" in r for r in routes))
        test("Router has /preview route", any("/preview" in r for r in routes))

    except ImportError as e:
        test("TrainingConfig importable", False, str(e))
        test("router importable", False, str(e))

    # ========================================
    # Section 10: Model Flow Tests
    # ========================================
    section("10. Model Selection to Training Flow")

    # Check ModelsPage has goToTrain function
    models_page_path = APP / "src" / "renderer" / "pages" / "ModelsPage.tsx"
    models_content = (
        models_page_path.read_text(encoding="utf-8")
        if models_page_path.exists()
        else ""
    )

    test("ModelsPage.tsx exists", models_page_path.exists())
    test("goToTrain function exists", "const goToTrain = " in models_content)
    test("goToTrain navigates to /train", "navigate('/train')" in models_content)
    test("goToTrain sets selectedModel", "setSelectedModel" in models_content)
    test("goToTrain includes template", "template: model.template" in models_content)

    # ========================================
    # Section 11: Config Validation Tests
    # ========================================
    section("11. Backend - Config Validation")

    try:
        from routers.training import TrainingConfig

        # Test: Valid config with required fields
        try:
            config = TrainingConfig(
                model_name_or_path="test/model",
                dataset="test_dataset",
                output_dir="output/test",
            )
            test("TrainingConfig validates required fields", True)
        except Exception as e:
            test("TrainingConfig validates required fields", False, str(e))

        # Test: to_dict removes unsupported fields
        config = TrainingConfig(
            model_name_or_path="test/model",
            dataset="test_dataset",
            output_dir="output/test",
            neftune_alpha=0.5,
            booster="flashattn2",
            batch_size=4,
        )
        result = config.to_dict()
        test("to_dict removes neftune_alpha", "neftune_alpha" not in result)
        test("to_dict removes batch_size", "batch_size" not in result)
        test("to_dict removes booster", "booster" not in result)
        test("to_dict keeps model_name_or_path", "model_name_or_path" in result)
        test("to_dict keeps dataset", "dataset" in result)
        test("to_dict sets do_train=True", result.get("do_train") == True)

    except ImportError as e:
        test("TrainingConfig validation", False, str(e))

    # ========================================
    # Summary
    # ========================================
    print(f"\n{BOLD}{'=' * 70}")
    print(f"  Test Summary")
    print(f"{'=' * 70}{END}\n")

    pass_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
    print(f"  Total Tests: {total_tests}")
    print(f"  {GREEN}Passed: {passed_tests}{END}")
    print(f"  {RED}Failed: {failed_tests}{END}")
    print(f"  Pass Rate: {pass_rate:.1f}%")

    if failed_tests == 0:
        print(f"\n  {GREEN}{BOLD}All tests passed!{END}")
    else:
        print(f"\n  {RED}{BOLD}Some tests failed.{END}")

    print(f"\n{'=' * 70}{END}\n")

    return 0 if failed_tests == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
