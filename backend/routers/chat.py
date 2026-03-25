from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
import os
from pathlib import Path

router = APIRouter()


class Message(BaseModel):
    role: str
    content: str


from services.chat_service import get_chat_service

chat_service = get_chat_service()


@router.post("/load")
async def load_model(body: dict):
    model_path = str(body.get("model_path", ""))
    template = str(body.get("template", "default"))
    finetuning_type = str(body.get("finetuning_type", "lora"))
    checkpoint_path = body.get("checkpoint_path")
    infer_backend = str(body.get("infer_backend", "huggingface"))
    infer_dtype = str(body.get("infer_dtype", "auto"))
    system_prompt = body.get("system_prompt")
    enable_thinking = body.get("enable_thinking")

    print(
        f"[ChatRouter] /load called with model_path: {model_path}, template: {template}"
    )

    if not model_path:
        return {
            "success": False,
            "error": "No model path provided",
            "details": "Please provide a model path",
        }

    if (
        not os.path.exists(model_path)
        and not model_path.startswith("meta-llama/")
        and not model_path.startswith("Qwen/")
        and not model_path.startswith("/")
    ):
        return {
            "success": False,
            "error": "Invalid model path",
            "details": f"Model path does not exist and is not a HuggingFace path: {model_path}",
        }

    result = chat_service.start_api(
        model_path,
        template,
        finetuning_type,
        checkpoint_path=checkpoint_path,
        infer_backend=infer_backend,
        infer_dtype=infer_dtype,
        system_prompt=system_prompt,
        enable_thinking=enable_thinking,
    )
    return result


@router.post("/unload")
async def unload_model():
    chat_service.stop_api()
    return {"success": True}


@router.post("/chat")
async def chat(body: dict):
    messages = body.get("messages", [])
    max_tokens = body.get("max_tokens", 1024)
    temperature = body.get("temperature", 0.95)
    top_p = body.get("top_p", 0.7)
    repetition_penalty = body.get("repetition_penalty", 1.0)
    stream = body.get("stream", False)

    status = chat_service.get_status()
    print(
        f"[ChatRouter] /chat called. Status: loaded={status['loaded']}, process_running={status.get('process_running', False)}, api_responding={status.get('api_responding', False)}"
    )

    if not status["loaded"]:
        error_msg = "No model loaded. Please load a model first."
        if status.get("error"):
            error_msg = f"Model not ready. Error: {status['error'][:200]}"
        elif status.get("process_running") and not status.get("api_responding"):
            error_msg = "Model process is running but API is not responding. Try reloading the model."
        return {"error": error_msg}

    if stream:
        from fastapi.responses import StreamingResponse
        import json

        def stream_generator():
            try:
                for token in chat_service.stream_chat(
                    messages=messages,
                    max_tokens=max_tokens,
                    temperature=temperature,
                    top_p=top_p,
                    repetition_penalty=repetition_penalty,
                ):
                    yield f"data: {json.dumps({'content': token})}\n\n"
                yield "data: [DONE]\n\n"
            except Exception as e:
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
                yield "data: [DONE]\n\n"

        return StreamingResponse(
            stream_generator(),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
        )

    response = chat_service.chat(
        messages=messages,
        max_tokens=max_tokens,
        temperature=temperature,
        top_p=top_p,
        repetition_penalty=repetition_penalty,
        stream=stream,
    )

    return response


@router.get("/status")
async def get_chat_status():
    return chat_service.get_status()


@router.get("/checkpoints/{output_dir:path}")
async def list_checkpoints(output_dir: str):
    """List available checkpoints in the output directory for selection."""
    from config import get_settings

    settings = get_settings()

    full_path = settings.core_path / output_dir
    if not full_path.exists():
        return {"checkpoints": [], "error": "Output directory not found"}

    import glob

    checkpoints = []

    checkpoint_dirs = sorted(
        glob.glob(str(full_path / "checkpoint-*")),
        key=lambda x: int(x.split("-")[-1]) if x.split("-")[-1].isdigit() else 0,
        reverse=True,
    )

    for ckpt_dir in checkpoint_dirs:
        ckpt_path = Path(ckpt_dir)
        step_num = ckpt_path.name.replace("checkpoint-", "")

        files = list(ckpt_path.glob("*"))
        has_adapter = any(
            f.name
            in ["adapter_config.json", "adapter_model.safetensors", "adapter_model.bin"]
            for f in files
        )

        if has_adapter:
            checkpoints.append(
                {
                    "path": str(ckpt_path),
                    "step": step_num,
                    "label": f"Step {step_num}" if step_num.isdigit() else step_num,
                }
            )

    final_checkpoint = full_path / "checkpoint-final"
    if final_checkpoint.exists():
        checkpoints.insert(
            0,
            {
                "path": str(final_checkpoint),
                "step": "final",
                "label": "Final (Best)",
            },
        )

    return {"checkpoints": checkpoints, "output_dir": output_dir}
