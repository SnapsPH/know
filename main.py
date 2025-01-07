import typer
import sys
import os
import traceback
import io

def safe_stdin_wrapper():
    """
    Safely wrap sys.stdin for PyInstaller environments
    """
    try:
        # Check if we're in a PyInstaller bundled environment
        if getattr(sys, 'frozen', False):
            # If stdin is None, create a dummy input stream
            if sys.stdin is None:
                sys.stdin = io.StringIO()
            # If stdin doesn't have a buffer, wrap it
            elif not hasattr(sys.stdin, 'buffer'):
                sys.stdin = io.TextIOWrapper(sys.stdin)
        return sys.stdin
    except Exception as e:
        # Fallback to a dummy input stream if anything goes wrong
        print(f"Error wrapping stdin: {e}")
        return io.StringIO()

def safe_input(prompt):
    """
    Safe input function that works in both interactive and bundled environments
    """
    try:
        # First, try standard input
        return input(prompt)
    except Exception:
        # Fallback to Tkinter dialog
        try:
            import tkinter as tk
            from tkinter import simpledialog
            
            root = tk.Tk()
            root.withdraw()
            
            user_input = simpledialog.askstring("Input", prompt)
            return user_input if user_input is not None else ""
        except Exception as e:
            print(f"Input error: {e}")
            return ""

from typing import Optional, Dict, Any
import json
from scraper.scraper import WebScraper
from processor.processor import DataProcessor
from storage.database import DataStorage
from utils.formatter import DataFormatter
from config.config import ConfigManager

class KnowledgeRetrievalTool:
    def __init__(self, config_path: str = 'config/settings.ini'):
        self.config = ConfigManager(config_path)
        self.storage = DataStorage(
            self.config.get('STORAGE', 'database_path', 'knowledge_base.db')
        )

    def scrape(self, 
               url: str, 
               output: Optional[str] = None, 
               format: Optional[str] = "json",
               crawl_depth: Optional[int] = None) -> Dict[str, Any]:
        if crawl_depth is None:
            crawl_depth = int(self.config.get('SCRAPER', 'crawl_depth', 0))
        
        scraped_data = WebScraper.scrape(url)
        
        self.storage.save_scraped_data(scraped_data)
        
        if output:
            if format == "json":
                DataFormatter.to_json(scraped_data, output)
            elif format == "markdown":
                DataFormatter.to_markdown(scraped_data, output)
            elif format == "csv":
                DataFormatter.to_csv([scraped_data], output)
        
        return scraped_data

    def process(self, 
                input_data: Dict[str, Any], 
                model: Optional[str] = None,
                output: Optional[str] = None,
                format: Optional[str] = "json") -> Dict[str, Any]:
        processor = DataProcessor()
        
        processed_data = processor.process_with_ollama(
            input_data, 
            model=model, 
            output_format=format
        )
        
        self.storage.save_processed_data(processed_data, 
            model=processed_data.get('model_used', model))
        
        if output:
            if format == "json":
                DataFormatter.to_json(processed_data, output)
            elif format == "markdown":
                DataFormatter.to_markdown(processed_data, output)
            elif format == "csv":
                DataFormatter.to_csv([processed_data], output)
        
        return processed_data

class SettingsConfigurator:
    def __init__(self, storage: DataStorage):
        self.storage = storage

    def display_settings_menu(self):
        while True:
            print("\n--- Settings Configuration ---")
            print("1. View Current Settings")
            print("2. Edit Setting")
            print("3. Reset to Default Settings")
            print("4. Delete Specific Setting")
            print("5. Return to Main Menu")
            
            choice = safe_input("Enter your choice (1-5): ").strip()
            
            if choice == '1':
                self._view_settings()
            elif choice == '2':
                self._edit_setting()
            elif choice == '3':
                self._reset_to_default()
            elif choice == '4':
                self._delete_setting()
            elif choice == '5':
                break
            else:
                print("Invalid choice. Please try again.")

    def _view_settings(self):
        settings = self.storage.get_all_settings()
        print("\n--- Current Settings ---")
        for section, section_settings in settings.items():
            print(f"\n[{section}]")
            for key, value in section_settings.items():
                print(f"{key}: {value}")

    def _edit_setting(self):
        section = safe_input("Enter section name (e.g., SCRAPER, PROCESSOR): ").strip().upper()
        key = safe_input("Enter setting key: ").strip()
        value = safe_input("Enter new value: ").strip()
        
        try:
            self.storage.save_setting(section, key, value)
            print(f"Setting {section}.{key} updated successfully.")
        except Exception as e:
            print(f"Error updating setting: {e}")

    def _reset_to_default(self):
        confirm = safe_input("Are you sure you want to reset ALL settings to default? (y/n): ").strip().lower()
        if confirm == 'y':
            self.storage.reset_settings_to_default()
            print("Settings reset to default values.")
        else:
            print("Reset cancelled.")

    def _delete_setting(self):
        section = safe_input("Enter section name (e.g., SCRAPER, PROCESSOR): ").strip().upper()
        key = safe_input("Enter setting key to delete: ").strip()
        
        try:
            self.storage.delete_setting(section, key)
            print(f"Setting {section}.{key} deleted successfully.")
        except Exception as e:
            print(f"Error deleting setting: {e}")

class InteractiveCLI:
    def __init__(self, tool: KnowledgeRetrievalTool):
        self.tool = tool
        self.storage = tool.storage
        self.settings_configurator = SettingsConfigurator(self.storage)

    def run(self):
        while True:
            print("\n--- Knowledge Retrieval CLI ---")
            print("1. Web Scraping")
            print("2. Data Processing")
            print("3. View Stored Data")
            print("4. Settings")
            print("5. Exit")
            
            choice = safe_input("Enter your choice (1-5): ").strip()
            
            if choice == '1':
                self._web_scraping_menu()
            elif choice == '2':
                self._data_processing_menu()
            elif choice == '3':
                self._view_stored_data_menu()
            elif choice == '4':
                self.settings_configurator.display_settings_menu()
            elif choice == '5':
                print("Exiting Knowledge Retrieval CLI. Goodbye!")
                break
            else:
                print("Invalid choice. Please try again.")

    def _web_scraping_menu(self):
        while True:
            print("\n--- Web Scraping ---")
            print("1. Scrape URL")
            print("2. Configure Scraping Settings")
            print("3. Return to Main Menu")
            
            choice = safe_input("Enter your choice (1-3): ").strip()
            
            if choice == '1':
                url = safe_input("Enter URL to scrape: ").strip()
                output = safe_input("Enter output file (optional, press Enter to skip): ").strip() or None
                format = safe_input("Enter output format (json/markdown/csv, default: json): ").strip().lower() or 'json'
                crawl_depth = safe_input("Enter crawl depth (optional, press Enter to skip): ").strip() or None
                
                try:
                    if crawl_depth:
                        crawl_depth = int(crawl_depth)
                    result = self.tool.scrape(url, output, format, crawl_depth)
                    print(f"\nScraped Data Summary:")
                    print(f"URL: {result.get('url', 'N/A')}")
                    print(f"Title: {result.get('title', 'N/A')}")
                except Exception as e:
                    print(f"Scraping error: {e}")
            
            elif choice == '2':
                print("\nScraping settings are managed in the Settings menu.")
            
            elif choice == '3':
                break
            
            else:
                print("Invalid choice. Please try again.")

    def _data_processing_menu(self):
        while True:
            print("\n--- Data Processing ---")
            print("1. Process Scraped Data")
            print("2. Configure Processing Settings")
            print("3. Return to Main Menu")
            
            choice = safe_input("Enter your choice (1-3): ").strip()
            
            if choice == '1':
                scraped_data = self.storage.get_scraped_data(5)
                if not scraped_data:
                    print("No scraped data available.")
                    continue
                
                print("\nRecent Scraped Data:")
                for i, data in enumerate(scraped_data, 1):
                    print(f"{i}. {data.get('url', 'Unknown URL')}")
                
                selection = safe_input("Enter the number of the data to process (or 'c' to cancel): ").strip()
                
                if selection.lower() == 'c':
                    continue
                
                try:
                    index = int(selection) - 1
                    if 0 <= index < len(scraped_data):
                        data = scraped_data[index]
                        model = safe_input("Enter AI model (optional, press Enter for default): ").strip() or None
                        output_format = safe_input("Enter output format (json/markdown, default: json): ").strip().lower() or 'json'
                        output_file = safe_input("Enter output file (optional, press Enter to skip): ").strip() or None
                        
                        result = self.tool.process(
                            data, 
                            model=model, 
                            output=output_file, 
                            format=output_format
                        )
                        print("\nProcessed Data Summary:")
                        print(f"Model Used: {result.get('model_used', 'N/A')}")
                        print(f"Output Format: {result.get('output_format', 'N/A')}")
                    else:
                        print("Invalid selection.")
                except ValueError:
                    print("Invalid input. Please enter a number.")
            
            elif choice == '2':
                print("\nProcessing settings are managed in the Settings menu.")
            
            elif choice == '3':
                break
            
            else:
                print("Invalid choice. Please try again.")

    def _view_stored_data_menu(self):
        while True:
            print("\n--- View Stored Data ---")
            print("1. View Recent Scraped Data")
            print("2. View Recent Processed Data")
            print("3. Return to Main Menu")
            
            choice = safe_input("Enter your choice (1-3): ").strip()
            
            if choice == '1':
                scraped_data = self.storage.get_scraped_data(10)
                print("\nRecent Scraped Data:")
                for data in scraped_data:
                    print(f"URL: {data.get('url', 'N/A')}")
                    print(f"Title: {data.get('title', 'N/A')}")
                    print("---")
            
            elif choice == '2':
                processed_data = self.storage.get_processed_data(10)
                print("\nRecent Processed Data:")
                for data in processed_data:
                    print(f"Model Used: {data.get('model_used', 'N/A')}")
                    print(f"Output Format: {data.get('output_format', 'N/A')}")
                    print("---")
            
            elif choice == '3':
                break
            
            else:
                print("Invalid choice. Please try again.")

def main(
    mode: Optional[str] = typer.Option(None, help="Mode of operation (scrape/process)"),
    url: Optional[str] = typer.Option(None, help="URL to scrape"),
    input_file: Optional[str] = typer.Option(None, help="Input file for processing"),
    output: Optional[str] = typer.Option(None, help="Output file path"),
    format: Optional[str] = typer.Option("json", help="Output format (json/markdown/csv)"),
    model: Optional[str] = typer.Option(None, help="AI model to use for processing"),
    crawl_depth: Optional[int] = typer.Option(None, help="Depth of crawling"),
    interactive: Optional[bool] = typer.Option(False, help="Launch interactive CLI")
):
    try:
        safe_stdin_wrapper()
        
        if interactive or not any([mode, url, input_file, output, model]):
            cli = InteractiveCLI(KnowledgeRetrievalTool())
            cli.run()
            return

        tool = KnowledgeRetrievalTool()
        
        if mode == "scrape":
            if not url:
                typer.echo("Error: URL is required for scraping")
                sys.exit(1)
            try:
                url_str = str(url)
                result = tool.scrape(url_str, output, format, crawl_depth)
                if result:
                    typer.echo(f"Scraped data: {result}")
                else:
                    typer.echo(f"Failed to scrape {url_str}")
            except Exception as e:
                typer.echo(f"Error: {e}")
                sys.exit(1)
        
        elif mode == "process":
            if not input_file:
                typer.echo("Error: Input file is required for processing")
                sys.exit(1)
            
            try:
                import json
                with open(input_file, 'r') as f:
                    input_data = json.load(f)
                
                result = tool.process(input_data, model, output, format)
                typer.echo(f"Processed data: {result}")
            except Exception as e:
                typer.echo(f"Error: {e}")
                sys.exit(1)
        
        else:
            if url:
                try:
                    url_str = str(url)
                    result = tool.scrape(url_str, output, format, crawl_depth)
                    if result:
                        typer.echo(f"Scraped data: {result}")
                    else:
                        typer.echo(f"Failed to scrape {url_str}")
                except Exception as e:
                    typer.echo(f"Error: {e}")
            elif input_file:
                try:
                    import json
                    with open(input_file, 'r') as f:
                        input_data = json.load(f)
                    result = tool.process(input_data, model, output, format)
                    typer.echo(f"Processed data: {result}")
                except Exception as e:
                    typer.echo(f"Error: {e}")
            else:
                cli = InteractiveCLI(KnowledgeRetrievalTool())
                cli.run()

    except Exception as e:
        error_log_path = os.path.join(os.path.dirname(__file__), 'error_log.txt')
        with open(error_log_path, 'w') as f:
            f.write(f"An error occurred: {str(e)}\n")
            f.write(traceback.format_exc())
        
        try:
            import tkinter as tk
            from tkinter import messagebox
            
            root = tk.Tk()
            root.withdraw()
            messagebox.showerror("Error", f"An unexpected error occurred. Check {error_log_path} for details.")
        except:
            print(f"Fatal error: {e}")

if __name__ == "__main__":
    try:
        safe_stdin_wrapper()
    except Exception as e:
        print(f"Stdin initialization error: {e}")
    
    main()
