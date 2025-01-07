@echo off
setlocal enabledelayedexpansion

:: Check Python version
python --version 2>nul
if errorlevel 1 (
    echo Error: Python is not installed or not in PATH.
    exit /b 1
)

:: Create virtual environment
python -m venv venv
call venv\Scripts\activate

:: Upgrade pip and setuptools
python -m pip install --upgrade pip setuptools wheel

:: Install requirements
pip install -r requirements.txt

:: Optional: Install development dependencies
pip install -r requirements.txt

echo Installation complete. Activate the virtual environment with:
echo     call venv\Scripts\activate

pause
