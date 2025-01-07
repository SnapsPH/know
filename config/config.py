import configparser
import os
from typing import Dict, Any, List

class ConfigManager:
    def __init__(self, config_path: str = 'config/settings.ini'):
        """
        Initialize configuration manager.
        
        :param config_path: Path to configuration file
        """
        self.config = configparser.ConfigParser()
        self.config_path = config_path
        self._load_config()

    def _load_config(self):
        """
        Load configuration from INI file.
        Create default configuration if file doesn't exist.
        """
        if not os.path.exists(self.config_path):
            self._create_default_config()
        
        self.config.read(self.config_path)

    def _create_default_config(self):
        """
        Create a default configuration file.
        """
        os.makedirs(os.path.dirname(self.config_path), exist_ok=True)
        
        # Scraper section
        self.config['SCRAPER'] = {
            'default_timeout': '10',
            'user_agent': 'KnowledgeRetrievalCLI/1.0',
            'crawl_depth': '0',
            'raw_output_dir': '/raw'
        }
        
        # Processor section
        self.config['PROCESSOR'] = {
            'ollama_url': 'http://localhost:11434',
            'default_model': 'llama3.2:3b',
            'supported_outputs': 'json,markdown'
        }
        
        # Processor instructions
        self.config['PROCESSOR_INSTRUCTIONS'] = {
            'markdown': 'Extract key information and format into a clean, readable markdown document. Organize content hierarchically, use headings, bullet points, and code blocks where appropriate. Provide a clear, concise summary at the top.',
            'json': 'Create a structured JSON output that captures the essential information, with clear key-value pairs and nested structures where necessary.'
        }
        
        # Storage section
        self.config['STORAGE'] = {
            'database_path': 'knowledge_base.db',
            'max_entries': '1000'
        }
        
        with open(self.config_path, 'w') as configfile:
            self.config.write(configfile)

    def get(self, section: str, key: str, fallback: str = None) -> str:
        """
        Get a configuration value.
        
        :param section: Configuration section
        :param key: Configuration key
        :param fallback: Default value if key not found
        :return: Configuration value
        """
        return self.config.get(section, key, fallback=fallback)

    def get_all(self, section: str) -> Dict[str, str]:
        """
        Get all configuration values for a section.
        
        :param section: Configuration section
        :return: Dictionary of configuration values
        """
        return dict(self.config[section])

    def get_supported_outputs(self) -> List[str]:
        """
        Get list of supported output formats.
        
        :return: List of supported output formats
        """
        outputs = self.get('PROCESSOR', 'supported_outputs', 'json,markdown')
        return [output.strip() for output in outputs.split(',')]

    def get_processor_instruction(self, output_format: str) -> str:
        """
        Get processing instruction for a specific output format.
        
        :param output_format: Output format (e.g., 'markdown', 'json')
        :return: Processing instruction
        """
        return self.get('PROCESSOR_INSTRUCTIONS', output_format, '')
