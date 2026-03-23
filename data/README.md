# Dataset Guide for ArclinkTune

This directory contains training datasets for fine-tuning language models.

## Supported Formats

### 1. Alpaca Format (Instruction-based)

Best for: General instruction following, Q&A, task completion

```json
[
  {
    "instruction": "What is the capital of France?",
    "input": "",
    "output": "The capital of France is Paris."
  },
  {
    "instruction": "Translate to Spanish",
    "input": "Hello, how are you?",
    "output": "Hola, ¿cómo estás?"
  }
]
```

**Columns:**
- `instruction` (required): The task/instruction
- `input` (optional): Additional context or user input
- `output` (required): The expected response
- `system` (optional): System prompt
- `history` (optional): Conversation history

### 2. ShareGPT Format (Conversation-based)

Best for: Multi-turn conversations, dialogue training

```json
[
  {
    "conversations": [
      {"from": "human", "value": "Hello!"},
      {"from": "gpt", "value": "Hi there!"}
    ],
    "system": "You are a helpful assistant."
  }
]
```

**Columns:**
- `conversations` (required): Array of message objects
- `from`: Role (human/gpt/system)
- `value`: Message content

## Supported File Types

- `.json` - JSON array
- `.jsonl` - JSON Lines (one object per line)
- `.csv` - Comma-separated values
- `.txt` - Plain text (single column)
- `.parquet` - Apache Parquet
- `.arrow` - Apache Arrow

## Pre-configured Datasets

The `dataset_info.json` file contains pre-configured datasets:

| Dataset | Format | Description |
|---------|--------|-------------|
| `alpaca_sample` | Alpaca | Sample Q&A examples |
| `sharegpt_sample` | ShareGPT | Sample conversations |
| `alpaca` | Alpaca | Stanford Alpaca dataset |
| `identity` | Alpaca | Model identity/personality |
| `openorca` | ShareGPT | OpenOrca reasoning dataset |
| `code_alpaca` | Alpaca | Code generation dataset |
| `gsm8k` | Alpaca | Math reasoning |

## Adding Custom Datasets

### Option 1: Local Files
1. Place your dataset file (.json, .jsonl, .csv) in this directory
2. Use the Dataset Browser in the Training page
3. Click "Browse Your Files" to select your dataset
4. The system will auto-detect the format and configure it

### Option 2: HuggingFace Datasets
1. Go to Training page → Dataset Browser
2. Switch to "HuggingFace" tab
3. Search for a dataset (e.g., "alpaca", "code")
4. Preview and configure the dataset

## Dataset Info Configuration

Datasets are registered in `dataset_info.json`:

```json
{
  "my_dataset": {
    "file_name": "my_data.json",
    "formatting": "alpaca",
    "columns": {
      "prompt": "instruction",
      "query": "input",
      "response": "output"
    }
  }
}
```

### Configuration Options

| Field | Required | Description |
|-------|----------|-------------|
| `file_name` | Yes | Path to data file |
| `hf_hub_url` | No | HuggingFace dataset URL |
| `formatting` | No | "alpaca" or "sharegpt" (default: alpaca) |
| `columns` | No | Column mapping |
| `split` | No | Dataset split (train/test) |

## Tips

1. **Quality over quantity**: A smaller, high-quality dataset often outperforms a larger, noisy one
2. **Format matters**: Ensure columns match the expected format
3. **Test first**: Try with a small sample before training on the full dataset
4. **Balance**: Keep training data balanced across different tasks/domains
