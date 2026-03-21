import pytest


class TestSystemStats:
    """Tests for system stats endpoint"""

    def test_get_stats_returns_response(self, client):
        response = client.get("/api/system/stats")
        assert response.status_code == 200

    def test_stats_contains_gpu_list(self, client):
        response = client.get("/api/system/stats")
        data = response.json()
        assert "gpu" in data
        assert isinstance(data["gpu"], list)

    def test_stats_contains_cpu(self, client):
        response = client.get("/api/system/stats")
        data = response.json()
        assert "cpu" in data

    def test_stats_contains_memory(self, client):
        response = client.get("/api/system/stats")
        data = response.json()
        assert "memory" in data

    def test_stats_contains_disk(self, client):
        response = client.get("/api/system/stats")
        data = response.json()
        assert "disk" in data
        assert isinstance(data["disk"], list)

    def test_stats_contains_network(self, client):
        response = client.get("/api/system/stats")
        data = response.json()
        assert "network" in data

    def test_stats_contains_info(self, client):
        response = client.get("/api/system/stats")
        data = response.json()
        assert "info" in data

    def test_stats_contains_timestamp(self, client):
        response = client.get("/api/system/stats")
        data = response.json()
        assert "timestamp" in data


class TestSystemGPU:
    """Tests for GPU endpoint"""

    def test_get_gpu_returns_list(self, client):
        response = client.get("/api/system/gpu")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_gpu_contains_name_field(self, client):
        response = client.get("/api/system/gpu")
        data = response.json()
        if len(data) > 0:
            gpu = data[0]
            assert "name" in gpu


class TestSystemCPU:
    """Tests for CPU endpoint"""

    def test_get_cpu_returns_data(self, client):
        response = client.get("/api/system/cpu")
        assert response.status_code == 200

    def test_cpu_contains_name(self, client):
        response = client.get("/api/system/cpu")
        data = response.json()
        assert "name" in data

    def test_cpu_contains_cores(self, client):
        response = client.get("/api/system/cpu")
        data = response.json()
        assert "cores_physical" in data or "cores_logical" in data

    def test_cpu_contains_utilization(self, client):
        response = client.get("/api/system/cpu")
        data = response.json()
        assert "utilization_percent" in data


class TestSystemMemory:
    """Tests for memory endpoint"""

    def test_get_memory_returns_data(self, client):
        response = client.get("/api/system/memory")
        assert response.status_code == 200

    def test_memory_contains_ram_total(self, client):
        response = client.get("/api/system/memory")
        data = response.json()
        assert "ram_total_gb" in data

    def test_memory_contains_ram_used(self, client):
        response = client.get("/api/system/memory")
        data = response.json()
        assert "ram_used_gb" in data

    def test_memory_contains_ram_percent(self, client):
        response = client.get("/api/system/memory")
        data = response.json()
        assert "ram_percent" in data

    def test_memory_contains_swap(self, client):
        response = client.get("/api/system/memory")
        data = response.json()
        assert "swap_total_gb" in data
        assert "swap_percent" in data


class TestSystemDisk:
    """Tests for disk endpoint"""

    def test_get_disk_returns_list(self, client):
        response = client.get("/api/system/disk")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_disk_contains_device(self, client):
        response = client.get("/api/system/disk")
        data = response.json()
        if len(data) > 0:
            disk = data[0]
            assert "device" in disk or "mount_point" in disk

    def test_disk_contains_total_space(self, client):
        response = client.get("/api/system/disk")
        data = response.json()
        if len(data) > 0:
            disk = data[0]
            assert "total_gb" in disk


class TestSystemNetwork:
    """Tests for network endpoint"""

    def test_get_network_returns_data(self, client):
        response = client.get("/api/system/network")
        assert response.status_code == 200

    def test_network_contains_bytes_sent(self, client):
        response = client.get("/api/system/network")
        data = response.json()
        assert "bytes_sent_gb" in data or "bytes_sent" in data


class TestSystemInfo:
    """Tests for system info endpoint"""

    def test_get_info_returns_data(self, client):
        response = client.get("/api/system/info")
        assert response.status_code == 200

    def test_info_contains_platform(self, client):
        response = client.get("/api/system/info")
        data = response.json()
        assert "platform" in data

    def test_info_contains_hostname(self, client):
        response = client.get("/api/system/info")
        data = response.json()
        assert "hostname" in data

    def test_info_contains_uptime(self, client):
        response = client.get("/api/system/info")
        data = response.json()
        assert "uptime_seconds" in data