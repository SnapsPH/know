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
if exist build rmdir /s /q build
if exist dist rmdir /s /q dist

:: Create output directories
if not exist "dist" mkdir dist
if not exist "dist\knowledge_retrieval" mkdir dist\knowledge_retrieval

:: Run PyInstaller with comprehensive options
pyinstaller ^
    --clean ^
    --noconfirm ^
    --name "knowledge_retrieval" ^
    --windowed ^
    --add-data "config;config" ^
    --add-data "README.md;." ^
    --add-data "docs;docs" ^
    --collect-all typer ^
    --collect-all requests ^
    --collect-all beautifulsoup4 ^
    --collect-all ollama ^
    main.py

:: Check build status
if %errorlevel% neq 0 (
    echo Build failed.
    exit /b 1
)

:: Prepare distribution package
cd dist

:: Create comprehensive package directory
mkdir knowledge_retrieval_win_x64
cd knowledge_retrieval_win_x64

:: Copy executable and resources
xcopy ..\knowledge_retrieval\* . /E /H /C /I

:: Create README for distribution
echo # Knowledge Retrieval CLI > README.txt
echo ## Usage >> README.txt
echo Run knowledge_retrieval.exe to start the application. >> README.txt
echo. >> README.txt
echo ## Configuration >> README.txt
echo Edit config\settings.ini to customize application settings. >> README.txt

:: Create ZIP archive
cd ..
powershell Compress-Archive -Force knowledge_retrieval_win_x64 knowledge_retrieval_win_x64.zip

echo Build successful. 
echo Executable and distribution package are in the 'dist' directory.
pause
