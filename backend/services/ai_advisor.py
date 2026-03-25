import json
import asyncio
import re
import math
import random
import logging
from typing import Optional, List, Tuple, Dict, Any
from uuid import uuid4

from models.autotune_models import (
    AIProviderConfig,
    AutoTuneConfig,
    TrialConfig,
    TrialResult,
    AutoTuneSession,
    SearchSpace,
)
from services.param_search import (
    generate_random_config,
    find_unique_config,
    configs_are_similar,
)

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are an expert machine learning engineer specializing in LLM fine-tuning optimization.
You have deep knowledge of LoRA fine-tuning, training dynamics, loss landscapes, and 
hyperparameter sensitivity for transformer models.

Your role is to act as an intelligent AutoTune advisor: you analyze training results and 
suggest the next hyperparameter configuration to try, guided by empirical evidence from 
previous trials.

You think like a Bayesian optimizer: each trial gives you information, and you use that 
information to narrow down the best region of the parameter space.

CRITICAL: Always respond with ONLY valid JSON. No markdown, no code fences, no explanation 
outside the JSON object."""

THINK_INITIAL_TEMPLATE = """<task>
You are starting a new AutoTune session. Choose the FIRST trial hyperparameter configuration.
This should be a good "baseline" starting point — neither too conservative nor too aggressive.
</task>

<session_info>
Base Model: {base_model}
Dataset: {dataset}
Template: {template}
Optimization Goal: {optimization_goal}
Probe Epochs: {probe_epochs}
Fine-tuning Type: {finetuning_type}
</session_info>

<search_space>
Learning Rate: {lr_min} to {lr_max}
LoRA Rank Options: {lora_rank_options}
LoRA Alpha Options: {lora_alpha_options}
LoRA Dropout: {dropout_min} to {dropout_max}
Batch Size Options: {batch_size_options}
Gradient Accumulation Options: {grad_accum_options}
LR Schedulers: {scheduler_options}
Warmup Ratio: {warmup_min} to {warmup_max}
Cutoff Length Options: {cutoff_options}
Weight Decay: {wd_min} to {wd_max}
</search_space>

<response_schema>
{{
  "learning_rate": float,
  "lora_rank": int,
  "lora_alpha": int,
  "lora_dropout": float,
  "per_device_train_batch_size": int,
  "gradient_accumulation_steps": int,
  "lr_scheduler_type": string,
  "warmup_ratio": float,
  "cutoff_len": int,
  "weight_decay": float,
  "reasoning": "Step-by-step explanation of why you chose these values as a starting baseline",
  "hypothesis": "What you expect to happen in this trial — specific prediction about loss behavior"
}}
</response_schema>"""

THINK_NEXT_TEMPLATE = """<task>
Based on the completed trials below, choose the NEXT hyperparameter configuration to try.
Do NOT repeat a configuration that has already been tried.
Think systematically: what did you learn from previous trials? What region of the 
parameter space should you explore next?
</task>

<completed_trials>
{trial_history}
</completed_trials>

<current_best>
{current_best_summary}
</current_best>

<session_info>
Base Model: {base_model}
Dataset: {dataset}
Optimization Goal: {optimization_goal}
Probe Epochs: {probe_epochs}
</session_info>

<search_space>
Learning Rate: {lr_min} to {lr_max}
LoRA Rank Options: {lora_rank_options}
LoRA Alpha Options: {lora_alpha_options}
LoRA Dropout: {dropout_min} to {dropout_max}
Batch Size Options: {batch_size_options}
Gradient Accumulation Options: {grad_accum_options}
LR Schedulers: {scheduler_options}
Warmup Ratio: {warmup_min} to {warmup_max}
Cutoff Length Options: {cutoff_options}
Weight Decay: {wd_min} to {wd_max}
</search_space>

<response_schema>
{{
  "learning_rate": float,
  "lora_rank": int,
  "lora_alpha": int,
  "lora_dropout": float,
  "per_device_train_batch_size": int,
  "gradient_accumulation_steps": int,
  "lr_scheduler_type": string,
  "warmup_ratio": float,
  "cutoff_len": int,
  "weight_decay": float,
  "reasoning": "Step-by-step explanation of what you learned and why you chose these next values",
  "hypothesis": "What you expect this trial will reveal compared to previous ones",
  "what_changed_from_best": "Explanation of what you changed from the current best trial and why",
  "exploration_vs_exploitation": "Are you exploring a new region or refining the best region? Why?"
}}
</response_schema>"""

EVALUATE_TEMPLATE = """<task>
Evaluate the quality of this trial's training results. Give it a score from 0-10 where:
10 = excellent (low loss, smooth curve, fast convergence)
7-9 = good (decent results, minor issues)
4-6 = mediocre (high loss or problematic training dynamics)
1-3 = poor (diverging, very high loss, training failure)
0 = failed
</task>

<trial_config>
Learning Rate: {lr}
LoRA Rank: {rank}, Alpha: {alpha}, Dropout: {dropout}
Batch Size: {batch}, Gradient Accumulation: {grad_accum}
LR Scheduler: {scheduler}, Warmup Ratio: {warmup}
Cutoff Len: {cutoff}, Weight Decay: {weight_decay}
</trial_config>

<trial_results>
Final train loss: {final_loss}
Loss curve summary: started at {first_loss}, ended at {last_loss}, trend: {trend}
Training time: {time_seconds}s
Status: {status}
</trial_results>

<context>
{trial_count} trials completed so far.
Best loss seen so far: {best_loss} (Trial {best_trial})
Average loss across trials: {avg_loss}
</context>

<response_schema>
{{
  "score": float (0-10),
  "evaluation": "Detailed analysis of what this trial revealed. Comment on: loss magnitude, curve shape, convergence speed, comparison to previous trials",
  "key_insight": "One key insight from this trial that should inform future trials",
  "concerns": "Any concerning patterns observed (divergence, spiky loss, etc.)"
}}
</response_schema>"""

SUMMARY_TEMPLATE = """<task>
Generate a comprehensive session summary for this AutoTune optimization session.
Explain what was learned, what worked, what didn't, and why the best configuration won.
</task>

<session_overview>
Session: {session_name}
Model: {base_model}
Dataset: {dataset}
Total Trials: {total_trials}
Duration: {duration_hours:.1f} hours
Optimization Goal: {optimization_goal}
</session_overview>

<trial_summary>
{trial_summary}
</trial_summary>

<best_config>
{best_config_details}
</best_config>

<response_schema>
{{
  "summary": "A narrative summary of the optimization journey — what patterns emerged, what surprised you, and what the final recommendation is based on",
  "key_findings": ["finding 1", "finding 2", "finding 3"],
  "confidence_level": "high/medium/low — how confident are you in the best config?",
  "next_steps": "What should the user do next? Suggest full training epochs and any caveats"
}}
</response_schema>"""


def _extract_json(text: str) -> Dict[str, Any]:
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}", text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                pass
        raise ValueError(f"Could not parse JSON from AI response: {text[:200]}")


def _format_trial_history(trials: List[TrialResult]) -> str:
    lines = []
    for t in trials:
        c = t.config
        loss_curve_summary = ""
        if t.loss_curve:
            first = t.loss_curve[0].get("loss", "?")
            last = t.loss_curve[-1].get("loss", "?")
            loss_curve_summary = f"started at {first}, ended at {last}"

        lines.append(
            f"Trial {t.trial_number}:\n"
            f"  Config: lr={c.learning_rate}, rank={c.lora_rank}, alpha={c.lora_alpha}, "
            f"dropout={c.lora_dropout}, batch={c.per_device_train_batch_size}, "
            f"grad_accum={c.gradient_accumulation_steps}, scheduler={c.lr_scheduler_type}, "
            f"warmup={c.warmup_ratio}, cutoff={c.cutoff_len}, wd={c.weight_decay}\n"
            f"  Result: final_loss={t.final_train_loss}, ai_score={t.ai_score}/10, "
            f"status={t.status}\n"
            f"  Loss curve: {loss_curve_summary}\n"
            f"  AI evaluation: {t.ai_evaluation[:200]}"
        )
    return "\n\n".join(lines)


class AIAdvisor:
    def __init__(self, config: AIProviderConfig):
        self.config = config
        self._gemini_model = None

    async def _call_gemini(self, prompt: str) -> str:
        import google.generativeai as genai

        genai.configure(api_key=self.config.gemini_api_key)
        model = genai.GenerativeModel(self.config.gemini_model)

        full_prompt = f"{SYSTEM_PROMPT}\n\n{prompt}"

        for attempt in range(3):
            try:
                response = await asyncio.to_thread(
                    model.generate_content,
                    full_prompt,
                    generation_config=genai.GenerationConfig(
                        temperature=self.config.temperature,
                        max_output_tokens=self.config.max_tokens,
                    ),
                )
                return response.text.strip()
            except Exception as e:
                logger.warning(f"Gemini attempt {attempt + 1} failed: {e}")
                if attempt == 2:
                    raise
                await asyncio.sleep(2**attempt)

    async def _call_ollama(self, prompt: str) -> str:
        import httpx

        full_prompt = f"{SYSTEM_PROMPT}\n\n{prompt}"
        url = f"{self.config.ollama_base_url}/api/generate"

        for attempt in range(3):
            try:
                async with httpx.AsyncClient(timeout=120) as client:
                    resp = await client.post(
                        url,
                        json={
                            "model": self.config.ollama_model,
                            "prompt": full_prompt,
                            "stream": False,
                            "options": {"temperature": self.config.temperature},
                        },
                    )
                    resp.raise_for_status()
                    return resp.json()["response"].strip()
            except Exception as e:
                logger.warning(f"Ollama attempt {attempt + 1} failed: {e}")
                if attempt == 2:
                    raise
                await asyncio.sleep(2**attempt)

    async def _call_ai(self, prompt: str) -> str:
        if self.config.provider == "gemini":
            return await self._call_gemini(prompt)
        elif self.config.provider == "ollama":
            return await self._call_ollama(prompt)
        else:
            raise ValueError(f"Unknown provider: {self.config.provider}")

    def _config_from_json(self, data: Dict[str, Any], trial_number: int) -> TrialConfig:
        return TrialConfig(
            trial_id=str(uuid4()),
            trial_number=trial_number,
            learning_rate=float(data["learning_rate"]),
            lora_rank=int(data["lora_rank"]),
            lora_alpha=int(data["lora_alpha"]),
            lora_dropout=float(data["lora_dropout"]),
            per_device_train_batch_size=int(data["per_device_train_batch_size"]),
            gradient_accumulation_steps=int(data["gradient_accumulation_steps"]),
            lr_scheduler_type=str(data["lr_scheduler_type"]),
            warmup_ratio=float(data["warmup_ratio"]),
            cutoff_len=int(data["cutoff_len"]),
            weight_decay=float(data["weight_decay"]),
            ai_reasoning=data.get("reasoning", ""),
            ai_hypothesis=data.get("hypothesis", ""),
        )

    async def think_initial(
        self, session_config: AutoTuneConfig
    ) -> Tuple[TrialConfig, str]:
        space = session_config.search_space
        prompt = THINK_INITIAL_TEMPLATE.format(
            base_model=session_config.base_model,
            dataset=session_config.dataset,
            template=session_config.template,
            optimization_goal=session_config.optimization_goal,
            probe_epochs=session_config.probe_epochs,
            finetuning_type=session_config.finetuning_type,
            lr_min=space.learning_rate_min,
            lr_max=space.learning_rate_max,
            lora_rank_options=space.lora_rank_options,
            lora_alpha_options=space.lora_alpha_options,
            dropout_min=space.lora_dropout_min,
            dropout_max=space.lora_dropout_max,
            batch_size_options=space.batch_size_options,
            grad_accum_options=space.gradient_accumulation_options,
            scheduler_options=space.lr_scheduler_options,
            warmup_min=space.warmup_ratio_min,
            warmup_max=space.warmup_ratio_max,
            cutoff_options=space.cutoff_len_options,
            wd_min=space.weight_decay_min,
            wd_max=space.weight_decay_max,
        )

        if self.config.provider == "none":
            config = generate_random_config(space, 1)
            config.ai_reasoning = (
                "Rule-based: Balanced starting point using search space heuristics"
            )
            config.ai_hypothesis = "This moderate configuration should provide a solid baseline for comparison"
            return config, "Rule-based initial configuration selected."

        try:
            response_text = await self._call_ai(prompt)
            data = _extract_json(response_text)
            config = self._config_from_json(data, 1)
            reasoning = data.get("reasoning", "")
            return config, reasoning
        except Exception as e:
            logger.error(f"AI think_initial failed, falling back to random: {e}")
            config = generate_random_config(space, 1)
            config.ai_reasoning = f"Fallback: AI call failed ({e}), using random search"
            return config, f"Fallback: {e}"

    async def think_next(
        self,
        session_config: AutoTuneConfig,
        completed_trials: List[TrialResult],
        current_best: Optional[TrialResult],
    ) -> Tuple[TrialConfig, str]:
        space = session_config.search_space
        trial_number = len(completed_trials) + 1
        previous_configs = [t.config for t in completed_trials]

        if self.config.provider == "none":
            config = find_unique_config(space, trial_number, previous_configs)
            config.ai_reasoning = f"Rule-based: Unique configuration #{trial_number} via random search with deduplication"
            config.ai_hypothesis = "Exploring unvisited regions of the parameter space"
            return config, "Rule-based next configuration selected."

        trial_history = _format_trial_history(completed_trials)
        best_summary = "No completed trials yet."
        if current_best:
            bc = current_best.config
            best_summary = (
                f"Trial {current_best.trial_number} with config: "
                f"lr={bc.learning_rate}, rank={bc.lora_rank}, alpha={bc.lora_alpha}, "
                f"dropout={bc.lora_dropout}, batch={bc.per_device_train_batch_size}\n"
                f"Score: {current_best.ai_score}/10, Loss: {current_best.final_train_loss}"
            )

        prompt = THINK_NEXT_TEMPLATE.format(
            trial_history=trial_history,
            current_best_summary=best_summary,
            base_model=session_config.base_model,
            dataset=session_config.dataset,
            optimization_goal=session_config.optimization_goal,
            probe_epochs=session_config.probe_epochs,
            lr_min=space.learning_rate_min,
            lr_max=space.learning_rate_max,
            lora_rank_options=space.lora_rank_options,
            lora_alpha_options=space.lora_alpha_options,
            dropout_min=space.lora_dropout_min,
            dropout_max=space.lora_dropout_max,
            batch_size_options=space.batch_size_options,
            grad_accum_options=space.gradient_accumulation_options,
            scheduler_options=space.lr_scheduler_options,
            warmup_min=space.warmup_ratio_min,
            warmup_max=space.warmup_ratio_max,
            cutoff_options=space.cutoff_len_options,
            wd_min=space.weight_decay_min,
            wd_max=space.weight_decay_max,
        )

        try:
            response_text = await self._call_ai(prompt)
            data = _extract_json(response_text)
            config = self._config_from_json(data, trial_number)

            is_duplicate = any(
                configs_are_similar(config, prev) for prev in previous_configs
            )
            if is_duplicate:
                logger.warning(
                    "AI returned duplicate config, using fallback unique config"
                )
                config = find_unique_config(space, trial_number, previous_configs)
                config.ai_reasoning = (
                    f"Fallback: AI returned duplicate, using unique random config"
                )

            reasoning = data.get("reasoning", "")
            what_changed = data.get("what_changed_from_best", "")
            if what_changed:
                reasoning += f"\n\nChange from best: {what_changed}"
            return config, reasoning

        except Exception as e:
            logger.error(f"AI think_next failed, falling back to random: {e}")
            config = find_unique_config(space, trial_number, previous_configs)
            config.ai_reasoning = f"Fallback: AI call failed ({e}), using random search"
            return config, f"Fallback: {e}"

    async def evaluate_trial(
        self,
        trial_config: TrialConfig,
        trial_result: TrialResult,
        all_previous: List[TrialResult],
    ) -> Tuple[float, str]:
        completed = [
            t
            for t in all_previous
            if t.status == "completed" and t.final_train_loss is not None
        ]
        best_loss = min((t.final_train_loss for t in completed), default=float("inf"))
        avg_loss = (
            sum(t.final_train_loss for t in completed) / len(completed)
            if completed
            else 0
        )
        best_trial = next(
            (t.trial_number for t in completed if t.final_train_loss == best_loss), 0
        )

        first_loss = "N/A"
        last_loss = "N/A"
        trend = "N/A"
        if trial_result.loss_curve:
            first_loss = str(trial_result.loss_curve[0].get("loss", "?"))
            last_loss = str(trial_result.loss_curve[-1].get("loss", "?"))
            f = float(first_loss) if first_loss != "?" else 0
            l = float(last_loss) if last_loss != "?" else 0
            if l < f * 0.9:
                trend = "improving"
            elif l > f * 1.1:
                trend = "diverging"
            else:
                trend = "plateaued"

        if self.config.provider == "none":
            score = self._rule_based_score(trial_result, completed)
            evaluation = f"Rule-based evaluation: loss={trial_result.final_train_loss}, trend={trend}"
            return score, evaluation

        prompt = EVALUATE_TEMPLATE.format(
            lr=trial_config.learning_rate,
            rank=trial_config.lora_rank,
            alpha=trial_config.lora_alpha,
            dropout=trial_config.lora_dropout,
            batch=trial_config.per_device_train_batch_size,
            grad_accum=trial_config.gradient_accumulation_steps,
            scheduler=trial_config.lr_scheduler_type,
            warmup=trial_config.warmup_ratio,
            cutoff=trial_config.cutoff_len,
            weight_decay=trial_config.weight_decay,
            final_loss=trial_result.final_train_loss,
            first_loss=first_loss,
            last_loss=last_loss,
            trend=trend,
            time_seconds=trial_result.training_time_seconds,
            status=trial_result.status,
            trial_count=len(completed),
            best_loss=best_loss,
            best_trial=best_trial,
            avg_loss=avg_loss,
        )

        try:
            response_text = await self._call_ai(prompt)
            data = _extract_json(response_text)
            score = float(data.get("score", 5.0))
            evaluation = data.get("evaluation", "")
            insight = data.get("key_insight", "")
            if insight:
                evaluation += f"\n\nKey insight: {insight}"
            return score, evaluation
        except Exception as e:
            logger.error(f"AI evaluate failed, using rule-based: {e}")
            score = self._rule_based_score(trial_result, completed)
            return score, f"Fallback evaluation: {e}"

    def _rule_based_score(
        self, trial: TrialResult, all_completed: List[TrialResult]
    ) -> float:
        if trial.status == "failed":
            return 0.0

        loss = trial.final_train_loss
        if loss is None:
            return 1.0

        if not all_completed:
            return 5.0

        losses = [
            t.final_train_loss for t in all_completed if t.final_train_loss is not None
        ]
        if not losses:
            return 5.0

        min_loss = min(losses)
        max_loss = max(losses)

        if max_loss == min_loss:
            return 5.0

        normalized = 1.0 - (loss - min_loss) / (max_loss - min_loss)
        score = 1.0 + normalized * 9.0

        if trial.loss_curve:
            first = trial.loss_curve[0].get("loss", loss)
            last = trial.loss_curve[-1].get("loss", loss)
            try:
                if float(last) < float(first):
                    score = min(10.0, score + 0.5)
            except (ValueError, TypeError):
                pass

        return round(score, 1)

    async def generate_session_summary(self, session: AutoTuneSession) -> str:
        completed = [t for t in session.trials if t.status == "completed"]
        if not completed:
            return "No completed trials in this session."

        elapsed_hours = 0
        if session.start_time:
            from datetime import datetime

            start = datetime.fromisoformat(session.start_time)
            end = (
                datetime.fromisoformat(session.end_time)
                if session.end_time
                else datetime.now()
            )
            elapsed_hours = (end - start).total_seconds() / 3600

        trial_lines = []
        for t in sorted(completed, key=lambda x: x.ai_score, reverse=True):
            trial_lines.append(
                f"Trial {t.trial_number}: score={t.ai_score}/10, "
                f"loss={t.final_train_loss}, lr={t.config.learning_rate}, "
                f"rank={t.config.lora_rank}, alpha={t.config.lora_alpha}"
            )

        best = session.best_trial_id
        best_trial = next((t for t in completed if t.trial_id == best), completed[0])
        bc = best_trial.config

        if self.config.provider == "none":
            return (
                f"Session completed with {len(completed)} trials in {elapsed_hours:.1f} hours. "
                f"Best trial: #{best_trial.trial_number} with loss={best_trial.final_train_loss} "
                f"and AI score={best_trial.ai_score}/10. "
                f"Configuration: lr={bc.learning_rate}, rank={bc.lora_rank}, alpha={bc.lora_alpha}. "
                f"Consider running a full training session with these parameters."
            )

        prompt = SUMMARY_TEMPLATE.format(
            session_name=session.config.session_name,
            base_model=session.config.base_model,
            dataset=session.config.dataset,
            total_trials=len(completed),
            duration_hours=elapsed_hours,
            optimization_goal=session.config.optimization_goal,
            trial_summary="\n".join(trial_lines),
            best_config_details=(
                f"Trial {best_trial.trial_number}: lr={bc.learning_rate}, rank={bc.lora_rank}, "
                f"alpha={bc.lora_alpha}, dropout={bc.lora_dropout}, batch={bc.per_device_train_batch_size}, "
                f"scheduler={bc.lr_scheduler_type}\nScore: {best_trial.ai_score}/10, Loss: {best_trial.final_train_loss}"
            ),
        )

        try:
            response_text = await self._call_ai(prompt)
            data = _extract_json(response_text)
            return data.get("summary", "Summary generation failed.")
        except Exception as e:
            logger.error(f"AI summary failed: {e}")
            return (
                f"Session completed with {len(completed)} trials. "
                f"Best trial: #{best_trial.trial_number} with loss={best_trial.final_train_loss}."
            )

    async def generate_final_report_content(
        self, session: AutoTuneSession
    ) -> Dict[str, Any]:
        completed = [t for t in session.trials if t.status == "completed"]
        ranked = sorted(completed, key=lambda x: x.ai_score, reverse=True)

        best = ranked[0] if ranked else None
        best_config_yaml = ""
        if best:
            bc = best.config
            import yaml

            config_dict = {
                "model_name_or_path": session.config.base_model,
                "stage": "sft",
                "template": session.config.template,
                "finetuning_type": session.config.finetuning_type,
                "dataset": session.config.dataset,
                "dataset_dir": session.config.dataset_dir,
                "learning_rate": bc.learning_rate,
                "num_train_epochs": session.config.probe_epochs * 3,
                "cutoff_len": bc.cutoff_len,
                "per_device_train_batch_size": bc.per_device_train_batch_size,
                "gradient_accumulation_steps": bc.gradient_accumulation_steps,
                "lr_scheduler_type": bc.lr_scheduler_type,
                "warmup_ratio": bc.warmup_ratio,
                "lora_rank": bc.lora_rank,
                "lora_alpha": bc.lora_alpha,
                "lora_dropout": bc.lora_dropout,
                "lora_target": "all",
                "bf16": True,
                "logging_steps": 5,
                "save_steps": 100,
                "do_train": True,
            }
            best_config_yaml = yaml.dump(config_dict, default_flow_style=False)

        parameter_analysis = {}
        if len(completed) >= 3:
            for param in [
                "learning_rate",
                "lora_rank",
                "lora_alpha",
                "per_device_train_batch_size",
            ]:
                values_scores = []
                for t in completed:
                    val = getattr(t.config, param, None)
                    if val is not None:
                        values_scores.append((val, t.ai_score))
                if values_scores:
                    parameter_analysis[param] = {
                        "values_tested": [v for v, _ in values_scores],
                        "scores": [s for _, s in values_scores],
                        "best_value": max(values_scores, key=lambda x: x[1])[0],
                    }

        return {
            "session_id": session.session_id,
            "session_name": session.config.session_name,
            "total_trials": len(session.trials),
            "completed_trials": len(completed),
            "best_trial": {
                "trial_number": best.trial_number,
                "score": best.ai_score,
                "loss": best.final_train_loss,
                "config": best.config.model_dump(),
            }
            if best
            else None,
            "all_trials": [
                {
                    "trial_number": t.trial_number,
                    "score": t.ai_score,
                    "loss": t.final_train_loss,
                    "status": t.status,
                    "config": t.config.model_dump(),
                }
                for t in ranked
            ],
            "best_config_yaml": best_config_yaml,
            "parameter_analysis": parameter_analysis,
            "ai_summary": session.ai_session_summary,
            "loop_log": [entry.model_dump() for entry in session.loop_log],
        }
