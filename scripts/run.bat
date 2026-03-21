@echo off
setlocal enabledelayedexpansion
set ROOT=%~dp0..
echo ==========================================
echo    ArclinkTune Launcher
echo ==========================================
echo.

set VENV_PATH=%ROOT%\core\.venv

:: Check if setup is needed
echo [INFO] Checking environment...

if NOT exist "%VENV_PATH%" (
    echo.
    echo [ERROR] Virtual environment not found!
    echo Please run setup first:
    echo   scripts\setup.bat
    echo.
    exit /b 1
)

if NOT exist "%ROOT%\app\node_modules" (
    echo.
    echo [ERROR] Frontend dependencies not installed!
    echo Please run setup first:
    echo   scripts\setup.bat
    echo.
    exit /b 1
)

echo [OK] Virtual environment found
echo [OK] Frontend dependencies found

:: Check GPU
python -c "import torch; exit(0 if torch.cuda.is_available() else 1)" >nul 2>&1
if %errorLevel% equ 0 (
    python -c "import torch; print('[OK] GPU: ' + torch.cuda.get_device_name(0))"
) else (
    echo [!] GPU monitoring unavailable
)

echo.
echo Starting services...
echo.

:: Kill existing processes
netstat -ano ^| findstr ":8000" ^| findstr "LISTENING" >nul
if !errorLevel! equ 0 (
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000" ^| findstr "LISTENING" ^| findstr "TCP"') do (
        taskkill //F //PID %%a >nul 2>&1
    )
)

netstat -ano ^| findstr ":5173" ^| findstr "LISTENING" >nul
if !errorLevel! equ 0 (
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5173" ^| findstr "LISTENING" ^| findstr "TCP"') do (
        taskkill //F //PID %%a >nul 2>&1
    )
)

timeout /t 1 /nobreak > nul

:: Launch Backend
echo [1/2] Starting Backend on port 8000...
start "ArclinkTune-Backend" cmd /k "cd /d %ROOT%\backend && python main.py"

:: Wait for backend
echo       Waiting for backend...
for /L %%i in (1,1,20) do (
    curl -s http://localhost:8000/health >nul 2>&1
    if !errorLevel! equ 0 (
        echo       Backend ready: http://localhost:8000
        echo       API Docs: http://localhost:8000/docs
        goto :launch_frontend
    )
    timeout /t 1 /nobreak > nul
)

:launch_frontend
echo.
echo [2/2] Starting Frontend on port 5173...
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