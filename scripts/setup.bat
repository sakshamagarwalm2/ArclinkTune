@echo off
setlocal enabledelayedexpansion
set ROOT=%~dp0..

echo ================================================
echo ArclinkTune Setup
echo ================================================
echo.

:: Check Python
echo [1/6] Checking Python...
python --version >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] Python not found. Please install Python 3.11+
    pause
    exit /b 1
)
for /f "delims=" %%i in ('python --version 2^>^&1') do echo [OK] %%i

:: Create venv
echo.
echo [2/6] Creating virtual environment...
if NOT exist "%ROOT%\core\.venv" (
    python -m venv "%ROOT%\core\.venv"
)
echo [OK] Virtual environment ready

:: Install backend deps
echo.
echo [3/6] Installing backend dependencies...
call "%ROOT%\core\.venv\Scripts\pip" install --upgrade pip -q
call "%ROOT%\core\.venv\Scripts\pip" install -q -r "%ROOT%\backend\requirements.txt"
echo [OK] Backend dependencies installed

:: Install LlamaFactory
echo.
echo [4/6] Installing LlamaFactory...
call "%ROOT%\core\.venv\Scripts\pip" install -q -e "%ROOT%\core\LlamaFactory"
echo [OK] LlamaFactory installed

:: Install frontend deps
echo.
echo [5/6] Installing frontend dependencies...
if NOT exist "%ROOT%\app\node_modules" (
    cd /d "%ROOT%\app" && call npm install
    cd /d "%ROOT%"
)
echo [OK] Frontend dependencies installed

:: Install CUDA PyTorch in VENV
echo.
echo [6/6] Setting up GPU monitoring...
echo       Checking venv PyTorch CUDA...
"%ROOT%\core\.venv\Scripts\python" -c "import torch; exit(0 if torch.cuda.is_available() else 1)" >nul 2>&1
if %errorLevel% neq 0 (
    echo       Installing PyTorch with CUDA in venv...
    :: Uninstall existing torch
    "%ROOT%\core\.venv\Scripts\pip" uninstall -y torch torchvision torchaudio torchdata >nul 2>&1
    :: Install CUDA PyTorch 12.1
    "%ROOT%\core\.venv\Scripts\pip" install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121 -q
    :: Install torchdata for LlamaFactory
    "%ROOT%\core\.venv\Scripts\pip" install "torchdata>=0.10.0,<=0.11.0" -q
)
"%ROOT%\core\.venv\Scripts\python" -c "import torch; print('       PyTorch: ' + torch.__version__); print('       CUDA: ' + str(torch.cuda.is_available())); print('       GPU: ' + (torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'N/A'))"
echo [OK] GPU monitoring ready

echo.
echo ================================================
echo Setup Complete!
echo ================================================
echo.
echo Run the app with:
echo   scripts\run.bat
echo.
echo Or manually:
echo   Backend:  cd backend ^&^& python main.py
echo   Frontend: cd app ^&^& npm run dev
echo.

pause
