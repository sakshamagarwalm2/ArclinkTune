<div align="center">
  <img src="app/src/assets/baner.png" alt="ArclinkTune Banner" width="100%" />
</div>

# ArclinkTune

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux%20%7C%20macOS-lightgrey)
![Python](https://img.shields.io/badge/python-3.11+-green.svg)

## Features

- **Model Management**: Browse, download, and manage LLM models from Hugging Face and ModelScope
- **Training**: Fine-tune models using various methods (LoRA, full fine-tuning, etc.)
- **Chat/Inference**: Test your trained models with an interactive chat interface
- **Evaluation**: Evaluate model performance with built-in benchmarks
- **System Monitoring**: Real-time GPU/CPU/RAM monitoring with live graphs
- **Export**: Export trained models in various formats
- **Dark/Light Theme**: Modern UI with theme support

## Tech Stack

- **Frontend**: Electron + React + Vite + TypeScript + TailwindCSS + shadcn/ui
- **Backend**: FastAPI + Python
- **Monitoring**: psutil + pynvml (NVIDIA GPU monitoring)
- **Training**: LlamaFactory integration

## Architecture

ArclinkTune uses a unified environment for training and monitoring:

```
┌─────────────────────────────────────────────────────────────┐
│                    ArclinkTune Architecture                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────────────────┐    ┌─────────────────┐               │
│   │     Frontend    │    │     Backend     │               │
│   │   (Electron)    │───▶│    (FastAPI)    │               │
│   │  localhost:5173 │    │  localhost:8000  │               │
│   └─────────────────┘    └────────┬────────┘               │
│                                    │                        │
│                                    ▼                        │
│   ┌─────────────────────────────────────────────────────┐   │
│   │              core\.venv (Virtual Env)                │   │
│   │  • LlamaFactory (llamafactory-cli)                  │   │
│   │  • PyTorch with CUDA (GPU training/inference)       │   │
│   │  • PyTorch for GPU Monitoring                       │   │
│   │  • pynvml (NVIDIA GPU stats)                       │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Environment Details:

| Component | Python Environment | Purpose |
|-----------|-------------------|---------|
| **Training** | `core\.venv` | LlamaFactory, model training, fine-tuning |
| **Inference** | `core\.venv` | Chat API, model loading |
| **GPU Monitoring** | `core\.venv` | PyTorch CUDA, pynvml, real-time stats |
| **Frontend** | Node.js | Electron app, React UI |

### Key Ports:

| Service | Port | Purpose |
|---------|------|---------|
| Backend API | 8000 | FastAPI server |
| Frontend | 5173 | React dev server |
| Chat API | 8001 | LLaMA-Factory inference (internal) |

## Project Structure

```
ArclinkTune/
├── app/                    # Electron + React frontend
│   ├── src/
│   │   ├── main/          # Electron main process
│   │   ├── preload/       # Preload scripts
│   │   └── renderer/      # React app
│   │       ├── components/ # UI components
│   │       ├── hooks/      # Custom React hooks
│   │       ├── pages/      # App pages
│   │       └── lib/        # Utilities
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
├── backend/                # FastAPI backend
│   ├── routers/           # API endpoints
│   │   ├── models.py      # Model management (117 templates, 61 models)
│   │   ├── training.py    # Training operations
│   │   ├── chat.py        # Chat/inference
│   │   └── system.py      # System monitoring + GPU health
│   ├── services/           # Backend services
│   │   ├── system_monitor.py
│   │   └── training_service.py
│   ├── llamafactory_data.py # Dynamic loader from LlamaFactory
│   ├── main.py            # FastAPI app
│   └── config.py           # Configuration
├── core/
│   └── LlamaFactory/      # Training engine (webui/api removed)
├── scripts/                # Launcher scripts
│   ├── setup.ps1          # First-time setup (PowerShell)
│   ├── setup.bat          # First-time setup (CMD)
│   ├── run.ps1            # Run app (PowerShell)
│   ├── run.bat            # Run app (CMD)
│   ├── diagnose_cuda.bat   # CUDA diagnostic tool
│   ├── kill_api_processes.bat  # Kill stale API processes
│   ├── test_model_loading.bat   # Test model loading
│   ├── test_model_loading.py    # Python test script
│   ├── check_hardware.py   # Hardware check
│   ├── setup_environment.py # Environment setup
│   └── quick_start.py      # Quick start verification
├── docker-compose.yml       # Docker deployment
├── Dockerfile.backend       # Backend container
└── README.md
```

## Prerequisites

- **Python**: 3.11 or higher
- **Node.js**: 18 or higher
- **npm** or **yarn**
- **NVIDIA GPU** (optional, for GPU training)
- **CUDA** (optional, for GPU acceleration)

## 🚀 Quick Start

### First Time Setup (run once)

```powershell
# PowerShell
.\scripts\setup.ps1

# Or Command Prompt
scripts\setup.bat
```

This installs:
- Python virtual environment at `core\.venv`
- Backend dependencies
- LlamaFactory for training
- Frontend dependencies
- PyTorch with CUDA for GPU monitoring

### Run the App (every time)

```powershell
# PowerShell
.\scripts\run.ps1

# Or Command Prompt
scripts\run.bat
```

This starts:
- **Backend** on port 8000
- **Frontend** on port 5173
- **API Docs** at http://localhost:8000/docs

---

## Development Commands

### Frontend (app/)

```bash
cd app

# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint

# Type check
npm run typecheck
```

### Backend (backend/)

```bash
cd backend

# Start server (development)
python -m uvicorn main:app --reload --port 8000

# Start server (production)
python -m uvicorn main:app --host 0.0.0.0 --port 8000

# Run with custom host/port
python scripts/run_backend.py --host 127.0.0.1 --port 8000 --debug
```

### Utility Scripts

```bash
# Diagnose CUDA/GPU setup (Windows)
scripts\diagnose_cuda.bat

# Kill stale API processes (Windows)
scripts\kill_api_processes.bat

# Test model loading directly (Windows)
scripts\test_model_loading.bat

# Check system hardware capabilities
python scripts/check_hardware.py

# Set up Python environment
python scripts/setup_environment.py

# Quick start verification
python scripts/quick_start.py

# Run training worker (advanced)
python scripts/train_worker.py --config config.yaml --output-dir output/
```

## Docker Deployment

### Build and Run with Docker Compose

```bash
# Build and start all services
docker-compose up --build

# Run in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Build Backend Container Only

```bash
docker build -f Dockerfile.backend -t arclinktune-backend .
docker run -p 8000:8000 --gpus all arclinktune-backend
```

## API Endpoints

### Models

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/models/` | List available models |
| GET | `/api/models/supported` | Get supported models list |
| GET | `/api/models/local` | List locally downloaded models |
| GET | `/api/models/templates` | Get training templates |
| POST | `/api/models/download` | Download a model |
| GET | `/api/models/download/{task_id}` | Get download status |
| DELETE | `/api/models/download/{task_id}` | Cancel download |

### Training

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/training/config` | Get default training config |
| GET | `/api/training/datasets` | List available datasets |
| GET | `/api/training/runs` | List training runs |
| POST | `/api/training/preview` | Preview training command |
| POST | `/api/training/start` | Start training |
| GET | `/api/training/status/{run_id}` | Get training status |
| POST | `/api/training/stop/{run_id}` | Stop training |
| GET | `/api/training/logs/{run_id}` | Get training logs |
| GET | `/api/training/loss/{run_id}` | Get loss history |
| POST | `/api/training/save` | Save training config |
| POST | `/api/training/load` | Load training config |

### Chat

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat/load` | Load model for chat |
| POST | `/api/chat/unload` | Unload model |
| POST | `/api/chat/chat` | Send chat message |
| GET | `/api/chat/status` | Get chat status |

### System

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/system/stats` | Get all system stats |
| GET | `/api/system/gpu` | Get GPU stats |
| GET | `/api/system/cpu` | Get CPU stats |
| GET | `/api/system/memory` | Get memory stats |
| GET | `/api/system/disk` | Get disk stats |
| GET | `/api/system/network` | Get network stats |
| GET | `/api/system/info` | Get system info |

## Training Configuration

Example training configuration (YAML format):

```yaml
stage: sft
model_name_or_path: meta-llama/Llama-3.1-8B-Instruct
template: llama3
finetuning_type: lora
dataset: alpaca
learning_rate: 5e-5
num_train_epochs: 3.0
cutoff_len: 2048
per_device_train_batch_size: 2
gradient_accumulation_steps: 8
lr_scheduler_type: cosine
max_grad_norm: 1.0
logging_steps: 5
save_steps: 100
warmup_steps: 0
output_dir: output/my_model
bf16: true
lora_rank: 8
lora_alpha: 16
lora_dropout: 0.05
lora_target: all
```

## System Requirements

### Minimum

- 8GB RAM
- 50GB free disk space
- Python 3.11+

### Recommended

- 16GB+ RAM
- NVIDIA GPU with 8GB+ VRAM
- CUDA 12.1+
- 100GB+ free disk space

### Hardware Check

Run the hardware check script to verify your system:

```bash
python scripts/check_hardware.py
```

## Troubleshooting

### Diagnostic Scripts

Run these scripts to diagnose common issues:

```bash
# Diagnose CUDA/GPU issues
scripts\diagnose_cuda.bat

# Kill stale API processes on port 8001
scripts\kill_api_processes.bat

# Test model loading directly
scripts\test_model_loading.py
```

### Backend won't start

1. Check Python version: `python --version` (needs 3.11+)
2. Verify dependencies: `pip install -r backend/requirements.txt`
3. Check port availability: `netstat -ano | findstr 8000`

### Frontend won't start

1. Clear node_modules: `rm -rf node_modules`
2. Reinstall: `npm install`
3. Check for errors: `npm run dev`

### GPU/CUDA not detected

1. Run: `scripts\diagnose_cuda.bat` to check CUDA status
2. Verify NVIDIA driver: `nvidia-smi`
3. If venv PyTorch shows CPU only, reinstall:
   ```bash
   cd core\.venv\Scripts
   pip uninstall -y torch torchaudio torchvision torchdata
   pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
   pip install "torchdata>=0.10.0,<=0.11.0"
   ```

### Model loading fails / Chat not working

1. Kill stale processes: `scripts\kill_api_processes.bat`
2. Check backend console for `[ChatService]` logs
3. Verify model exists: Check `C:\Users\<user>\models\`
4. Try loading a small model first (e.g., Qwen2.5-0.5B)

### Connection refused errors (Chat)

1. Ensure backend is running: `curl http://localhost:8000/health`
2. Kill stale API processes: `scripts\kill_api_processes.bat`
3. Reload the model in the Chat page
4. Check CORS settings in `backend/main.py`

### Port 8001 already in use

Run: `scripts\kill_api_processes.bat` to kill stale API processes.

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/my-feature`
5. Create a Pull Request

## License

MIT License - see LICENSE file for details

## Version Management

The app version is managed centrally in `VERSION.json` and automatically synced to the app.

### Current Version

Check the current version:
```bash
cat VERSION.json
```

### Bump Version

```bash
# Patch bump (1.0.0 → 1.0.1)
npm run version:patch

# Minor bump (1.0.0 → 1.1.0)
npm run version:minor

# Major bump (1.0.0 → 2.0.0)
npm run version:major
```

This will:
- Update `VERSION.json` with new version + build date + git commit
- Copy to `app/public/version.json` for the app to read
- Show in the About page dynamically

---

## Acknowledgments

- [LlamaFactory](https://github.com/hiyouga/LlamaFactory) - Training framework
- [Electron](https://electronjs.org/) - Desktop framework
- [FastAPI](https://fastapi.tiangolo.com/) - Backend framework
- [shadcn/ui](https://ui.shadcn.com/) - UI components
