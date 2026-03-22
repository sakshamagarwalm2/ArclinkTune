# ArclinkTune Setup Script
# Run this once to set up the environment

param(
    [switch]$SkipGPU
)

$ErrorActionPreference = "Stop"
$ROOT = (Get-Item $PSScriptRoot).Parent.FullName

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   ArclinkTune Setup" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$VENV_PATH = "$ROOT\core\.venv"

# Find Python with CUDA support (3.11-3.12)
$PYTHON_BIN = $null
$PYTHON312 = "C:\Users\Astrallink\AppData\Local\Programs\Python\Python312\python.exe"
$PYTHON311 = "C:\Users\Astrallink\AppData\Local\Programs\Python\Python311\python.exe"
$PYTHON313 = "C:\Users\Astrallink\AppData\Local\Programs\Python\Python313\python.exe"

if (Test-Path $PYTHON312) { $PYTHON_BIN = $PYTHON312 }
elseif (Test-Path $PYTHON311) { $PYTHON_BIN = $PYTHON311 }
elseif (Test-Path $PYTHON313) { $PYTHON_BIN = $PYTHON313 }
else { $PYTHON_BIN = "python" }

# Check Python
Write-Host "[1/7] Checking Python..." -ForegroundColor Yellow
try {
    $pythonVersion = & $PYTHON_BIN --version 2>&1
    if ($pythonVersion -match "Python 3\.(1[1-2])") {
        Write-Host "  $pythonVersion (CUDA supported)" -ForegroundColor Green
    } elseif ($pythonVersion -match "Python 3\.([0-9]+)") {
        Write-Host "  $pythonVersion (Warning: CUDA may not be available)" -ForegroundColor Yellow
    } else {
        Write-Host "  ERROR: Python 3.11+ required for CUDA support" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "  ERROR: Python not found" -ForegroundColor Red
    exit 1
}

# Create virtual environment
Write-Host "[2/7] Setting up virtual environment..." -ForegroundColor Yellow
if (-not (Test-Path $VENV_PATH)) {
    Write-Host "  Creating core\.venv with Python $pythonVersion..."
    & $PYTHON_BIN -m venv $VENV_PATH
}
Write-Host "  OK" -ForegroundColor Green

# Install PyTorch with CUDA first
Write-Host "[3/7] Installing PyTorch with CUDA..." -ForegroundColor Yellow
& "$VENV_PATH\Scripts\python" -m pip install --upgrade pip -q
& "$VENV_PATH\Scripts\python" -m pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118 -q
Write-Host "  PyTorch with CUDA installed" -ForegroundColor Green

# Install LlamaFactory dependencies
Write-Host "[4/7] Installing LlamaFactory dependencies..." -ForegroundColor Yellow
& "$VENV_PATH\Scripts\python" -m pip install -q transformers "transformers>=4.55.0,<=5.2.0"
& "$VENV_PATH\Scripts\python" -m pip install -q accelerate datasets peft trl
& "$VENV_PATH\Scripts\python" -m pip install -q fastapi uvicorn sse-starlette gradio gradio-client
& "$VENV_PATH\Scripts\python" -m pip install -q pandas matplotlib scipy sentencepiece tiktoken
& "$VENV_PATH\Scripts\python" -m pip install -q pyyaml omegaconf safetensors huggingface-hub
& "$VENV_PATH\Scripts\python" -m pip install -q fire tyro rich packaging
Write-Host "  OK" -ForegroundColor Green

# Install LlamaFactory in editable mode
Write-Host "[5/7] Installing LlamaFactory..." -ForegroundColor Yellow
& "$VENV_PATH\Scripts\python" -m pip install -q -e "$ROOT\core\LlamaFactory"
Write-Host "  OK" -ForegroundColor Green

# Copy API module from original LlamaFactory if missing
$OriginalAPI = "$ROOT\LlamaFactory\src\llamafactory\api"
$ForkAPI = "$ROOT\core\LlamaFactory\src\llamafactory\api"
if ((Test-Path $OriginalAPI) -and (-not (Test-Path "$ForkAPI\app.py"))) {
    Write-Host "[6/7] Copying API module..." -ForegroundColor Yellow
    Copy-Item -Path $OriginalAPI -Destination $ForkAPI -Recurse -Force
    Write-Host "  OK" -ForegroundColor Green
} else {
    Write-Host "[6/7] API module (skipped)" -ForegroundColor Gray
}

# Install ArclinkTune backend dependencies
Write-Host "[7/7] Installing ArclinkTune backend dependencies..." -ForegroundColor Yellow
& "$VENV_PATH\Scripts\python" -m pip install -q pydantic-settings psutil python-multipart nvidia-ml-py3
Write-Host "  OK" -ForegroundColor Green

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "   Setup Complete!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Run the app with:" -ForegroundColor Yellow
Write-Host "  .\scripts\run.ps1" -ForegroundColor Cyan
Write-Host ""
Write-Host "Or manually:" -ForegroundColor Yellow
Write-Host "  Backend:  cd backend; ..\core\.venv\Scripts\python.exe main.py" -ForegroundColor Gray
Write-Host "  Frontend: cd app; npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "Test LlamaFactory integration:" -ForegroundColor Yellow
Write-Host "  ..\core\.venv\Scripts\python.exe -m llamafactory.cli" -ForegroundColor Cyan
Write-Host ""
