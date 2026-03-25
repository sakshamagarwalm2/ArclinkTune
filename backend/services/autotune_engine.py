import asyncio
import json
import logging
import math
import os
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional, List
from uuid import uuid4

from models.autotune_models import (
    AutoTuneConfig,
    AutoTuneSession,
    TrialConfig,
    TrialResult,
    LoopLogEntry,
    AIProviderConfig,
)
from services.ai_advisor import AIAdvisor

logger = logging.getLogger(__name__)

SESSIONS_DIR = Path(__file__).parent.parent.parent / "autotune_sessions"


def _now_str() -> str:
    return datetime.now().isoformat()


class AutoTuneEngine:
    def __init__(self, training_service):
        self.training_service = training_service
        self.sessions: Dict[str, AutoTuneSession] = {}
        self._locks: Dict[str, asyncio.Lock] = {}
        self._tasks: Dict[str, asyncio.Task] = {}
        SESSIONS_DIR.mkdir(parents=True, exist_ok=True)
        self._load_existing_sessions()

    def _load_existing_sessions(self):
        if not SESSIONS_DIR.exists():
            return
        for f in SESSIONS_DIR.glob("*.json"):
            try:
                with open(f, "r", encoding="utf-8") as fh:
                    data = json.load(fh)
                    session = AutoTuneSession(**data)
                    self.sessions[session.session_id] = session
                    self._locks[session.session_id] = asyncio.Lock()
            except Exception as e:
                logger.warning(f"Failed to load session from {f}: {e}")

    def _save_session(self, session: AutoTuneSession):
        path = SESSIONS_DIR / f"{session.session_id}.json"
        data = session.model_dump(mode="json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, default=str)

    def _log_step(self, session: AutoTuneSession, step_type: str, message: str):
        entry = LoopLogEntry(timestamp=_now_str(), step=step_type, message=message)
        session.loop_log.append(entry)
        logger.info(f"[AutoTune][{session.session_id}] [{step_type}] {message}")

    def _get_best_trial(self, session: AutoTuneSession) -> Optional[TrialResult]:
        completed = [
            t
            for t in session.trials
            if t.status == "completed" and t.final_train_loss is not None
        ]
        if not completed:
            return None
        return min(completed, key=lambda t: t.final_train_loss)

    def _update_best_trial(self, session: AutoTuneSession):
        best = self._get_best_trial(session)
        if best:
            session.best_trial_id = best.trial_id
            completed = sorted(
                [t for t in session.trials if t.status == "completed"],
                key=lambda t: t.ai_score,
                reverse=True,
            )
            for i, t in enumerate(completed):
                t.rank = i + 1

    def _should_early_stop(self, loss_curve: List[Dict], patience: int) -> bool:
        if len(loss_curve) < patience * 5:
            return False
        recent = loss_curve[-patience * 5 :]
        first_loss = recent[0].get("loss", None)
        last_loss = recent[-1].get("loss", None)
        if first_loss is None or last_loss is None:
            return False
        if first_loss == 0:
            return False
        improvement = (first_loss - last_loss) / abs(first_loss)
        return improvement < 0.01

    def _build_training_config(
        self, session: AutoTuneSession, trial_config: TrialConfig
    ) -> Dict[str, Any]:
        base = (
            dict(session.config.base_training_config)
            if session.config.base_training_config
            else {}
        )

        # Strip file extension from dataset name (LlamaFactory uses dataset_info.json names)
        dataset_name = session.config.dataset
        for ext in (".json", ".jsonl", ".csv", ".yaml", ".parquet"):
            if dataset_name.endswith(ext):
                dataset_name = dataset_name[: -len(ext)]
                break

        base.update(
            {
                "model_name_or_path": session.config.base_model,
                "dataset": dataset_name,
                "dataset_dir": session.config.dataset_dir,
                "template": session.config.template,
                "finetuning_type": session.config.finetuning_type,
                "stage": "sft",
                "num_train_epochs": session.config.probe_epochs,
                "learning_rate": trial_config.learning_rate,
                "lora_rank": trial_config.lora_rank,
                "lora_alpha": trial_config.lora_alpha,
                "lora_dropout": trial_config.lora_dropout,
                "lora_target": "all",
                "per_device_train_batch_size": trial_config.per_device_train_batch_size,
                "gradient_accumulation_steps": trial_config.gradient_accumulation_steps,
                "lr_scheduler_type": trial_config.lr_scheduler_type,
                "warmup_ratio": trial_config.warmup_ratio,
                "cutoff_len": trial_config.cutoff_len,
                "weight_decay": trial_config.weight_decay,
                "bf16": True,
                "logging_steps": 5,
                "save_steps": 100,
                "do_train": True,
                "plot_loss": True,
                "trust_remote_code": True,
                "include_num_input_tokens_seen": True,
                "report_to": ["none"],
                "output_dir": str(
                    Path("output")
                    / f"autotune_{session.session_id}"
                    / f"trial_{trial_config.trial_number}"
                ),
            }
        )

        # Map compute_device to LlamaFactory format (same as TrainingConfig.to_dict)
        compute_device = session.config.compute_device
        if compute_device == "cpu":
            base["use_cpu"] = True
        elif compute_device in ("cuda", "auto"):
            base["use_cpu"] = False
            if compute_device == "cuda":
                base["device"] = "cuda"

        return base

    async def _start_trial_training(
        self, session: AutoTuneSession, trial_config: TrialConfig
    ) -> str:
        cfg = self._build_training_config(session, trial_config)
        run_id, output_dir = await asyncio.to_thread(
            self.training_service.start_training, cfg
        )
        return run_id

    async def _run_loop(self, session_id: str):
        session = self.sessions.get(session_id)
        if not session:
            return

        lock = self._locks[session_id]
        advisor = AIAdvisor(session.config.ai_provider)

        try:
            async with lock:
                session.status = "running"
                session.start_time = _now_str()
                self._save_session(session)
                self._log_step(
                    session,
                    "system",
                    f"AutoTune session started: {session.config.session_name}",
                )

            start_epoch = datetime.now()

            while (
                session.total_trials_completed < session.config.max_trials
                and session.status in ("running",)
            ):
                elapsed = (datetime.now() - start_epoch).total_seconds()
                if elapsed > session.config.max_runtime_hours * 3600:
                    self._log_step(
                        session, "system", "Runtime limit reached. Stopping."
                    )
                    break

                trial_number = session.total_trials_completed + 1

                # ═══ THINK STEP ═══
                async with lock:
                    self._log_step(
                        session,
                        "think",
                        f"Trial {trial_number}: AI is selecting configuration...",
                    )
                    self._save_session(session)

                try:
                    if trial_number == 1:
                        trial_config, reasoning = await advisor.think_initial(
                            session.config
                        )
                    else:
                        completed_trials = [
                            t for t in session.trials if t.status == "completed"
                        ]
                        best = self._get_best_trial(session)
                        trial_config, reasoning = await advisor.think_next(
                            session.config, completed_trials, best
                        )
                    trial_config.trial_id = str(uuid4())
                    trial_config.trial_number = trial_number
                except Exception as e:
                    logger.error(f"Think step failed for trial {trial_number}: {e}")
                    from services.param_search import find_unique_config

                    previous_configs = [t.config for t in session.trials]
                    trial_config = find_unique_config(
                        session.config.search_space, trial_number, previous_configs
                    )
                    trial_config.trial_id = str(uuid4())
                    trial_config.trial_number = trial_number
                    reasoning = f"Fallback: {e}"

                async with lock:
                    trial_result = TrialResult(
                        trial_id=trial_config.trial_id,
                        trial_number=trial_number,
                        config=trial_config,
                        status="running",
                    )
                    session.trials.append(trial_result)
                    session.current_trial = trial_number
                    self._log_step(
                        session,
                        "think",
                        f"Trial {trial_number}: lr={trial_config.learning_rate}, "
                        f"rank={trial_config.lora_rank}, alpha={trial_config.lora_alpha}",
                    )
                    self._save_session(session)

                # ═══ TRAIN STEP ═══
                async with lock:
                    self._log_step(
                        session, "train", f"Trial {trial_number}: Starting training..."
                    )

                try:
                    run_id = await self._start_trial_training(session, trial_config)
                except Exception as e:
                    logger.error(
                        f"Failed to start training for trial {trial_number}: {e}"
                    )
                    async with lock:
                        trial_result.status = "failed"
                        trial_result.ai_evaluation = f"Training failed to start: {e}"
                        session.total_trials_completed += 1
                        self._save_session(session)
                    continue

                loss_curve: List[Dict[str, Any]] = []
                poll_count = 0
                while True:
                    await asyncio.sleep(5)
                    poll_count += 1
                    try:
                        status_info = await asyncio.to_thread(
                            self.training_service.get_status, run_id
                        )

                        if "error" in status_info:
                            logger.warning(
                                f"[AutoTune] Poll {poll_count}: run_id {run_id} not found yet, retrying..."
                            )
                            if poll_count > 3:
                                logger.error(
                                    f"[AutoTune] Training run {run_id} disappeared after {poll_count} polls"
                                )
                                status = "failed"
                                break
                            continue

                        status = status_info.get("status", "unknown")
                        losses = status_info.get("loss_history", [])
                        elapsed_secs = status_info.get("elapsed_seconds", 0)

                        loss_curve = [
                            {"step": i, "loss": l} for i, l in enumerate(losses)
                        ]

                        logger.info(
                            f"[AutoTune] Trial {trial_number} poll {poll_count}: "
                            f"status={status}, loss_points={len(loss_curve)}, "
                            f"elapsed={elapsed_secs}s"
                        )

                        async with lock:
                            trial_result.loss_curve = loss_curve
                            trial_result.training_time_seconds = elapsed_secs
                            self._save_session(session)

                        if self._should_early_stop(
                            loss_curve, session.config.early_stopping_patience
                        ):
                            self._log_step(
                                session,
                                "train",
                                f"Trial {trial_number}: Early stopping triggered",
                            )
                            await asyncio.to_thread(
                                self.training_service.stop_training, run_id, True
                            )
                            status = "stopped"
                            break

                        if status in ("completed", "stopped", "failed"):
                            break
                    except Exception as e:
                        logger.error(f"[AutoTune] Error polling training status: {e}")
                        status = "failed"
                        break

                async with lock:
                    if loss_curve:
                        trial_result.final_train_loss = loss_curve[-1].get("loss")
                    trial_result.loss_curve = loss_curve

                    try:
                        final_status = await asyncio.to_thread(
                            self.training_service.get_status, run_id
                        )
                        trial_result.final_train_loss = (
                            final_status.get("loss_history", [None])[-1]
                            or trial_result.final_train_loss
                        )
                        trial_result.training_time_seconds = final_status.get(
                            "elapsed_seconds", trial_result.training_time_seconds
                        )
                    except Exception:
                        pass

                    # Check if training produced results
                    if trial_result.final_train_loss is None and status != "failed":
                        # Training "completed" but no loss - check logs for errors
                        try:
                            logs = await asyncio.to_thread(
                                self.training_service.get_logs, run_id, 20
                            )
                            error_lines = [
                                l
                                for l in logs
                                if any(
                                    kw in l.lower()
                                    for kw in [
                                        "error",
                                        "exception",
                                        "traceback",
                                        "failed",
                                        "not found",
                                    ]
                                )
                            ]
                            if error_lines:
                                status = "failed"
                                logger.error(
                                    f"[AutoTune] Trial {trial_number} failed. Error lines from training log:\n"
                                    + "\n".join(error_lines[-5:])
                                )
                        except Exception:
                            pass

                    trial_result.status = (
                        "completed" if status != "failed" else "failed"
                    )
                    self._log_step(
                        session,
                        "train",
                        f"Trial {trial_number}: Training {trial_result.status}. "
                        f"Loss={trial_result.final_train_loss}, "
                        f"Time={trial_result.training_time_seconds:.0f}s",
                    )

                # ═══ EVALUATE STEP ═══
                async with lock:
                    self._log_step(
                        session,
                        "evaluate",
                        f"Trial {trial_number}: Evaluating results...",
                    )

                try:
                    all_prev = [
                        t for t in session.trials if t.trial_id != trial_result.trial_id
                    ]
                    score, evaluation = await advisor.evaluate_trial(
                        trial_config, trial_result, all_prev
                    )
                    async with lock:
                        trial_result.ai_score = score
                        trial_result.ai_evaluation = evaluation
                except Exception as e:
                    logger.error(f"Evaluate step failed: {e}")
                    async with lock:
                        trial_result.ai_score = 5.0
                        trial_result.ai_evaluation = f"Evaluation failed: {e}"

                # ═══ FEEDBACK STEP ═══
                async with lock:
                    session.total_trials_completed += 1
                    self._update_best_trial(session)
                    self._log_step(
                        session,
                        "feedback",
                        f"Trial {trial_number}: Score={trial_result.ai_score:.1f}/10. "
                        f"Best trial: {self._get_best_trial(session).trial_number if self._get_best_trial(session) else 'N/A'}",
                    )
                    self._save_session(session)

            # ═══ SESSION COMPLETE ═══
            async with lock:
                if session.status == "running":
                    session.status = "completed"
                session.end_time = _now_str()
                self._log_step(session, "system", "Generating session summary...")

            try:
                summary = await advisor.generate_session_summary(session)
                async with lock:
                    session.ai_session_summary = summary
            except Exception as e:
                async with lock:
                    session.ai_session_summary = f"Summary generation failed: {e}"

            async with lock:
                self._save_session(session)

        except asyncio.CancelledError:
            async with lock:
                session.status = "stopped"
                session.end_time = _now_str()
                self._log_step(session, "system", "Session was cancelled")
                self._save_session(session)
        except Exception as e:
            logger.error(f"AutoTune loop error: {e}", exc_info=True)
            async with lock:
                session.status = "failed"
                session.end_time = _now_str()
                self._log_step(session, "system", f"Session failed: {e}")
                self._save_session(session)

    async def start_session(self, config: AutoTuneConfig) -> str:
        session_id = str(uuid4())
        session = AutoTuneSession(
            session_id=session_id,
            config=config,
            status="idle",
        )
        self.sessions[session_id] = session
        self._locks[session_id] = asyncio.Lock()
        self._save_session(session)

        task = asyncio.create_task(self._run_loop(session_id))
        self._tasks[session_id] = task
        return session_id

    async def pause_session(self, session_id: str):
        session = self.sessions.get(session_id)
        if session and session.status == "running":
            async with self._locks[session_id]:
                session.status = "paused"
                self._log_step(session, "system", "Session paused by user")
                self._save_session(session)

    async def resume_session(self, session_id: str):
        session = self.sessions.get(session_id)
        if session and session.status == "paused":
            async with self._locks[session_id]:
                session.status = "running"
                self._log_step(session, "system", "Session resumed by user")
                self._save_session(session)

    async def stop_session(self, session_id: str):
        session = self.sessions.get(session_id)
        if not session:
            return
        async with self._locks[session_id]:
            session.status = "stopped"
            session.end_time = _now_str()
            self._log_step(session, "system", "Session stopped by user")
            self._save_session(session)
        task = self._tasks.get(session_id)
        if task and not task.done():
            task.cancel()

    def get_session(self, session_id: str) -> Optional[AutoTuneSession]:
        return self.sessions.get(session_id)

    def list_sessions(self) -> List[AutoTuneSession]:
        return sorted(
            self.sessions.values(), key=lambda s: s.start_time or "", reverse=True
        )

    def delete_session(self, session_id: str) -> bool:
        task = self._tasks.get(session_id)
        if task and not task.done():
            task.cancel()
        if session_id in self.sessions:
            del self.sessions[session_id]
        if session_id in self._locks:
            del self._locks[session_id]
        if session_id in self._tasks:
            del self._tasks[session_id]
        path = SESSIONS_DIR / f"{session_id}.json"
        if path.exists():
            path.unlink()
            return True
        return False
