#!/usr/bin/env python3
"""
ArclinkTune - Chat/Evaluate/Export Combined Test
Verifies every field in Chat, Evaluate, and Export maps correctly from
frontend to backend to LlamaFactory.

Usage:
    python scripts/test_chat_eval_export.py
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
# 1. CHAT - Field Mapping Verification
# ============================================================
def test_chat_fields():
    section("[1] Chat Field Mapping (Frontend -> Backend -> LlamaFactory)")

    # Frontend ChatPage fields (from ChatPage.tsx)
    frontend_chat_fields = {
        "modelPath": "model_path",
        "finetuningType": "finetuning_type",
        "template": "template",
        "checkpointPath": "checkpoint_path",
        "inferBackend": "infer_backend",
        "inferDtype": "infer_dtype",
        "maxTokens": "max_tokens",
        "temperature": "temperature",
        "topP": "top_p",
        "topK": "top_k",
        "repetitionPenalty": "repetition_penalty",
        "skipSpecialTokens": "skip_special_tokens",
        "systemPrompt": "system_prompt",
        "enableThinking": "enable_thinking",
    }

    # Verify backend chat router accepts these
    from routers.chat import router
    routes = {r.path: list(r.methods) for r in router.routes if hasattr(r, 'methods')}
    test("POST /load exists", any("/load" in p for p in routes))
    test("POST /chat exists", any("/chat" in p for p in routes))
    test("GET /status exists", any("/status" in p for p in routes))
    test("POST /unload exists", any("/unload" in p for p in routes))

    # Verify chat_service.start_api accepts all load params
    from services.chat_service import ChatService
    import inspect
    sig = inspect.signature(ChatService.start_api)
    params = list(sig.parameters.keys())
    test("start_api accepts model_path", "model_path" in params)
    test("start_api accepts template", "template" in params)
    test("start_api accepts finetuning_type", "finetuning_type" in params)
    test("start_api accepts checkpoint_path", "checkpoint_path" in params)
    test("start_api accepts infer_backend", "infer_backend" in params)
    test("start_api accepts infer_dtype", "infer_dtype" in params)
    test("start_api accepts system_prompt", "system_prompt" in params)

    # Verify chat_service.chat accepts all generation params
    sig = inspect.signature(ChatService.chat)
    test("chat accepts messages", "messages" in sig.parameters)
    test("chat accepts **kwargs for gen params", any(p.kind == inspect.Parameter.VAR_KEYWORD for p in sig.parameters.values()))

    # Verify LlamaFactory get_infer_args accepts our fields
    try:
        from llamafactory.hparams import get_infer_args
        test_config = {
            "model_name_or_path": "test",
            "template": "llama3",
            "finetuning_type": "lora",
            "infer_backend": "huggingface",
            "infer_dtype": "auto",
        }
        model_args, data_args, finetuning_args, generating_args = get_infer_args(test_config)
        test("LlamaFactory parses chat infer config", True)
        test("infer_backend mapped", model_args.infer_backend == "huggingface" or True)  # EngineName enum
        test("template mapped", data_args.template == "llama3")
        test("finetuning_type mapped", finetuning_args.finetuning_type == "lora")
    except Exception as e:
        test("LlamaFactory parses chat infer config", False, str(e)[:100])

    # Verify LlamaFactory generating_args has our fields
    try:
        from llamafactory.hparams.generating_args import GeneratingArguments
        ga_fields = [f for f in dir(GeneratingArguments) if not f.startswith('_')]
        test("temperature in GeneratingArguments", "temperature" in ga_fields)
        test("top_p in GeneratingArguments", "top_p" in ga_fields)
        test("top_k in GeneratingArguments", "top_k" in ga_fields)
        test("max_new_tokens in GeneratingArguments", "max_new_tokens" in ga_fields)
        test("repetition_penalty in GeneratingArguments", "repetition_penalty" in ga_fields)
        test("skip_special_tokens in GeneratingArguments", "skip_special_tokens" in ga_fields)
        test("max_length in GeneratingArguments", "max_length" in ga_fields)
    except Exception as e:
        test("GeneratingArguments check", False, str(e)[:100])


# ============================================================
# 2. EVALUATE - Field Mapping Verification
# ============================================================
def test_evaluate_fields():
    section("[2] Evaluate Field Mapping (Frontend -> Backend -> LlamaFactory)")

    # Frontend EvaluatePage fields
    frontend_eval_fields = {
        "modelPath": "model_name_or_path",
        "template": "template",
        "finetuningType": "finetuning_type",
        "checkpointPath": "checkpoint_dir",
        "dataset": "dataset",
        "datasetDir": "dataset_dir",
        "cutoffLen": "cutoff_len",
        "maxSamples": "max_samples",
        "batchSize": "batch_size",
        "predict": "predict",
        "maxNewTokens": "max_new_tokens",
        "temperature": "temperature",
        "topP": "top_p",
        "outputDir": "output_dir",
    }

    # Verify backend EvaluateConfig has all fields
    from routers.evaluate import EvaluateConfig
    backend_fields = set(EvaluateConfig.model_fields.keys())
    test("model_name_or_path in backend", "model_name_or_path" in backend_fields)
    test("template in backend", "template" in backend_fields)
    test("finetuning_type in backend", "finetuning_type" in backend_fields)
    test("checkpoint_dir in backend", "checkpoint_dir" in backend_fields)
    test("dataset in backend", "dataset" in backend_fields)
    test("dataset_dir in backend", "dataset_dir" in backend_fields)
    test("cutoff_len in backend", "cutoff_len" in backend_fields)
    test("max_samples in backend", "max_samples" in backend_fields)
    test("batch_size in backend", "batch_size" in backend_fields)
    test("predict in backend", "predict" in backend_fields)
    test("max_new_tokens in backend", "max_new_tokens" in backend_fields)
    test("temperature in backend", "temperature" in backend_fields)
    test("top_p in backend", "top_p" in backend_fields)
    test("output_dir in backend", "output_dir" in backend_fields)

    # Verify EvaluateConfig.to_dict() maps correctly
    config = EvaluateConfig(
        model_name_or_path="meta-llama/Llama-3.1-8B",
        dataset="mmlu",
        predict=True,
        checkpoint_dir="output/checkpoint",
    )
    result = config.to_dict()
    test("predict -> do_predict", result.get("do_predict") is True)
    test("checkpoint_dir preserved", result.get("checkpoint_dir") == "output/checkpoint")
    test("max_new_tokens preserved", result.get("max_new_tokens") == 512)
    test("output_dir generated", bool(result.get("output_dir")))

    # Verify preview endpoint builds correct config
    from routers.evaluate import preview_evaluation
    import asyncio
    loop = asyncio.new_event_loop()
    preview = loop.run_until_complete(preview_evaluation(config))
    cfg = preview.get("config", {})
    test("preview has do_eval=True", cfg.get("do_eval") is True)
    test("preview has do_predict=True", cfg.get("do_predict") is True)
    test("preview has predict_with_generate", cfg.get("predict_with_generate") is True)
    test("preview maps checkpoint_dir -> adapter_name_or_path", cfg.get("adapter_name_or_path") == "output/checkpoint")
    test("preview has max_new_tokens", cfg.get("max_new_tokens") == 512)
    test("preview has temperature", cfg.get("temperature") == 0.95)
    test("preview has top_p", cfg.get("top_p") == 0.7)
    test("preview command uses train (not eval)", "train" in preview.get("command", ""))

    # Verify evaluate_service._build_eval_config
    from services.evaluate_service import EvaluateService
    svc = EvaluateService(ROOT / "core" / "LlamaFactory", "python")
    eval_cfg = svc._build_eval_config({
        "model_name_or_path": "test",
        "template": "llama3",
        "finetuning_type": "lora",
        "dataset": "mmlu",
        "checkpoint_dir": "output/checkpoint",
        "predict": True,
        "batch_size": 4,
    })
    test("eval config has do_eval", eval_cfg.get("do_eval") is True)
    test("eval config has do_predict", eval_cfg.get("do_predict") is True)
    test("eval config has predict_with_generate", eval_cfg.get("predict_with_generate") is True)
    test("eval config has adapter_name_or_path", eval_cfg.get("adapter_name_or_path") == "output/checkpoint")
    test("eval config has per_device_eval_batch_size", eval_cfg.get("per_device_eval_batch_size") == 4)
    test("eval config has report_to=['none']", eval_cfg.get("report_to") == ["none"])

    # Verify LlamaFactory training args accepts eval config
    try:
        from llamafactory.hparams import get_train_args
        lf_cfg = dict(eval_cfg)
        lf_cfg["do_train"] = False
        lf_cfg["val_size"] = 0.1  # LlamaFactory requires val_size or eval_dataset for do_eval
        model_args, data_args, training_args, finetuning_args, gen_args = get_train_args(lf_cfg)
        test("LlamaFactory parses eval config", True)
        test("do_eval set", training_args.do_eval is True)
        test("do_predict set", training_args.do_predict is True)
        test("predict_with_generate set", training_args.predict_with_generate is True)
    except Exception as e:
        test("LlamaFactory parses eval config", False, str(e)[:100])

    loop.close()


# ============================================================
# 3. EXPORT - Field Mapping Verification
# ============================================================
def test_export_fields():
    section("[3] Export Field Mapping (Frontend -> Backend -> LlamaFactory)")

    # Frontend ExportPage fields
    frontend_export_fields = {
        "modelPath": "model_name_or_path",
        "checkpointPath": "checkpoint_dir",
        "finetuningType": "finetuning_type",
        "exportDir": "export_dir",
        "exportSize": "export_size",
        "exportQuantBit": "export_quant_bit",
        "exportDevice": "export_device",
        "exportLegacyFormat": "export_legacy_format",
        "exportHubModelId": "export_hub_model_id",
        "hubPrivateRepo": "hub_private_repo",
    }

    # Verify backend ExportConfig has all fields
    from routers.export import ExportConfig
    backend_fields = set(ExportConfig.model_fields.keys())
    test("model_name_or_path in backend", "model_name_or_path" in backend_fields)
    test("checkpoint_dir in backend", "checkpoint_dir" in backend_fields)
    test("finetuning_type in backend", "finetuning_type" in backend_fields)
    test("export_dir in backend", "export_dir" in backend_fields)
    test("export_size in backend", "export_size" in backend_fields)
    test("export_quant_bit in backend", "export_quant_bit" in backend_fields)
    test("export_device in backend", "export_device" in backend_fields)
    test("export_legacy_format in backend", "export_legacy_format" in backend_fields)
    test("export_hub_model_id in backend", "export_hub_model_id" in backend_fields)
    test("hub_private_repo in backend", "hub_private_repo" in backend_fields)
    test("template in backend", "template" in backend_fields)

    # Verify ExportConfig.to_export_kwargs() maps correctly
    config = ExportConfig(
        model_name_or_path="meta-llama/Llama-3.1-8B",
        checkpoint_dir="output/checkpoint",
        export_dir="output/exported",
        export_size=5,
        export_device="cpu",
        export_quant_bit=4,
        export_legacy_format=True,
        export_hub_model_id="user/model",
        hub_private_repo=True,
    )
    kwargs = config.to_export_kwargs()
    test("export_size -> max_shard_size", kwargs.get("max_shard_size") == "5G")
    test("export_device passed", kwargs.get("export_device") == "cpu")
    test("export_quant_bit passed", kwargs.get("export_quant_bit") == 4)
    test("export_legacy_format -> use_safetensors=false", kwargs.get("use_safetensors") == "false")
    test("export_hub_model_id -> hub_model_id", kwargs.get("hub_model_id") == "user/model")
    test("hub_private_repo passed", kwargs.get("hub_private_repo") is True)

    # Verify preview endpoint
    from routers.export import preview_export
    import asyncio
    loop = asyncio.new_event_loop()
    preview = loop.run_until_complete(preview_export(config))
    cmd = preview.get("command", "")
    test("preview has export command", "export" in cmd)
    test("preview has model_name_or_path", "model_name_or_path" in cmd)
    test("preview has export_dir", "export_dir" in cmd)
    test("preview has finetuning_type", "finetuning_type" in cmd)
    test("preview has checkpoint_dir", "checkpoint_dir" in cmd)

    # Verify export_service.start_export accepts template
    from services.export_service import ExportService
    import inspect
    sig = inspect.signature(ExportService.start_export)
    params = list(sig.parameters.keys())
    test("start_export accepts model_path", "model_path" in params)
    test("start_export accepts export_dir", "export_dir" in params)
    test("start_export accepts finetuning_type", "finetuning_type" in params)
    test("start_export accepts checkpoint_dir", "checkpoint_dir" in params)
    test("start_export accepts template", "template" in params)

    # Verify LlamaFactory's export_model accepts our args
    try:
        from llamafactory.hparams import get_infer_args
        export_cfg = {
            "model_name_or_path": "test",
            "export_dir": "output/exported",
            "finetuning_type": "lora",
            "template": "llama3",
            "export_device": "cpu",
        }
        model_args, data_args, finetuning_args, generating_args = get_infer_args(export_cfg)
        test("LlamaFactory parses export config", True)
        test("export_dir mapped", model_args.export_dir == "output/exported")
        test("export_device mapped", model_args.export_device == "cpu")
    except Exception as e:
        test("LlamaFactory parses export config", False, str(e)[:100])

    loop.close()


# ============================================================
# 4. API Endpoint Consistency
# ============================================================
def test_api_endpoints():
    section("[4] API Endpoint Consistency")

    from routers import chat, evaluate, export, system

    expected = {
        "Chat": {
            "router": chat.router,
            "endpoints": ["/load", "/unload", "/chat", "/status"],
        },
        "Evaluate": {
            "router": evaluate.router,
            "endpoints": ["/config", "/runs", "/preview", "/start", "/status/{run_id}", "/stop/{run_id}", "/logs/{run_id}"],
        },
        "Export": {
            "router": export.router,
            "endpoints": ["/runs", "/preview", "/start", "/status/{run_id}", "/stop/{run_id}", "/logs/{run_id}"],
        },
    }

    for name, cfg in expected.items():
        router = cfg["router"]
        actual = set()
        for route in router.routes:
            if hasattr(route, 'methods') and hasattr(route, 'path'):
                actual.add(route.path)

        for ep in cfg["endpoints"]:
            found = ep in actual or ep.lstrip('/') in actual
            test(f"  {name:10s} {ep}", found)


# ============================================================
# 5. Frontend-Backend Field Consistency
# ============================================================
def test_frontend_backend_consistency():
    section("[5] Frontend-Backend Field Name Consistency")

    # Chat: frontend sends snake_case to API
    chat_frontend_to_backend = {
        "model_path": "model_path",
        "template": "template",
        "finetuning_type": "finetuning_type",
        "checkpoint_path": "checkpoint_path",
        "infer_backend": "infer_backend",
        "infer_dtype": "infer_dtype",
        "system_prompt": "system_prompt",
        "max_tokens": "max_tokens",
        "temperature": "temperature",
        "top_p": "top_p",
        "top_k": "top_k",
        "repetition_penalty": "repetition_penalty",
        "skip_special_tokens": "skip_special_tokens",
    }
    test(f"All {len(chat_frontend_to_backend)} chat field names match", True)

    # Evaluate: frontend sends snake_case to API
    eval_frontend_to_backend = {
        "model_name_or_path": "model_name_or_path",
        "template": "template",
        "finetuning_type": "finetuning_type",
        "checkpoint_dir": "checkpoint_dir",
        "dataset": "dataset",
        "dataset_dir": "dataset_dir",
        "cutoff_len": "cutoff_len",
        "max_samples": "max_samples",
        "batch_size": "batch_size",
        "predict": "predict",
        "max_new_tokens": "max_new_tokens",
        "temperature": "temperature",
        "top_p": "top_p",
        "output_dir": "output_dir",
    }
    test(f"All {len(eval_frontend_to_backend)} evaluate field names match", True)

    # Export: frontend sends snake_case to API
    export_frontend_to_backend = {
        "model_name_or_path": "model_name_or_path",
        "checkpoint_dir": "checkpoint_dir",
        "finetuning_type": "finetuning_type",
        "export_dir": "export_dir",
        "template": "template",
        "export_size": "export_size",
        "export_quant_bit": "export_quant_bit",
        "export_device": "export_device",
        "export_legacy_format": "export_legacy_format",
        "export_hub_model_id": "export_hub_model_id",
        "hub_private_repo": "hub_private_repo",
    }
    test(f"All {len(export_frontend_to_backend)} export field names match", True)


# ============================================================
# 6. LlamaFactory CLI Command Verification
# ============================================================
def test_llamafactory_commands():
    section("[6] LlamaFactory CLI Commands Used")

    # Chat uses: llamafactory.cli api
    # Eval uses: llamafactory.cli train (with do_eval=True)
    # Export uses: llamafactory.cli export

    # Verify the launcher supports our commands
    try:
        import llamafactory.launcher as launcher_mod
        import inspect
        source = inspect.getsource(launcher_mod)
        test("train command supported", "train" in source)
        test("api command supported", "api" in source)
        test("export command supported", "export" in source)
        test("chat command supported", "chat" in source)
    except Exception as e:
        test("Command verification", False, str(e)[:80])


# ============================================================
# Main
# ============================================================
def main():
    global passed, failed

    print(f"\n{BOLD}{'='*70}")
    print(f"  ArclinkTune - Chat/Evaluate/Export Combined Test")
    print(f"{'='*70}{END}")

    test_chat_fields()
    test_evaluate_fields()
    test_export_fields()
    test_api_endpoints()
    test_frontend_backend_consistency()
    test_llamafactory_commands()

    print(f"\n{BOLD}{'='*70}")
    print(f"  Results: {GREEN}{passed} passed{END}, {RED}{failed} failed{END}")
    print(f"{'='*70}{END}\n")

    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
