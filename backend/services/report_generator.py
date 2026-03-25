import json
import yaml
from pathlib import Path
from typing import Dict, Any
from datetime import datetime

from models.autotune_models import AutoTuneSession, TrialResult

SESSIONS_DIR = Path(__file__).parent.parent.parent / "autotune_sessions"


def _escape_html(text: str) -> str:
    if not isinstance(text, str):
        text = str(text)
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def _format_duration(seconds: float) -> str:
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    if hours > 0:
        return f"{hours}h {minutes}m {secs}s"
    elif minutes > 0:
        return f"{minutes}m {secs}s"
    return f"{secs}s"


def generate_html_report(session: AutoTuneSession) -> str:
    completed = [t for t in session.trials if t.status in ("completed", "failed")]
    ranked = sorted(
        [t for t in completed if t.status == "completed"],
        key=lambda t: t.ai_score,
        reverse=True,
    )
    best = ranked[0] if ranked else None

    best_score_str = f"{best.ai_score:.1f}" if best else "N/A"
    best_loss_str = (
        f"{best.final_train_loss:.4f}" if best and best.final_train_loss else "N/A"
    )
    best_trial_str = str(best.trial_number) if best else "N/A"

    elapsed = 0
    if session.start_time and session.end_time:
        start = datetime.fromisoformat(session.start_time)
        end = datetime.fromisoformat(session.end_time)
        elapsed = (end - start).total_seconds()

    total_training_time = sum(t.training_time_seconds for t in completed)

    trial_rows = ""
    for t in ranked:
        color = (
            "#22c55e"
            if t.rank and t.rank <= 3
            else "#eab308"
            if t.rank and t.rank <= 6
            else "#ef4444"
        )
        bc = t.config
        loss_str = (
            f"{t.final_train_loss:.4f}" if t.final_train_loss is not None else "N/A"
        )
        trial_rows += f"""
        <tr>
            <td style="color:{color};font-weight:bold">#{t.rank}</td>
            <td>{t.trial_number}</td>
            <td>{bc.learning_rate:.2e}</td>
            <td>{bc.lora_rank}/{bc.lora_alpha}</td>
            <td>{bc.per_device_train_batch_size}</td>
            <td>{bc.lr_scheduler_type}</td>
            <td>{loss_str}</td>
            <td><span style="color:{color};font-weight:bold">{t.ai_score:.1f}</span></td>
            <td>{_format_duration(t.training_time_seconds)}</td>
        </tr>"""

    best_yaml = ""
    if best:
        bc = best.config
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
        }
        best_yaml = yaml.dump(config_dict, default_flow_style=False)

    loss_datasets_js = "[]"
    if ranked:
        datasets = []
        for t in ranked:
            if t.loss_curve:
                points = [
                    {"x": p.get("step", i), "y": p.get("loss", 0)}
                    for i, p in enumerate(t.loss_curve)
                ]
                is_best = best and t.trial_id == best.trial_id
                datasets.append(
                    {
                        "label": f"Trial {t.trial_number}",
                        "data": points,
                        "borderColor": "#22d3ee"
                        if is_best
                        else f"rgba({100 + t.trial_number * 15}, {150 + t.trial_number * 10}, 255, 0.4)",
                        "borderWidth": 3 if is_best else 1,
                        "pointRadius": 0,
                        "fill": False,
                    }
                )
        loss_datasets_js = json.dumps(datasets).replace("{", "{{").replace("}", "}}")

    log_entries = ""
    for entry in session.loop_log[-50:]:
        color_map = {
            "think": "#60a5fa",
            "train": "#fbbf24",
            "evaluate": "#a78bfa",
            "feedback": "#34d399",
            "system": "#94a3b8",
        }
        icon_map = {
            "think": "Brain",
            "train": "Dumbbell",
            "evaluate": "Chart",
            "feedback": "Lightbulb",
            "system": "Settings",
        }
        color = color_map.get(entry.step, "#94a3b8")
        ts = str(entry.timestamp)
        ts = ts[11:19] if len(ts) > 19 else ts
        log_entries += f"""
        <div style="padding:4px 0;border-bottom:1px solid #1e293b;">
            <span style="color:#475569;font-size:12px;">{ts}</span>
            <span style="color:{color};font-weight:600;margin-left:8px;text-transform:uppercase;font-size:11px;">[{entry.step}]</span>
            <span style="color:#e2e8f0;margin-left:8px;font-size:13px;">{_escape_html(entry.message)}</span>
        </div>"""

    trial_analysis_cards = ""
    if ranked:
        for param in [
            "learning_rate",
            "lora_rank",
            "lora_alpha",
            "per_device_train_batch_size",
        ]:
            values_scores = []
            for t in completed:
                if t.status == "completed":
                    val = getattr(t.config, param, None)
                    if val is not None:
                        values_scores.append((val, t.ai_score))
            if len(values_scores) >= 3:
                best_val = max(values_scores, key=lambda x: x[1])[0]
                param_label = param.replace("_", " ").title()
                trial_analysis_cards += f"""
                <div style="background:#0f172a;border:1px solid #1e293b;border-radius:8px;padding:16px;">
                    <h4 style="color:#e2e8f0;margin:0 0 8px 0;font-size:14px;">{param_label}</h4>
                    <p style="color:#22d3ee;font-size:18px;font-weight:bold;margin:0;">Best: {best_val}</p>
                    <p style="color:#64748b;font-size:12px;margin:4px 0 0 0;">Tested {len(values_scores)} values</p>
                </div>"""

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>AutoTune Report - {_escape_html(session.config.session_name)}</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
<style>
    * {{ margin: 0; padding: 0; box-sizing: border-box; }}
    body {{
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
        background: #020617; color: #e2e8f0; padding: 32px;
        line-height: 1.6;
    }}
    .container {{ max-width: 1200px; margin: 0 auto; }}
    h1 {{ font-size: 28px; color: #f8fafc; margin-bottom: 4px; }}
    h2 {{ font-size: 20px; color: #f1f5f9; margin: 32px 0 16px 0; padding-bottom: 8px; border-bottom: 1px solid #1e293b; }}
    h3 {{ font-size: 16px; color: #cbd5e1; margin: 16px 0 8px 0; }}
    .subtitle {{ color: #64748b; font-size: 14px; }}
    .badge {{ display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; }}
    .badge-success {{ background: #22c55e22; color: #22c55e; border: 1px solid #22c55e44; }}
    .badge-info {{ background: #3b82f622; color: #60a5fa; border: 1px solid #3b82f644; }}
    .stats-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin: 16px 0; }}
    .stat-card {{
        background: #0f172a; border: 1px solid #1e293b; border-radius: 12px; padding: 16px;
    }}
    .stat-label {{ color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }}
    .stat-value {{ color: #22d3ee; font-size: 24px; font-weight: bold; margin-top: 4px; }}
    .best-config {{
        background: linear-gradient(135deg, #0f172a, #1e293b);
        border: 2px solid #fbbf24;
        border-radius: 12px; padding: 24px; margin: 16px 0;
        box-shadow: 0 0 20px rgba(251, 191, 36, 0.1);
    }}
    .best-config h3 {{ color: #fbbf24; }}
    table {{ width: 100%; border-collapse: collapse; margin: 16px 0; }}
    th {{ background: #0f172a; color: #94a3b8; padding: 10px 12px; text-align: left; font-size: 12px; text-transform: uppercase; }}
    td {{ padding: 10px 12px; border-bottom: 1px solid #1e293b; font-size: 13px; font-family: 'SF Mono', 'Fira Code', monospace; }}
    tr:hover {{ background: #0f172a; }}
    pre {{
        background: #0f172a; border: 1px solid #1e293b; border-radius: 8px;
        padding: 16px; overflow-x: auto; font-size: 13px;
        font-family: 'SF Mono', 'Fira Code', monospace; color: #a5f3fc;
    }}
    .chart-container {{ background: #0f172a; border: 1px solid #1e293b; border-radius: 12px; padding: 20px; margin: 16px 0; }}
    .log-container {{ background: #0f172a; border: 1px solid #1e293b; border-radius: 12px; padding: 16px; max-height: 500px; overflow-y: auto; }}
    .summary-text {{ color: #cbd5e1; font-size: 15px; line-height: 1.8; padding: 16px; background: #0f172a; border-radius: 8px; border-left: 3px solid #22d3ee; }}
    .analysis-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin: 16px 0; }}
    @media print {{ body {{ background: white; color: black; }} }}
</style>
</head>
<body>
<div class="container">
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px;">
        <div>
            <h1>AutoTune Report</h1>
            <p class="subtitle">{_escape_html(session.config.session_name)} &middot; {session.start_time[:10] if session.start_time else "N/A"}</p>
        </div>
        <span class="badge badge-success">Completed</span>
    </div>

    <div class="stats-grid">
        <div class="stat-card">
            <div class="stat-label">Total Trials</div>
            <div class="stat-value">{len(completed)}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Best Score</div>
            <div class="stat-value">{best_score_str}/10</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Best Loss</div>
            <div class="stat-value">{best_loss_str}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Total Time</div>
            <div class="stat-value">{_format_duration(elapsed)}</div>
        </div>
    </div>

    <h2>Best Configuration</h2>
    <div class="best-config">
        <h3>Trial #{best_trial_str} &mdash; Score: {best_score_str}/10</h3>
        <pre>{_escape_html(best_yaml)}</pre>
        <p style="color:#94a3b8;margin-top:12px;font-size:13px;">{_escape_html(best.config.ai_reasoning) if best else ""}</p>
    </div>

    <h2>Trial Rankings</h2>
    <table>
        <thead><tr><th>Rank</th><th>Trial</th><th>LR</th><th>Rank/Alpha</th><th>Batch</th><th>Scheduler</th><th>Loss</th><th>Score</th><th>Time</th></tr></thead>
        <tbody>{trial_rows}</tbody>
    </table>

    <h2>Loss Curves</h2>
    <div class="chart-container">
        <canvas id="lossChart" height="300"></canvas>
    </div>

    {f'<h2>Parameter Analysis</h2><div class="analysis-grid">{trial_analysis_cards}</div>' if trial_analysis_cards else ""}

    <h2>Session Summary</h2>
    <div class="summary-text">{_escape_html(session.ai_session_summary) if session.ai_session_summary else "No summary available."}</div>

    <h2>AI Reasoning Log</h2>
    <div class="log-container">{log_entries}</div>

    <h2>Raw Data</h2>
    <details>
        <summary style="cursor:pointer;color:#60a5fa;font-size:14px;">Show full session JSON</summary>
        <pre style="margin-top:12px;max-height:400px;overflow-y:auto;font-size:11px;">{_escape_html(json.dumps(session.model_dump(mode="json"), indent=2, default=str).replace("{", "{{").replace("}", "}}"))}</pre>
    </details>
</div>

<script>
try {{
    const ctx = document.getElementById('lossChart').getContext('2d');
    new Chart(ctx, {{
        type: 'line',
        data: {{ datasets: {loss_datasets_js} }},
        options: {{
            responsive: true,
            maintainAspectRatio: false,
            scales: {{
                x: {{ type: 'linear', title: {{ display: true, text: 'Step', color: '#64748b' }}, grid: {{ color: '#1e293b' }}, ticks: {{ color: '#64748b' }} }},
                y: {{ title: {{ display: true, text: 'Loss', color: '#64748b' }}, grid: {{ color: '#1e293b' }}, ticks: {{ color: '#64748b' }} }}
            }},
            plugins: {{
                legend: {{ labels: {{ color: '#e2e8f0' }} }},
                tooltip: {{ mode: 'index', intersect: false }}
            }}
        }}
    }});
}} catch(e) {{ console.error('Chart error:', e); }}
</script>
</body>
</html>"""

    report_path = SESSIONS_DIR / f"{session.session_id}" / "report.html"
    report_path.parent.mkdir(parents=True, exist_ok=True)
    with open(report_path, "w", encoding="utf-8") as f:
        f.write(html)

    return html


def generate_json_report(session: AutoTuneSession) -> Dict[str, Any]:
    completed = [t for t in session.trials if t.status == "completed"]
    ranked = sorted(completed, key=lambda t: t.ai_score, reverse=True)

    report = {
        "session_id": session.session_id,
        "session_name": session.config.session_name,
        "model": session.config.base_model,
        "dataset": session.config.dataset,
        "total_trials": len(session.trials),
        "completed_trials": len(completed),
        "start_time": session.start_time,
        "end_time": session.end_time,
        "ai_summary": session.ai_session_summary,
        "best_trial": {
            "trial_number": ranked[0].trial_number,
            "score": ranked[0].ai_score,
            "loss": ranked[0].final_train_loss,
            "config": ranked[0].config.model_dump(),
        }
        if ranked
        else None,
        "all_trials": [t.model_dump() for t in ranked],
        "loop_log": [entry.model_dump() for entry in session.loop_log],
    }

    report_path = SESSIONS_DIR / f"{session.session_id}" / "report.json"
    report_path.parent.mkdir(parents=True, exist_ok=True)
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, default=str)

    return report


def get_ready_to_use_yaml(best_trial: TrialResult, session: AutoTuneSession) -> str:
    bc = best_trial.config
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
        "plot_loss": True,
    }
    return yaml.dump(config_dict, default_flow_style=False)
