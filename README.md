# Knowledge Retrieval CLI

## Overview
A powerful CLI tool for web scraping, data processing, and AI-powered information management.

## Prerequisites
- Python 3.8+
- Windows, macOS, or Linux

## Installation

### Automated Installation
1. Clone the repository
2. Run the installation script:
```bash
# On Windows
install.bat

# On macOS/Linux
./install.sh
```

### Manual Installation
```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

## Running the Application

### Interactive Mode
```bash
# Activate virtual environment first
python main.py
```

### Command-line Options
```bash
# Scrape a URL
python main.py --url https://example.com

# Process data
python main.py --input-file data.json
```

## Building Standalone Executable

### Windows
```bash
# Activate virtual environment
call venv\Scripts\activate

# Build executable
build.bat
```

### macOS/Linux
```bash
# Activate virtual environment
source venv/bin/activate

# Build executable
./build.sh
```

The executable will be in the `dist` directory.

## Development

### Running Tests
```bash
pytest
```

### Code Formatting
```bash
black .
```

## Configuration
Edit `config/settings.ini` to customize:
- Scraping settings
- AI processing options
- Storage configurations

## License
[Your License Here]
