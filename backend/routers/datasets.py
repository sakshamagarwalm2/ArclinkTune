"""
ArclinkTune - Dataset Browser & Auto-Configure API
Provides endpoints to browse files, detect format, and manage dataset_info.json.
"""

import json
import os
import csv
import shutil
from pathlib import Path
from typing import Optional, List, Dict, Any, TYPE_CHECKING

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from config import get_settings

settings = get_settings()

router = APIRouter()


# Supported file extensions by LlamaFactory
SUPPORTED_EXTENSIONS = {".json", ".jsonl", ".csv", ".parquet", ".arrow", ".txt"}
SUPPORTED_EXTENSIONS_STR = ".json, .jsonl, .csv, .parquet, .arrow, .txt"

DATA_CONFIG = "dataset_info.json"


# ─── Request/Response Models ─────────────────────────────────────────────────


class BrowseRequest(BaseModel):
    path: Optional[str] = None  # None = start from data_dir


class FileEntry(BaseModel):
    name: str
    path: str
    is_directory: bool
    size: Optional[int] = None
    extension: Optional[str] = None
    is_supported: bool = False


class BrowseResponse(BaseModel):
    current_path: str
    parent_path: Optional[str] = None
    entries: List[FileEntry]
    data_dir: str


class AnalyzeRequest(BaseModel):
    file_path: str  # relative to data_dir


class DetectedColumn(BaseModel):
    name: str
    sample_values: List[str]


class AnalyzeResponse(BaseModel):
    file_path: str
    format: str  # "alpaca", "sharegpt", or "unknown"
    columns: Dict[str, str]  # mapped columns
    detected_columns: List[DetectedColumn]
    sample_count: int
    file_size_bytes: int
    preview: List[Dict[str, Any]]
    suggested_name: str


class ConfigureRequest(BaseModel):
    file_path: str  # relative to data_dir
    dataset_name: str
    formatting: str  # "alpaca" or "sharegpt"
    columns: Optional[Dict[str, str]] = None
    tags: Optional[Dict[str, str]] = None


class ConfigureResponse(BaseModel):
    success: bool
    dataset_name: str
    message: str


class DatasetInfoEntry(BaseModel):
    name: str
    file_name: str
    formatting: str
    columns: Dict[str, str]
    tags: Dict[str, str]


class DatasetInfoResponse(BaseModel):
    datasets: List[DatasetInfoEntry]
    config_path: str


# ─── Helper Functions ────────────────────────────────────────────────────────


def _get_data_dir() -> Path:
    """Get the user data directory, creating it if needed."""
    data_dir = settings.data_dir
    data_dir.mkdir(parents=True, exist_ok=True)
    return data_dir


def _get_config_path() -> Path:
    return _get_data_dir() / DATA_CONFIG


def _load_dataset_info() -> Dict[str, Any]:
    config_path = _get_config_path()
    if config_path.exists():
        with open(config_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


def _save_dataset_info(info: Dict[str, Any]):
    config_path = _get_config_path()
    with open(config_path, "w", encoding="utf-8") as f:
        json.dump(info, f, indent=2, ensure_ascii=False)


def _read_json_samples(file_path: Path, max_lines: int = 20) -> List[Dict[str, Any]]:
    """Read samples from a JSON or JSONL file."""
    samples = []
    try:
        if file_path.suffix == ".jsonl":
            with open(file_path, "r", encoding="utf-8") as f:
                for i, line in enumerate(f):
                    if i >= max_lines:
                        break
                    line = line.strip()
                    if line:
                        samples.append(json.loads(line))
        else:
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list):
                    samples = data[:max_lines]
                elif isinstance(data, dict):
                    samples = [data]
    except Exception:
        pass
    return samples


def _read_csv_samples(file_path: Path, max_lines: int = 20) -> List[Dict[str, Any]]:
    """Read samples from a CSV file."""
    samples = []
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for i, row in enumerate(reader):
                if i >= max_lines:
                    break
                samples.append(dict(row))
    except Exception:
        pass
    return samples


def _read_txt_samples(file_path: Path, max_lines: int = 20) -> List[Dict[str, Any]]:
    """Read samples from a plain text file."""
    samples = []
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            for i, line in enumerate(f):
                if i >= max_lines:
                    break
                line = line.strip()
                if line:
                    samples.append({"text": line})
    except Exception:
        pass
    return samples


def _read_samples(file_path: Path, max_lines: int = 20) -> List[Dict[str, Any]]:
    ext = file_path.suffix.lower()
    if ext in (".json", ".jsonl"):
        return _read_json_samples(file_path, max_lines)
    elif ext == ".csv":
        return _read_csv_samples(file_path, max_lines)
    elif ext == ".txt":
        return _read_txt_samples(file_path, max_lines)
    return []


def _detect_format(
    samples: List[Dict[str, Any]],
) -> tuple[str, Dict[str, str], Dict[str, str]]:
    """Detect data format and map columns.

    Returns:
        (formatting, columns_mapping, tags_mapping)
    """
    if not samples:
        return "unknown", {}, {}

    first = samples[0]

    # Check for ShareGpt format
    if "conversations" in first:
        conv = first["conversations"]
        if isinstance(conv, list) and len(conv) > 0:
            first_msg = conv[0]
            if isinstance(first_msg, dict):
                # Detect tag names
                role_key = (
                    "from"
                    if "from" in first_msg
                    else ("role" if "role" in first_msg else None)
                )
                content_key = (
                    "value"
                    if "value" in first_msg
                    else ("content" if "content" in first_msg else None)
                )
                if role_key and content_key:
                    tags = {"role_tag": role_key, "content_tag": content_key}
                    # Detect user/assistant tags
                    for msg in conv:
                        if msg.get(role_key) not in ("system", None):
                            if msg.get(role_key) in ("human", "user"):
                                tags["user_tag"] = msg[role_key]
                            elif msg.get(role_key) in ("gpt", "assistant"):
                                tags["assistant_tag"] = msg[role_key]
                    return "sharegpt", {"messages": "conversations"}, tags

    # Check for Alpaca format
    has_instruction = "instruction" in first
    has_output = "output" in first
    has_input = "input" in first
    has_prompt = "prompt" in first
    has_response = "response" in first
    has_query = "query" in first

    if has_instruction and has_output:
        columns = {
            "prompt": "instruction",
            "response": "output",
        }
        if has_input:
            columns["query"] = "input"
        return "alpaca", columns, {}

    if has_prompt and has_response:
        columns = {"prompt": "prompt", "response": "response"}
        if has_query:
            columns["query"] = "query"
        return "alpaca", columns, {}

    # Check for OpenAI messages format
    if "messages" in first:
        msg = first["messages"]
        if isinstance(msg, list) and len(msg) > 0:
            first_msg = msg[0]
            if (
                isinstance(first_msg, dict)
                and "role" in first_msg
                and "content" in first_msg
            ):
                return (
                    "sharegpt",
                    {"messages": "messages"},
                    {"role_tag": "role", "content_tag": "content"},
                )

    # Fallback: try to detect any text-like column
    text_columns = [
        k for k in first.keys() if isinstance(first[k], str) and len(first[k]) > 10
    ]
    if len(text_columns) >= 2:
        return "alpaca", {"prompt": text_columns[0], "response": text_columns[-1]}, {}

    return "unknown", {}, {}


def _get_column_samples(
    samples: List[Dict[str, Any]], columns: Dict[str, str]
) -> List[DetectedColumn]:
    """Get sample values for each detected column."""
    result = []
    for mapped_name, actual_name in columns.items():
        values = []
        for s in samples:
            val = s.get(actual_name)
            if val is not None:
                if isinstance(val, str):
                    values.append(val[:80])
                else:
                    values.append(str(val)[:80])
            if len(values) >= 3:
                break
        result.append(
            DetectedColumn(name=f"{mapped_name} → {actual_name}", sample_values=values)
        )
    return result


# ─── Endpoints ───────────────────────────────────────────────────────────────


@router.post("/browse", response_model=BrowseResponse)
async def browse_files(request: BrowseRequest):
    """Browse files on the server filesystem within the data directory."""
    data_dir = _get_data_dir()

    if request.path:
        target = Path(request.path)
        if not target.is_absolute():
            target = data_dir / request.path
    else:
        target = data_dir

    # Security: ensure we stay within data_dir
    data_dir_resolved = data_dir.resolve()
    try:
        target = target.resolve()
        if not str(target).startswith(str(data_dir_resolved)):
            target = data_dir_resolved
    except Exception:
        target = data_dir_resolved

    if not target.exists():
        target = data_dir

    entries: List[FileEntry] = []

    # List directories first, then files
    try:
        items = sorted(target.iterdir(), key=lambda p: (not p.is_dir(), p.name.lower()))
    except PermissionError:
        items = []

    for item in items:
        # Skip hidden files and __pycache__
        if item.name.startswith(".") or item.name == "__pycache__":
            continue

        entry = FileEntry(
            name=item.name,
            path=str(item.relative_to(data_dir_resolved))
            if item.is_relative_to(data_dir_resolved)
            else str(item),
            is_directory=item.is_dir(),
            size=item.stat().st_size if item.is_file() else None,
            extension=item.suffix if item.is_file() else None,
            is_supported=item.suffix.lower() in SUPPORTED_EXTENSIONS
            if item.is_file()
            else True,
        )
        entries.append(entry)

    parent = None
    if target != data_dir_resolved:
        try:
            parent = str(target.parent.relative_to(data_dir_resolved))
        except ValueError:
            parent = ""

    return BrowseResponse(
        current_path=str(target.relative_to(data_dir_resolved))
        if target.is_relative_to(data_dir_resolved)
        else "",
        parent_path=parent,
        entries=entries,
        data_dir=str(data_dir_resolved),
    )


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_dataset(request: AnalyzeRequest):
    """Analyze a dataset file to detect its format and columns."""
    data_dir = _get_data_dir()
    file_path = data_dir / request.file_path

    if not file_path.exists():
        raise HTTPException(
            status_code=404, detail=f"File not found: {request.file_path}"
        )

    ext = file_path.suffix.lower()
    if ext not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {ext}. Supported: {SUPPORTED_EXTENSIONS_STR}",
        )

    # Read samples
    samples = _read_samples(file_path, max_lines=20)

    # Detect format
    formatting, columns, tags = _detect_format(samples)

    # Get column samples
    detected_columns = _get_column_samples(samples, columns)

    # Count total samples
    sample_count = 0
    try:
        if ext == ".json":
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                sample_count = len(data) if isinstance(data, list) else 1
        elif ext == ".jsonl":
            with open(file_path, "r", encoding="utf-8") as f:
                sample_count = sum(1 for line in f if line.strip())
        elif ext == ".csv":
            with open(file_path, "r", encoding="utf-8") as f:
                sample_count = max(0, sum(1 for _ in f) - 1)  # subtract header
    except Exception:
        sample_count = len(samples)

    # Generate suggested dataset name
    stem = file_path.stem
    suggested_name = stem.replace(" ", "_").replace("-", "_").lower()

    # Build merged columns dict (include tags in columns for response)
    merged_columns = dict(columns)
    merged_columns.update(tags)

    return AnalyzeResponse(
        file_path=request.file_path,
        format=formatting,
        columns=merged_columns,
        detected_columns=detected_columns,
        sample_count=sample_count,
        file_size_bytes=file_path.stat().st_size,
        preview=samples[:5],
        suggested_name=suggested_name,
    )


@router.post("/configure", response_model=ConfigureResponse)
async def configure_dataset(request: ConfigureRequest):
    """Add/update a dataset entry in dataset_info.json."""
    data_dir = _get_data_dir()
    file_path = data_dir / request.file_path

    if not file_path.exists():
        raise HTTPException(
            status_code=404, detail=f"File not found: {request.file_path}"
        )

    # Load existing dataset_info
    info = _load_dataset_info()

    # Build entry
    entry: Dict[str, Any] = {
        "file_name": request.file_path,
        "formatting": request.formatting,
    }

    if request.columns:
        entry["columns"] = request.columns
    if request.tags:
        entry["tags"] = request.tags

    # Save
    info[request.dataset_name] = entry
    _save_dataset_info(info)

    return ConfigureResponse(
        success=True,
        dataset_name=request.dataset_name,
        message=f"Dataset '{request.dataset_name}' configured in {DATA_CONFIG}",
    )


@router.get("/info", response_model=DatasetInfoResponse)
async def get_dataset_info():
    """Read the current dataset_info.json."""
    data_dir = _get_data_dir()
    config_path = _get_config_path()
    info = _load_dataset_info()

    datasets = []
    for name, entry in info.items():
        if isinstance(entry, dict):
            datasets.append(
                DatasetInfoEntry(
                    name=name,
                    file_name=entry.get("file_name", ""),
                    formatting=entry.get("formatting", "alpaca"),
                    columns=entry.get("columns", {}),
                    tags=entry.get("tags", {}),
                )
            )

    return DatasetInfoResponse(
        datasets=datasets,
        config_path=str(config_path),
    )


@router.delete("/info/{dataset_name}")
async def delete_dataset_entry(dataset_name: str):
    """Remove a dataset entry from dataset_info.json."""
    info = _load_dataset_info()

    if dataset_name not in info:
        raise HTTPException(
            status_code=404, detail=f"Dataset '{dataset_name}' not found"
        )

    del info[dataset_name]
    _save_dataset_info(info)

    return {"success": True, "message": f"Dataset '{dataset_name}' removed"}


@router.get("/supported-formats")
async def get_supported_formats():
    """Return supported file extensions and data formats."""
    return {
        "extensions": list(SUPPORTED_EXTENSIONS),
        "formats": {
            "alpaca": {
                "description": "Instruction-based format",
                "columns": ["instruction", "input", "output"],
                "example": {
                    "instruction": "What is the capital of France?",
                    "input": "",
                    "output": "Paris",
                },
            },
            "sharegpt": {
                "description": "Conversation-based format",
                "columns": ["conversations (with from/value pairs)"],
                "example": {
                    "conversations": [
                        {"from": "human", "value": "Hello"},
                        {"from": "gpt", "value": "Hi there!"},
                    ]
                },
            },
        },
        "config_file": DATA_CONFIG,
    }


# ─── HuggingFace Dataset Endpoints ─────────────────────────────────────────────


@router.get("/hf/search")
async def search_hf_datasets(query: str = "", limit: int = 20):
    """Search HuggingFace datasets by query."""
    try:
        from huggingface_hub import HfApi

        api = HfApi()

        datasets = []
        for ds in api.list_datasets(
            search=query if query else None,
            limit=limit,
        ):
            datasets.append(
                {
                    "id": ds.id,
                    "name": ds.id.split("/")[-1],
                    "author": ds.id.split("/")[0] if "/" in ds.id else "",
                    "downloads": ds.downloads,
                    "likes": getattr(ds, "likes", 0),
                    "tags": getattr(ds, "tags", [])[:10]
                    if hasattr(ds, "tags") and ds.tags
                    else [],
                    "task": getattr(ds, "task_categories", [])
                    if hasattr(ds, "task_categories")
                    else [],
                    "created_at": str(ds.created_at)
                    if hasattr(ds, "created_at") and ds.created_at
                    else None,
                }
            )

        return {"datasets": datasets, "total": len(datasets)}
    except ImportError:
        raise HTTPException(status_code=500, detail="huggingface_hub not installed")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"HF search failed: {str(e)}")


@router.get("/hf/{repo_id}")
async def get_hf_dataset_info(repo_id: str):
    """Get detailed info about a HuggingFace dataset."""
    try:
        from huggingface_hub import HfApi

        api = HfApi()

        try:
            info = api.dataset_info(repo_id)

            return {
                "id": info.id,
                "name": info.id.split("/")[-1],
                "author": info.id.split("/")[0] if "/" in info.id else "",
                "downloads": info.downloads,
                "likes": getattr(info, "likes", 0),
                "tags": getattr(info, "tags", []),
                "task_categories": getattr(info, "task_categories", []),
                "card_data": getattr(info, "card_data", {}),
                "created_at": str(info.created_at)
                if hasattr(info, "created_at") and info.created_at
                else None,
                "last_modified": str(info.last_modified)
                if hasattr(info, "last_modified") and info.last_modified
                else None,
                "siblings": [
                    {"rfilename": s.rfilename, "size": getattr(s, "size", 0)}
                    for s in getattr(info, "siblings", [])[:20]
                ],
            }
        except Exception as e:
            raise HTTPException(status_code=404, detail=f"Dataset not found: {repo_id}")
    except ImportError:
        raise HTTPException(status_code=500, detail="huggingface_hub not installed")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get dataset info: {str(e)}"
        )


@router.get("/hf/{repo_id}/preview")
async def preview_hf_dataset(repo_id: str, split: str = "train", rows: int = 5):
    """Preview samples from a HuggingFace dataset."""
    try:
        from datasets import load_dataset

        try:
            ds = load_dataset(
                repo_id, split=split, streaming=True, trust_remote_code=True
            )

            samples = []
            for i, row in enumerate(ds):
                if i >= rows:
                    break
                samples.append(
                    {
                        k: str(v)[:200] if isinstance(v, str) else v
                        for k, v in row.items()
                    }
                )

            return {
                "repo_id": repo_id,
                "split": split,
                "samples": samples,
                "features": list(samples[0].keys()) if samples else [],
            }
        except Exception as e:
            raise HTTPException(
                status_code=400, detail=f"Failed to load dataset: {str(e)}"
            )
    except ImportError:
        raise HTTPException(status_code=500, detail="datasets library not installed")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Preview failed: {str(e)}")


@router.post("/hf/{repo_id}/download")
async def download_hf_dataset(
    repo_id: str, splits: Optional[str] = None, max_size: Optional[int] = None
):
    """Download a HuggingFace dataset to local data folder."""
    import tempfile
    import shutil

    try:
        from datasets import load_dataset
        import json

        data_dir = _get_data_dir()
        target_dir = data_dir / repo_id.replace("/", "_")
        target_dir.mkdir(parents=True, exist_ok=True)

        split_list = splits.split(",") if splits else None

        config_path = data_dir / DATA_CONFIG

        info = _load_dataset_info()

        dataset_entry = {
            "hf_hub_url": repo_id,
            "formatting": "alpaca",
            "description": f"Downloaded from HuggingFace: {repo_id}",
        }

        if split_list:
            dataset_entry["split"] = ",".join(split_list)

        info[repo_id.replace("/", "_")] = dataset_entry
        _save_dataset_info(info)

        return {
            "success": True,
            "message": f"Dataset '{repo_id}' configured. It will be downloaded when training starts.",
            "dataset_name": repo_id.replace("/", "_"),
            "config_path": str(config_path),
        }
    except ImportError as e:
        raise HTTPException(status_code=500, detail=f"Missing library: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Download failed: {str(e)}")


@router.post("/hf/validate-format")
async def validate_hf_format(repo_id: str, split: str = "train"):
    """Analyze the format of a HuggingFace dataset and suggest column mappings."""
    try:
        from datasets import load_dataset

        try:
            ds = load_dataset(
                repo_id, split=split, streaming=True, trust_remote_code=True
            )

            samples = []
            for i, row in enumerate(ds):
                if i >= 10:
                    break
                samples.append(row)

            if not samples:
                return {
                    "format": "unknown",
                    "columns": {},
                    "suggestion": "Dataset appears to be empty",
                }

            first = samples[0]

            detected_format = "unknown"
            columns = {}

            if "conversations" in first:
                detected_format = "sharegpt"
                columns = {"messages": "conversations"}
            elif "messages" in first:
                detected_format = "sharegpt"
                columns = {"messages": "messages"}
            elif "instruction" in first and "output" in first:
                detected_format = "alpaca"
                columns = {"prompt": "instruction", "response": "output"}
                if "input" in first:
                    columns["query"] = "input"
            elif "question" in first and "answer" in first:
                detected_format = "alpaca"
                columns = {"prompt": "question", "response": "answer"}

            if detected_format == "unknown":
                text_cols = [
                    k for k, v in first.items() if isinstance(v, str) and len(v) > 10
                ]
                if len(text_cols) >= 2:
                    detected_format = "alpaca"
                    columns = {"prompt": text_cols[0], "response": text_cols[-1]}

            return {
                "format": detected_format,
                "columns": columns,
                "available_columns": list(first.keys()),
                "suggestion": f"Detected {detected_format} format with columns: {', '.join(columns.values())}"
                if columns
                else "Could not auto-detect format. Please map columns manually.",
            }
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to analyze: {str(e)}")
    except ImportError:
        raise HTTPException(status_code=500, detail="datasets library not installed")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Validation failed: {str(e)}")


# ─── Local File Validation ─────────────────────────────────────────────────────


@router.post("/validate-local-path")
async def validate_local_path(request: dict):
    """Validate a local file path and return its info."""
    file_path = request.get("path", "")

    if not file_path:
        raise HTTPException(status_code=400, detail="Path is required")

    path = Path(file_path)

    result = {
        "path": file_path,
        "exists": path.exists(),
        "is_file": path.is_file() if path.exists() else False,
        "is_supported": False,
        "extension": None,
        "size_bytes": 0,
        "error": None,
    }

    if path.exists() and path.is_file():
        result["extension"] = path.suffix.lower()
        result["is_supported"] = result["extension"] in SUPPORTED_EXTENSIONS
        result["size_bytes"] = path.stat().st_size

        if result["is_supported"]:
            samples = _read_samples(path, max_lines=5)
            formatting, columns, tags = _detect_format(samples)
            result["format"] = formatting
            result["columns"] = columns
            result["preview"] = samples[:3]
    else:
        result["error"] = "File not found or is not a file"

    return result


@router.post("/copy-to-data")
async def copy_file_to_data(request: dict):
    """Copy a local file to the app's data directory."""
    file_path = request.get("path", "")

    if not file_path:
        raise HTTPException(status_code=400, detail="Path is required")

    source = Path(file_path)

    if not source.exists() or not source.is_file():
        raise HTTPException(status_code=404, detail="Source file not found")

    ext = source.suffix.lower()
    if ext not in SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {ext}. Supported: {', '.join(SUPPORTED_EXTENSIONS)}",
        )

    data_dir = _get_data_dir()
    dest = data_dir / source.name

    shutil.copy2(source, dest)

    samples = _read_samples(dest, max_lines=20)
    formatting, columns, tags = _detect_format(samples)

    info = _load_dataset_info()
    dataset_name = source.stem.replace(" ", "_").replace("-", "_").lower()

    info[dataset_name] = {
        "file_name": source.name,
        "formatting": formatting,
        "columns": columns,
    }

    if tags:
        info[dataset_name]["tags"] = tags

    _save_dataset_info(info)

    return {
        "success": True,
        "message": f"File copied to data directory and configured",
        "dataset_name": dataset_name,
        "format": formatting,
        "relative_path": source.name,
    }
