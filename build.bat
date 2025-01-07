@echo off
setlocal enabledelayedexpansion

:: Check if virtual environment is activated
if not defined VIRTUAL_ENV (
    echo Error: Virtual environment is not activated.
    echo Please activate your virtual environment first.
    exit /b 1
)

:: Ensure PyInstaller is installed
pip install pyinstaller

:: Clean previous builds
if exist dist rmdir /s /q dist
if exist build rmdir /s /q build

:: Run PyInstaller
pyinstaller ^
    --clean ^
    --onefile ^
    --name knowledge_retrieval ^
    --add-data "config;config" ^
    --add-data "README.md;." ^
    main.py

:: Check build status
if %errorlevel% neq 0 (
    echo Build failed.
    exit /b 1
)

:: Create a distribution folder
mkdir dist\config
copy config\settings.ini dist\config\

echo Build successful. Executable is in the 'dist' directory.
pause
