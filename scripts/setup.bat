@echo off
setlocal enabledelayedexpansion

echo ================================================
echo ArclinkTune Setup Script
echo ================================================
echo.

set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

:check_admin
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [INFO] Some operations may require admin privileges
    echo.
)

:check_python
echo [1/5] Checking Python installation...
python --version >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] Python not found. Please install Python 3.10+ from python.org
    pause
    exit /b 1
)

for /f "delims=" %%i in ('python --version 2^>^&1') do set "PYTHON_VERSION=%%i"
echo [OK] %PYTHON_VERSION%

:frontend_deps
echo.
echo [2/5] Installing frontend dependencies...
cd app
if exist "package-lock.json" (
    call npm ci
) else (
    call npm install
)
if %errorLevel% neq 0 (
    echo [ERROR] Failed to install frontend dependencies
    pause
    exit /b 1
)
echo [OK] Frontend dependencies installed
cd ..

:backend_deps
echo.
echo [3/5] Installing backend dependencies...
cd backend
call pip install -r requirements.txt
if %errorLevel% neq 0 (
    echo [ERROR] Failed to install backend dependencies
    pause
    exit /b 1
)
echo [OK] Backend dependencies installed
cd ..

:llamafactory_setup
echo.
echo [4/5] Setting up LlamaFactory virtual environment...
cd core\LlamaFactory

if exist "..\..\.venv" (
    echo [INFO] Virtual environment exists, activating...
) else (
    echo [INFO] Creating virtual environment...
    python -m venv ..\..\.venv
)

call ..\..\.venv\Scripts\activate.bat

echo [INFO] Upgrading pip...
python -m pip install --upgrade pip

echo [INFO] Installing LlamaFactory dependencies...
pip install -e . -q

if %errorLevel% neq 0 (
    echo [ERROR] Failed to install LlamaFactory dependencies
    pause
    exit /b 1
)
echo [OK] LlamaFactory dependencies installed

cd ..\..
call .venv\Scripts\deactivate.bat

:gpu_check
echo.
echo [5/5] GPU Setup for Monitoring...
echo [INFO] Installing PyTorch with CUDA support for GPU monitoring...

pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118 -q

if %errorLevel% neq 0 (
    echo [WARNING] Failed to install CUDA PyTorch. GPU monitoring may not work.
    echo [INFO] You can install manually with:
    echo        pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
) else (
    echo [OK] CUDA PyTorch installed for monitoring
    python -c "import torch; print('    PyTorch: ' + torch.__version__); print('    CUDA: ' + str(torch.cuda.is_available()))"
)

:final
echo.
echo ================================================
echo Setup Complete!
echo ================================================
echo.
echo You can now run the app with:
echo   npm run dev
echo.
echo Note: GPU monitoring uses global PyTorch with CUDA.
echo       Training uses the .venv virtual environment.
echo.

pause
