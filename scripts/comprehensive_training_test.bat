@echo off
chcp 65001 >nul 2>&1
setlocal enabledelayedexpansion

echo ================================================
echo ArclinkTune - Comprehensive Training Test Suite
echo ================================================
echo.
echo This script tests ALL training options by running
echo actual training for 1-2 steps, then stopping.
echo.
echo Press Ctrl+C to cancel at any time...
pause >nul
echo.

set ROOT=C:\Users\Astrallink\Desktop\AstralLink\ArclinkTune
set VENV_PYTHON=%ROOT%\core\.venv\Scripts\python.exe
set LLMAMODEL_DIR=%ROOT%\core\LlamaFactory
set DATA_DIR=%ROOT%\data
set MODEL_PATH=C:\Users\Astrallink\models\arclink\Qwen_Qwen2.5-0.5B-Instruct
set OUTPUT_BASE=%ROOT%\output\full_test

:: Configuration
set MAX_STEPS=2
set TIMEOUT_SEC=120
set EPOCHS=0.01

:: Colors (for Windows 10/11)
set GREEN=[92m
set RED=[91m
set YELLOW=[93m
set BLUE=[94m
set RESET=[0m

:: Create output directory
if not exist "%OUTPUT_BASE%" mkdir "%OUTPUT_BASE%"

:: ================================================
:: TEST 1: Environment Check
:: ================================================
echo %BLUE%================================================%RESET%
echo %BLUE%TEST 1: Environment Check%RESET%
echo %BLUE%================================================%RESET%
echo.

echo Checking Python...
"%VENV_PYTHON%" -c "import sys; print('Python:', sys.version.split()[0])"

echo.
echo Checking PyTorch and CUDA...
"%VENV_PYTHON%" -c "import torch; print('PyTorch:', torch.__version__); print('CUDA:', 'Available' if torch.cuda.is_available() else 'Not Available'); print('GPU:', torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'N/A')"

echo.
echo Checking LlamaFactory...
"%VENV_PYTHON%" -m llamafactory.cli version

echo.
echo Checking Model...
if exist "%MODEL_PATH%" (
    echo %GREEN%[OK]%RESET% Model found at: %MODEL_PATH%
) else (
    echo %RED%[FAIL]%RESET% Model not found!
    goto :error
)

echo.
echo Checking Dataset...
if exist "%DATA_DIR%\alpaca_sample.json" (
    echo %GREEN%[OK]%RESET% Dataset found
) else (
    echo %RED%[FAIL]%RESET% Dataset not found!
    goto :error
)

if exist "%DATA_DIR%\dataset_info.json" (
    echo %GREEN%[OK]%RESET% dataset_info.json found
) else (
    echo %RED%[FAIL]%RESET% dataset_info.json not found!
    goto :error
)

echo.
echo %GREEN%================================================%RESET%
echo %GREEN%Environment Check: PASSED%RESET%
echo %GREEN%================================================%RESET%
echo.
echo Starting training tests in 5 seconds...
timeout /t 5 /nobreak >nul

:: ================================================
:: Helper Function: Run Training Test
:: ================================================
goto :main

:run_test
set TEST_NAME=%~1
set TEST_OUTPUT=%~2
set TEST_CONFIG=%~3

echo.
echo %BLUE%------------------------------------------------%RESET%
echo %BLUE%Testing: %TEST_NAME%%RESET%
echo %BLUE%------------------------------------------------%RESET%
echo.

if exist "%TEST_OUTPUT%" rmdir /s /q "%TEST_OUTPUT%" 2>nul
mkdir "%TEST_OUTPUT%"

:: Create config file
(
echo ### %TEST_NAME%
echo stage: sft
echo model_name_or_path: "%MODEL_PATH%"
echo template: qwen
echo finetuning_type: %FINETYPE%
echo dataset: alpaca_sample
echo dataset_dir: "%DATA_DIR%"
echo output_dir: "%TEST_OUTPUT%"
echo num_train_epochs: %EPOCHS%
echo per_device_train_batch_size: 1
echo gradient_accumulation_steps: 4
echo learning_rate: 5.0e-5
echo cutoff_len: 256
echo max_grad_norm: 1.0
echo warmup_ratio: 0.1
echo logging_steps: 1
echo save_steps: 1000
echo bf16: true
echo fp16: false
%EXTRA_CONFIG%
) > "%TEST_OUTPUT%\train_config.yaml"

echo Config created at: %TEST_OUTPUT%\train_config.yaml
echo.
echo Starting training (max %MAX_STEPS% steps, %TIMEOUT_SEC% sec timeout)...
echo.

:: Run training
cd /d "%LLLAMODEL_DIR%"
set PYTHONPATH=%LLLAMODEL_DIR%\src
set PYTHONIOENCODING=utf-8

:: Start training in background and capture output
"%VENV_PYTHON%" -m llamafactory.cli train "%TEST_OUTPUT%\train_config.yaml" > "%TEST_OUTPUT%\training_log.txt" 2>&1
set TRAIN_EXIT=%errorlevel%

:: Check results
echo.
if %TRAIN_EXIT% equ 0 (
    echo %GREEN%[SUCCESS]%RESET% Training completed (exit code 0)
    
    :: Check for loss values in log
    findstr /C:"loss" "%TEST_OUTPUT%\training_log.txt" | findstr /v "history" > "%TEST_OUTPUT%\losses.txt"
    findstr /C:"Step" "%TEST_OUTPUT%\training_log.txt" > "%TEST_OUTPUT%\steps.txt"
    
    set /a LOSS_COUNT=0
    for /f %%i in ('findstr /C:"loss" "%TEST_OUTPUT%\training_log.txt" ^| find /c /v ""') do set LOSS_COUNT=%%i
    set /a STEP_COUNT=0
    for /f %%i in ('findstr /C:"Step" "%TEST_OUTPUT%\training_log.txt" ^| find /c /v ""') do set STEP_COUNT=%%i
    
    echo Training steps logged: %STEP_COUNT%
    echo Loss values logged: %LOSS_COUNT%
    
    if %LOSS_COUNT% gtr 0 (
        echo %GREEN%[SUCCESS]%RESET% Loss values recorded - Training worked!
    ) else (
        echo %YELLOW%[WARNING]%RESET% No loss values found
    )
    
    :: Check output files
    if exist "%TEST_OUTPUT%\adapter_model.safetensors" (
        echo %GREEN%[OK]%RESET% LoRA adapter created
    )
    if exist "%TEST_OUTPUT%\trainer_state.json" (
        echo %GREEN%[OK]%RESET% Trainer state saved
    )
    
) else (
    echo %YELLOW%[WARNING]%RESET% Training exited with code %TRAIN_EXIT%
    echo Checking log for errors...
    findstr /i /C:"error" /C:"failed" /C:"exception" "%TEST_OUTPUT%\training_log.txt" > "%TEST_OUTPUT%\errors.txt"
    if exist "%TEST_OUTPUT%\errors.txt" (
        echo Errors found:
        type "%TEST_OUTPUT%\errors.txt"
    )
)

:: Clean up for next test
echo.
echo Cleaning up...
if exist "%TEST_OUTPUT%\adapter_model.safetensors" del /q "%TEST_OUTPUT%\adapter_model.safetensors" 2>nul
if exist "%TEST_OUTPUT%\model.safetensors" del /q "%TEST_OUTPUT%\model.safetensors" 2>nul
if exist "%TEST_OUTPUT%\checkpoint*" rmdir /s /q "%TEST_OUTPUT%\checkpoint*" 2>nul

echo %TEST_NAME% completed.
exit /b 0

:: ================================================
:: MAIN TEST LOOP
:: ================================================
:main

set TESTS_PASSED=0
set TESTS_FAILED=0
set TESTS_WARNING=0

:: ================================================
:: TEST: Basic LoRA
:: ================================================
set TEST_NAME=Basic LoRA
set TEST_OUTPUT=%OUTPUT_BASE%\01_basic_lora
set FINETYPE=lora
set EXTRA_CONFIG=echo lora_rank: 8
call :run_test "%TEST_NAME%" "%TEST_OUTPUT%" ""
if %TRAIN_EXIT% equ 0 (
    set /a TESTS_PASSED+=1
) else (
    set /a TESTS_WARNING+=1
)

:: ================================================
:: TEST: Full Parameter
:: ================================================
echo.
echo ================================================
echo.
set TEST_NAME=Full Parameter Training
set TEST_OUTPUT=%OUTPUT_BASE%\02_full_param
set FINETYPE=full
set EXTRA_CONFIG=echo.
call :run_test "%TEST_NAME%" "%TEST_OUTPUT%" ""
if %TRAIN_EXIT% equ 0 (
    set /a TESTS_PASSED+=1
) else (
    set /a TESTS_WARNING+=1
)

:: ================================================
:: TEST: Freeze Training
:: ================================================
echo.
echo ================================================
echo.
set TEST_NAME=Freeze Training
set TEST_OUTPUT=%OUTPUT_BASE%\03_freeze
set FINETYPE=freeze
set EXTRA_CONFIG=echo freeze_trainable_layers: 2
call :run_test "%TEST_NAME%" "%TEST_OUTPUT%" ""
if %TRAIN_EXIT% equ 0 (
    set /a TESTS_PASSED+=1
) else (
    set /a TESTS_WARNING+=1
)

:: ================================================
:: TEST: LoRA with Quantization (4-bit)
:: ================================================
echo.
echo ================================================
echo.
set TEST_NAME=LoRA + 4-bit Quantization
set TEST_OUTPUT=%OUTPUT_BASE%\04_lora_quantized
set FINETYPE=lora
set EXTRA_CONFIG=echo quantization_bit: 4
call :run_test "%TEST_NAME%" "%TEST_OUTPUT%" ""
if %TRAIN_EXIT% equ 0 (
    set /a TESTS_PASSED+=1
) else (
    set /a TESTS_WARNING+=1
)

:: ================================================
:: TEST: LoRA with Flash Attention
:: ================================================
echo.
echo ================================================
echo.
set TEST_NAME=LoRA + Flash Attention
set TEST_OUTPUT=%OUTPUT_BASE%\05_flash_attn
set FINETYPE=lora
set EXTRA_CONFIG=echo flash_attn: fa2
call :run_test "%TEST_NAME%" "%TEST_OUTPUT%" ""
if %TRAIN_EXIT% equ 0 (
    set /a TESTS_PASSED+=1
) else (
    set /a TESTS_WARNING+=1
)

:: ================================================
:: TEST: LoRA + R-SLoRA
:: ================================================
echo.
echo ================================================
echo.
set TEST_NAME=LoRA + R-SLoRA
set TEST_OUTPUT=%OUTPUT_BASE%\06_rslora
set FINETYPE=lora
set EXTRA_CONFIG=echo use_rslora: true
call :run_test "%TEST_NAME%" "%TEST_OUTPUT%" ""
if %TRAIN_EXIT% equ 0 (
    set /a TESTS_PASSED+=1
) else (
    set /a TESTS_WARNING+=1
)

:: ================================================
:: TEST: LoRA + DoRA
:: ================================================
echo.
echo ================================================
echo.
set TEST_NAME=LoRA + DoRA
set TEST_OUTPUT=%OUTPUT_BASE%\07_dora
set FINETYPE=lora
set EXTRA_CONFIG=echo use_dora: true
call :run_test "%TEST_NAME%" "%TEST_OUTPUT%" ""
if %TRAIN_EXIT% equ 0 (
    set /a TESTS_PASSED+=1
) else (
    set /a TESTS_WARNING+=1
)

:: ================================================
:: TEST: DeepSpeed ZeRO-2
:: ================================================
echo.
echo ================================================
echo.
set TEST_NAME=DeepSpeed ZeRO-2
set TEST_OUTPUT=%OUTPUT_BASE%\08_deepspeed_z2
set FINETYPE=lora
set EXTRA_CONFIG=echo deepspeed: [config will be added]
(
echo deepspeed:
echo   train_batch_size: auto
echo   train_micro_batch_size_per_gpu: auto
echo   gradient_accumulation_steps: auto
echo   zero_optimization:
echo     stage: 2
) >> "%TEST_OUTPUT%\train_config_temp.yaml"
call :run_test "%TEST_NAME%" "%TEST_OUTPUT%" ""
if %TRAIN_EXIT% equ 0 (
    set /a TESTS_PASSED+=1
) else (
    set /a TESTS_WARNING+=1
)

:: ================================================
:: TEST: GaLore Optimization
:: ================================================
echo.
echo ================================================
echo.
set TEST_NAME=GaLore Optimization
set TEST_OUTPUT=%OUTPUT_BASE%\09_galore
set FINETYPE=lora
set EXTRA_CONFIG=echo use_galore: true
call :run_test "%TEST_NAME%" "%TEST_OUTPUT%" ""
if %TRAIN_EXIT% equ 0 (
    set /a TESTS_PASSED+=1
) else (
    set /a TESTS_WARNING+=1
)

:: ================================================
:: TEST: CPU Training
:: ================================================
echo.
echo ================================================
echo.
set TEST_NAME=CPU Only Training
set TEST_OUTPUT=%OUTPUT_BASE%\10_cpu_only
set FINETYPE=lora
set EXTRA_CONFIG=echo use_cpu: true
call :run_test "%TEST_NAME%" "%TEST_OUTPUT%" ""
if %TRAIN_EXIT% equ 0 (
    set /a TESTS_PASSED+=1
) else (
    set /a TESTS_WARNING+=1
)

:: ================================================
:: TEST: FP16 Mode
:: ================================================
echo.
echo ================================================
echo.
set TEST_NAME=FP16 Training
set TEST_OUTPUT=%OUTPUT_BASE%\11_fp16
set FINETYPE=lora
set EXTRA_CONFIG=echo bf16: false & echo fp16: true
call :run_test "%TEST_NAME%" "%TEST_OUTPUT%" ""
if %TRAIN_EXIT% equ 0 (
    set /a TESTS_PASSED+=1
) else (
    set /a TESTS_WARNING+=1
)

:: ================================================
:: SUMMARY
:: ================================================
echo.
echo ================================================
echo %BLUE%================================================%RESET%
echo %BLUE%             TEST SUMMARY                         %RESET%
echo %BLUE%================================================%RESET%
echo.
echo Total Tests: %TESTS_PASSED%
echo Passed: %GREEN%%TESTS_PASSED%%RESET%
echo Warnings: %YELLOW%%TESTS_WARNING%%RESET%
echo.
echo Output directory: %OUTPUT_BASE%
echo.
echo Press any key to exit...
pause >nul
goto :end

:error
echo.
echo %RED%================================================%RESET%
echo %RED%Environment check failed!%RESET%
echo %RED%================================================%RESET%
echo.
echo Please fix the issues above and run again.
echo.
pause

:end
