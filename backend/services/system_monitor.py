import psutil
import platform
import time
import os
import shutil
from typing import List, Optional, Dict, Any

try:
    import pynvml
    
    # Windows fallback for nvml.dll if it's not in Program Files
    if platform.system() == 'Windows':
        local_nvml_dir = os.path.join(os.path.dirname(__file__), "NVIDIA Corporation", "NVSMI")
        std_path = os.path.join(os.environ.get("ProgramFiles", "C:/Program Files"), "NVIDIA Corporation", "NVSMI", "nvml.dll")
        
        if not os.path.exists(std_path):
            os.makedirs(local_nvml_dir, exist_ok=True)
            sys32_path = r"C:\Windows\System32\nvml.dll"
            local_dll = os.path.join(local_nvml_dir, "nvml.dll")
            
            if not os.path.exists(local_dll) and os.path.exists(sys32_path):
                try:
                    shutil.copy2(sys32_path, local_dll)
                except Exception:
                    pass
            
            if os.path.exists(local_dll):
                # Temporary override just for pynvml.nvmlInit()
                os.environ["ProgramFiles"] = os.path.dirname(__file__)
                
    PYNVML_AVAILABLE = True
except ImportError:
    PYNVML_AVAILABLE = False

_NVML_FAILED = False

def get_gpu_stats() -> List[Dict[str, Any]]:
    global _NVML_FAILED
    gpus = []
    if PYNVML_AVAILABLE and not _NVML_FAILED:
        try:
            pynvml.nvmlInit()
            device_count = pynvml.nvmlDeviceGetCount()
            for i in range(device_count):
                handle = pynvml.nvmlDeviceGetHandleByIndex(i)
                info = pynvml.nvmlDeviceGetMemoryInfo(handle)
                util = pynvml.nvmlDeviceGetUtilizationRates(handle)
                temp = pynvml.nvmlDeviceGetTemperature(handle, pynvml.NVML_TEMPERATURE_GPU)
                power = pynvml.nvmlDeviceGetPowerUsage(handle) / 1000.0
                
                try:
                    fan = pynvml.nvmlDeviceGetFanSpeed(handle)
                except:
                    fan = 0
                
                try:
                    clock = pynvml.nvmlDeviceGetClockInfo(handle, pynvml.NVML_CLOCK_SM)
                except:
                    clock = 0
                
                try:
                    mem_clock = pynvml.nvmlDeviceGetClockInfo(handle, pynvml.NVML_CLOCK_MEM)
                except:
                    mem_clock = 0
                
                try:
                    name = pynvml.nvmlDeviceGetName(handle)
                    if isinstance(name, bytes):
                        name = name.decode('utf-8')
                except:
                    name = "Unknown GPU"
                
                try:
                    driver = pynvml.nvmlSystemGetDriverVersion()
                    if isinstance(driver, bytes):
                        driver = driver.decode('utf-8')
                except Exception:
                    driver = "N/A"
                
                gpus.append({
                    "name": name,
                    "driver_version": driver,
                    "utilization_percent": float(util.gpu),
                    "memory_used_gb": info.used / (1024 ** 3),
                    "memory_total_gb": info.total / (1024 ** 3),
                    "memory_percent": (info.used / info.total * 100) if info.total > 0 else 0,
                    "temperature_celsius": temp,
                    "power_watts": power,
                    "fan_speed_percent": float(fan),
                    "clock_gpu_mhz": clock,
                    "clock_memory_mhz": mem_clock,
                })
            
            pynvml.nvmlShutdown()
        except Exception as e:
            _NVML_FAILED = True
            print(f"NVML monitoring disabled. Could not detect GPU: {e}")
    
    if not gpus:
        gpus.append({
            "name": "No GPU Detected",
            "driver_version": "N/A",
            "utilization_percent": 0.0,
            "memory_used_gb": 0.0,
            "memory_total_gb": 0.0,
            "memory_percent": 0.0,
            "temperature_celsius": 0,
            "power_watts": 0.0,
            "fan_speed_percent": 0.0,
            "clock_gpu_mhz": 0,
            "clock_memory_mhz": 0,
        })
    
    return gpus

def get_cpu_stats():
    cpu_freq = psutil.cpu_freq()
    per_core = psutil.cpu_percent(percpu=True, interval=0.1)
    
    return {
        "name": platform.processor() or "Unknown CPU",
        "cores_physical": psutil.cpu_count(logical=False) or 1,
        "cores_logical": psutil.cpu_count(logical=True) or 1,
        "utilization_percent": psutil.cpu_percent(interval=0.1),
        "per_core_percent": per_core,
        "frequency_mhz": cpu_freq.current if cpu_freq else 0,
    }

def get_memory_stats():
    mem = psutil.virtual_memory()
    swap = psutil.swap_memory()
    
    return {
        "ram_total_gb": mem.total / (1024 ** 3),
        "ram_used_gb": mem.used / (1024 ** 3),
        "ram_available_gb": mem.available / (1024 ** 3),
        "ram_percent": mem.percent,
        "swap_total_gb": swap.total / (1024 ** 3),
        "swap_used_gb": swap.used / (1024 ** 3),
        "swap_percent": swap.percent,
    }

def get_disk_stats() -> List[dict]:
    disks = []
    for partition in psutil.disk_partitions():
        try:
            usage = psutil.disk_usage(partition.mountpoint)
            disks.append({
                "device": partition.device,
                "mount_point": partition.mountpoint,
                "total_gb": usage.total / (1024 ** 3),
                "used_gb": usage.used / (1024 ** 3),
                "free_gb": usage.free / (1024 ** 3),
                "percent": usage.percent,
            })
        except:
            pass
    
    return disks

def get_network_stats() -> Optional[dict]:
    try:
        net = psutil.net_io_counters()
        return {
            "bytes_sent_gb": net.bytes_sent / (1024 ** 3),
            "bytes_recv_gb": net.bytes_recv / (1024 ** 3),
        }
    except:
        return None

def get_system_info():
    boot_time = psutil.boot_time()
    uptime = time.time() - boot_time
    
    return {
        "platform": f"{platform.system()} {platform.release()}",
        "hostname": platform.node(),
        "uptime_seconds": int(uptime),
    }
