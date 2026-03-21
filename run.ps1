Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   ArclinkTune System Launcher (PS)" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

$ROOT = Get-Location

# 1. Check for Backend Venv
if (-not (Test-Path "$ROOT\environment\venv")) {
    Write-Host "[STATUS] Python environment not found. Starting setup..." -ForegroundColor Yellow
    python "$ROOT\scripts\setup_environment.py"
} else {
    Write-Host "[OK] Python environment found." -ForegroundColor Green
}

# 2. Check for Frontend Node Modules
if (-not (Test-Path "$ROOT\app\node_modules")) {
    Write-Host "[STATUS] Node dependencies not found. Installing..." -ForegroundColor Yellow
    Set-Location "$ROOT\app"
    npm install
    Set-Location $ROOT
} else {
    Write-Host "[OK] Node dependencies found." -ForegroundColor Green
}

Write-Host ""
Write-Host "[ACTION] Launching Backend & Frontend processes..." -ForegroundColor Cyan
Write-Host ""

# 3. Launch Backend in a New Window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$ROOT\backend'; ..\environment\venv\Scripts\python -m uvicorn main:app --reload --port 8000"

# 4. Launch Frontend in the Current Window
Set-Location "$ROOT\app"
npm run dev
