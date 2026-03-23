@echo off
chcp 65001 >nul 2>&1
echo ================================================
echo ArclinkTune - Kill Stale Processes
echo ================================================
echo.

echo Killing any stale Python processes on port 8001...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8001 ^| findstr LISTENING') do (
    echo Killing process %%a...
    taskkill /F /PID %%a >nul 2>&1
)

echo.
echo Killing any llamafactory API processes...
taskkill /F /IM python.exe /FI "WINDOWTITLE eq *llamafactory*" >nul 2>&1

echo.
echo Checking port 8001 status...
netstat -ano 2>nul | findstr :8001
if errorlevel 1 (
    echo Port 8001 is now free.
) else (
    echo WARNING: Port 8001 may still be in use.
)

echo.
echo Done!
pause
