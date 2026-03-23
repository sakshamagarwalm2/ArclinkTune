@echo off
chcp 65001 >nul 2>&1
setlocal enabledelayedexpansion

echo ================================================
echo ArclinkTune - Training Test Script
echo ================================================
echo.

set ROOT=C:\Users\Astrallink\Desktop\AstralLink\ArclinkTune
set VENV_PYTHON=%ROOT%\core\.venv\Scripts\python.exe
set MODEL_PATH=C:\Users\Astrallink\models\arclink\Qwen_Qwen2.5-0.5B-Instruct
set DATA_DIR=%ROOT%\data
set OUTPUT_DIR=%ROOT%\output\test_training
set DATASET=alpaca_sample

echo [1/5] Checking environment...
echo.

echo Checking Python...
"%VENV_PYTHON%" -c "import sys; print(f'  Python: {sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}')"

echo.
echo Checking CUDA...
"%VENV_PYTHON%" -c "import torch; print(f'  PyTorch: {torch.__version__}'); print(f'  CUDA Available: {torch.cuda.is_available()}'); print(f'  CUDA Version: {torch.version.cuda}'); print(f'  GPU: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else \"N/A\"}')"

echo.
echo Checking LlamaFactory...
"%VENV_PYTHON%" -m llamafactory.cli version

echo.
echo [2/5] Checking model files...
if not exist "%MODEL_PATH%" (
    echo ERROR: Model not found at: %MODEL_PATH%
    echo Please download a model first.
    pause
    exit /b 1
)
echo   Model: %MODEL_PATH%
dir "%MODEL_PATH%\*.safetensors" /b 2>nul
dir "%MODEL_PATH%\config.json" 2>nul >nul
if errorlevel 1 (
    echo ERROR: Model files incomplete!
    pause
    exit /b 1
)
echo   Model files: OK

echo.
echo [3/5] Checking dataset...
if not exist "%DATA_DIR%\%DATASET%.json" (
    echo ERROR: Dataset not found at: %DATA_DIR%\%DATASET%.json
    pause
    exit /b 1
)
echo   Dataset: %DATA_DIR%\%DATASET%.json

if not exist "%DATA_DIR%\dataset_info.json" (
    echo ERROR: dataset_info.json not found!
    pause
    exit /b 1
)
echo   dataset_info.json: OK

echo.
echo [4/5] Checking output directory...
if exist "%OUTPUT_DIR%" (
    echo   Cleaning old output...
    rmdir /s /q "%OUTPUT_DIR%" 2>nul
)
mkdir "%OUTPUT_DIR%"
echo   Output: %OUTPUT_DIR%

echo.
echo [5/5] Creating training config...
set TRAIN_CONFIG=%OUTPUT_DIR%\train_config.yaml

(
echo # Training Test Configuration
echo stage: sft
echo model_name_or_path: "%MODEL_PATH%"
echo template: qwen
echo finetuning_type: lora
echo dataset: %DATASET%
echo dataset_dir: "%DATA_DIR%"
echo output_dir: "%OUTPUT_DIR%"
echo.
echo # Training Hyperparameters
echo num_train_epochs: 1
echo per_device_train_batch_size: 1
echo gradient_accumulation_steps: 4
echo learning_rate: 5.0e-5
echo cutoff_len: 512
echo max_grad_norm: 1.0
echo warmup_ratio: 0.1
echo.
echo # LoRA Config
echo lora_rank: 8
echo lora_alpha: 16
echo lora_dropout: 0.05
echo lora_target: all
echo.
echo # Logging
echo logging_steps: 5
echo save_steps: 20
echo.
echo # Hardware
echo fp16: false
echo bf16: true
) > "%TRAIN_CONFIG%"

echo Config created at: %TRAIN_CONFIG%
echo.

echo ================================================
echo Training Test
echo ================================================
echo.
echo This will run a minimal training test (1 epoch, small batch).
echo Press Ctrl+C to cancel, or any key to start...
pause >nul

echo.
echo Starting training...
echo.

cd /d "%ROOT%\core\LlamaFactory"

set PYTHONPATH=%ROOT%\core\LlamaFactory\src;%PYTHONPATH%
set PYTHONIOENCODING=utf-8

"%VENV_PYTHON%" -m llamafactory.cli train ^
    --stage sft ^
    --model_name_or_path "%MODEL_PATH%" ^
    --template qwen ^
    --finetuning_type lora ^
    --dataset %DATASET% ^
    --dataset_dir "%DATA_DIR%" ^
    --output_dir "%OUTPUT_DIR%" ^
    --num_train_epochs 1 ^
    --per_device_train_batch_size 1 ^
    --gradient_accumulation_steps 4 ^
    --learning_rate 5.0e-5 ^
    --cutoff_len 512 ^
    --max_grad_norm 1.0 ^
    --logging_steps 5 ^
    --save_steps 20 ^
    --lora_rank 8 ^
    --lora_alpha 16 ^
    --lora_dropout 0.05 ^
    --lora_target all ^
    --bf16 true ^
    --template qwen

set TRAIN_EXIT=%errorlevel%

echo.
echo ================================================
echo Training %TRAIN_EXIT%
echo ================================================
echo.

if %TRAIN_EXIT% equ 0 (
    echo SUCCESS: Training completed!
    echo.
    echo Checking output files...
    if exist "%OUTPUT_DIR%\adapter_model.safetensors" (
        echo   adapter_model.safetensors: OK
    ) else (
        echo   WARNING: adapter_model.safetensors not found!
    )
    if exist "%OUTPUT_DIR%\trainer_state.json" (
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
echo Output directory: %OUTPUT_DIR%
echo.
echo Press any key to exit...
pause >nul
