import pytest


class TestModelsEndpoint:
    """Tests for the /api/models endpoints"""

    def test_list_models_returns_list(self, client):
        response = client.get("/api/models/")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0

    def test_list_models_contains_expected_fields(self, client):
        response = client.get("/api/models/")
        data = response.json()
        model = data[0]
        assert "name" in model
        assert "path" in model
        assert "downloaded" in model

    def test_list_models_contains_popular_models(self, client):
        response = client.get("/api/models/")
        data = response.json()
        model_names = [m["name"] for m in data]
        assert any("Llama" in name for name in model_names)
        assert any("Qwen" in name for name in model_names)

    def test_get_supported_models(self, client):
        response = client.get("/api/models/supported")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0

    def test_get_local_models(self, client):
        response = client.get("/api/models/local")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_get_templates(self, client):
        response = client.get("/api/models/templates")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert "default" in data
        assert "llama3" in data
        assert "qwen" in data


class TestModelDownload:
    """Tests for model download endpoints"""

    def test_download_model_returns_task_id(self, client, sample_model_download_request):
        response = client.post("/api/models/download", json=sample_model_download_request)
        assert response.status_code == 200
        data = response.json()
        assert "task_id" in data
        assert "download_" in data["task_id"]

    def test_download_model_with_different_hubs(self, client):
        for hub in ["huggingface", "modelscope", "openmind"]:
            response = client.post("/api/models/download", json={
                "model_name": "test-model",
                "hub": hub
            })
            assert response.status_code == 200

    def test_get_download_status(self, client):
        task_id = "test_task_123"
        response = client.get(f"/api/models/download/{task_id}")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert "progress" in data

    def test_cancel_download(self, client):
        task_id = "test_task_456"
        response = client.delete(f"/api/models/download/{task_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True