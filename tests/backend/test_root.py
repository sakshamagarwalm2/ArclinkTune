import pytest


class TestRootEndpoint:
    """Tests for the root API endpoint"""

    def test_root_returns_message_and_version(self, client):
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "version" in data
        assert data["version"] == "1.0.0"

    def test_root_returns_arclinktune_message(self, client):
        response = client.get("/")
        data = response.json()
        assert "ArclinkTune API" in data["message"]


class TestHealthEndpoint:
    """Tests for the health check endpoint"""

    def test_health_returns_healthy_status(self, client):
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"

    def test_health_response_format(self, client):
        response = client.get("/health")
        data = response.json()
        assert isinstance(data, dict)
        assert len(data) == 1