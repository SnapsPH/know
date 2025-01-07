## **Building `knowledge_retrieval` CLI Tool**

### **Overview**
`knowledge_retrieval` is a Python-based CLI tool designed to:
1. Scrape a URL for raw data.
2. Process the data using an **Ollama AI model**.
3. Save and retrieve raw and processed data.
4. Output results in multiple formats: JSON, Markdown, or CSV.

---

### **1. Directory Structure**
Organize your project as follows:

```
knowledge_retrieval/
├── main.py                  # Main CLI entry point.
├── scraper/
│   ├── scraper.py           # Web scraping logic.
│   └── __init__.py          # Module initializer.
├── processor/
│   ├── processor.py         # Ollama AI model integration.
│   └── __init__.py          # Module initializer.
├── storage/
│   ├── database.py          # SQLite database logic.
│   ├── file_storage.py      # File storage (if needed).
│   └── __init__.py          # Module initializer.
├── config/
│   ├── settings.ini         # Configuration file.
│   └── config.py            # Configuration management logic.
├── utils/
│   ├── formatter.py         # Formatting data into JSON, Markdown, CSV.
│   └── __init__.py          # Module initializer.
└── tests/
    └── test_knowledge.py    # Unit tests for the tool.
```

---

### **2. Installation**

#### **Install Dependencies**
Install all required Python libraries:
```bash
pip install requests beautifulsoup4 pandas typer
```

---

### **3. Code Overview**

#### **main.py**
The main entry point for the CLI, built using the `typer` library:
```python
import typer
from scraper.scraper import scrape_url
from processor.processor import process_data
from storage.database import store_data, retrieve_data
from utils.formatter import format_output

app = typer.Typer()

@app.command()
def scrape(url: str, save_raw: bool = True):
    """Scrape content from a URL."""
    raw_content = scrape_url(url)
    if save_raw:
        store_data("raw", url, raw_content)
    typer.echo("Scraping complete. Raw data stored.")

@app.command()
def process(record_id: int, output_format: str = "json", output_path: str = "output.json"):
    """Process stored data with Ollama AI model."""
    raw_data = retrieve_data("raw", record_id)
    processed_data = process_data(raw_data)
    formatted_output = format_output(processed_data, output_format)
    
    with open(output_path, "w") as file:
        file.write(formatted_output)
    typer.echo(f"Processed data saved to {output_path}")

@app.command()
def config(setting: str, value: str):
    """Update configuration settings."""
    from config.config import update_config
    update_config(setting, value)
    typer.echo(f"Configuration updated: {setting} = {value}")

if __name__ == "__main__":
    app()
```

---

### **4. Creating the Executable**

#### **Install PyInstaller**
Install PyInstaller globally:
```bash
pip install pyinstaller
```

#### **Generate the Executable**
Run the following command to create the `.exe` file:
```bash
pyinstaller --onefile --name knowledge_retrieval main.py
```

- **`--onefile`**: Packages everything into a single executable.
- **`--name knowledge_retrieval`**: Sets the name of the executable.

#### **Output Structure**
After running the command, the output will look like this:
```
dist/
└── knowledge_retrieval.exe      # Standalone executable
build/
├── ...                          # Temporary build files (can be ignored)
knowledge_retrieval.spec         # PyInstaller spec file
```

The `.exe` file is located in the `dist/` directory.

---

### **5. Adding Configuration Files**
If your tool requires a configuration file (e.g., `settings.ini`), include it in the build process using the `--add-data` flag:

```bash
pyinstaller --onefile --name knowledge_retrieval --add-data "config/settings.ini;config" main.py
```

This ensures that the `settings.ini` file is bundled with the executable.

---

### **6. Testing the Executable**
Run the executable from the terminal to ensure it works:
```bash
dist/knowledge_retrieval.exe scrape "https://example.com"
dist/knowledge_retrieval.exe process 1 --output_format json
dist/knowledge_retrieval.exe config output_format markdown
```

---

### **7. Distributing the Executable**
The generated `.exe` file can be distributed without requiring Python or dependencies. However, ensure:
1. All required files (e.g., `settings.ini`) are included.
2. It’s tested on different Windows systems for compatibility.

---

### **8. Troubleshooting**
1. **Missing Libraries**:
   - If you encounter missing library errors, ensure all dependencies are installed and included:
     ```bash
     pip freeze > requirements.txt
     pip install -r requirements.txt
     ```

2. **File Not Found**:
   - Verify that additional resources (like `settings.ini`) are bundled with `--add-data`.

3. **Executable Size**:
   - Use UPX to compress the executable:
     ```bash
     pyinstaller --onefile --upx-dir /path/to/upx main.py
     ```

---

### **9. Notes**
- This executable is cross-platform, but the `.exe` is specific to Windows.
- For other platforms (e.g., Linux or macOS), re-run the `pyinstaller` command on the target system.