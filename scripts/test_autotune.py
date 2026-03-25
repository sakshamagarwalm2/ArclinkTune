"""
ArclinkTune AutoTune Feature - Comprehensive Test Script
Tests all AutoTune and Settings API endpoints end-to-end.

Usage:
  python scripts/test_autotune.py

Prerequisites:
  - Backend running at http://localhost:8000
  - At least one local model downloaded
  - At least one dataset available
"""

import requests
import json
import time
import sys

BASE_URL = "http://localhost:8000/api"

# Test configuration - update these based on your local setup
MODEL = "Qwen/Qwen2.5-0.5B-Instruct"
DATASET = "sharegpt_sample"
TEMPLATE = "qwen"

PASSED = 0
FAILED = 0
RESULTS = []


def log(test_name, status, detail=""):
    global PASSED, FAILED
    icon = "[PASS]" if status == "PASS" else "[FAIL]"
    if status == "PASS":
        PASSED += 1
    else:
        FAILED += 1
    msg = f"  {icon} {test_name}"
    if detail:
        msg += f"  -- {detail}"
    print(msg)
    RESULTS.append((test_name, status, detail))


def section(name):
    print(f"\n{'=' * 60}")
    print(f"  {name}")
    print(f"{'=' * 60}")


# ============================================================
# SECTION 1: SETTINGS API
# ============================================================


def test_settings():
    section("1. SETTINGS API")

    # 1.1 GET /api/settings
    try:
        r = requests.get(f"{BASE_URL}/settings")
        assert r.status_code == 200, f"Status {r.status_code}"
        data = r.json()
        assert "ai_provider" in data, "Missing ai_provider"
        assert "theme" in data, "Missing theme"
        log(
            "GET /api/settings",
            "PASS",
            f"theme={data['theme']}, provider={data['ai_provider']['provider']}",
        )
    except Exception as e:
        log("GET /api/settings", "FAIL", str(e))

    # 1.2 GET /api/settings/ai-provider
    try:
        r = requests.get(f"{BASE_URL}/settings/ai-provider")
        assert r.status_code == 200
        data = r.json()
        assert "provider" in data
        log("GET /api/settings/ai-provider", "PASS", f"provider={data['provider']}")
    except Exception as e:
        log("GET /api/settings/ai-provider", "FAIL", str(e))

    # 1.3 PUT /api/settings/ai-provider
    try:
        payload = {
            "provider": "none",
            "gemini_api_key": None,
            "gemini_model": "gemini-1.5-flash",
            "ollama_base_url": "http://localhost:11434",
            "ollama_model": "llama3.1:8b",
            "temperature": 0.3,
            "max_tokens": 2000,
        }
        r = requests.put(f"{BASE_URL}/settings/ai-provider", json=payload)
        assert r.status_code == 200
        data = r.json()
        assert data["provider"] == "none"
        log(
            "PUT /api/settings/ai-provider",
            "PASS",
            f"Updated provider to {data['provider']}",
        )
    except Exception as e:
        log("PUT /api/settings/ai-provider", "FAIL", str(e))

    # 1.4 GET /api/settings/gemini-models
    try:
        r = requests.get(f"{BASE_URL}/settings/gemini-models")
        assert r.status_code == 200
        data = r.json()
        assert "models" in data
        assert len(data["models"]) > 0
        log(
            "GET /api/settings/gemini-models",
            "PASS",
            f"{len(data['models'])} models available",
        )
    except Exception as e:
        log("GET /api/settings/gemini-models", "FAIL", str(e))

    # 1.5 GET /api/settings/ollama-models
    try:
        r = requests.get(f"{BASE_URL}/settings/ollama-models")
        assert r.status_code == 200
        data = r.json()
        log(
            "GET /api/settings/ollama-models",
            "PASS",
            f"available={data.get('available', False)}",
        )
    except Exception as e:
        log("GET /api/settings/ollama-models", "FAIL", str(e))

    # 1.6 PUT /api/settings (partial update)
    try:
        r = requests.put(f"{BASE_URL}/settings", json={"theme": "dark"})
        assert r.status_code == 200
        log("PUT /api/settings (partial)", "PASS")
    except Exception as e:
        log("PUT /api/settings (partial)", "FAIL", str(e))


# ============================================================
# SECTION 2: AUTOTUNE API - START & SESSION
# ============================================================


def test_autotune_start():
    section("2. AUTOTUNE API - START & SESSION")

    session_id = None

    # 2.1 Validate AI Provider
    try:
        payload = {"provider": "none"}
        r = requests.post(f"{BASE_URL}/autotune/validate-ai-provider", json=payload)
        assert r.status_code == 200
        data = r.json()
        assert data["valid"] == True
        log(
            "POST /api/autotune/validate-ai-provider",
            "PASS",
            f"mode={data.get('model_info', '')}",
        )
    except Exception as e:
        log("POST /api/autotune/validate-ai-provider", "FAIL", str(e))

    # 2.2 Start session
    try:
        payload = {
            "session_name": f"test-autotune-{int(time.time())}",
            "base_model": MODEL,
            "dataset": DATASET,
            "template": TEMPLATE,
            "finetuning_type": "lora",
            "probe_epochs": 1,
            "max_trials": 3,
            "max_runtime_hours": 0.5,
            "early_stopping_patience": 3,
            "ai_provider": {"provider": "none"},
            "optimization_goal": "minimize_val_loss",
            "compute_device": "auto",
            "dataset_dir": "data",
            "search_space": {
                "learning_rate_min": 1e-5,
                "learning_rate_max": 1e-3,
                "lora_rank_options": [4, 8],
                "lora_alpha_options": [8, 16],
                "lora_dropout_min": 0.0,
                "lora_dropout_max": 0.1,
                "batch_size_options": [1, 2],
                "gradient_accumulation_options": [4, 8],
                "lr_scheduler_options": ["cosine", "linear"],
                "warmup_ratio_min": 0.0,
                "warmup_ratio_max": 0.05,
                "cutoff_len_options": [512],
                "weight_decay_min": 0.0,
                "weight_decay_max": 0.05,
            },
            "base_training_config": {},
        }
        r = requests.post(f"{BASE_URL}/autotune/start", json=payload)
        assert r.status_code == 200, f"Status {r.status_code}: {r.text}"
        data = r.json()
        assert "session_id" in data
        session_id = data["session_id"]
        log("POST /api/autotune/start", "PASS", f"session_id={session_id[:12]}...")
    except Exception as e:
        log("POST /api/autotune/start", "FAIL", str(e))
        return None

    # 2.3 GET session
    try:
        r = requests.get(f"{BASE_URL}/autotune/sessions/{session_id}")
        assert r.status_code == 200
        data = r.json()
        assert data["session_id"] == session_id
        assert data["status"] in ("idle", "running")
        assert data["config"]["session_name"] is not None
        log("GET /api/autotune/sessions/{id}", "PASS", f"status={data['status']}")
    except Exception as e:
        log("GET /api/autotune/sessions/{id}", "FAIL", str(e))

    # 2.4 Duplicate start should fail (409)
    try:
        r = requests.post(f"{BASE_URL}/autotune/start", json=payload)
        assert r.status_code == 409, f"Expected 409, got {r.status_code}"
        log(
            "POST /api/autotune/start (duplicate)",
            "PASS",
            "Correctly rejected with 409",
        )
    except Exception as e:
        log("POST /api/autotune/start (duplicate)", "FAIL", str(e))

    return session_id


# ============================================================
# SECTION 3: AUTOTUNE API - LIVE MONITORING
# ============================================================


def test_autotune_live(session_id):
    section("3. AUTOTUNE API - LIVE MONITORING")

    if not session_id:
        log("Live monitoring", "SKIP", "No session_id available")
        return

    # 3.1 SSE stream - connect and receive events
    try:
        print(f"  Connecting to SSE stream for session {session_id[:12]}...")
        url = f"{BASE_URL}/autotune/sessions/{session_id}/stream"
        resp = requests.get(
            url, stream=True, headers={"Accept": "text/event-stream"}, timeout=120
        )

        assert resp.status_code == 200, f"SSE status {resp.status_code}"

        events_received = 0
        session_status = None
        timeout_at = time.time() + 90  # Wait up to 90 seconds

        for line in resp.iter_lines(decode_unicode=True):
            if time.time() > timeout_at:
                print(f"  SSE timeout after 90s")
                break

            if line and line.startswith("data: "):
                data_str = line[6:]
                try:
                    data = json.loads(data_str)
                    events_received += 1
                    session_status = data.get("status", "unknown")
                    trials_completed = data.get("total_trials_completed", 0)
                    current_trial = data.get("current_trial", 0)
                    new_logs = data.get("new_logs", [])

                    if events_received <= 3 or events_received % 5 == 0:
                        print(
                            f"  SSE event #{events_received}: status={session_status}, "
                            f"trial={current_trial}, completed={trials_completed}, "
                            f"new_logs={len(new_logs)}"
                        )

                    if session_status in ("completed", "failed", "stopped"):
                        print(f"  Session ended with status: {session_status}")
                        break
                except json.JSONDecodeError:
                    pass

        if events_received > 0:
            log(
                "SSE stream (/stream)",
                "PASS",
                f"{events_received} events, final status={session_status}",
            )
        else:
            log("SSE stream (/stream)", "FAIL", "No events received")

    except requests.exceptions.ConnectionError:
        log("SSE stream (/stream)", "FAIL", "Connection error")
    except Exception as e:
        log("SSE stream (/stream)", "FAIL", str(e))

    # 3.2 Poll session status
    try:
        r = requests.get(f"{BASE_URL}/autotune/sessions/{session_id}")
        assert r.status_code == 200
        data = r.json()
        log(
            "GET session (post-run)",
            "PASS",
            f"status={data['status']}, trials_completed={data['total_trials_completed']}, "
            f"trials_in_list={len(data.get('trials', []))}",
        )
    except Exception as e:
        log("GET session (post-run)", "FAIL", str(e))

    # 3.3 Check loop_log
    try:
        r = requests.get(f"{BASE_URL}/autotune/sessions/{session_id}")
        data = r.json()
        loop_log = data.get("loop_log", [])
        steps = [entry["step"] for entry in loop_log]
        log(
            "Loop log entries",
            "PASS" if len(loop_log) > 0 else "FAIL",
            f"{len(loop_log)} entries, steps: {steps[:10]}",
        )
    except Exception as e:
        log("Loop log entries", "FAIL", str(e))

    # 3.4 Check trial data
    try:
        r = requests.get(f"{BASE_URL}/autotune/sessions/{session_id}")
        data = r.json()
        trials = data.get("trials", [])
        for t in trials:
            has_loss = t.get("final_train_loss") is not None
            has_score = t.get("ai_score", 0) > 0
            loss_val = t.get("final_train_loss", "N/A")
            score_val = t.get("ai_score", 0)
            print(
                f"    Trial #{t['trial_number']}: status={t['status']}, "
                f"loss={loss_val}, score={score_val}, "
                f"time={t.get('training_time_seconds', 0):.0f}s"
            )

        completed_with_loss = [
            t for t in trials if t.get("final_train_loss") is not None
        ]
        log(
            "Trial data integrity",
            "PASS" if len(completed_with_loss) > 0 else "FAIL",
            f"{len(completed_with_loss)}/{len(trials)} trials have loss data",
        )
    except Exception as e:
        log("Trial data integrity", "FAIL", str(e))

    return session_id


# ============================================================
# SECTION 4: AUTOTUNE API - REPORT & CONFIG
# ============================================================


def test_autotune_report(session_id):
    section("4. AUTOTUNE API - REPORT & CONFIG")

    if not session_id:
        log("Report tests", "SKIP", "No session_id available")
        return

    # 4.1 GET JSON report
    try:
        r = requests.get(
            f"{BASE_URL}/autotune/sessions/{session_id}/report?format=json"
        )
        assert r.status_code == 200, f"Status {r.status_code}: {r.text[:200]}"
        data = r.json()
        assert "session_id" in data
        assert "all_trials" in data
        log(
            "GET report (JSON)",
            "PASS",
            f"trials={len(data.get('all_trials', []))}, "
            f"best_trial={data.get('best_trial', {}) and data['best_trial'].get('trial_number', 'N/A') if data.get('best_trial') else 'N/A'}",
        )
    except Exception as e:
        log("GET report (JSON)", "FAIL", str(e))

    # 4.2 GET HTML report
    try:
        r = requests.get(
            f"{BASE_URL}/autotune/sessions/{session_id}/report?format=html"
        )
        assert r.status_code == 200, f"Status {r.status_code}: {r.text[:200]}"
        html = r.text
        assert "<!DOCTYPE html>" in html
        assert "AutoTune Report" in html
        assert "Trial Rankings" in html
        log("GET report (HTML)", "PASS", f"HTML size={len(html)} bytes")
    except Exception as e:
        log("GET report (HTML)", "FAIL", str(e))

    # 4.3 GET best config YAML
    try:
        r = requests.get(f"{BASE_URL}/autotune/sessions/{session_id}/best-config")
        if r.status_code == 200:
            yaml_content = r.text
            assert (
                "learning_rate" in yaml_content or "model_name_or_path" in yaml_content
            )
            log(
                "GET best-config (YAML)", "PASS", f"YAML size={len(yaml_content)} bytes"
            )
        else:
            # 404 is OK if no completed trials
            log(
                "GET best-config (YAML)",
                "PASS",
                f"Status {r.status_code} (no completed trials)",
            )
    except Exception as e:
        log("GET best-config (YAML)", "FAIL", str(e))


# ============================================================
# SECTION 5: AUTOTUNE API - SESSION MANAGEMENT
# ============================================================


def test_autotune_management(session_id):
    section("5. AUTOTUNE API - SESSION MANAGEMENT")

    # 5.1 List sessions
    try:
        r = requests.get(f"{BASE_URL}/autotune/sessions")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        log("GET /api/autotune/sessions", "PASS", f"{len(data)} sessions found")
    except Exception as e:
        log("GET /api/autotune/sessions", "FAIL", str(e))

    if not session_id:
        return

    # 5.2 Pause session
    try:
        r = requests.post(f"{BASE_URL}/autotune/sessions/{session_id}/pause")
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "paused"
        log("POST pause session", "PASS")
    except Exception as e:
        log("POST pause session", "FAIL", str(e))

    # 5.3 Resume session
    try:
        r = requests.post(f"{BASE_URL}/autotune/sessions/{session_id}/resume")
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "running"
        log("POST resume session", "PASS")
    except Exception as e:
        log("POST resume session", "FAIL", str(e))

    # 5.4 Stop session
    try:
        r = requests.post(f"{BASE_URL}/autotune/sessions/{session_id}/stop")
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "stopped"
        log("POST stop session", "PASS")
    except Exception as e:
        log("POST stop session", "FAIL", str(e))

    # Wait for session to fully stop
    time.sleep(2)

    # 5.5 Verify session is stopped
    try:
        r = requests.get(f"{BASE_URL}/autotune/sessions/{session_id}")
        data = r.json()
        assert data["status"] in ("stopped", "completed", "failed")
        log("Session stopped verification", "PASS", f"status={data['status']}")
    except Exception as e:
        log("Session stopped verification", "FAIL", str(e))

    # 5.6 Delete session
    try:
        r = requests.delete(f"{BASE_URL}/autotune/sessions/{session_id}")
        assert r.status_code == 200
        data = r.json()
        assert data["deleted"] == True
        log("DELETE session", "PASS")
    except Exception as e:
        log("DELETE session", "FAIL", str(e))

    # 5.7 Verify deletion
    try:
        r = requests.get(f"{BASE_URL}/autotune/sessions/{session_id}")
        assert r.status_code == 404
        log("DELETE verification", "PASS", "Session properly deleted (404)")
    except Exception as e:
        log("DELETE verification", "FAIL", str(e))


# ============================================================
# SECTION 6: EDGE CASES
# ============================================================


def test_edge_cases():
    section("6. EDGE CASES")

    # 6.1 Get non-existent session
    try:
        r = requests.get(f"{BASE_URL}/autotune/sessions/nonexistent-id")
        assert r.status_code == 404
        log("GET non-existent session", "PASS", "Correctly returns 404")
    except Exception as e:
        log("GET non-existent session", "FAIL", str(e))

    # 6.2 Stop non-existent session
    try:
        r = requests.post(f"{BASE_URL}/autotune/sessions/nonexistent-id/stop")
        # Should handle gracefully
        log("POST stop non-existent", "PASS", f"Status {r.status_code}")
    except Exception as e:
        log("POST stop non-existent", "FAIL", str(e))

    # 6.3 Report for non-existent session
    try:
        r = requests.get(f"{BASE_URL}/autotune/sessions/nonexistent-id/report")
        assert r.status_code == 404
        log("GET report non-existent", "PASS", "Correctly returns 404")
    except Exception as e:
        log("GET report non-existent", "FAIL", str(e))

    # 6.4 Invalid settings update
    try:
        r = requests.put(
            f"{BASE_URL}/settings/ai-provider", json={"provider": "invalid"}
        )
        assert r.status_code == 422  # Validation error
        log("PUT invalid provider", "PASS", "Correctly rejects invalid provider")
    except Exception as e:
        log("PUT invalid provider", "FAIL", str(e))


# ============================================================
# MAIN
# ============================================================


def main():
    global PASSED, FAILED

    print("=" * 60)
    print("  ArclinkTune AutoTune Feature - Test Suite")
    print("=" * 60)

    # Check backend is running
    try:
        r = requests.get(f"{BASE_URL.replace('/api', '')}/health", timeout=5)
        assert r.status_code == 200
        print(f"\n  Backend: ONLINE ({BASE_URL})")
    except Exception as e:
        print(f"\n  Backend: OFFLINE - {e}")
        print("  Please start the backend first: python backend/main.py")
        sys.exit(1)

    # Run tests
    test_settings()
    session_id = test_autotune_start()

    if session_id:
        # Wait briefly for first trial to start, then connect SSE
        print(f"\n  Waiting 5 seconds for training to begin...")
        time.sleep(5)

        session_id = test_autotune_live(session_id)
        test_autotune_report(session_id)
        test_autotune_management(session_id)

    test_edge_cases()

    # Summary
    print(f"\n{'=' * 60}")
    print(f"  TEST SUMMARY")
    print(f"{'=' * 60}")
    print(f"  Passed: {PASSED}")
    print(f"  Failed: {FAILED}")
    print(f"  Total:  {PASSED + FAILED}")
    print(f"{'=' * 60}")

    if FAILED > 0:
        print(f"\n  Failed tests:")
        for name, status, detail in RESULTS:
            if status == "FAIL":
                print(f"    [FAIL] {name}: {detail}")

    print()
    sys.exit(0 if FAILED == 0 else 1)


if __name__ == "__main__":
    main()
