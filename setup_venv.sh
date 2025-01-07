#!/bin/bash
# Setup virtual environment for Knowledge Retrieval CLI Tool

# Check if Python is installed
if ! command -v python3 &> /dev/null
then
    echo "Python is not installed."
    echo "Please install Python 3.8+ and ensure it's in PATH."
    exit 1
fi

# Create virtual environment
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment and install dependencies
source venv/bin/activate
pip install -r requirements.txt

echo "Virtual environment setup complete!"
echo "To activate: source venv/bin/activate"
echo "To run the CLI: python main.py"
