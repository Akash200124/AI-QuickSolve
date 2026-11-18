@echo off
echo Setting up AI QuickSolve Python backend...
cd /d "%~dp0backend"

echo Creating Python virtual environment...
python -m venv venv
if errorlevel 1 (
    echo ERROR: Python not found. Please install Python 3.11+
    pause
    exit /b 1
)

echo Activating virtual environment...
call venv\Scripts\activate.bat

echo Installing dependencies...
pip install -r requirements.txt
if errorlevel 1 (
    echo ERROR: Failed to install Python dependencies
    pause
    exit /b 1
)

echo.
echo Backend setup complete!
echo To start the backend manually:
echo   cd backend
echo   venv\Scripts\activate
echo   python app/main.py
pause
