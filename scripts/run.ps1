Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   ArclinkTune System Launcher (PS)" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

$ErrorActionPreference = "Continue"
$ROOT = (Get-Item $PSScriptRoot).Parent.FullName

Write-Host ""
Write-Host "[1/5] Checking Python environment..." -ForegroundColor Yellow

$VENV_PATH = "$ROOT\core\.venv"

if (-not (Test-Path $VENV_PATH)) {
    Write-Host "    Creating virtual environment..." -ForegroundColor Yellow
    python -m venv $VENV_PATH
}

Write-Host "[OK] Python environment ready at core\.venv" -ForegroundColor Green

Write-Host ""
Write-Host "[2/5] Installing backend dependencies..." -ForegroundColor Yellow

& "$VENV_PATH\Scripts\pip" install -q -r "$ROOT\backend\requirements.txt"
if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Backend dependencies installed" -ForegroundColor Green
}

Write-Host ""
Write-Host "[3/5] Installing LlamaFactory in venv..." -ForegroundColor Yellow

& "$VENV_PATH\Scripts\pip" install -q -e "$ROOT\core\LlamaFactory"
if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] LlamaFactory installed" -ForegroundColor Green
}

Write-Host ""
Write-Host "[4/5] Checking GPU monitoring..." -ForegroundColor Yellow

python -c "import torch; exit(0 if torch.cuda.is_available() else 1)" 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "    Installing PyTorch with CUDA..." -ForegroundColor Yellow
    pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118 -q
    python -c "import torch; Write-Host ('    CUDA: ' + $torch.cuda.is_available())"
}
Write-Host "[OK] GPU monitoring ready" -ForegroundColor Green

Write-Host ""
Write-Host "[5/5] Checking frontend dependencies..." -ForegroundColor Yellow

if (-not (Test-Path "$ROOT\app\node_modules")) {
    Write-Host "    Installing npm packages..." -ForegroundColor Yellow
    Set-Location "$ROOT\app"
    npm install
    Set-Location $ROOT
}
Write-Host "[OK] Frontend dependencies ready" -ForegroundColor Green

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   Launching ArclinkTune" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Launch Backend in New Window
Write-Host "Starting Backend on port 8000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$ROOT\backend'; python main.py; Write-Host 'Backend stopped'" -WindowStyle Normal

# Wait for backend
$attempts = 0
while ($attempts -lt 15) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8000/health" -UseBasicParsing -TimeoutSec 1 -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            Write-Host "[OK] Backend running on http://localhost:8000" -ForegroundColor Green
            break
        }
    } catch {}
    Start-Sleep -Seconds 1
    $attempts++
}

Write-Host ""
Write-Host "Starting Frontend on port 5173..." -ForegroundColor Yellow
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   ArclinkTune is ready!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "   Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host "   Backend:  http://localhost:8000" -ForegroundColor Cyan
Write-Host "   API Docs: http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host ""

# Launch Frontend
Set-Location "$ROOT\app"
npm run dev