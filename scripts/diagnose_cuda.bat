@echo off
chcp 65001 >nul 2>&1
echo ================================================
echo ArclinkTune CUDA Diagnostic
echo ================================================
echo.

echo [1/7] NVIDIA Driver...
nvidia-smi --query-gpu=name,driver_version,memory.total --format=csv,noheader 2>nul
if errorlevel 1 (
    echo [ERROR] NVIDIA driver not found
    goto :summary
)
echo.

echo [2/7] Global Python...
python --version 2>nul
if errorlevel 1 (
    echo [WARN] Python not in PATH
) else (
    python -c "import torch; print(f'  PyTorch: {torch.__version__}'); print(f'  CUDA: {torch.cuda.is_available()}')" 2>nul
    if errorlevel 1 echo [WARN] PyTorch not installed in global Python
)
echo.

echo [3/7] Venv Python (LlamaFactory)...
set VENV_PY=C:\Users\Astrallink\Desktop\AstralLink\ArclinkTune\core\.venv\Scripts\python.exe
if exist "%VENV_PY%" (
    "%VENV_PY%" -c "import sys; print(f'  Python: {sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}'); import torch; print(f'  PyTorch: {torch.__version__}'); print(f'  CUDA: {torch.cuda.is_available()}'); print(f'  CUDA Ver: {torch.version.cuda}'); print(f'  GPU: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else \"N/A\"}')" 2>nul
    if errorlevel 1 (
        echo [ERROR] PyTorch import failed
    )
) else (
    echo [ERROR] Venv Python not found at: %VENV_PY%
)
echo.

echo [4/7] Venv Packages...
if exist "%VENV_PY%" (
    "%VENV_PY%" -m pip list 2>nul | findstr /I "torch llamafactory"
)
echo.

echo [5/7] LlamaFactory Installation...
if exist "C:\Users\Astrallink\Desktop\AstralLink\ArclinkTune\core\LlamaFactory\src\llamafactory" (
    echo [OK] LlamaFactory source found
    "%VENV_PY%" -m llamafactory.cli version 2>nul
) else (
    echo [ERROR] LlamaFactory not found
)
echo.

echo [6/7] Checking for existing API processes...
netstat -ano 2>nul | findstr ":8001 "
if errorlevel 1 echo   No process on port 8001
echo.

echo [7/7] Model files...
set MODEL_PATH=C:\Users\Astrallink\models\arclink\Qwen_Qwen2.5-0.5B-Instruct
if exist "%MODEL_PATH%" (
    echo [OK] Model found: %MODEL_PATH%
    dir "%MODEL_PATH%\*.safetensors" /b 2>nul
    dir "%MODEL_PATH%\config.json" 2>nul
    if errorlevel 1 echo [WARN] Missing model files!
) else (
    echo [WARN] Model not found at: %MODEL_PATH%
    echo.
    echo Available models:
    for /f "delims=" %%i in ('dir "C:\Users\Astrallink\models\*" /b /ad 2^>nul') do echo   - %%i
)
echo.

:summary
echo ================================================
echo SUMMARY
echo ================================================
echo.

set GLOBAL_CUDA=0
python -c "import torch; exit(0 if torch.cuda.is_available() else 1)" 2>nul
if not errorlevel 1 set GLOBAL_CUDA=1

set VENV_CUDA=0
"%VENV_PY%" -c "import torch; exit(0 if torch.cuda.is_available() else 1)" 2>nul
if not errorlevel 1 set VENV_CUDA=1

if %GLOBAL_CUDA%==1 (
    echo [OK] Global Python: CUDA Available
) else (
    echo [X] Global Python: CUDA Not Available
)

if %VENV_CUDA%==1 (
    echo [OK] Venv Python: CUDA Available - Training/Inference will work
) else (
    echo [X] Venv Python: CUDA Not Available - Training/Inference will be SLOW
    echo.
    echo To fix CUDA in venv, run:
    echo   cd C:\Users\Astrallink\Desktop\AstralLink\ArclinkTune\core\.venv\Scripts
    echo   pip uninstall -y torch torchaudio torchvision torchdata
    echo   pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
    echo   pip install "torchdata^=0.10.0,^<=0.11.0"
)

echo.
echo Quick Test Commands:
echo   1. Test model loading: scripts\test_model_loading.bat
echo   2. Re-run setup: scripts\setup.bat
echo   3. Check GPU: nvidia-smi
echo.
echo ================================================
pause
