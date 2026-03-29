@echo off
setlocal

cd /d "%~dp0"

echo.
echo AI Maze Runner Standalone Launcher
echo ==================================
echo.

where node >nul 2>nul
if errorlevel 1 (
    echo Node.js was not found on this machine.
    echo Install Node.js first, then run this launcher again.
    echo.
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo Dependencies were not found. Installing them now...
    call npm.cmd install
    if errorlevel 1 (
        echo.
        echo Dependency installation failed.
        echo.
        pause
        exit /b 1
    )
)

echo Starting the standalone server in a new window...
start "AI Maze Runner Standalone Server" /D "%~dp0" cmd /k "npm.cmd run serve:standalone"

echo Waiting for the local site to come online...
timeout /t 2 /nobreak >nul

echo Opening AI Maze Runner in your default browser...
start "" "http://127.0.0.1:4173"

echo.
echo If the browser opens before the server is ready, refresh once after a second or two.
echo To stop the server later, close the server window or press Ctrl+C in that window.
echo.
pause
