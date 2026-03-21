#!/usr/bin/env python3
"""
ArclinkTune Quick Start

Verifies the installation and starts both backend and frontend.
"""

import sys
import subprocess
import time
import os
from pathlib import Path

def print_status(msg, success=True):
    symbol = "✓" if success else "✗"
    print(f"{symbol} {msg}")

def check_frontend_deps():
    print("\n--- Frontend Dependencies ---")
    app_dir = Path(__file__).parent.parent / "app"
    if not (app_dir / "node_modules").exists():
        print_status("Installing npm dependencies...")
        result = subprocess.run(["npm", "install"], cwd=app_dir, capture_output=True, text=True)
        if result.returncode == 0:
            print_status("npm dependencies installed", True)
        else:
            print_status("npm install failed", False)
            print(result.stderr)
            return False
    else:
        print_status("npm dependencies found", True)
    return True

def check_backend_deps():
    print("\n--- Backend Dependencies ---")
    backend_dir = Path(__file__).parent.parent / "backend"
    env_dir = Path(__file__).parent.parent / "environment" / "venv"
    
    if os.name == 'nt':
        pip_exe = env_dir / "Scripts" / "pip.exe"
    else:
        pip_exe = env_dir / "bin" / "pip"
    
    if not pip_exe.exists():
        print_status("Python virtual environment not found", False)
        print("Run: python scripts/setup_environment.py")
        return False
    
    print_status("Python virtual environment found", True)
    return True

def main():
    print("=" * 50)
    print("  ArclinkTune Quick Start Check")
    print("=" * 50)
    
    if not check_frontend_deps():
        return 1
    
    if not check_backend_deps():
        return 1
    
    print("\n" + "=" * 50)
    print("  Ready to run!")
    print("=" * 50)
    print("\nTo start the backend:")
    print("  cd backend && python -m uvicorn main:app --reload")
    print("\nTo start the frontend (in another terminal):")
    print("  cd app && npm run dev")
    print("\nOr use Docker Compose:")
    print("  docker-compose up --build")
    
    return 0

if __name__ == '__main__':
    sys.exit(main())
