@echo off
set ROOT=%~dp0
echo ==========================================
echo    ArclinkTune System Launcher (One-Click)
echo ==========================================

:: 1. Check for Backend Venv
if NOT exist "%ROOT%environment\venv" (
    echo [STATUS] Python environment not found. Starting setup...
    python "%ROOT%scripts\setup_environment.py"
) else (
    echo [OK] Python environment found.
)

:: 2. Check for Frontend Node Modules
if NOT exist "%ROOT%app\node_modules" (
    echo [STATUS] Node dependencies not found. Installing...
    cd /d "%ROOT%app" && npm install
) else (
    echo [OK] Node dependencies found.
)

echo.
echo [ACTON] Launching Backend ^& Frontend processes...
echo.

:: 3. Launch Backend in a New Window
start "ArclinkTune-Backend" cmd /k "cd /d %ROOT%backend && ..\environment\venv\Scripts\python -m uvicorn main:app --reload --port 8000"

:: 4. Launch Frontend in the Current Window
cd /d "%ROOT%app" && npm run dev
