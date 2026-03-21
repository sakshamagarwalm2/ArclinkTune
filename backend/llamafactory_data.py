import re
import os
from pathlib import Path
from typing import List, Dict, Optional
from collections import defaultdict

LLAMAFACTORY_PATH = Path(__file__).parent.parent / "core" / "LlamaFactory" / "src" / "llamafactory" / "data" / "template.py"

CACHE_FILE = Path(__file__).parent / "models_cache.json"


def get_templates_from_llamafactory() -> List[str]:
    """Dynamically load templates from LlamaFactory source file."""
    if not LLAMAFACTORY_PATH.exists():
        return ["default", "alpaca", "llama3", "qwen", "chatglm3"]
    
    try:
        with open(LLAMAFACTORY_PATH, 'r', encoding='utf-8') as f:
            content = f.read()
        
        pattern = r'register_template\s*\(\s*name\s*=\s*["\']([^"\']+)["\']'
        matches = re.findall(pattern, content)
        return sorted(list(set(matches)))
    except Exception as e:
        print(f"Error loading templates: {e}")
        return ["default", "alpaca", "llama3", "qwen", "chatglm3"]


def infer_template(model_path: str) -> str:
    """Infer template based on model path."""
    path_lower = model_path.lower()
    
    if "llama" in path_lower and "llama3" not in path_lower:
        return "llama2"
    elif "llama3" in path_lower or "llama-3" in path_lower:
        return "llama3"
    elif "qwen" in path_lower and "vl" not in path_lower:
        return "qwen2.5" if "2.5" in path_lower else "qwen2"
    elif "qwen" in path_lower and "vl" in path_lower:
        return "qwen2.5_vl" if "2.5" in path_lower else "qwen2_vl"
    elif "deepseek" in path_lower and "coder" in path_lower:
        return "deepseekcoder"
    elif "deepseek" in path_lower and "r1" in path_lower:
        return "deepseekr1"
    elif "deepseek" in path_lower:
        return "deepseek"
    elif "gemma-3" in path_lower:
        return "gemma3"
    elif "gemma" in path_lower:
        return "gemma2"
    elif "mistral" in path_lower and "mixtral" in path_lower:
        return "mixtral"
    elif "mistral" in path_lower:
        return "mistral"
    elif "chatglm4" in path_lower:
        return "chatglm4"
    elif "chatglm3" in path_lower:
        return "chatglm3"
    elif "glm-4" in path_lower:
        return "glm4"
    elif "glm-4v" in path_lower:
        return "glm4v"
    elif "yi" in path_lower:
        return "yi"
    elif "minicpm" in path_lower and "o" in path_lower:
        return "minicpm_o"
    elif "minicpm-3" in path_lower:
        return "minicpm3"
    elif "minicpm" in path_lower:
        return "minicpm"
    elif "internlm" in path_lower and "2" in path_lower:
        return "intern2"
    elif "internvl" in path_lower:
        return "intern_vl2" if "2" in path_lower else "intern_vl"
    elif "baichuan" in path_lower:
        return "baichuan2"
    elif "codellama" in path_lower:
        return "codellama"
    elif "wizardlm" in path_lower:
        return "wizardlm"
    elif "phi-3" in path_lower or "phi3" in path_lower:
        return "phi3"
    elif "phi" in path_lower:
        return "phi"
    elif "starcoder" in path_lower:
        return "starcoder2"
    elif "falcon" in path_lower:
        return "falcon"
    elif "cohere" in path_lower:
        return "cohere"
    elif "llava" in path_lower:
        return "llava"
    elif "qwen2_vl" in path_lower:
        return "qwen2_vl"
    elif "qwen2.5_vl" in path_lower:
        return "qwen2.5_vl"
    else:
        return "default"


def get_model_groups_from_huggingface(hub: str = "huggingface") -> Dict[str, List[Dict]]:
    """Fetch popular models from HuggingFace Hub dynamically."""
    import json
    import time
    
    if hub == "modelscope":
        return get_modelscope_models()
    
    orgs = [
        "meta-llama", "Qwen", "deepseek-ai", "google", "mistralai",
        "01-ai", "THUDM", "openbmb", "internlm", "baichuan-inc",
        "codellama", "WizardLM", "microsoft", "bigcode", "tiiuae", "cohere",
        "LlamaFactory", "meta-llama", "nvidia", " NousResearch", "CognitiveFM",
    ]
    
    all_models = []
    seen_ids = set()
    
    for org in orgs:
        try:
            import urllib.request
            url = f"https://huggingface.co/api/models?author={org}&sort=downloads&direction=-1&limit=50"
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=10) as response:
                data = json.loads(response.read().decode())
                
            for model in data[:10]:
                model_id = model.get("id", "")
                if model_id and model_id not in seen_ids:
                    seen_ids.add(model_id)
                    model_name = model_id.split("/")[-1].replace("-", " ").replace("_", " ").title()
                    
                    all_models.append({
                        "name": model_name,
                        "path": model_id,
                        "template": infer_template(model_id),
                        "downloads": model.get("downloads", 0),
                        "likes": model.get("likes", 0),
                    })
        except Exception as e:
            print(f"Error fetching {org}: {e}")
            continue
    
    all_models.sort(key=lambda x: x.get("downloads", 0), reverse=True)
    
    grouped = defaultdict(list)
    for model in all_models:
        org = model["path"].split("/")[0] if "/" in model["path"] else "Other"
        group_name = get_group_name(org)
        grouped[group_name].append(model)
    
    return dict(grouped)


def get_group_name(org: str) -> str:
    """Get human-readable group name from organization."""
    org_map = {
        "meta-llama": "Meta Llama",
        "Qwen": "Qwen",
        "deepseek-ai": "DeepSeek",
        "google": "Google",
        "mistralai": "Mistral",
        "01-ai": "Yi",
        "THUDM": "ChatGLM",
        "openbmb": "MiniCPM",
        "internlm": "InternLM",
        "baichuan-inc": "Baichuan",
        "codellama": "CodeLlama",
        "WizardLM": "WizardLM",
        "microsoft": "Microsoft",
        "bigcode": "StarCoder",
        "tiiuae": "Falcon",
        "cohere": "Cohere",
        "LlamaFactory": "LlamaFactory",
        "nvidia": "NVIDIA",
        "NousResearch": "NousResearch",
        "CognitiveFM": "CognitiveFM",
    }
    return org_map.get(org, org.replace("-", " ").title())


def get_modelscope_models() -> Dict[str, List[Dict]]:
    """Fetch models from ModelScope (simplified)."""
    return {
        "Qwen": [
            {"name": "Qwen2.5-7B-Instruct", "path": "Qwen/Qwen2.5-7B-Instruct", "template": "qwen"},
            {"name": "Qwen2.5-14B-Instruct", "path": "Qwen/Qwen2.5-14B-Instruct", "template": "qwen"},
        ],
        "Other": []
    }


LLAMAFACTORY_TEMPLATES = get_templates_from_llamafactory()

LLAMAFACTORY_MODELS = get_model_groups_from_huggingface()
