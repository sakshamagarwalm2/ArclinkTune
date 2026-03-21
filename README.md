<div align="center">
  <img src="app/src/assets/baner.png" alt="ArclinkTune Banner" width="100%" />
</div>

# ArclinkTune

A modern desktop application for fine-tuning and managing custom language models. Built with Electron + React frontend and FastAPI backend, leveraging LlamaFactory for training.

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
│   │   ├── models.py      # Model management
│   │   ├── training.py    # Training operations
│   │   ├── chat.py        # Chat/inference
│   │   └── system.py      # System monitoring
│   ├── services/           # Backend services
│   │   ├── system_monitor.py
│   │   └── training_service.py
│   ├── main.py            # FastAPI app
│   └── config.py           # Configuration
├── core/
│   └── LlamaFactory/      # LlamaFactory (unchanged)
├── scripts/                # Utility scripts
│   ├── setup_environment.py
│   ├── check_hardware.py
│   ├── train_worker.py
│   ├── run_backend.py
│   └── quick_start.py
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

## 🚀 One-Click Execution (Recommended)

To set up everything and start both the backend and frontend with a single command, simply run the launcher from the project root:

```powershell
# Windows (PowerShell)
.\run.ps1
```

```batch
# Windows (Command Prompt)
run.bat
```

This script will:
1. Automatically set up the **Python Virtual Environment** if missing.
2. Install all **Backend Dependencies** (`requirements.txt`).
3. Install all **Frontend Dependencies** (`node_modules`) if missing.
4. Launch the **FastAPI Backend** in a new dedicated terminal.
5. Launch the **Vite Frontend** in the current terminal.

---

## 🛠 Manual Quick Start

### 2. Set Up Python Environment

```bash
# Option A: Using the setup script
python scripts/setup_environment.py

# Option B: Manual setup
cd environment
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate
pip install -r ../backend/requirements.txt
```

### 3. Start Backend Server

```bash
cd backend
python -m uvicorn main:app --reload --port 8000
```

Or use the launcher script:

```bash
python scripts/run_backend.py --port 8000
```

### 4. Start Frontend Development Server

```bash
cd app
npm run dev
```

### 5. Open in Browser

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

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

### Backend won't start

1. Check Python version: `python --version` (needs 3.11+)
2. Verify dependencies: `pip install -r backend/requirements.txt`
3. Check port availability: `netstat -an | grep 8000`

### Frontend won't start

1. Clear node_modules: `rm -rf node_modules`
2. Reinstall: `npm install`
3. Check for errors: `npm run dev`

### GPU not detected

1. Verify NVIDIA driver: `nvidia-smi`
2. Check CUDA installation: `nvcc --version`
3. Install nvidia-ml-py3: `pip install nvidia-ml-py3`

### Connection refused errors

1. Ensure backend is running: `curl http://localhost:8000/health`
2. Check CORS settings in `backend/main.py`
3. Verify frontend API URL in `app/src/renderer/hooks/useApi.ts`

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/my-feature`
5. Create a Pull Request

## License

MIT License - see LICENSE file for details

## Acknowledgments

- [LlamaFactory](https://github.com/hiyouga/LlamaFactory) - Training framework
- [Electron](https://electronjs.org/) - Desktop framework
- [FastAPI](https://fastapi.tiangolo.com/) - Backend framework
- [shadcn/ui](https://ui.shadcn.com/) - UI components
