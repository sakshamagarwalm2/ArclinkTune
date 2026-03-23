@echo off
chcp 65001 >nul 2>&1
setlocal enabledelayedexpansion

echo ================================================
echo ArclinkTune Model Loading Test
echo ================================================
echo.

set MODEL_PATH=C:\Users\Astrallink\models\arclink\Qwen_Qwen2.5-0.5B-Instruct
set VENV_PYTHON=C:\Users\Astrallink\Desktop\AstralLink\ArclinkTune\core\.venv\Scripts\python.exe
set LLAMA_PATH=C:\Users\Astrallink\Desktop\AstralLink\ArclinkTune\core\LlamaFactory
set API_PORT=8001

echo [1/4] Checking Python environment...
if not exist "%VENV_PYTHON%" (
    echo ERROR: Venv Python not found at: %VENV_PYTHON%
    exit /b 1
)
"%VENV_PYTHON%" -c "import torch; print(f'  PyTorch: {torch.__version__}'); print(f'  CUDA: {torch.cuda.is_available()}')"
echo.

echo [2/4] Checking model files...
if not exist "%MODEL_PATH%" (
    echo ERROR: Model not found at: %MODEL_PATH%
    echo.
    echo Available models in C:\Users\Astrallink\models\:
    dir "C:\Users\Astrallink\models\*" /b /ad 2>nul
    exit /b 1
)
echo   Model path: %MODEL_PATH%
echo   Contents:
for /f "delims=" %%i in ('dir "%MODEL_PATH%" /b 2^>nul') do echo     - %%i
echo.

echo [3/4] Checking CUDA availability...
"%VENV_PYTHON%" -c "import torch; assert torch.cuda.is_available(), 'CUDA not available'; print(f'  GPU: {torch.cuda.get_device_name(0)}'); print(f'  VRAM: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.1f} GB')"
if errorlevel 1 (
    echo.
    echo WARNING: CUDA not available. Model loading will be very slow!
    echo.
)
echo.

echo [4/4] Testing API startup (30 seconds timeout)...
echo   Starting LLaMA-Factory API...
echo   Command: llamafactory-cli api --model_name_or_path "%MODEL_PATH%" --template qwen
echo.
echo   NOTE: First run may download tokenizer or model files.
echo   This can take several minutes for large models.
echo.

set START_TIME=%time%
set API_RUNNING=0

start /b cmd /c "set PYTHONIOENCODING=utf-8 && "%VENV_PYTHON%" -m llamafactory.cli api --model_name_or_path "%MODEL_PATH%" --template qwen --api_port %API_PORT% > api_output.log 2>&1"

echo   Waiting for API to start (checking every 2 seconds)...
for /L %%i in (1,1,30) do (
    timeout /t 2 /nobreak >nul
    curl -s http://127.0.0.1:%API_PORT%/v1/models >nul 2>&1
    if not errorlevel 1 (
        set API_RUNNING=1
        goto :api_ready
    )
    if %%i == 5 echo     Still starting... (model may be downloading)
    if %%i == 15 echo     This is taking longer than expected...
    if %%i == 25 echo     Still loading... (may need more time for large models)
)

:api_ready
set END_TIME=%time%

if %API_RUNNING%==1 (
    echo.
    echo SUCCESS! API is running at http://127.0.0.1:%API_PORT%
    echo Time taken: %START_TIME% - %END_TIME%
    echo.
    echo Testing chat endpoint...
    curl -s -X POST http://127.0.0.1:%API_PORT%/v1/chat/completions ^
        -H "Content-Type: application/json" ^
        -d "{\"model\":\"Qwen2.5-0.5B\",\"messages\":[{\"role\":\"user\",\"content\":\"Hello!\"}],\"max_tokens\":50}" ^
        > chat_test.json 2>&1
    
    findstr /C:"content" chat_test.json >nul 2>&1
    if not errorlevel 1 (
        echo Chat test PASSED!
        type chat_test.json
    ) else (
        echo Chat test response (check manually):
        type chat_test.json
    )
    
    echo.
    echo Killing API process...
    taskkill /f /im python.exe 2>nul
    
) else (
    echo.
    echo FAILED: API did not start within 30 seconds
    echo.
    echo Check api_output.log for details:
    if exist api_output.log (
        echo =========================================
        type api_output.log
        echo =========================================
    )
    echo.
    echo Common issues:
    echo   1. Model downloading from HuggingFace - needs HF_TOKEN
    echo   2. CUDA out of memory - close other GPU applications
    echo   3. Missing tokenizer - re-download model
    echo.
    echo To run manually with full output:
    echo   cd %LLAMA_PATH%
    echo   set PYTHONIOENCODING=utf-8
    echo   "%VENV_PYTHON%" -m llamafactory.cli api --model_name_or_path "%MODEL_PATH%" --template qwen
)

echo.
echo ================================================
echo Test Complete
echo ================================================
pause
