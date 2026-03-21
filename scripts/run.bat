@echo off
setlocal enabledelayedexpansion
set ROOT=%~dp0..
echo ==========================================
echo    ArclinkTune System Launcher (One-Click)
echo ==========================================
echo.

set VENV_PATH=%ROOT%\core\.venv

:: 1. Create/check virtual environment
echo [1/5] Checking Python environment...
if NOT exist "%VENV_PATH%" (
    echo     Creating virtual environment...
    python -m venv "%VENV_PATH%"
)
echo [OK] Python environment ready

:: 2. Install backend dependencies
echo.
echo [2/5] Installing backend dependencies...
call "%VENV_PATH%\Scripts\pip" install -q -r "%ROOT%\backend\requirements.txt"
echo [OK] Backend dependencies installed

:: 3. Install LlamaFactory in venv
echo.
echo [3/5] Installing LlamaFactory...
call "%VENV_PATH%\Scripts\pip" install -q -e "%ROOT%\core\LlamaFactory"
echo [OK] LlamaFactory installed

:: 4. Ensure CUDA PyTorch for GPU monitoring (global)
echo.
echo [4/5] Checking GPU monitoring...
python -c "import torch; exit(0 if torch.cuda.is_available() else 1)" >nul 2>&1
if %errorLevel% neq 0 (
    echo     Installing PyTorch with CUDA...
    pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118 -q
)
python -c "import torch; print('     CUDA: ' + str(torch.cuda.is_available()))" >nul 2>&1
echo [OK] GPU monitoring ready

:: 5. Check frontend dependencies
echo.
echo [5/5] Checking frontend dependencies...
if NOT exist "%ROOT%\app\node_modules" (
    echo     Installing npm packages...
    cd /d "%ROOT%\app" && call npm install
    cd /d "%ROOT%"
)
echo [OK] Frontend ready

echo.
echo ==========================================
echo    Launching ArclinkTune
echo ==========================================
echo.

:: Launch Backend
echo Starting Backend on port 8000...
start "ArclinkTune-Backend" cmd /k "cd /d %ROOT%\backend && python main.py"

:: Wait for backend
echo Waiting for backend...
for /L %%i in (1,1,15) do (
    curl -s http://localhost:8000/health >nul 2>&1
    if !errorLevel! equ 0 (
        echo [OK] Backend running on http://localhost:8000
        goto :ready
    )
    timeout /t 1 /nobreak > nul
)

:ready
echo.
echo ==========================================
echo    ArclinkTune is ready!
echo ==========================================
echo.
echo    Frontend: http://localhost:5173
echo    Backend:  http://localhost:8000
echo    API Docs: http://localhost:8000/docs
echo.

:: Launch Frontend
cd /d "%ROOT%\app" && npm run dev