@echo off
REM Setup virtual environment for Knowledge Retrieval CLI Tool

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Python is not installed or not in PATH.
    echo Please install Python 3.8+ and ensure it's added to PATH.
    pause
    exit /b 1
)

REM Create virtual environment
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment and install dependencies
call venv\Scripts\activate
pip install -r requirements.txt

echo Virtual environment setup complete!
echo To activate: call venv\Scripts\activate
echo To run the CLI: python main.py

pause
