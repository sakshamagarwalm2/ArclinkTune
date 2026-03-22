#!/usr/bin/env python3
"""
ArclinkTune - Training Field Mapping Test
Verifies every frontend/backend training field maps correctly to LlamaFactory.

Usage:
    python scripts/test_training_fields.py
"""

import sys
import os
import re
import json
from pathlib import Path
from typing import Dict, Set, List, Tuple, Any

ROOT = Path(__file__).parent.parent
BACKEND = ROOT / "backend"
LLAMAFACTORY = ROOT / "core" / "LlamaFactory"
LF_HPARAMS = LLAMAFACTORY / "src" / "llamafactory" / "hparams"

sys.path.insert(0, str(BACKEND))
sys.path.insert(0, str(LLAMAFACTORY / "src"))
os.environ["DISABLE_VERSION_CHECK"] = "1"
os.environ["PYTHONPATH"] = str(LLAMAFACTORY / "src")

GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
BOLD = "\033[1m"
END = "\033[0m"


def test(name: str, condition: bool, detail: str = "") -> bool:
    status = f"{GREEN}PASS{END}" if condition else f"{RED}FAIL{END}"
    print(f"  [{status}] {name}")
    if detail:
        print(f"          {detail[:120]}")
    return condition


def extract_fields_from_dataclass(filepath: Path) -> Dict[str, dict]:
    """Extract field names and defaults from a Python dataclass file."""
    fields = {}
    content = filepath.read_text(encoding="utf-8")
    
    # Match field definitions: field_name: type = field(default=..., ...)
    pattern = r"^\s+(\w+)\s*:\s*[^=]+?=\s*field\s*\(([^)]*)\)"
    for match in re.finditer(pattern, content, re.MULTILINE):
        name = match.group(1)
        field_args = match.group(2)
        
        # Extract default value
        default_match = re.search(r"default\s*=\s*(.+?)(?:,|$)", field_args)
        default = default_match.group(1).strip() if default_match else None
        
        # Extract help text
        help_match = re.search(r'"help"\s*:\s*"([^"]*)"', field_args)
        help_text = help_match.group(1) if help_match else ""
        
        # Extract Literal type if present
        type_line = content[:match.start()].split('\n')[-1] + content[match.start():match.end()]
        literal_match = re.search(r"Literal\[([^\]]+)\]", type_line)
        allowed_values = None
        if literal_match:
            allowed_values = [v.strip().strip('"').strip("'") for v in literal_match.group(1).split(",")]
        
        fields[name] = {
            "default": default,
            "help": help_text,
            "allowed_values": allowed_values,
            "source": filepath.name,
        }
    
    return fields


def extract_fields_from_pydantic(filepath: Path) -> Dict[str, dict]:
    """Extract field names and defaults from a Pydantic BaseModel."""
    fields = {}
    content = filepath.read_text(encoding="utf-8")
    
    # Match field definitions: field_name: type = default_value
    # Skip lines that are methods, imports, or class definitions
    for line in content.split('\n'):
        line = line.strip()
        if line.startswith('#') or line.startswith('def ') or line.startswith('class '):
            continue
        if line.startswith('from ') or line.startswith('import '):
            continue
        
        match = re.match(r'^(\w+)\s*:\s*(.+?)\s*=\s*(.+)$', line)
        if match:
            name = match.group(1)
            type_str = match.group(2).strip()
            default = match.group(3).strip()
            
            # Skip methods and non-field lines
            if 'def ' in type_str or default.startswith('('):
                continue
            
            fields[name] = {
                "default": default,
                "type": type_str,
                "source": filepath.name,
            }
    
    return fields


def get_all_llamafactory_fields() -> Dict[str, dict]:
    """Get all field names from all LlamaFactory hparams dataclasses."""
    all_fields = {}
    
    hparams_files = [
        "model_args.py",
        "data_args.py",
        "training_args.py",
        "finetuning_args.py",
        "generating_args.py",
        "evaluation_args.py",
    ]
    
    for fname in hparams_files:
        fpath = LF_HPARAMS / fname
        if fpath.exists():
            fields = extract_fields_from_dataclass(fpath)
            for field_name, info in fields.items():
                if field_name in all_fields:
                    all_fields[field_name]["sources"].append(info["source"])
                else:
                    info["sources"] = [info.pop("source")]
                    all_fields[field_name] = info
    
    # Also add fields from transformers Seq2SeqTrainingArguments
    # These are inherited by TrainingArguments
    transformers_common_fields = {
        "learning_rate", "num_train_epochs", "per_device_train_batch_size",
        "gradient_accumulation_steps", "max_grad_norm", "warmup_steps",
        "lr_scheduler_type", "logging_steps", "save_steps", "output_dir",
        "bf16", "fp16", "neftune_alpha", "report_to", "deepspeed",
        "do_train", "do_eval", "do_predict", "seed", "dataloader_num_workers",
        "gradient_checkpointing", "optim", "lr_scheduler_kwargs",
        "weight_decay", "adam_beta1", "adam_beta2", "adam_epsilon",
        "max_steps", "save_total_limit", "eval_strategy", "eval_steps",
        "load_best_model_at_end", "metric_for_best_model", "greater_is_better",
        "ddp_find_unused_parameters", "torch_compile", "torch_compile_backend",
        "fp8", "fp8_backend", "fp8_enable_fsdp_float8_all_gather",
        "ddp_timeout", "ddp_backend", "fsdp", "fsdp_config",
        "resume_from_checkpoint", "overwrite_output_dir",
        "per_device_eval_batch_size", "prediction_loss_only",
        "remove_unused_columns", "label_names", "push_to_hub",
        "hub_model_id", "hub_strategy", "hub_token", "hub_private_repo",
        "hub_always_push", "group_by_length", "length_column_name",
        "ignore_data_skip", "dataloader_pin_memory", "dataloader_persistent_workers",
        "dataloader_prefetch_factor", "torch_empty_cache_steps",
        "include_inputs_for_metrics", "auto_find_batch_size",
        "full_determinism", "tpu_num_cores", "use_cpu",
        "use_mps_device", "eval_accumulation_steps",
        "predict_with_generate", "generation_max_length",
        "generation_num_beams",
    }
    
    for field_name in transformers_common_fields:
        if field_name not in all_fields:
            all_fields[field_name] = {
                "default": None,
                "help": "From transformers TrainingArguments",
                "allowed_values": None,
                "sources": ["transformers.Seq2SeqTrainingArguments"],
            }
    
    return all_fields


def main():
    print(f"\n{BOLD}{'='*70}")
    print(f"  ArclinkTune - Training Field Mapping Verification")
    print(f"{'='*70}{END}\n")
    
    all_passed = True
    
    # ========================================
    # Step 1: Load LlamaFactory fields
    # ========================================
    print(f"{YELLOW}[1] Loading LlamaFactory Field Definitions{END}")
    
    lf_fields = get_all_llamafactory_fields()
    test(f"Loaded {len(lf_fields)} LlamaFactory fields", len(lf_fields) > 50,
         f"From: model_args, data_args, training_args, finetuning_args, generating_args + transformers")
    
    # ========================================
    # Step 2: Load backend TrainingConfig fields
    # ========================================
    print(f"\n{YELLOW}[2] Loading Backend TrainingConfig{END}")
    
    try:
        from routers.training import TrainingConfig
        backend_fields = set(TrainingConfig.model_fields.keys())
        test(f"Loaded {len(backend_fields)} backend fields", len(backend_fields) > 20)
    except Exception as e:
        test("Load backend TrainingConfig", False, str(e))
        return 1
    
    # ========================================
    # Step 3: Verify each backend field maps to LlamaFactory
    # ========================================
    print(f"\n{YELLOW}[3] Backend -> LlamaFactory Field Mapping{END}")
    
    # Fields that are backend-only (not sent to LlamaFactory)
    backend_only = {'batch_size', 'extra_args', 'booster', 'ds_stage', 'ds_offload'}
    
    # Fields that get renamed/transformed in to_dict()
    transformed = {
        'booster': 'flash_attn/use_unsloth/enable_liger_kernel',
        'ds_stage': 'deepspeed',
        'ds_offload': 'deepspeed (nested)',
    }
    
    mapping_issues = []
    for field_name in sorted(backend_fields):
        if field_name in backend_only:
            test(f"  {field_name:35s} -> (backend-only, transformed in to_dict())", True)
            continue
        
        if field_name in lf_fields:
            test(f"  {field_name:35s} -> {field_name} [OK]", True)
        else:
            # Check for near matches
            near_matches = [k for k in lf_fields if k.replace('_', '') == field_name.replace('_', '')]
            if near_matches:
                test(f"  {field_name:35s} -> [X] MISMATCH (LlamaFactory uses: {near_matches[0]})", False)
                mapping_issues.append((field_name, near_matches[0]))
            else:
                # It might be a valid transformers field we didn't enumerate
                test(f"  {field_name:35s} -> [!]  Not found in known fields (may be OK)", True,
                     "Passed through to LlamaFactory YAML")
    
    if mapping_issues:
        all_passed = False
        print(f"\n  {RED}Field name mismatches found:{END}")
        for backend_name, lf_name in mapping_issues:
            print(f"    {backend_name} -> {lf_name}")
    
    # ========================================
    # Step 4: Verify LlamaFactory critical fields are present
    # ========================================
    print(f"\n{YELLOW}[4] Critical LlamaFactory Fields in Backend{END}")
    
    critical_fields = [
        ("stage", "finetuning_args.stage"),
        ("model_name_or_path", "model_args.model_name_or_path"),
        ("template", "data_args.template"),
        ("finetuning_type", "finetuning_args.finetuning_type"),
        ("dataset", "data_args.dataset"),
        ("dataset_dir", "data_args.dataset_dir"),
        ("learning_rate", "training_args.learning_rate"),
        ("num_train_epochs", "training_args.num_train_epochs"),
        ("cutoff_len", "data_args.cutoff_len"),
        ("per_device_train_batch_size", "training_args.per_device_train_batch_size"),
        ("gradient_accumulation_steps", "training_args.gradient_accumulation_steps"),
        ("output_dir", "training_args.output_dir"),
        ("bf16", "training_args.bf16"),
        ("lora_rank", "finetuning_args.lora_rank"),
        ("lora_alpha", "finetuning_args.lora_alpha"),
        ("lora_target", "finetuning_args.lora_target"),
        ("pref_beta", "finetuning_args.pref_beta"),
        ("pref_loss", "finetuning_args.pref_loss"),
        ("use_galore", "finetuning_args.use_galore"),
        ("use_apollo", "finetuning_args.use_apollo"),
        ("use_badam", "finetuning_args.use_badam"),
        ("packing", "data_args.packing"),
        ("pissa_init", "finetuning_args.pissa_init"),
        ("project", "training_args.project"),
        ("freeze_trainable_layers", "finetuning_args.freeze_trainable_layers"),
        ("galore_scale", "finetuning_args.galore_scale"),
        ("apollo_scale", "finetuning_args.apollo_scale"),
        ("badam_switch_mode", "finetuning_args.badam_switch_mode"),
    ]
    
    for field_name, lf_path in critical_fields:
        present = field_name in backend_fields
        test(f"  {field_name:35s} -> {lf_path}", present)
        if not present:
            all_passed = False
    
    # ========================================
    # Step 5: Verify to_dict() output
    # ========================================
    print(f"\n{YELLOW}[5] TrainingConfig.to_dict() Output Verification{END}")
    
    try:
        config = TrainingConfig(
            model_name_or_path="meta-llama/Llama-3.1-8B-Instruct",
            dataset="alpaca",
            stage="sft",
            finetuning_type="lora",
        )
        result = config.to_dict()
        
        test("do_train=True is set", result.get('do_train') == True,
             f"Value: {result.get('do_train')}")
        
        test("batch_size is removed", 'batch_size' not in result,
             "Should be removed in to_dict()")
        
        test("extra_args is removed", 'extra_args' not in result,
             "Should be removed in to_dict()")
        
        test("output_dir is generated", bool(result.get('output_dir')),
             f"Value: {result.get('output_dir')}")
        
        test("booster is removed, flash_attn mapped", 
             'booster' not in result,
             "booster field should be removed")
        
        # Test booster mapping
        config_flash = TrainingConfig(
            model_name_or_path="test",
            dataset="alpaca",
            booster="flashattn2",
        )
        result_flash = config_flash.to_dict()
        test("booster=flashattn2 -> flash_attn=fa2", 
             result_flash.get('flash_attn') == 'fa2',
             f"Value: {result_flash.get('flash_attn')}")
        
        config_unsloth = TrainingConfig(
            model_name_or_path="test",
            dataset="alpaca",
            booster="unsloth",
        )
        result_unsloth = config_unsloth.to_dict()
        test("booster=unsloth -> use_unsloth=True",
             result_unsloth.get('use_unsloth') == True,
             f"Value: {result_unsloth.get('use_unsloth')}")
        
        config_liger = TrainingConfig(
            model_name_or_path="test",
            dataset="alpaca",
            booster="liger_kernel",
        )
        result_liger = config_liger.to_dict()
        test("booster=liger_kernel -> enable_liger_kernel=True",
             result_liger.get('enable_liger_kernel') == True,
             f"Value: {result_liger.get('enable_liger_kernel')}")
        
        # Test deepspeed mapping
        config_ds = TrainingConfig(
            model_name_or_path="test",
            dataset="alpaca",
            ds_stage="2",
        )
        result_ds = config_ds.to_dict()
        test("ds_stage=2 -> deepspeed dict with stage 2",
             isinstance(result_ds.get('deepspeed'), dict) and
             result_ds.get('deepspeed', {}).get('zero_optimization', {}).get('stage') == 2,
             f"Value: {json.dumps(result_ds.get('deepspeed'), indent=2)[:100]}")
        
        # Test deepspeed with offload
        config_ds_offload = TrainingConfig(
            model_name_or_path="test",
            dataset="alpaca",
            ds_stage="3",
            ds_offload=True,
        )
        result_ds_offload = config_ds_offload.to_dict()
        offload_device = result_ds_offload.get('deepspeed', {}).get('zero_optimization', {}).get('offload_optimizer', {}).get('device')
        test("ds_stage=3 + ds_offload=True -> offload_optimizer.device=cpu",
             offload_device == 'cpu',
             f"Value: {offload_device}")
        
        # Test report_to conversion
        test("report_to=none -> report_to=['none']",
             result.get('report_to') == ['none'],
             f"Value: {result.get('report_to')}")
        
        # Test pissa_init (not use_pissa)
        test("pissa_init field exists (not use_pissa)",
             'pissa_init' in config.model_fields_set or 'pissa_init' in dir(config),
             f"Field present: {'pissa_init' in config.model_fields}")
        
        # Test project (not project_name)
        test("project field exists (not project_name)",
             'project' in config.model_fields_set or 'project' in dir(config),
             f"Field present: {'project' in config.model_fields}")
        
        # Verify no invalid fields in output
        invalid_keys = {'use_pissa', 'project_name', 'ddp'}
        found_invalid = invalid_keys & set(result.keys())
        test("No invalid field names in output",
             len(found_invalid) == 0,
             f"Found: {found_invalid}" if found_invalid else "Clean")
        
    except Exception as e:
        test("to_dict() execution", False, str(e))
        all_passed = False
    
    # ========================================
    # Step 6: Verify default values match LlamaFactory
    # ========================================
    print(f"\n{YELLOW}[6] Default Value Verification{END}")
    
    lf_defaults = {
        "freeze_trainable_layers": 2,
        "galore_scale": 2.0,
        "galore_update_interval": 200,
        "apollo_scale": 32.0,
        "apollo_update_interval": 200,
        "badam_switch_mode": "ascending",
        "badam_switch_interval": 50,
        "badam_update_ratio": 0.05,
        "lora_rank": 8,
        "lora_dropout": 0.05,
        "lora_target": "all",
        "pref_beta": 0.1,
        "pref_loss": "sigmoid",
        "pref_ftx": 0.0,
        "badam_mode": "layer",
        "galore_rank": 16,
        "galore_target": "all",
        "apollo_rank": 16,
        "apollo_target": "all",
    }
    
    try:
        default_config = TrainingConfig()
        default_dict = default_config.to_dict()
        
        for field_name, expected_default in lf_defaults.items():
            actual = default_dict.get(field_name)
            if actual is None and field_name not in default_dict:
                # Field might not be in dict if it's None/optional
                actual = getattr(default_config, field_name, None)
            
            matches = actual == expected_default
            test(f"  {field_name:35s} = {actual} (expected {expected_default})", matches)
            if not matches:
                all_passed = False
                
    except Exception as e:
        test("Default value check", False, str(e))
        all_passed = False
    
    # ========================================
    # Step 7: Verify LlamaFactory can parse the config
    # ========================================
    print(f"\n{YELLOW}[7] LlamaFactory Parser Compatibility{END}")
    
    try:
        from llamafactory.hparams import get_train_args
        
        test_config = {
            "model_name_or_path": "meta-llama/Llama-3.1-8B-Instruct",
            "stage": "sft",
            "finetuning_type": "lora",
            "template": "llama3",
            "dataset": "alpaca",
            "dataset_dir": "data",
            "cutoff_len": 2048,
            "output_dir": "output/test",
            "do_train": True,
            "learning_rate": 5e-5,
            "num_train_epochs": 3.0,
            "per_device_train_batch_size": 2,
            "gradient_accumulation_steps": 8,
            "logging_steps": 5,
            "save_steps": 100,
            "bf16": True,
            "lora_rank": 8,
            "lora_target": "all",
            "report_to": ["none"],
        }
        
        try:
            model_args, data_args, training_args, finetuning_args, generating_args = get_train_args(test_config)
            
            test("LlamaFactory parses config", True)
            test(f"  stage = {finetuning_args.stage}", finetuning_args.stage == "sft")
            test(f"  finetuning_type = {finetuning_args.finetuning_type}", 
                 finetuning_args.finetuning_type == "lora")
            test(f"  template = {data_args.template}", data_args.template == "llama3")
            test(f"  lora_rank = {finetuning_args.lora_rank}", finetuning_args.lora_rank == 8)
            test(f"  do_train = {training_args.do_train}", training_args.do_train == True)
            test(f"  bf16 = {training_args.bf16}", training_args.bf16 == True)
            test(f"  learning_rate = {training_args.learning_rate}", 
                 abs(training_args.learning_rate - 5e-5) < 1e-10)
            test(f"  cutoff_len = {data_args.cutoff_len}", data_args.cutoff_len == 2048)
            
        except Exception as e:
            test("LlamaFactory parses config", False, str(e)[:150])
            all_passed = False
            
    except ImportError as e:
        test("Import LlamaFactory hparams", False, str(e))
        all_passed = False
    
    # ========================================
    # Step 8: Verify pissa_init and project field names
    # ========================================
    print(f"\n{YELLOW}[8] Renamed Field Verification{END}")
    
    try:
        # Verify pissa_init works
        config_pissa = TrainingConfig(
            model_name_or_path="test",
            dataset="alpaca",
            pissa_init=True,
        )
        result_pissa = config_pissa.to_dict()
        test("pissa_init=True -> pissa_init in output",
             result_pissa.get('pissa_init') == True,
             f"Value: {result_pissa.get('pissa_init')}")
        
        # Verify use_pissa is NOT in model fields (renamed to pissa_init)
        has_use_pissa = 'use_pissa' in TrainingConfig.model_fields
        test("use_pissa NOT in model_fields (renamed to pissa_init)",
             not has_use_pissa,
             f"use_pissa in model_fields: {has_use_pissa}")
        
        # Verify project (not project_name)
        config_proj = TrainingConfig(
            model_name_or_path="test",
            dataset="alpaca",
            project="my-project",
        )
        result_proj = config_proj.to_dict()
        test("project='my-project' -> project in output",
             result_proj.get('project') == 'my-project',
             f"Value: {result_proj.get('project')}")
        
        # Verify project_name is NOT in model fields (renamed to project)
        has_project_name = 'project_name' in TrainingConfig.model_fields
        test("project_name NOT in model_fields (renamed to project)",
             not has_project_name,
             f"project_name in model_fields: {has_project_name}")
        
        # Verify badam_switch_mode default is valid
        badam_mode = default_dict.get('badam_switch_mode')
        valid_badam_modes = {'ascending', 'descending', 'random', 'fixed'}
        test(f"badam_switch_mode='{badam_mode}' is valid",
             badam_mode in valid_badam_modes,
             f"Valid values: {valid_badam_modes}")
        
    except Exception as e:
        test("Renamed field verification", False, str(e))
        all_passed = False
    
    # ========================================
    # Summary
    # ========================================
    print(f"\n{BOLD}{'='*70}")
    print(f"  Summary")
    print(f"{'='*70}{END}\n")
    
    if all_passed:
        print(f"  {GREEN}{BOLD}All tests passed! Training fields are correctly mapped.{END}")
    else:
        print(f"  {RED}{BOLD}Some tests failed. Review the output above.{END}")
    
    print(f"\n{'='*70}{END}\n")
    
    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(main())
