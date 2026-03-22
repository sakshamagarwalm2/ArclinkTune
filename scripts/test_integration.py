#!/usr/bin/env python3
"""
ArclinkTune - Quick Integration Test
Run with: python -c "$(Get-Content test_quick.py -Raw)" from backend folder
Or: python scripts/test_integration.py from project root
"""

import sys
import os
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
END = "\033[0m"

def test(name, condition, detail=""):
    status = f"{GREEN}PASS{END}" if condition else f"{RED}FAIL{END}"
    print(f"  [{status}] {name}")
    if detail:
        print(f"        {detail[:80]}{'...' if len(str(detail)) > 80 else ''}")
    return condition

def main():
    print("\n" + "=" * 50)
    print("  ArclinkTune - Integration Test")
    print("=" * 50 + "\n")
    
    all_passed = True
    
    # Test 1: Paths
    print(f"{YELLOW}[1] File Paths{END}")
    all_passed &= test("Root", ROOT.exists())
    all_passed &= test("Backend", BACKEND.exists())
    all_passed &= test("LlamaFactory", LLAMAFACTORY.exists())
    
    # Test 2: LlamaFactory Modules
    print(f"\n{YELLOW}[2] LlamaFactory Modules{END}")
    modules = [
        ("llamafactory.cli", "from llamafactory.cli import main"),
        ("llamafactory.api", "from llamafactory.api.app import create_app, run_api"),
        ("llamafactory.chat", "from llamafactory.chat import ChatModel"),
        ("llamafactory.train", "from llamafactory.train.tuner import export_model"),
    ]
    for name, cmd in modules:
        try:
            exec(cmd, globals())
            all_passed &= test(name, True)
        except Exception as e:
            all_passed &= test(name, False, str(e)[:60])
    
    # Test 3: Backend Config
    print(f"\n{YELLOW}[3] Backend Config{END}")
    try:
        from config import get_settings
        settings = get_settings()
        all_passed &= test("Config loads", True)
        all_passed &= test("Core path", settings.core_path.exists())
        all_passed &= test("Data dir", settings.data_dir.exists())
        all_passed &= test("Venv Python", Path(settings.get_venv_python()).exists())
    except Exception as e:
        all_passed &= test("Config", False, str(e)[:60])
    
    # Test 4: Backend Services
    print(f"\n{YELLOW}[4] Backend Services{END}")
    try:
        from services.chat_service import get_chat_service as chat_svc
        from services.training_service import TrainingService
        from services.evaluate_service import get_evaluate_service as eval_svc
        from services.export_service import get_export_service as export_svc
        
        all_passed &= test("ChatService import", True)
        all_passed &= test("TrainingService import", True)
        all_passed &= test("EvaluateService import", True)
        all_passed &= test("ExportService import", True)
        
        # Test ChatService instantiation
        try:
            cs = chat_svc()
            status = cs.get_status()
            all_passed &= test("ChatService ready", True)
            print(f"        Status: {status}")
        except Exception as e:
            all_passed &= test("ChatService init", False, str(e)[:60])
            
    except Exception as e:
        all_passed &= test("Services", False, str(e)[:60])
    
    print("\n" + "=" * 50)
    if all_passed:
        print(f"  {GREEN}All tests passed!{END}")
    else:
        print(f"  {RED}Some tests failed{END}")
    print("=" * 50 + "\n")
    
    return 0 if all_passed else 1

if __name__ == "__main__":
    sys.exit(main())
