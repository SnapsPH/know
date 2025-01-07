import json
import csv
import pandas as pd
from typing import Dict, Any, List

class DataFormatter:
    @staticmethod
    def to_json(data: Dict[str, Any], output_file: str = None) -> str:
        """
        Convert data to JSON format.
        
        :param data: Data to convert
        :param output_file: Optional file to save JSON
        :return: JSON string
        """
        json_str = json.dumps(data, indent=2)
        if output_file:
            with open(output_file, 'w') as f:
                f.write(json_str)
        return json_str

    @staticmethod
    def to_markdown(data: Dict[str, Any], output_file: str = None) -> str:
        """
        Convert data to Markdown format.
        
        :param data: Data to convert
        :param output_file: Optional file to save Markdown
        :return: Markdown string
        """
        markdown_str = "# Scraped and Processed Data\n\n"
        for key, value in data.items():
            markdown_str += f"## {key.replace('_', ' ').title()}\n\n"
            markdown_str += f"```\n{value}\n```\n\n"
        
        if output_file:
            with open(output_file, 'w') as f:
                f.write(markdown_str)
        return markdown_str

    @staticmethod
    def to_csv(data: List[Dict[str, Any]], output_file: str = None) -> str:
        """
        Convert data to CSV format.
        
        :param data: List of data dictionaries
        :param output_file: Optional file to save CSV
        :return: CSV string
        """
        df = pd.DataFrame(data)
        csv_str = df.to_csv(index=False)
        
        if output_file:
            df.to_csv(output_file, index=False)
        return csv_str
