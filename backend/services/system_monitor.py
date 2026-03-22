import psutil
import platform
import time
import os
import shutil
import subprocess
from typing import List, Optional, Dict, Any

try:
    import pynvml

    # Windows fallback for nvml.dll if it's not in Program Files
    if platform.system() == "Windows":
        local_nvml_dir = os.path.join(
            os.path.dirname(__file__), "NVIDIA Corporation", "NVSMI"
        )
        std_path = os.path.join(
            os.environ.get("ProgramFiles", "C:/Program Files"),
            "NVIDIA Corporation",
            "NVSMI",
            "nvml.dll",
        )

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


def _get_gpu_from_nvidia_smi() -> Optional[List[Dict[str, Any]]]:
    """Fallback to nvidia-smi CLI when pynvml fails"""
    try:
        result = subprocess.run(
            [
                "nvidia-smi",
                "--query-gpu=name,utilization.gpu,memory.used,memory.total,temperature.gpu,power.draw,driver_version,clocks.current.sm,clocks.current.memory",
                "--format=csv,noheader,nounits",
            ],
            capture_output=True,
            text=True,
            timeout=5,
        )
        if result.returncode == 0 and result.stdout.strip():
            gpus = []
            for line in result.stdout.strip().split("\n"):
                parts = [p.strip() for p in line.split(",")]
                if len(parts) >= 9:
                    gpus.append(
                        {
                            "name": parts[0],
                            "utilization_percent": float(parts[1])
                            if parts[1] != "[N/A]"
                            else 0.0,
                            "memory_used_gb": float(parts[2]) / 1024
                            if parts[2] != "[N/A]"
                            else 0.0,
                            "memory_total_gb": float(parts[3]) / 1024
                            if parts[3] != "[N/A]"
                            else 0.0,
                            "temperature_celsius": int(parts[4])
                            if parts[4] != "[N/A]"
                            else 0,
                            "power_watts": float(parts[5])
                            if parts[5] != "[N/A]"
                            else 0.0,
                            "driver_version": parts[6],
                            "clock_gpu_mhz": int(parts[7])
                            if parts[7] != "[N/A]"
                            else 0,
                            "clock_memory_mhz": int(parts[8])
                            if parts[8] != "[N/A]"
                            else 0,
                            "memory_percent": (float(parts[2]) / float(parts[3]) * 100)
                            if parts[2] != "[N/A]"
                            and parts[3] != "[N/A]"
                            and float(parts[3]) > 0
                            else 0.0,
                            "fan_speed_percent": 0.0,
                        }
                    )
            return gpus
    except Exception:
        pass
    return None


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
                temp = pynvml.nvmlDeviceGetTemperature(
                    handle, pynvml.NVML_TEMPERATURE_GPU
                )
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
                    mem_clock = pynvml.nvmlDeviceGetClockInfo(
                        handle, pynvml.NVML_CLOCK_MEM
                    )
                except:
                    mem_clock = 0

                try:
                    name = pynvml.nvmlDeviceGetName(handle)
                    if isinstance(name, bytes):
                        name = name.decode("utf-8")
                except:
                    name = "Unknown GPU"

                try:
                    driver = pynvml.nvmlSystemGetDriverVersion()
                    if isinstance(driver, bytes):
                        driver = driver.decode("utf-8")
                except Exception:
                    driver = "N/A"

                gpus.append(
                    {
                        "name": name,
                        "driver_version": driver,
                        "utilization_percent": float(util.gpu),
                        "memory_used_gb": info.used / (1024**3),
                        "memory_total_gb": info.total / (1024**3),
                        "memory_percent": (info.used / info.total * 100)
                        if info.total > 0
                        else 0,
                        "temperature_celsius": temp,
                        "power_watts": power,
                        "fan_speed_percent": float(fan),
                        "clock_gpu_mhz": clock,
                        "clock_memory_mhz": mem_clock,
                    }
                )

            pynvml.nvmlShutdown()
        except Exception as e:
            _NVML_FAILED = True
            print(f"NVML monitoring disabled: {e}")

    if not gpus:
        smi_gpus = _get_gpu_from_nvidia_smi()
        if smi_gpus:
            gpus = smi_gpus

    if not gpus:
        gpus.append(
            {
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
            }
        )

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
        "ram_total_gb": mem.total / (1024**3),
        "ram_used_gb": mem.used / (1024**3),
        "ram_available_gb": mem.available / (1024**3),
        "ram_percent": mem.percent,
        "swap_total_gb": swap.total / (1024**3),
        "swap_used_gb": swap.used / (1024**3),
        "swap_percent": swap.percent,
    }


def get_disk_stats() -> List[dict]:
    disks = []
    for partition in psutil.disk_partitions():
        try:
            usage = psutil.disk_usage(partition.mountpoint)
            disks.append(
                {
                    "device": partition.device,
                    "mount_point": partition.mountpoint,
                    "total_gb": usage.total / (1024**3),
                    "used_gb": usage.used / (1024**3),
                    "free_gb": usage.free / (1024**3),
                    "percent": usage.percent,
                }
            )
        except:
            pass

    return disks


def get_network_stats() -> Optional[dict]:
    try:
        net = psutil.net_io_counters()
        return {
            "bytes_sent_gb": net.bytes_sent / (1024**3),
            "bytes_recv_gb": net.bytes_recv / (1024**3),
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


def check_gpu_health():
    result = {
        "cuda_available": False,
        "cuda_version": None,
        "gpu_name": None,
        "gpu_count": 0,
        "gpu_compute_capability": None,
        "tensor_test_passed": False,
        "memory_test_passed": False,
        "error": None,
        "details": {},
    }

    try:
        import torch

        result["cuda_available"] = torch.cuda.is_available()
        result["cuda_version"] = (
            torch.version.cuda if torch.cuda.is_available() else None
        )

        if torch.cuda.is_available():
            result["gpu_count"] = torch.cuda.device_count()
            result["gpu_name"] = torch.cuda.get_device_name(0)
            result["gpu_compute_capability"] = (
                f"{torch.cuda.get_device_capability(0)[0]}.{torch.cuda.get_device_capability(0)[1]}"
            )
            result["details"]["total_memory_gb"] = torch.cuda.get_device_properties(
                0
            ).total_memory / (1024**3)
            result["details"]["allocated_memory_gb"] = torch.cuda.memory_allocated(
                0
            ) / (1024**3)
            result["details"]["reserved_memory_gb"] = torch.cuda.memory_reserved(0) / (
                1024**3
            )

            try:
                x = torch.randn(1000, 1000, device="cuda")
                y = torch.randn(1000, 1000, device="cuda")
                z = torch.matmul(x, y)
                result["tensor_test_passed"] = z.device.type == "cuda"
                del x, y, z
                torch.cuda.empty_cache()
            except Exception as e:
                result["error"] = f"Tensor test failed: {str(e)}"

            try:
                torch.cuda.init()
                result["memory_test_passed"] = True
                torch.cuda.empty_cache()
            except Exception as e:
                result["error"] = f"Memory test failed: {str(e)}"
        else:
            result["error"] = (
                "CUDA is not available. Make sure PyTorch with CUDA support is installed."
            )
    except ImportError:
        result["error"] = "PyTorch not installed. Install with: pip install torch"
    except Exception as e:
        result["error"] = str(e)

    return result
