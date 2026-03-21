import pytest


class TestChatLoad:
    """Tests for loading model in chat"""

    def test_load_model_success(self, client):
        response = client.post("/api/chat/load", json={
            "model_path": "meta-llama/Llama-3.1-8B-Instruct",
            "finetuning_type": "lora"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "model" in data

    def test_load_model_with_all_params(self, client):
        response = client.post("/api/chat/load", json={
            "model_path": "test-model",
            "finetuning_type": "full",
            "infer_backend": "huggingface",
            "infer_dtype": "float16",
            "checkpoint_path": "output/checkpoint",
            "template": "llama3"
        })
        assert response.status_code == 200

    def test_load_model_stores_path(self, client):
        response = client.post("/api/chat/load", json={
            "model_path": "test-model-path"
        })
        data = response.json()
        assert data["model"] == "test-model-path"


class TestChatUnload:
    """Tests for unloading model"""

    def test_unload_model_success(self, client):
        client.post("/api/chat/load", json={"model_path": "test"})
        response = client.post("/api/chat/unload")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True


class TestChat:
    """Tests for chat endpoint"""

    def test_chat_requires_loaded_model(self, client, sample_chat_message):
        response = client.post("/api/chat/chat", json=sample_chat_message)
        assert response.status_code == 200
        data = response.json()
        assert "error" in data or "content" in data

    def test_chat_with_loaded_model(self, client):
        client.post("/api/chat/load", json={"model_path": "test-model"})
        response = client.post("/api/chat/chat", json={
            "messages": [{"role": "user", "content": "Hello"}],
            "max_tokens": 100
        })
        assert response.status_code == 200
        data = response.json()
        assert "content" in data

    def test_chat_uses_parameters(self, client):
        client.post("/api/chat/load", json={"model_path": "test-model"})
        response = client.post("/api/chat/chat", json={
            "messages": [{"role": "user", "content": "Test"}],
            "max_tokens": 500,
            "temperature": 0.5,
            "top_p": 0.8
        })
        assert response.status_code == 200
        data = response.json()
        assert "content" in data

    def test_chat_response_format(self, client):
        client.post("/api/chat/load", json={"model_path": "test-model"})
        response = client.post("/api/chat/chat", json={
            "messages": [{"role": "user", "content": "Hello"}]
        })
        data = response.json()
        assert isinstance(data["content"], str)


class TestChatStatus:
    """Tests for chat status endpoint"""

    def test_get_chat_status_initial(self, client):
        response = client.get("/api/chat/status")
        assert response.status_code == 200
        data = response.json()
        assert "loaded" in data
        assert "model" in data

    def test_get_chat_status_after_load(self, client):
        client.post("/api/chat/load", json={"model_path": "test-model"})
        response = client.get("/api/chat/status")
        data = response.json()
        assert data["loaded"] is True
        assert data["model"] == "test-model"

    def test_get_chat_status_after_unload(self, client):
        client.post("/api/chat/load", json={"model_path": "test-model"})
        client.post("/api/chat/unload")
        response = client.get("/api/chat/status")
        data = response.json()
        assert data["loaded"] is False
        assert data["model"] is None