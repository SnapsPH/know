import ollama
from typing import Dict, Any, Optional
import os
import json
from config.config import ConfigManager

class DataProcessor:
    def __init__(self, config_path: str = 'config/settings.ini'):
        """
        Initialize DataProcessor with configuration.
        
        :param config_path: Path to configuration file
        """
        self.config = ConfigManager(config_path)
        self.ollama_url = self.config.get('PROCESSOR', 'ollama_url', 'http://localhost:11434')

    def _ensure_raw_dir(self, resource_name: str) -> str:
        """
        Ensure raw output directory exists.
        
        :param resource_name: Name of the resource
        :return: Path to raw output directory
        """
        raw_base_dir = self.config.get('SCRAPER', 'raw_output_dir', '/raw')
        raw_dir = os.path.join(raw_base_dir, resource_name)
        os.makedirs(raw_dir, exist_ok=True)
        return raw_dir

    def _save_raw_file(self, resource_name: str, content: str) -> str:
        """
        Save raw content to a file.
        
        :param resource_name: Name of the resource
        :param content: Raw content to save
        :return: Path to saved raw file
        """
        raw_dir = self._ensure_raw_dir(resource_name)
        raw_file_path = os.path.join(raw_dir, f"{resource_name}_raw.txt")
        
        with open(raw_file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        return raw_file_path

    def process_with_ollama(
        self, 
        data: Dict[str, Any], 
        model: Optional[str] = None,
        output_format: str = 'json'
    ) -> Dict[str, Any]:
        """
        Process data using Ollama AI model.
        
        :param data: Input data to process
        :param model: Ollama model to use
        :param output_format: Output format (json/markdown)
        :return: Processed data
        """
        # Validate output format
        supported_outputs = self.config.get_supported_outputs()
        if output_format not in supported_outputs:
            raise ValueError(f"Unsupported output format. Supported: {supported_outputs}")
        
        # Use default model if not specified
        model = model or self.config.get('PROCESSOR', 'default_model', 'llama3.2:3b')
        
        # Prepare resource name (use URL or a default)
        resource_name = data.get('url', 'unknown').split('//')[1].replace('.', '_')
        
        # Save raw content
        raw_file_path = self._save_raw_file(resource_name, data.get('content', ''))
        
        # Get processing instruction
        instruction = self.config.get_processor_instruction(output_format)
        
        try:
            # Prepare prompt with custom instruction
            prompt = f"{instruction}\n\nRaw content:\n{data.get('content', '')}"
            
            # Use Ollama to process content
            response = ollama.chat(
                model=model, 
                messages=[{'role': 'user', 'content': prompt}],
                options={
                    'base_url': self.ollama_url
                }
            )
            
            # Prepare processed result
            processed_result = {
                'original_data': data,
                'raw_file_path': raw_file_path,
                'processed_content': response['message']['content'],
                'model_used': model,
                'output_format': output_format
            }
            
            return processed_result
        
        except Exception as e:
            print(f"Error processing data with Ollama: {e}")
            return {
                'original_data': data,
                'raw_file_path': raw_file_path,
                'error': str(e)
            }
