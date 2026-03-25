import pytest


class TestTrainingConfig:
    """Tests for training configuration endpoints"""

    def test_get_default_config(self, client):
        response = client.get("/api/training/config")
        assert response.status_code == 200
        data = response.json()
        assert "stage" in data
        assert "output_dir" in data

    def test_default_config_values(self, client):
        response = client.get("/api/training/config")
        data = response.json()
        assert data["stage"] == "sft"
        assert data["finetuning_type"] == "lora"
        assert data["learning_rate"] == 5e-5


class TestTrainingDatasets:
    """Tests for dataset endpoints"""

    def test_get_datasets_returns_list(self, client):
        response = client.get("/api/training/datasets")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_datasets_have_required_fields(self, client):
        response = client.get("/api/training/datasets")
        data = response.json()
        if len(data) > 0:
            dataset = data[0]
            assert "name" in dataset
            assert "path" in dataset


class TestTrainingRuns:
    """Tests for training runs endpoints"""

    def test_list_runs_returns_list(self, client):
        response = client.get("/api/training/runs")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_delete_run(self, client):
        response = client.delete("/api/training/runs/test_run_id")
        assert response.status_code == 200
        data = response.json()
        assert "success" in data


class TestTrainingPreview:
    """Tests for training preview endpoint"""

    def test_preview_training(self, client, sample_training_config):
        response = client.post("/api/training/preview", json=sample_training_config)
        assert response.status_code == 200
        data = response.json()
        assert "command" in data
        assert "config" in data

    def test_preview_contains_stage(self, client, sample_training_config):
        response = client.post("/api/training/preview", json=sample_training_config)
        data = response.json()
        assert "sft" in data["command"]

    def test_preview_contains_model_path(self, client, sample_training_config):
        response = client.post("/api/training/preview", json=sample_training_config)
        data = response.json()
        assert "meta-llama" in data["command"]


class TestTrainingStart:
    """Tests for starting training"""

    def test_start_training_returns_run_id(self, client, sample_training_config):
        response = client.post("/api/training/start", json=sample_training_config)
        assert response.status_code == 200
        data = response.json()
        assert "run_id" in data or "success" in data

    def test_start_training_with_different_stages(self, client):
        for stage in ["sft", "dpo", "kto"]:
            config = {"stage": stage, "output_dir": f"output/test_{stage}"}
            response = client.post("/api/training/start", json=config)
            assert response.status_code == 200


class TestTrainingStatus:
    """Tests for training status"""

    def test_get_training_status(self, client):
        run_id = "test_run_123"
        response = client.get(f"/api/training/status/{run_id}")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)


class TestTrainingStop:
    """Tests for stopping training"""

    def test_stop_training(self, client):
        run_id = "test_run_456"
        response = client.post(f"/api/training/stop/{run_id}")
        assert response.status_code == 200
        data = response.json()
        assert "success" in data


class TestTrainingLogs:
    """Tests for training logs"""

    def test_get_training_logs(self, client):
        run_id = "test_run_789"
        response = client.get(f"/api/training/logs/{run_id}")
        assert response.status_code == 200
        data = response.json()
        assert "logs" in data
        assert "count" in data

    def test_get_logs_with_line_limit(self, client):
        run_id = "test_run_abc"
        response = client.get(f"/api/training/logs/{run_id}?lines=50")
        assert response.status_code == 200
        data = response.json()
        assert data["count"] <= 50


class TestTrainingLoss:
    """Tests for loss history"""

    def test_get_loss_history(self, client):
        run_id = "test_run_xyz"
        response = client.get(f"/api/training/loss/{run_id}")
        assert response.status_code == 200
        data = response.json()
        assert "loss_history" in data
        assert isinstance(data["loss_history"], list)


class TestTrainingConfigSaveLoad:
    """Tests for saving and loading configs"""

    def test_save_config(self, client, sample_training_config):
        response = client.post(
            "/api/training/save?path=test_config.yaml", json=sample_training_config
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") is True or response.status_code == 500


class TestTrainingCheckpoints:
    """Tests for checkpoint management"""

    def test_list_checkpoints_returns_list(self, client):
        response = client.get("/api/training/checkpoints/output/test_run")
        assert response.status_code == 200
        data = response.json()
        assert "checkpoints" in data

    def test_list_checkpoints_format(self, client):
        response = client.get("/api/training/checkpoints/output/test_run")
        data = response.json()
        assert isinstance(data["checkpoints"], list)

    def test_list_outputs_returns_list(self, client):
        response = client.get("/api/training/outputs")
        assert response.status_code == 200
        data = response.json()
        assert "outputs" in data
        assert isinstance(data["outputs"], list)


class TestTrainingResume:
    """Tests for resuming training"""

    def test_resume_training_invalid_path(self, client):
        response = client.post("/api/training/resume/nonexistent_output")
        data = response.json()
        assert "success" in data

    def test_resume_training_returns_run_id_or_error(self, client):
        response = client.post("/api/training/resume/output/test_nonexistent")
        data = response.json()
        assert "success" in data
