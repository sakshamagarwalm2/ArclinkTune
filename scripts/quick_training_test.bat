@echo off
chcp 65001 >nul 2>&1
setlocal enabledelayedexpansion

echo ================================================
echo ArclinkTune - Quick Training Test
echo ================================================
echo.

set ROOT=C:\Users\Astrallink\Desktop\AstralLink\ArclinkTune
set VENV_PYTHON=%ROOT%\core\.venv\Scripts\python.exe
set LLMAMODEL_DIR=%ROOT%\core\LlamaFactory
set CONFIG=%ROOT%\output\quick_test\test_config.yaml

echo Checking prerequisites...
echo.

if not exist "%CONFIG%" (
    echo ERROR: Test config not found. Run the Python test first.
    pause
    exit /b 1
)

echo Config: %CONFIG%
echo.

echo Press any key to start training (will run ~30 seconds or 1 step)...
pause >nul

cd /d "%LLLAMODEL_DIR%"

set PYTHONPATH=%LLLAMODEL_DIR%\src
set PYTHONIOENCODING=utf-8

echo Starting training...
echo.
echo ================================================

"%VENV_PYTHON%" -m llamafactory.cli train "%CONFIG%" 

set TRAIN_EXIT=%errorlevel%

echo.
echo ================================================
echo Training exited with code: %TRAIN_EXIT%
echo ================================================
echo.

if %TRAIN_EXIT% equ 0 (
    echo SUCCESS: Training completed!
    echo.
    echo Checking output files...
    if exist "%ROOT%\output\quick_test\adapter_model.safetensors" (
        echo   adapter_model.safetensors: OK
    ) else (
        echo   WARNING: adapter_model.safetensors not found!
    )
    if exist "%ROOT%\output\quick_test\trainer_state.json" (
        echo   trainer_state.json: OK
    ) else (
        echo   WARNING: trainer_state.json not found!
    )
) else (
    echo FAILED: Training exited with error code %TRAIN_EXIT%
    echo.
    echo Check the log above for errors.
)

echo.
echo Press any key to exit...
pause >nul
