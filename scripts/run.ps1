# ArclinkTune Run Script
# Starts the backend and frontend quickly

$ErrorActionPreference = "Continue"
$ROOT = (Get-Item $PSScriptRoot).Parent.FullName

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   ArclinkTune Launcher" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$VENV_PATH = "$ROOT\core\.venv"

# Quick checks
Write-Host "Checking environment..." -ForegroundColor Yellow

$ready = $true
if (-not (Test-Path $VENV_PATH)) {
    Write-Host "ERROR: Run setup first: .\scripts\setup.ps1" -ForegroundColor Red
    $ready = $false
}
if (-not (Test-Path "$ROOT\app\node_modules")) {
    Write-Host "ERROR: Run setup first: .\scripts\setup.ps1" -ForegroundColor Red
    $ready = $false
}
if (-not $ready) { exit 1 }

Write-Host "  [OK] Environment ready" -ForegroundColor Green

# Quick GPU check
python -c "import torch; print('GPU:', torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'N/A')" 2>$null

$backendPort = 8000
$frontendPort = 5173

# Kill old processes quickly
Get-NetTCPConnection -LocalPort $backendPort,$frontendPort -ErrorAction SilentlyContinue | 
    Stop-Process -Id {$_.OwningProcess} -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Starting services..." -ForegroundColor Cyan
Write-Host ""

# Launch Backend immediately (don't wait)
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$ROOT\backend'; python main.py" -WindowStyle Normal

# Quick check with retry
$attempts = 0
while ($attempts -lt 10) {
    try {
        $null = Invoke-WebRequest -Uri "http://localhost:$backendPort/health" -UseBasicParsing -TimeoutSec 1 -ErrorAction SilentlyContinue
        Write-Host "[OK] Backend ready on http://localhost:$backendPort" -ForegroundColor Green
        break
    } catch {
        $attempts++
        Start-Sleep -Milliseconds 500
    }
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "   ArclinkTune is ready!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   Frontend: http://localhost:$frontendPort" -ForegroundColor Cyan
Write-Host "   Backend:  http://localhost:$backendPort" -ForegroundColor Cyan
Write-Host ""

Set-Location "$ROOT\app"
npm run dev