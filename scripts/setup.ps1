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

# Check Python
Write-Host "[1/6] Checking Python..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version 2>&1
    if ($pythonVersion -match "Python 3\.(1[1-9]|[2-9][0-9])") {
        Write-Host "  $pythonVersion" -ForegroundColor Green
    } else {
        Write-Host "  ERROR: Python 3.11+ required" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "  ERROR: Python not found" -ForegroundColor Red
    exit 1
}

# Create virtual environment
Write-Host "[2/6] Setting up virtual environment..." -ForegroundColor Yellow
if (-not (Test-Path $VENV_PATH)) {
    Write-Host "  Creating core\.venv..."
    python -m venv $VENV_PATH
}
Write-Host "  OK" -ForegroundColor Green

# Install backend dependencies
Write-Host "[3/6] Installing backend dependencies..." -ForegroundColor Yellow
& "$VENV_PATH\Scripts\pip" install --upgrade pip -q
& "$VENV_PATH\Scripts\pip" install -q -r "$ROOT\backend\requirements.txt"
Write-Host "  OK" -ForegroundColor Green

# Install LlamaFactory
Write-Host "[4/6] Installing LlamaFactory..." -ForegroundColor Yellow
& "$VENV_PATH\Scripts\pip" install -q -e "$ROOT\core\LlamaFactory"
Write-Host "  OK" -ForegroundColor Green

# Install frontend dependencies
Write-Host "[5/6] Installing frontend dependencies..." -ForegroundColor Yellow
if (-not (Test-Path "$ROOT\app\node_modules")) {
    Set-Location "$ROOT\app"
    npm install
    Set-Location $ROOT
}
Write-Host "  OK" -ForegroundColor Green

# Install CUDA PyTorch for GPU monitoring
Write-Host "[6/6] Setting up GPU monitoring..." -ForegroundColor Yellow
if (-not $SkipGPU) {
    python -c "import torch; exit(0 if torch.cuda.is_available() else 1)" 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  Installing PyTorch with CUDA..."
        pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118 -q
    }
    
    python -c "import torch; Write-Host ('  CUDA: ' + $torch.cuda.is_available()); if ($$torch.cuda.is_available()) { Write-Host ('  GPU: ' + $torch.cuda.get_device_name(0)) }"
} else {
    Write-Host "  Skipped (--SkipGPU)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "   Setup Complete!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Run the app with:" -ForegroundColor Yellow
Write-Host "  .\scripts\run.ps1" -ForegroundColor Cyan
Write-Host ""
Write-Host "Or manually:" -ForegroundColor Yellow
Write-Host "  Backend:  cd backend; python main.py" -ForegroundColor Gray
Write-Host "  Frontend: cd app; npm run dev" -ForegroundColor Gray
Write-Host ""
