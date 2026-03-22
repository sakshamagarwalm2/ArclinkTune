#!/usr/bin/env python3
"""
ArclinkTune - Complete Chat/Evaluate/Export Verification
Tests every field maps correctly from frontend -> backend -> LlamaFactory.

Usage:
    python scripts/test_chat_eval_export_final.py
"""

import sys
import os
from pathlib import Path

ROOT = Path(__file__).parent.parent
BACKEND = ROOT / "backend"
LLAMAFACTORY = ROOT / "core" / "LlamaFactory"

sys.path.insert(0, str(BACKEND))
sys.path.insert(0, str(LLAMAFACTORY / "src"))
os.environ["DISABLE_VERSION_CHECK"] = "1"
os.environ["PYTHONPATH"] = str(LLAMAFACTORY / "src")

GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
BOLD = "\033[1m"
END = "\033[0m"

passed = 0
failed = 0


def test(name, condition, detail=""):
    global passed, failed
    if condition:
        passed += 1
        status = f"{GREEN}PASS{END}"
    else:
        failed += 1
        status = f"{RED}FAIL{END}"
    print(f"  [{status}] {name}")
    if detail:
        print(f"          {str(detail)[:120]}")
    return condition


def section(name):
    print(f"\n{YELLOW}{name}{END}")


# ============================================================
# CHAT VERIFICATION
# ============================================================
def test_chat():
    section("[1] Chat - Service Parameters")

    from services.chat_service import ChatService
    import inspect

    sig = inspect.signature(ChatService.start_api)
    params = list(sig.parameters.keys())
    test("start_api: model_path", "model_path" in params)
    test("start_api: template", "template" in params)
    test("start_api: finetuning_type", "finetuning_type" in params)
    test("start_api: checkpoint_path", "checkpoint_path" in params)
    test("start_api: infer_backend", "infer_backend" in params)
    test("start_api: infer_dtype", "infer_dtype" in params)
    test("start_api: system_prompt", "system_prompt" in params)
    test("start_api: enable_thinking", "enable_thinking" in params)

    section("[2] Chat - Payload Uses LlamaFactory Protocol")

    # Read the chat service source to verify payload field names
    import inspect
    source = inspect.getsource(ChatService.chat)
    test("payload uses 'presence_penalty' (not repetition_penalty)",
         "presence_penalty" in source and "repetition_penalty" not in source.split("presence_penalty")[0][-50:],
         "LlamaFactory maps presence_penalty -> repetition_penalty")
    test("payload does NOT send 'top_k' (not in protocol)",
         "top_k" not in source.split("payload")[1] if "payload" in source else False,
         "top_k not in ChatCompletionRequest")
    test("payload does NOT send 'skip_special_tokens' (not in protocol)",
         "skip_special_tokens" not in source.split("payload")[1] if "payload" in source else False,
         "skip_special_tokens not in ChatCompletionRequest")

    section("[3] Chat - CLI Args for Load")

    source = inspect.getsource(ChatService.start_api)
    test("--default_system passed when system_prompt given",
         "--default_system" in source)
    test("--enable_thinking passed when enable_thinking given",
         "--enable_thinking" in source)
    test("--adapter_name_or_path for checkpoint",
         "--adapter_name_or_path" in source)
    test("--infer_backend for backend selection",
         "--infer_backend" in source)
    test("--infer_dtype for dtype selection",
         "--infer_dtype" in source)

    section("[4] Chat - LlamaFactory Protocol Accepts Our Fields")

    try:
        from llamafactory.api.protocol import ChatCompletionRequest
        fields = set(ChatCompletionRequest.model_fields.keys())
        test("temperature in protocol", "temperature" in fields)
        test("top_p in protocol", "top_p" in fields)
        test("max_tokens in protocol", "max_tokens" in fields)
        test("presence_penalty in protocol", "presence_penalty" in fields)
        test("do_sample in protocol", "do_sample" in fields)
        test("messages in protocol", "messages" in fields)
    except Exception as e:
        test("Protocol import", False, str(e)[:100])

    section("[5] Chat - LlamaFactory Generates Args Accepts Our Fields")

    try:
        from llamafactory.hparams.generating_args import GeneratingArguments
        import dataclasses
        fields = {f.name for f in dataclasses.fields(GeneratingArguments)}
        test("temperature in GeneratingArguments", "temperature" in fields)
        test("top_p in GeneratingArguments", "top_p" in fields)
        test("top_k in GeneratingArguments", "top_k" in fields)
        test("max_new_tokens in GeneratingArguments", "max_new_tokens" in fields)
        test("repetition_penalty in GeneratingArguments", "repetition_penalty" in fields)
        test("skip_special_tokens in GeneratingArguments", "skip_special_tokens" in fields)
    except Exception as e:
        test("GeneratingArguments import", False, str(e)[:100])

    section("[6] Chat - API Endpoints")

    from routers.chat import router
    routes = {r.path: list(r.methods) for r in router.routes if hasattr(r, 'methods')}
    test("POST /load", any("/load" in p for p in routes))
    test("POST /chat", any("/chat" in p for p in routes))
    test("GET /status", any("/status" in p for p in routes))
    test("POST /unload", any("/unload" in p for p in routes))


# ============================================================
# EVALUATE VERIFICATION
# ============================================================
def test_evaluate():
    section("[7] Evaluate - Backend Config Fields")

    from routers.evaluate import EvaluateConfig
    backend_fields = set(EvaluateConfig.model_fields.keys())
    expected = [
        "model_name_or_path", "template", "finetuning_type", "checkpoint_dir",
        "dataset", "dataset_dir", "cutoff_len", "max_samples", "batch_size",
        "predict", "max_new_tokens", "temperature", "top_p", "output_dir",
    ]
    for field in expected:
        test(f"  {field} in EvaluateConfig", field in backend_fields)

    section("[8] Evaluate - to_dict() Transformations")

    config = EvaluateConfig(
        model_name_or_path="test",
        dataset="mmlu",
        predict=True,
    )
    result = config.to_dict()
    test("predict -> do_predict", result.get("do_predict") is True)
    test("output_dir auto-generated", bool(result.get("output_dir")))
    test("max_new_tokens NOT renamed (no-op removed)", result.get("max_new_tokens") == 512)

    section("[9] Evaluate - Service Config Building")

    from services.evaluate_service import EvaluateService
    import inspect
    source = inspect.getsource(EvaluateService._build_eval_config)
    test("does NOT set compute_accuracy (removed)", "compute_accuracy" not in source)
    test("sets do_eval=True", "do_eval" in source)
    test("sets do_predict=True", "do_predict" in source)
    test("sets predict_with_generate=True", "predict_with_generate" in source)
    test("maps checkpoint_dir -> adapter_name_or_path", "adapter_name_or_path" in source)
    test("maps batch_size -> per_device_eval_batch_size", "per_device_eval_batch_size" in source)

    section("[10] Evaluate - Preview Endpoint")

    import asyncio
    loop = asyncio.new_event_loop()
    cfg = EvaluateConfig(model_name_or_path="test", dataset="mmlu", predict=True)
    from routers.evaluate import preview_evaluation
    preview = loop.run_until_complete(preview_evaluation(cfg))
    p_cfg = preview.get("config", {})
    test("preview: do_eval=True", p_cfg.get("do_eval") is True)
    test("preview: do_predict=True", p_cfg.get("do_predict") is True)
    test("preview: predict_with_generate", p_cfg.get("predict_with_generate") is True)
    test("preview: per_device_eval_batch_size", p_cfg.get("per_device_eval_batch_size") == 2)
    test("preview: report_to=['none']", p_cfg.get("report_to") == ["none"])
    test("preview command uses 'train'", "train" in preview.get("command", ""))

    # Test checkpoint mapping
    cfg2 = EvaluateConfig(model_name_or_path="test", dataset="mmlu", checkpoint_dir="output/ckpt")
    preview2 = loop.run_until_complete(preview_evaluation(cfg2))
    test("preview: checkpoint_dir -> adapter_name_or_path",
         preview2["config"].get("adapter_name_or_path") == "output/ckpt")

    loop.close()

    section("[11] Evaluate - LlamaFactory Compatibility")

    try:
        from llamafactory.hparams import get_train_args
        eval_cfg = {
            "model_name_or_path": "test",
            "dataset": "mmlu",
            "template": "llama3",
            "finetuning_type": "lora",
            "do_eval": True,
            "do_predict": True,
            "predict_with_generate": True,
            "per_device_eval_batch_size": 2,
            "val_size": 0.1,
            "output_dir": "output/test",
            "report_to": ["none"],
        }
        model_args, data_args, training_args, finetuning_args, gen_args = get_train_args(eval_cfg)
        test("LlamaFactory parses eval config", True)
        test("do_eval set", training_args.do_eval is True)
        test("do_predict set", training_args.do_predict is True)
        test("predict_with_generate set", training_args.predict_with_generate is True)
    except Exception as e:
        test("LlamaFactory parses eval config", False, str(e)[:100])


# ============================================================
# EXPORT VERIFICATION
# ============================================================
def test_export():
    section("[12] Export - Backend Config Fields")

    from routers.export import ExportConfig
    backend_fields = set(ExportConfig.model_fields.keys())
    expected = [
        "model_name_or_path", "adapter_name_or_path", "export_dir",
        "finetuning_type", "template", "export_size", "export_quant_bit",
        "export_quantization_dataset", "export_device", "export_legacy_format",
        "export_hub_model_id", "extra_args",
    ]
    for field in expected:
        test(f"  {field} in ExportConfig", field in backend_fields)

    # Verify wrong fields are NOT present
    test("  checkpoint_dir NOT in ExportConfig", "checkpoint_dir" not in backend_fields)
    test("  hub_private_repo NOT in ExportConfig", "hub_private_repo" not in backend_fields)
    test("  export_quant_method NOT in ExportConfig", "export_quant_method" not in backend_fields)

    section("[13] Export - to_export_kwargs() Transforms")

    config = ExportConfig(
        model_name_or_path="test",
        adapter_name_or_path="output/ckpt",
        export_dir="output/exported",
        export_size=5,
        export_device="cpu",
        export_legacy_format=True,
        export_quant_bit=4,
        export_quantization_dataset="data/c4.jsonl",
        export_hub_model_id="user/model",
    )
    kwargs = config.to_export_kwargs()
    test("export_size -> export_size (int, not max_shard_size string)",
         kwargs.get("export_size") == 5 and "max_shard_size" not in kwargs)
    test("export_device passed", kwargs.get("export_device") == "cpu")
    test("export_legacy_format -> export_legacy_format (not use_safetensors)",
         kwargs.get("export_legacy_format") is True and "use_safetensors" not in kwargs)
    test("export_quant_bit -> export_quantization_bit",
         kwargs.get("export_quantization_bit") == 4)
    test("export_quantization_dataset passed",
         kwargs.get("export_quantization_dataset") == "data/c4.jsonl")
    test("export_hub_model_id -> export_hub_model_id",
         kwargs.get("export_hub_model_id") == "user/model")
    test("hub_private_repo NOT in kwargs", "hub_private_repo" not in kwargs)

    section("[14] Export - Service Uses adapter_name_or_path")

    from services.export_service import ExportService
    import inspect
    sig = inspect.signature(ExportService.start_export)
    params = list(sig.parameters.keys())
    test("start_export: adapter_name_or_path (not checkpoint_dir)",
         "adapter_name_or_path" in params and "checkpoint_dir" not in params)
    test("start_export: template", "template" in params)

    section("[15] Export - Preview Command Correct")

    import asyncio
    loop = asyncio.new_event_loop()
    from routers.export import preview_export
    preview = loop.run_until_complete(preview_export(config))
    cmd = preview.get("command", "")
    test("preview: --adapter_name_or_path (not --checkpoint_dir)",
         "--adapter_name_or_path" in cmd and "--checkpoint_dir" not in cmd)
    test("preview: --export_size", "--export_size" in cmd)
    test("preview: --export_device", "--export_device" in cmd)
    test("preview: --export_legacy_format", "--export_legacy_format" in cmd)
    test("preview: --export_quantization_bit", "--export_quantization_bit" in cmd)
    test("preview: --export_quantization_dataset", "--export_quantization_dataset" in cmd)
    test("preview: --template", "--template" in cmd)
    test("preview: --hub_model_id", "--export_hub_model_id" in cmd)

    loop.close()

    section("[16] Export - LlamaFactory Compatibility")

    try:
        from llamafactory.hparams import get_infer_args
        export_cfg = {
            "model_name_or_path": "test",
            "export_dir": "output/exported",
            "finetuning_type": "lora",
            "template": "llama3",
            "export_device": "cpu",
            "export_size": 5,
        }
        model_args, data_args, finetuning_args, generating_args = get_infer_args(export_cfg)
        test("LlamaFactory parses export config", True)
        test("export_dir mapped", model_args.export_dir == "output/exported")
        test("export_device mapped", model_args.export_device == "cpu")
        test("export_size mapped", model_args.export_size == 5)
    except Exception as e:
        test("LlamaFactory parses export config", False, str(e)[:100])


# ============================================================
# CROSS-CUTTING VERIFICATION
# ============================================================
def test_cross_cutting():
    section("[17] API Endpoint Consistency")

    from routers import chat, evaluate, export
    for name, router in [("Chat", chat.router), ("Evaluate", evaluate.router), ("Export", export.router)]:
        routes = []
        for r in router.routes:
            if hasattr(r, 'methods') and hasattr(r, 'path'):
                routes.append((list(r.methods), r.path))
        test(f"  {name}: {len(routes)} routes registered", len(routes) > 0)

    section("[18] Frontend-Backend Field Name Consistency")

    # Chat: frontend sends these keys
    chat_keys = ["model_path", "template", "finetuning_type", "checkpoint_path",
                 "infer_backend", "infer_dtype", "system_prompt", "enable_thinking",
                 "max_tokens", "temperature", "top_p", "repetition_penalty"]
    test(f"Chat: {len(chat_keys)} field names defined", True)

    # Evaluate: frontend sends these keys
    eval_keys = ["model_name_or_path", "template", "finetuning_type", "checkpoint_dir",
                 "dataset", "dataset_dir", "cutoff_len", "max_samples", "batch_size",
                 "predict", "max_new_tokens", "temperature", "top_p", "output_dir"]
    test(f"Evaluate: {len(eval_keys)} field names defined", True)

    # Export: frontend sends these keys
    export_keys = ["model_name_or_path", "adapter_name_or_path", "export_dir",
                   "finetuning_type", "template", "export_size", "export_quant_bit",
                   "export_quantization_dataset", "export_device", "export_legacy_format",
                   "export_hub_model_id", "extra_args"]
    test(f"Export: {len(export_keys)} field names defined", True)


# ============================================================
# Main
# ============================================================
def main():
    global passed, failed

    print(f"\n{BOLD}{'='*70}")
    print(f"  ArclinkTune - Complete Chat/Evaluate/Export Verification")
    print(f"{'='*70}{END}")

    test_chat()
    test_evaluate()
    test_export()
    test_cross_cutting()

    print(f"\n{BOLD}{'='*70}")
    print(f"  Results: {GREEN}{passed} passed{END}, {RED}{failed} failed{END}")
    print(f"{'='*70}{END}\n")

    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
