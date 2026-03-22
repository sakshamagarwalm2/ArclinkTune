#!/usr/bin/env python3
"""
ArclinkTune Setup Script

This script helps set up the Python environment for ArclinkTune.
Installs: Backend deps, LlamaFactory (for training), and CUDA PyTorch (for monitoring).
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
            lines = result.stdout.split('\n')[:8]
            for line in lines:
                print(f"  {line}")
            return True
        else:
            print("[WARN] nvidia-smi not found (GPU monitoring will be limited)")
            return False
    except FileNotFoundError:
        print("[WARN] NVIDIA driver not installed or not in PATH")
        return False

def create_venv(venv_path):
    venv_path = Path(venv_path)
    
    if venv_path.exists():
        print(f"[INFO] Virtual environment already exists at {venv_path}")
        return venv_path
    
    print(f"[INFO] Creating virtual environment at {venv_path}...")
    subprocess.run([sys.executable, '-m', 'venv', str(venv_path)], check=True)
    print(f"[OK] Virtual environment created")
    return venv_path

def get_pip_exe(venv_path):
    if platform.system() == 'Windows':
        return venv_path / 'Scripts' / 'pip.exe'
    return venv_path / 'bin' / 'pip'

def install_backend_deps(venv_path):
    print_step("Installing Backend Dependencies")
    
    pip_exe = get_pip_exe(venv_path)
    project_root = Path(__file__).parent.parent
    requirements_file = project_root / 'backend' / 'requirements.txt'
    
    print("Upgrading pip...")
    subprocess.run([str(pip_exe), 'install', '--upgrade', 'pip', '-q'], check=True)
    
    print(f"\nInstalling from {requirements_file.name}...")
    result = subprocess.run([str(pip_exe), 'install', '-r', str(requirements_file), '-q'], 
                          capture_output=True, text=True)
    if result.returncode != 0:
        print(f"[WARN] Some dependencies may have issues: {result.stderr[:200]}")
    print("[OK] Backend dependencies installed")

def install_llamafactory(venv_path):
    print_step("Installing LlamaFactory")
    
    pip_exe = get_pip_exe(venv_path)
    project_root = Path(__file__).parent.parent
    llamafactory_path = project_root / 'core' / 'LlamaFactory'
    
    print(f"\nInstalling LlamaFactory from {llamafactory_path}...")
    print("[INFO] This enables llamafactory-cli command for training")
    
    result = subprocess.run([
        str(pip_exe), 'install', '-e', str(llamafactory_path), '-q'
    ], capture_output=True, text=True)
    
    if result.returncode == 0:
        print("[OK] LlamaFactory installed successfully!")
        print("[OK] 'llamafactory-cli' command is now available")
    else:
        print(f"[ERROR] Failed to install LlamaFactory: {result.stderr[:300]}")
        return False
    return True

def install_cuda_for_monitoring(venv_path):
    print_step("Installing PyTorch with CUDA support")
    
    print("[INFO] This enables GPU health checks and hardware-accelerated training.")
    print(f"[INFO] Using venv at: {venv_path}")
    
    pip_exe = get_pip_exe(venv_path)
    
    try:
        # Use CUDA 12.4 for modern drivers and Python 3.13 compatibility
        print("\nInstalling PyTorch with CUDA 12.4 support...")
        result = subprocess.run([
            str(pip_exe), 'install', 
            'torch', 'torchvision',
            '--index-url', 'https://download.pytorch.org/whl/cu124',
            '--force-reinstall',
            '-q'
        ], capture_output=True, text=True)
        
        check_result = subprocess.run([str(get_pip_exe(venv_path).parent / 'python.exe' if platform.system() == 'Windows' else get_pip_exe(venv_path).parent / 'python'), '-c', 
            'import torch; print(f"PyTorch: {torch.__version__}"); '
            'print(f"CUDA Available: {torch.cuda.is_available()}"); '
            'if torch.cuda.is_available(): print(f"GPU: {torch.cuda.get_device_name(0)}")'],
            capture_output=True, text=True)
        
        print(check_result.stdout)
        
        if 'True' in check_result.stdout:
            print("[OK] CUDA PyTorch installed successfully in venv!")
        else:
            print("[WARN] CUDA still not available within venv. Check NVIDIA drivers or manual install.")
            
    except Exception as e:
        print(f"[ERROR] Failed to install CUDA PyTorch into venv: {e}")
        print("[INFO] Install manually with:")
        print(f"  {pip_exe} install torch torchvision --index-url https://download.pytorch.org/whl/cu124")

def main():
    print("\n" + "="*60)
    print("  ArclinkTune Setup Script")
    print("="*60)
    
    project_root = Path(__file__).parent.parent
    venv_path = project_root / 'core' / '.venv'
    
    if not check_python():
        sys.exit(1)
    
    cuda_detected = check_cuda()
    
    print_step("Setting Up Virtual Environment")
    venv_path = create_venv(venv_path)
    
    install_backend_deps(venv_path)
    install_llamafactory(venv_path)
    
    if cuda_detected:
        install_cuda_for_monitoring(venv_path)
    else:
        print("\n[WARN] No CUDA GPU detected.")
        print("[INFO] GPU monitoring will show 'No GPU Detected'")
        print("[INFO] Training will use CPU only (very slow)")
    
    print_step("Setup Complete!")
    
    print("To run the app:")
    print("  scripts\\run.bat          (Windows)")
    print("  scripts\\run.ps1         (PowerShell)")
    print("")
    print("Or manually:")
    print("  1. Start backend:  cd backend && python main.py")
    print("  2. Start frontend: cd app && npm run dev")
    print("")
    print("Architecture:")
    print("  - Virtual Env:         core\\.venv")
    print("  - Backend & Training:  Uses venv + LlamaFactory + CUDA Support")
    print("  - GPU Monitoring:      Integrated via venv PyTorch")
    print("  - Frontend:            Node.js + npm")

if __name__ == '__main__':
    main()
