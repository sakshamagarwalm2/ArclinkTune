#!/usr/bin/env python3
"""
ArclinkTune Hardware Check

Checks system hardware capabilities for running LLM training.
"""

import subprocess
import platform

def check_cuda():
    """Check CUDA availability"""
    try:
        result = subprocess.run(['nvidia-smi', '--query-gpu=name,driver_version,memory.total', '--format=csv,noheader'], 
                             capture_output=True, text=True)
        if result.returncode == 0:
            print("✓ CUDA GPU detected:")
            for line in result.stdout.strip().split('\n'):
                print(f"  {line}")
            return True
    except FileNotFoundError:
        pass
    
    print("✗ No CUDA GPU detected")
    return False

def check_rocm():
    """Check ROCm availability (AMD GPUs)"""
    try:
        result = subprocess.run(['rocm-smi', '--showproductname'], 
                             capture_output=True, text=True)
        if result.returncode == 0:
            print("✓ ROCm GPU detected:")
            print(f"  {result.stdout.strip()}")
            return True
    except FileNotFoundError:
        pass
    
    print("✗ No ROCm GPU detected")
    return False

def check_npu():
    """Check NPU availability (Huawei)"""
    try:
        result = subprocess.run(['cann-nna-smi', '-L'], 
                             capture_output=True, text=True)
        if result.returncode == 0:
            print("✓ NPU detected:")
            print(f"  {result.stdout.strip()}")
            return True
    except FileNotFoundError:
        pass
    
    print("✗ No NPU detected")
    return False

def check_cpu():
    """Check CPU information"""
    import psutil
    print(f"✓ CPU: {psutil.cpu_count(logical=False)} cores / {psutil.cpu_count(logical=True)} threads")
    
def check_memory():
    """Check RAM"""
    import psutil
    total = psutil.virtual_memory().total / (1024**3)
    print(f"✓ RAM: {total:.1f} GB")
    
def check_disk():
    """Check disk space"""
    import psutil
    for partition in psutil.disk_partitions():
        try:
            usage = psutil.disk_usage(partition.mountpoint)
            if usage.total > 50 * (1024**3):  # Only show > 50GB disks
                print(f"✓ Disk {partition.device}: {usage.total/(1024**3):.1f} GB")
        except:
            pass

def main():
    print("="*50)
    print("  ArclinkTune Hardware Check")
    print("="*50)
    print(f"\nPlatform: {platform.system()} {platform.release()}")
    print(f"Python: {platform.python_version()}")
    
    print("\n--- Hardware ---")
    check_cpu()
    check_memory()
    check_disk()
    
    print("\n--- Accelerators ---")
    has_accel = check_cuda() or check_rocm() or check_npu()
    
    if not has_accel:
        print("\n⚠ WARNING: No GPU/NPU detected!")
        print("  Training will use CPU only (very slow)")
        print("  GPU is recommended for training")

if __name__ == '__main__':
    main()
