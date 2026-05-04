@echo off
setlocal
echo ======================================================
echo   Equipment Matching System - Startup Script
echo ======================================================

cd /d %~dp0

echo [1/2] Starting Backend Server (FastAPI)...
if not exist ".\venv\Scripts\python.exe" (
    echo [ERROR] Virtual environment 'venv' not found.
    echo Please set up the environment first.
    pause
    exit /b
)

.\venv\Scripts\python -c "import fastapi" 2>nul
if errorlevel 1 (
    echo [INFO] Installing required libraries. This may take a few minutes...
    .\venv\Scripts\python -m pip install -r requirements.txt
)

start "Backend (FastAPI)" cmd /k ".\venv\Scripts\python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000"

echo [2/2] Starting Frontend Server (Vite)...
if not exist ".\frontend\node_modules" (
    echo [INFO] node_modules not found. Running npm install...
    cd frontend && call npm install && cd ..
)

start "Frontend (Vite)" cmd /k "cd frontend && npm run dev -- --host 0.0.0.0"

echo.
echo ======================================================
echo   Startup sequence initiated.
echo.
echo   App URL: http://localhost:5173
echo   API Docs: http://localhost:8000/docs
echo ======================================================
echo.

timeout /t 5 > nul
start http://localhost:5173

pause
