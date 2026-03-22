#!/usr/bin/env python3
"""
ArclinkTune - Quick Integration Test
Run this from the backend directory using the venv Python:
    D:\\Recks\\ArclinkTune\\core\\.venv\\Scripts\\python.exe ..\\scripts\\test_quick.py
"""

import sys
import os
from pathlib import Path

# Setup paths
ROOT = Path(__file__).parent.parent
BACKEND = ROOT / "backend"
LLAMAFACTORY = ROOT / "core" / "LlamaFactory"
VENV_PYTHON = ROOT / "core" / ".venv" / ("Scripts" if os.name == "nt" else "bin") / "python.exe"

sys.path.insert(0, str(BACKEND))
sys.path.insert(0, str(LLAMAFACTORY / "src"))
os.environ["DISABLE_VERSION_CHECK"] = "1"
os.environ["PYTHONPATH"] = str(LLAMAFACTORY / "src")

GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
END = "\033[0m"

def test(name, condition, detail=""):
    status = f"{GREEN}PASS{END}" if condition else f"{RED}FAIL{END}"
    print(f"  [{status}] {name}")
    if detail:
        print(f"        {detail[:80]}{'...' if len(detail) > 80 else ''}")
    return condition

def main():
    print("\n" + "=" * 50)
    print("  ArclinkTune - Quick Integration Test")
    print("=" * 50 + "\n")
    
    all_passed = True
    
    # Test 1: Paths
    print(f"{YELLOW}[1] File Paths{END}")
    all_passed &= test("Root directory", ROOT.exists())
    all_passed &= test("Backend directory", BACKEND.exists())
    all_passed &= test("LlamaFactory directory", LLAMAFACTORY.exists())
    all_passed &= test("Venv Python", VENV_PYTHON.exists())
    
    # Test 2: LlamaFactory modules
    print(f"\n{YELLOW}[2] LlamaFactory Modules{END}")
    try:
        from llamafactory.cli import main
        all_passed &= test("llamafactory.cli", True)
    except Exception as e:
        all_passed &= test("llamafactory.cli", False, str(e))
    
    try:
        from llamafactory.launcher import launch
        all_passed &= test("llamafactory.launcher", True)
    except Exception as e:
        all_passed &= test("llamafactory.launcher", False, str(e))
    
    try:
        from llamafactory.api.app import create_app, run_api
        all_passed &= test("llamafactory.api (API module)", True)
    except Exception as e:
        all_passed &= test("llamafactory.api (API module)", False, str(e))
    
    try:
        from llamafactory.chat import ChatModel
        all_passed &= test("llamafactory.chat (ChatModel)", True)
    except Exception as e:
        all_passed &= test("llamafactory.chat (ChatModel)", False, str(e))
    
    try:
        from llamafactory.train.tuner import export_model
        all_passed &= test("llamafactory.train (export_model)", True)
    except Exception as e:
        all_passed &= test("llamafactory.train (export_model)", False, str(e))
    
    # Test 3: Backend config
    print(f"\n{YELLOW}[3] Backend Configuration{END}")
    try:
        from config import get_settings
        settings = get_settings()
        all_passed &= test("Config loaded", True)
        all_passed &= test("Core path exists", settings.core_path.exists(), str(settings.core_path))
        all_passed &= test("Venv Python exists", Path(settings.get_venv_python()).exists())
        all_passed &= test("Data dir exists", settings.data_dir.exists(), str(settings.data_dir))
    except Exception as e:
        all_passed &= test("Config loading", False, str(e))
    
    # Test 4: Backend services
    print(f"\n{YELLOW}[4] Backend Services{END}")
    try:
        from services.chat_service import get_chat_service
        cs = get_chat_service()
        all_passed &= test("ChatService", True)
        status = cs.get_status()
        print(f"        Status: {status}")
    except Exception as e:
        all_passed &= test("ChatService", False, str(e))
    
    try:
        from services.training_service import TrainingService
        from config import get_settings
        settings = get_settings()
        ts = TrainingService(settings.core_path, settings.get_venv_python())
        all_passed &= test("TrainingService", True)
    except Exception as e:
        all_passed &= test("TrainingService", False, str(e))
    
    try:
        from services.evaluate_service import get_evaluate_service
        es = get_evaluate_service()
        all_passed &= test("EvaluateService", True)
    except Exception as e:
        all_passed &= test("EvaluateService", False, str(e))
    
    try:
        from services.export_service import get_export_service
        xs = get_export_service()
        all_passed &= test("ExportService", True)
    except Exception as e:
        all_passed &= test("ExportService", False, str(e))
    
    # Summary
    print("\n" + "=" * 50)
    if all_passed:
        print(f"  {GREEN}All tests passed!{END}")
    else:
        print(f"  {RED}Some tests failed{END}")
    print("=" * 50 + "\n")
    
    return 0 if all_passed else 1

if __name__ == "__main__":
    sys.exit(main())
