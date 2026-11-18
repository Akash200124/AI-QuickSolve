@echo off
setlocal

echo ============================================
echo  AI QuickSolve - Development Startup
echo ============================================
echo.

:: Check if Python venv exists
if not exist "backend\venv\Scripts\python.exe" (
    echo [1/3] Setting up Python virtual environment...
    cd backend
    python -m venv venv
    if errorlevel 1 (
        echo ERROR: Python 3.11+ is required. Download from python.org
        pause & exit /b 1
    )
    call venv\Scripts\activate.bat
    pip install -r requirements.txt
    if errorlevel 1 (
        echo ERROR: Failed to install Python dependencies
        pause & exit /b 1
    )
    cd ..
    echo Python setup complete!
) else (
    echo [1/3] Python venv found, skipping setup
)

:: Copy .env if not exists
if not exist ".env" (
    echo [2/3] Creating .env from .env.example...
    copy .env.example .env
    echo Please edit .env and add your OpenAI API key!
) else (
    echo [2/3] .env file found
)

:: Start Python backend in background
echo [3/3] Starting Python backend on port 7845...
start "AI QuickSolve Backend" cmd /k "cd backend && venv\Scripts\activate && python app\main.py"

:: Wait a moment then start Electron
timeout /t 3 /nobreak > nul

echo.
echo Starting Electron frontend...
echo (Close both windows to stop the application)
echo.
npm run dev
