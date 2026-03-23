from fastapi import APIRouter
from typing import List, Optional
from pydantic import BaseModel
from services.system_monitor import (
    get_gpu_stats,
    get_cpu_stats,
    get_memory_stats,
    get_disk_stats,
    get_network_stats,
    get_system_info,
    check_gpu_health,
)

router = APIRouter()


class GPUStats(BaseModel):
    name: str
    driver_version: str
    utilization_percent: float
    memory_used_gb: float
    memory_total_gb: float
    memory_percent: float
    temperature_celsius: float
    power_watts: float
    fan_speed_percent: float
    clock_gpu_mhz: int
    clock_memory_mhz: int


class CPUStats(BaseModel):
    name: str
    cores_physical: int
    cores_logical: int
    utilization_percent: float
    per_core_percent: list[float]
    frequency_mhz: float


class MemoryStats(BaseModel):
    ram_total_gb: float
    ram_used_gb: float
    ram_available_gb: float
    ram_percent: float
    swap_total_gb: float
    swap_used_gb: float
    swap_percent: float


class DiskStats(BaseModel):
    device: str
    mount_point: str
    total_gb: float
    used_gb: float
    free_gb: float
    percent: float


class NetworkStats(BaseModel):
    bytes_sent_gb: float
    bytes_recv_gb: float


class SystemInfo(BaseModel):
    platform: str
    hostname: str
    uptime_seconds: int


class SystemStatsResponse(BaseModel):
    gpu: List[GPUStats]
    cpu: CPUStats
    memory: MemoryStats
    disk: List[DiskStats]
    network: Optional[NetworkStats]
    info: SystemInfo
    timestamp: str


@router.get("/stats", response_model=SystemStatsResponse)
async def get_stats():
    from datetime import datetime

    return SystemStatsResponse(
        gpu=get_gpu_stats(),
        cpu=get_cpu_stats(),
        memory=get_memory_stats(),
        disk=get_disk_stats(),
        network=get_network_stats(),
        info=get_system_info(),
        timestamp=datetime.now().isoformat(),
    )


@router.get("/gpu", response_model=List[GPUStats])
async def get_gpu():
    return get_gpu_stats()


@router.get("/cpu", response_model=CPUStats)
async def get_cpu():
    return get_cpu_stats()


@router.get("/memory", response_model=MemoryStats)
async def get_memory():
    return get_memory_stats()


@router.get("/disk", response_model=List[DiskStats])
async def get_disk():
    return get_disk_stats()


@router.get("/network", response_model=NetworkStats)
async def get_network():
    return get_network_stats()


@router.get("/info", response_model=SystemInfo)
async def get_info():
    return get_system_info()


class GPUHealthResponse(BaseModel):
    cuda_available: bool
    cuda_version: Optional[str]
    gpu_name: Optional[str]
    gpu_count: int
    gpu_compute_capability: Optional[str]
    tensor_test_passed: bool
    memory_test_passed: bool
    error: Optional[str]
    details: dict
    venv_pytorch_version: Optional[str] = None
    venv_cuda_available: bool = False
    venv_cuda_version: Optional[str] = None


@router.get("/gpu/health", response_model=GPUHealthResponse)
async def get_gpu_health():
    return check_gpu_health()
