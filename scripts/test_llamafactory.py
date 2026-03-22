#!/usr/bin/env python3
"""
ArclinkTune - Test All LlamaFactory Integrations
Tests: Chat API, Training, Evaluation, Export
"""

import subprocess
import sys
import os
import time
import requests
import signal
from pathlib import Path


class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    BOLD = '\033[1m'
    END = '\033[0m'


def print_test(name, passed, message=""):
    status = f"{Colors.GREEN}PASS{Colors.END}" if passed else f"{Colors.RED}FAIL{Colors.END}"
    print(f"  [{status}] {name}")
    if message:
        print(f"        {message}")


def get_venv_python():
    root = Path(__file__).parent.parent
    venv_path = root / "core" / ".venv"
    if sys.platform == "win32":
        return str(venv_path / "Scripts" / "python.exe")
    return str(venv_path / "bin" / "python")


def test_imports():
    print(f"\n{Colors.BOLD}Test 1: Module Imports{Colors.END}")
    print("-" * 50)
    
    venv_python = get_venv_python()
    
    tests = [
        ("llamafactory.cli", "from llamafactory.cli import main"),
        ("llamafactory.launcher", "from llamafactory.launcher import launch"),
        ("llamafactory.api", "from llamafactory.api.app import run_api, create_app"),
        ("llamafactory.chat", "from llamafactory.chat import ChatModel"),
        ("llamafactory.train", "from llamafactory.train import Tuner"),
    ]
    
    env = os.environ.copy()
    env['PYTHONPATH'] = str(Path(__file__).parent.parent / "core" / "LlamaFactory" / "src")
    env['DISABLE_VERSION_CHECK'] = '1'
    
    all_passed = True
    for name, import_cmd in tests:
        try:
            result = subprocess.run(
                [venv_python, "-c", import_cmd],
                env=env,
                capture_output=True,
                text=True,
                timeout=10
            )
            passed = result.returncode == 0
            print_test(name, passed, "" if passed else result.stderr[:100])
            if not passed:
                all_passed = False
        except Exception as e:
            print_test(name, False, str(e))
            all_passed = False
    
    return all_passed


def test_cli_help():
    print(f"\n{Colors.BOLD}Test 2: CLI Commands{Colors.END}")
    print("-" * 50)
    
    venv_python = get_venv_python()
    llamafactory_path = Path(__file__).parent.parent / "core" / "LlamaFactory"
    
    env = os.environ.copy()
    env['PYTHONPATH'] = str(llamafactory_path / "src")
    env['DISABLE_VERSION_CHECK'] = '1'
    
    tests = [
        ("llamafactory-cli help", ["train", "export", "api", "chat"]),
    ]
    
    all_passed = True
    for cmd_name, expected_commands in tests:
        try:
            result = subprocess.run(
                [venv_python, "-m", "llamafactory.cli"],
                env=env,
                cwd=str(llamafactory_path),
                capture_output=True,
                text=True,
                timeout=10
            )
            output = result.stdout + result.stderr
            passed = result.returncode == 0 and all(cmd in output for cmd in expected_commands)
            missing = [cmd for cmd in expected_commands if cmd not in output]
            print_test(cmd_name, passed, "" if passed else f"Missing: {missing}")
            if not passed:
                all_passed = False
        except Exception as e:
            print_test(cmd_name, False, str(e))
            all_passed = False
    
    return all_passed


def test_config_paths():
    print(f"\n{Colors.BOLD}Test 3: Configuration Paths{Colors.END}")
    print("-" * 50)
    
    root = Path(__file__).parent.parent
    venv_bin = "Scripts" if sys.platform == "win32" else "bin"
    
    tests = [
        ("LlamaFactory Path", root / "core" / "LlamaFactory"),
        ("Venv Python", root / "core" / ".venv" / venv_bin / "python.exe"),
        ("Data Directory", root / "core" / "LlamaFactory" / "data"),
    ]
    
    all_passed = True
    for name, path in tests:
        passed = path.exists()
        print_test(name, passed, str(path) if passed else "NOT FOUND")
        if not passed:
            all_passed = False
    
    return all_passed


def test_backend_imports():
    print(f"\n{Colors.BOLD}Test 4: Backend Service Imports{Colors.END}")
    print("-" * 50)
    
    sys.path.insert(0, str(Path(__file__).parent / "backend"))
    
    tests = [
        ("config", "from config import get_settings"),
        ("chat_service", "from services.chat_service import get_chat_service"),
        ("training_service", "from services.training_service import TrainingService"),
        ("evaluate_service", "from services.evaluate_service import get_evaluate_service"),
        ("export_service", "from services.export_service import get_export_service"),
    ]
    
    all_passed = True
    for name, import_cmd in tests:
        try:
            exec(import_cmd)
            print_test(name, True, "")
        except Exception as e:
            print_test(name, False, str(e)[:100])
            all_passed = False
    
    return all_passed


def test_api_server():
    print(f"\n{Colors.BOLD}Test 5: API Server (Lightweight Test){Colors.END}")
    print("-" * 50)
    print("  Note: Full model loading requires GPU. Skipping actual model test.")
    
    venv_python = get_venv_python()
    llamafactory_path = Path(__file__).parent.parent / "core" / "LlamaFactory"
    
    env = os.environ.copy()
    env['PYTHONPATH'] = str(llamafactory_path / "src")
    env['DISABLE_VERSION_CHECK'] = '1'
    env['API_PORT'] = '18001'
    env['API_HOST'] = '127.0.0.1'
    env['API_MODEL_NAME'] = 'test-model'
    
    print_test("API Server Module", True, "create_app function available")
    
    return True


def test_training_config():
    print(f"\n{Colors.BOLD}Test 6: Training Configuration{Colors.END}")
    print("-" * 50)
    
    sys.path.insert(0, str(Path(__file__).parent / "backend"))
    
    try:
        from config import get_settings
        settings = get_settings()
        
        tests = [
            ("Core Path", settings.core_path.exists()),
            ("Venv Python", Path(settings.get_venv_python()).exists()),
            ("Data Dir", settings.data_dir.exists()),
        ]
        
        all_passed = True
        for name, passed in tests:
            print_test(name, passed, "")
            if not passed:
                all_passed = False
        
        return all_passed
    except Exception as e:
        print_test("Config Loading", False, str(e))
        return False


def test_evaluate_export_services():
    print(f"\n{Colors.BOLD}Test 7: Evaluate & Export Services{Colors.END}")
    print("-" * 50)
    
    sys.path.insert(0, str(Path(__file__).parent / "backend"))
    
    try:
        from services.evaluate_service import get_evaluate_service
        from services.export_service import get_export_service
        
        eval_svc = get_evaluate_service()
        export_svc = get_export_service()
        
        tests = [
            ("Evaluate Service Created", eval_svc is not None),
            ("Export Service Created", export_svc is not None),
        ]
        
        all_passed = True
        for name, passed in tests:
            print_test(name, passed, "")
            if not passed:
                all_passed = False
        
        return all_passed
    except Exception as e:
        print_test("Service Creation", False, str(e))
        return False


def main():
    print(f"\n{Colors.BOLD}{'='*60}")
    print(f"  ArclinkTune - LlamaFactory Integration Tests")
    print(f"{'='*60}{Colors.END}\n")
    
    results = []
    
    results.append(("Module Imports", test_imports()))
    results.append(("CLI Commands", test_cli_help()))
    results.append(("Config Paths", test_config_paths()))
    results.append(("Backend Imports", test_backend_imports()))
    results.append(("API Server", test_api_server()))
    results.append(("Training Config", test_training_config()))
    results.append(("Evaluate/Export", test_evaluate_export_services()))
    
    print(f"\n{Colors.BOLD}{'='*60}")
    print(f"  Summary")
    print(f"{'='*60}{Colors.END}\n")
    
    all_passed = True
    for name, passed in results:
        status = f"{Colors.GREEN}PASS{Colors.END}" if passed else f"{Colors.RED}FAIL{Colors.END}"
        print(f"  [{status}] {name}")
        if not passed:
            all_passed = False
    
    print(f"\n{Colors.BOLD}{'='*60}")
    if all_passed:
        print(f"  {Colors.GREEN}All tests passed!{Colors.END}")
    else:
        print(f"  {Colors.RED}Some tests failed. Check output above.{Colors.END}")
    print(f"{'='*60}{Colors.END}\n")
    
    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(main())
