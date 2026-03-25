import asyncio
import json
import logging
from typing import Optional, Dict, Any

from fastapi import APIRouter, HTTPException
from fastapi.responses import HTMLResponse, Response
from pydantic import BaseModel

from sse_starlette.sse import EventSourceResponse

from models.autotune_models import AutoTuneConfig, AIProviderConfig
from services.autotune_engine import AutoTuneEngine
from services.report_generator import (
    generate_html_report,
    generate_json_report,
    get_ready_to_use_yaml,
)

router = APIRouter()
logger = logging.getLogger(__name__)

_engine: Optional[AutoTuneEngine] = None


def get_autotune_engine(training_service) -> AutoTuneEngine:
    global _engine
    if _engine is None:
        _engine = AutoTuneEngine(training_service)
    return _engine


def set_autotune_engine(engine: AutoTuneEngine):
    global _engine
    _engine = engine


@router.post("/start")
async def start_autotune(config: AutoTuneConfig):
    if _engine is None:
        raise HTTPException(status_code=500, detail="AutoTune engine not initialized")

    active = [s for s in _engine.sessions.values() if s.status == "running"]
    if active:
        raise HTTPException(
            status_code=409,
            detail=f"Session {active[0].session_id} is already running. Stop it first.",
        )

    if not config.session_name:
        from datetime import datetime

        config.session_name = f"autotune-{datetime.now().strftime('%Y%m%d-%H%M%S')}"

    session_id = await _engine.start_session(config)
    return {"session_id": session_id, "status": "started"}


@router.get("/sessions")
async def list_sessions():
    if _engine is None:
        return []
    sessions = _engine.list_sessions()
    return [s.model_dump(mode="json") for s in sessions]


@router.get("/sessions/{session_id}")
async def get_session(session_id: str):
    if _engine is None:
        raise HTTPException(status_code=404, detail="Engine not initialized")
    session = _engine.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session.model_dump(mode="json")


@router.get("/sessions/{session_id}/stream")
async def stream_session(session_id: str):
    if _engine is None:
        raise HTTPException(status_code=404, detail="Engine not initialized")

    async def event_generator():
        last_log_len = 0
        last_trial_count = 0

        while True:
            session = _engine.get_session(session_id)
            if not session:
                yield {
                    "event": "error",
                    "data": json.dumps({"error": "Session not found"}),
                }
                break

            data = {
                "session_id": session.session_id,
                "status": session.status,
                "current_trial": session.current_trial,
                "total_trials_completed": session.total_trials_completed,
                "best_trial_id": session.best_trial_id,
                "trials": [
                    {
                        "trial_id": t.trial_id,
                        "trial_number": t.trial_number,
                        "status": t.status,
                        "final_train_loss": t.final_train_loss,
                        "ai_score": t.ai_score,
                        "ai_evaluation": t.ai_evaluation,
                        "training_time_seconds": t.training_time_seconds,
                        "loss_curve": t.loss_curve[-50:] if t.loss_curve else [],
                        "config": t.config.model_dump(),
                    }
                    for t in session.trials
                ],
            }

            new_logs = session.loop_log[last_log_len:]
            if new_logs:
                data["new_logs"] = [entry.model_dump() for entry in new_logs]
                last_log_len = len(session.loop_log)

            if session.total_trials_completed > last_trial_count:
                data["event_type"] = "trial_complete"
                last_trial_count = session.total_trials_completed
            elif session.status in ("completed", "failed", "stopped"):
                data["event_type"] = "session_complete"
            else:
                data["event_type"] = "update"

            yield {"event": "message", "data": json.dumps(data, default=str)}

            if session.status in ("completed", "failed", "stopped"):
                break

            await asyncio.sleep(5)

    return EventSourceResponse(event_generator())


@router.post("/sessions/{session_id}/pause")
async def pause_session(session_id: str):
    if _engine is None:
        raise HTTPException(status_code=404, detail="Engine not initialized")
    await _engine.pause_session(session_id)
    return {"status": "paused"}


@router.post("/sessions/{session_id}/resume")
async def resume_session(session_id: str):
    if _engine is None:
        raise HTTPException(status_code=404, detail="Engine not initialized")
    await _engine.resume_session(session_id)
    return {"status": "running"}


@router.post("/sessions/{session_id}/stop")
async def stop_session(session_id: str):
    if _engine is None:
        raise HTTPException(status_code=404, detail="Engine not initialized")
    await _engine.stop_session(session_id)
    return {"status": "stopped"}


@router.get("/sessions/{session_id}/report")
async def get_report(session_id: str, format: str = "html"):
    if _engine is None:
        raise HTTPException(status_code=404, detail="Engine not initialized")
    session = _engine.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    try:
        if format == "json":
            report = generate_json_report(session)
            return report
        else:
            html = generate_html_report(session)
            return HTMLResponse(content=html)
    except Exception as e:
        logger.error(f"Report generation failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=500, detail=f"Report generation failed: {str(e)}"
        )


@router.get("/sessions/{session_id}/best-config")
async def get_best_config(session_id: str):
    if _engine is None:
        raise HTTPException(status_code=404, detail="Engine not initialized")
    session = _engine.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    completed = [t for t in session.trials if t.status == "completed"]
    if not completed:
        raise HTTPException(status_code=404, detail="No completed trials")

    best = max(completed, key=lambda t: t.ai_score)
    yaml_str = get_ready_to_use_yaml(best, session)

    return Response(
        content=yaml_str,
        media_type="application/x-yaml",
        headers={
            "Content-Disposition": f"attachment; filename=best_config_{session_id}.yaml"
        },
    )


@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    if _engine is None:
        raise HTTPException(status_code=404, detail="Engine not initialized")
    success = _engine.delete_session(session_id)
    if not success:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"deleted": True}


class ValidateProviderRequest(BaseModel):
    provider: str = "none"
    gemini_api_key: Optional[str] = None
    gemini_model: str = "gemini-1.5-flash"
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.1:8b"


@router.post("/validate-ai-provider")
async def validate_ai_provider(req: ValidateProviderRequest):
    config = AIProviderConfig(
        provider=req.provider,
        gemini_api_key=req.gemini_api_key,
        gemini_model=req.gemini_model,
        ollama_base_url=req.ollama_base_url,
        ollama_model=req.ollama_model,
    )

    if config.provider == "none":
        return {"valid": True, "error": None, "model_info": "Rule-based mode"}

    from services.ai_advisor import AIAdvisor

    advisor = AIAdvisor(config)
    try:
        if config.provider == "gemini":
            response = await advisor._call_gemini("Respond with exactly: OK")
            return {"valid": True, "error": None, "model_info": response[:100]}
        elif config.provider == "ollama":
            response = await advisor._call_ollama("Respond with exactly: OK")
            return {"valid": True, "error": None, "model_info": response[:100]}
    except Exception as e:
        return {"valid": False, "error": str(e), "model_info": None}
