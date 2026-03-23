@echo off
chcp 65001 >nul 2>&1
setlocal enabledelayedexpansion

echo ================================================
echo ArclinkTune - Comprehensive Training Options Test
echo ================================================
echo.

set ROOT=C:\Users\Astrallink\Desktop\AstralLink\ArclinkTune
set VENV_PYTHON=%ROOT%\core\.venv\Scripts\python.exe
set MODEL_PATH=C:\Users\Astrallink\models\arclink\Qwen_Qwen2.5-0.5B-Instruct
set DATA_DIR=%ROOT%\data
set OUTPUT_DIR=%ROOT%\output\options_test
set LLMAMODEL_DIR=%ROOT%\core\LlamaFactory

echo [1/6] Environment Check
echo ========================
echo.

echo Checking Python and PyTorch...
"%VENV_PYTHON%" -c "import sys; import torch; print(f'  Python: {sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}'); print(f'  PyTorch: {torch.__version__}'); print(f'  CUDA: {torch.cuda.is_available()}'); print(f'  GPU: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else \"CPU Only\"}')"

echo.
echo Checking LlamaFactory CLI...
"%VENV_PYTHON%" -m llamafactory.cli version

echo.
echo [2/6] Checking Resources
echo ========================
echo.

if not exist "%MODEL_PATH%" (
    echo WARNING: Model not found at: %MODEL_PATH%
    echo Using test mode without actual model...
    set TEST_MODE=1
) else (
    echo   Model: OK
    set TEST_MODE=0
)

if not exist "%DATA_DIR%\alpaca_sample.json" (
    echo ERROR: Dataset not found!
    pause
    exit /b 1
)
echo   Dataset: OK

echo.
echo [3/6] Creating Test Configs
echo ============================
echo.

if exist "%OUTPUT_DIR%" rmdir /s /q "%OUTPUT_DIR%" 2>nul
mkdir "%OUTPUT_DIR%"

echo Testing various training option combinations...
echo.

:: Test 1: Basic LoRA with all defaults
echo [Test 1/5] Basic LoRA Configuration
(
echo ### Basic LoRA Config
echo stage: sft
echo model_name_or_path: "%MODEL_PATH%"
echo template: qwen
echo finetuning_type: lora
echo dataset: alpaca_sample
echo dataset_dir: "%DATA_DIR%"
echo output_dir: "%OUTPUT_DIR%\test1_basic_lora"
echo num_train_epochs: 0.01
echo per_device_train_batch_size: 1
echo gradient_accumulation_steps: 4
echo learning_rate: 5.0e-5
echo cutoff_len: 256
echo max_grad_norm: 1.0
echo logging_steps: 5
echo save_steps: 100
echo warmup_ratio: 0.1
echo bf16: true
echo fp16: false
echo lora_rank: 8
echo lora_alpha: 16
echo lora_dropout: 0.05
echo lora_target: all
) > "%OUTPUT_DIR%\test1_basic_lora.yaml"
echo   Created: test1_basic_lora.yaml

:: Test 2: Full Parameter Training
echo [Test 2/5] Full Parameter Training
(
echo ### Full Parameter Fine-tuning
echo stage: sft
echo model_name_or_path: "%MODEL_PATH%"
echo template: qwen
echo finetuning_type: full
echo dataset: alpaca_sample
echo dataset_dir: "%DATA_DIR%"
echo output_dir: "%OUTPUT_DIR%\test2_full_param"
echo num_train_epochs: 0.01
echo per_device_train_batch_size: 1
echo gradient_accumulation_steps: 4
echo learning_rate: 1.0e-5
echo cutoff_len: 256
echo bf16: true
echo fp16: false
) > "%OUTPUT_DIR%\test2_full_param.yaml"
echo   Created: test2_full_param.yaml

:: Test 3: LoRA with Quantization
echo [Test 3/5] LoRA with 4-bit Quantization
(
echo ### LoRA with BNB 4-bit Quantization
echo stage: sft
echo model_name_or_path: "%MODEL_PATH%"
echo template: qwen
echo finetuning_type: lora
echo dataset: alpaca_sample
echo dataset_dir: "%DATA_DIR%"
echo output_dir: "%OUTPUT_DIR%\test3_quantized_lora"
echo num_train_epochs: 0.01
echo per_device_train_batch_size: 1
echo gradient_accumulation_steps: 4
echo learning_rate: 5.0e-5
echo cutoff_len: 256
echo bf16: true
echo quantization_bit: 4
echo quantization_method: bnb
echo lora_rank: 8
echo lora_alpha: 16
echo lora_target: all
) > "%OUTPUT_DIR%\test3_quantized_lora.yaml"
echo   Created: test3_quantized_lora.yaml

:: Test 4: LoRA with Flash Attention
echo [Test 4/5] LoRA with Flash Attention 2
(
echo ### LoRA with Flash Attention 2
echo stage: sft
echo model_name_or_path: "%MODEL_PATH%"
echo template: qwen
echo finetuning_type: lora
echo dataset: alpaca_sample
echo dataset_dir: "%DATA_DIR%"
echo output_dir: "%OUTPUT_DIR%\test4_flashattn_lora"
echo num_train_epochs: 0.01
echo per_device_train_batch_size: 1
echo gradient_accumulation_steps: 4
echo learning_rate: 5.0e-5
echo cutoff_len: 256
echo bf16: true
echo flash_attn: fa2
echo lora_rank: 8
echo lora_alpha: 16
echo lora_target: all
) > "%OUTPUT_DIR%\test4_flashattn_lora.yaml"
echo   Created: test4_flashattn_lora.yaml

:: Test 5: Freeze Training
echo [Test 5/5] Freeze Training
(
echo ### Freeze Training (freeze embedding and first N layers)
echo stage: sft
echo model_name_or_path: "%MODEL_PATH%"
echo template: qwen
echo finetuning_type: freeze
echo dataset: alpaca_sample
echo dataset_dir: "%DATA_DIR%"
echo output_dir: "%OUTPUT_DIR%\test5_freeze"
echo num_train_epochs: 0.01
echo per_device_train_batch_size: 1
echo gradient_accumulation_steps: 4
echo learning_rate: 5.0e-5
echo cutoff_len: 256
echo bf16: true
echo freeze_trainable_layers: 2
echo freeze_trainable_modules: all
) > "%OUTPUT_DIR%\test5_freeze.yaml"
echo   Created: test5_freeze.yaml

echo.
echo [4/6] LlamaFactory CLI Validation
echo =================================
echo.

echo Validating YAML configs with LlamaFactory...
echo.

for %%F in (test1_basic_lora test2_full_param test3_quantized_lora test4_flashattn_lora test5_freeze) do (
    echo Checking %%F.yaml...
    "%VENV_PYTHON%" -c "import yaml; yaml.safe_load(open(r'%OUTPUT_DIR%\%%F.yaml', encoding='utf-8'))" 2>nul
    if !errorlevel! equ 0 (
        echo   [OK] Valid YAML
    ) else (
        echo   [FAIL] Invalid YAML
    )
)

echo.
echo [5/6] Quick Training Tests
echo =========================
echo.

if %TEST_MODE%==1 (
    echo WARNING: Running in TEST MODE (no actual model)
    echo Skipping actual training tests.
    echo.
    goto :api_test
)

echo This will run very short training tests (1-2 steps each).
echo All tests will stop after 10 seconds or 2 steps.
echo Press Ctrl+C to cancel, or any key to continue...
pause >nul

set TRAIN_TIMEOUT=15
set STEP_TIMEOUT=5

echo.
echo [Test 1] Basic LoRA Training...
echo ----------------------------------------
timeout /t 2 /nobreak >nul
start /b cmd /c "cd /d "%LLLAMODEL_DIR%" && set PYTHONPATH=%LLLAMODEL_DIR%\src && "%VENV_PYTHON%" -m llamafactory.cli train "%OUTPUT_DIR%\test1_basic_lora.yaml" 2^>^&1 | findstr /i /c:"loss" /c:"step" /c:"error" /c:"warning" | head /n 5"

echo.
echo [Test 2] Full Parameter Training...
echo ----------------------------------------
timeout /t 2 /nobreak >nul

echo.
echo [Test 3] Quantized Training...
echo ----------------------------------------
timeout /t 2 /nobreak >nul

echo.
echo [Test 6] DeepSpeed ZeRO-2...
echo ----------------------------------------
mkdir "%OUTPUT_DIR%\test6_deepspeed" 2>nul
(
echo ### LoRA with DeepSpeed ZeRO-2
echo stage: sft
echo model_name_or_path: "%MODEL_PATH%"
echo template: qwen
echo finetuning_type: lora
echo dataset: alpaca_sample
echo dataset_dir: "%DATA_DIR%"
echo output_dir: "%OUTPUT_DIR%\test6_deepspeed"
echo num_train_epochs: 0.01
echo per_device_train_batch_size: 1
echo gradient_accumulation_steps: 4
echo learning_rate: 5.0e-5
echo cutoff_len: 256
echo bf16: true
echo deepspeed:
echo   train_batch_size: auto
echo   train_micro_batch_size_per_gpu: auto
echo   gradient_accumulation_steps: auto
echo   zero_optimization:
echo     stage: 2
echo     offload_optimizer:
echo       device: none
echo     allgather_partitions: true
echo     allgather_bucket_size: 5.0e8
echo     reduce_scatter: true
echo     reduce_bucket_size: 5.0e8
echo lora_rank: 8
echo lora_alpha: 16
echo lora_target: all
) > "%OUTPUT_DIR%\test6_deepspeed.yaml"
timeout /t 2 /nobreak >nul

:api_test
echo.
echo [6/6] Backend API Config Validation
echo =====================================
echo.

echo Testing if backend API is running...
curl -s http://127.0.0.1:8000/api/system/health >nul 2>&1
if !errorlevel! equ 0 (
    echo Backend API is running. Testing config generation...
    echo.
    
    curl -s -X POST http://127.0.0.1:8000/api/training/config -H "Content-Type: application/json" | "%VENV_PYTHON%" -c "import sys,json; d=json.load(sys.stdin); print(f'Config fields: {len(d)}'); print('Sample fields:', list(d.keys())[:10])"
    
    echo.
    echo Testing compute devices endpoint...
    curl -s http://127.0.0.1:8000/api/training/compute-devices | "%VENV_PYTHON%" -c "import sys,json; d=json.load(sys.stdin); print(f'Available devices: {len(d.get(\"available\",[]))}'); [print(f'  - {dev[\"name\"]} ({dev[\"type\"]})') for dev in d.get('available',[])]"
    
    echo.
    echo Testing dataset endpoint...
    curl -s http://127.0.0.1:8000/api/training/datasets | "%VENV_PYTHON%" -c "import sys,json; d=json.load(sys.stdin); print(f'Available datasets: {len(d)}'); [print(f'  - {ds[\"name\"]}') for ds in d[:5]]"
) else (
    echo Backend API is not running.
    echo Start the API with: npm run api
)

echo.
echo ================================================
echo Options Test Summary
echo ================================================
echo.
echo Config files created in: %OUTPUT_DIR%
echo.
echo Test configs:
echo   1. test1_basic_lora.yaml    - Standard LoRA fine-tuning
echo   2. test2_full_param.yaml    - Full parameter fine-tuning
echo   3. test3_quantized_lora.yaml - LoRA with 4-bit quantization
echo   4. test4_flashattn_lora.yaml - LoRA with Flash Attention 2
echo   5. test5_freeze.yaml        - Freeze training
echo   6. test6_deepspeed.yaml     - LoRA with DeepSpeed ZeRO-2
echo.
echo All LlamaFactory options that are supported:
echo   - Training Stage: sft, pretrain, rm, ppo, dpo, orpo, kto
echo   - Fine-tuning: lora, full, freeze
echo   - Quantization: 4bit, 8bit (bnb, hqq, eetq)
echo   - Attention: flash_attn, use_unsloth, enable_liger_kernel
echo   - Optimizers: adamw, adamw_torch, sgd, lion, paged_adamw
echo   - Schedulers: cosine, linear, polynomial, constant
echo   - LoRA+: loraplus_lr_ratio, use_rslora, use_dora, pissa_init
echo   - GaLore: use_galore, galore_rank, galore_target
echo   - Apollo: use_apollo, apollo_rank
echo   - BAdam: use_badam, badam_mode
echo   - DeepSpeed: ds_stage 2/3 with offload options
echo   - Memory: quantization_bit, cutoff_len, max_samples
echo.
echo Press any key to exit...
pause >nul
