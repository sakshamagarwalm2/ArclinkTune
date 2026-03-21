#!/usr/bin/env python3
"""
ArclinkTune Setup Script

This script helps set up the Python environment for ArclinkTune.
"""

import os
import sys
import subprocess
import platform
from pathlib import Path

def print_step(msg):
    print(f"\n{'='*60}")
    print(f"  {msg}")
    print(f"{'='*60}\n")

def check_python():
    print_step("Checking Python Installation")
    
    version = sys.version_info
    print(f"Python version: {version.major}.{version.minor}.{version.micro}")
    
    if version.major < 3 or (version.major == 3 and version.minor < 11):
        print("ERROR: Python 3.11 or higher is required!")
        return False
    
    print("[OK] Python version is compatible")
    return True

def check_cuda():
    print_step("Checking CUDA")
    
    try:
        result = subprocess.run(['nvidia-smi'], capture_output=True, text=True)
        if result.returncode == 0:
            print("[OK] NVIDIA GPU detected")
            print(result.stdout[:500])
            return True
        else:
            print("[WARN] nvidia-smi not found (GPU monitoring will be limited)")
            return False
    except FileNotFoundError:
        print("[WARN] NVIDIA driver not installed or not in PATH")
        return False

def create_venv(venv_path):
    print_step(f"Creating Virtual Environment at {venv_path}")
    
    venv_path = Path(venv_path)
    
    if venv_path.exists():
        print(f"Virtual environment already exists at {venv_path}")
        response = input("Recreate it? (y/N): ").strip().lower()
        if response == 'y':
            import shutil
            shutil.rmtree(venv_path)
        else:
            print("Using existing virtual environment")
            return venv_path
    
    subprocess.run([sys.executable, '-m', 'venv', str(venv_path)], check=True)
    print(f"[OK] Virtual environment created at {venv_path}")
    return venv_path

def install_dependencies(venv_path, requirements_file):
    print_step("Installing Dependencies")
    
    pip_exe = venv_path / ('Scripts/pip.exe' if platform.system() == 'Windows' else 'bin/pip')
    
    print("Upgrading pip...")
    subprocess.run([str(pip_exe), 'install', '--upgrade', 'pip'], check=True)
    
    print(f"\nInstalling from {requirements_file}...")
    subprocess.run([str(pip_exe), 'install', '-r', str(requirements_file)], check=True)
    
    print("[OK] Dependencies installed")

def main():
    print("\n" + "="*60)
    print("  ArclinkTune Setup Script")
    print("="*60)
    
    # Get project root
    project_root = Path(__file__).parent.parent
    venv_path = project_root / 'environment' / 'venv'
    requirements_file = project_root / 'backend' / 'requirements.txt'
    
    # Check requirements
    if not check_python():
        sys.exit(1)
    
    check_cuda()
    
    # Create virtual environment
    venv_path = create_venv(venv_path)
    
    # Install dependencies
    if requirements_file.exists():
        install_dependencies(venv_path, requirements_file)
    else:
        print(f"⚠ Requirements file not found: {requirements_file}")
    
    # Print activation instructions
    print_step("Setup Complete!")
    
    if platform.system() == 'Windows':
        activate_cmd = str(venv_path / 'Scripts' / 'activate')
    else:
        activate_cmd = f"source {venv_path / 'bin' / 'activate'}"
    
    print(f"To activate the virtual environment, run:")
    print(f"  {activate_cmd}")
    print(f"\nTo run the backend:")
    print(f"  {activate_cmd.split()[0]} {activate_cmd.split()[1] if len(activate_cmd.split()) > 1 else ''} && python -m uvicorn backend.main:app --reload --port 8000")

if __name__ == '__main__':
    main()
