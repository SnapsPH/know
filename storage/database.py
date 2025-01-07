import sqlite3
import json
from typing import Dict, Any, Optional, List

class DataStorage:
    def __init__(self, db_path: str = 'knowledge_base.db'):
        """
        Initialize database connection and create necessary tables.
        
        :param db_path: Path to SQLite database
        """
        self.db_path = db_path
        self._create_tables()

    def _create_tables(self):
        """
        Create necessary tables if they don't exist.
        """
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # Scraped data table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS scraped_data (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    url TEXT UNIQUE,
                    title TEXT,
                    content TEXT,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Processed data table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS processed_data (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    original_data TEXT,
                    processed_content TEXT,
                    model_used TEXT,
                    output_format TEXT,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Settings table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS settings (
                    section TEXT,
                    key TEXT,
                    value TEXT,
                    PRIMARY KEY (section, key)
                )
            ''')
            
            conn.commit()

    def save_setting(self, section: str, key: str, value: str):
        """
        Save or update a setting in the database.
        
        :param section: Configuration section
        :param key: Setting key
        :param value: Setting value
        """
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT OR REPLACE INTO settings (section, key, value) 
                VALUES (?, ?, ?)
            ''', (section, key, value))
            conn.commit()

    def get_setting(self, section: str, key: str, default: Optional[str] = None) -> Optional[str]:
        """
        Retrieve a setting from the database.
        
        :param section: Configuration section
        :param key: Setting key
        :param default: Default value if setting not found
        :return: Setting value or default
        """
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT value FROM settings 
                WHERE section = ? AND key = ?
            ''', (section, key))
            
            result = cursor.fetchone()
            return result[0] if result else default

    def get_all_settings(self, section: Optional[str] = None) -> Dict[str, Dict[str, str]]:
        """
        Retrieve all settings, optionally filtered by section.
        
        :param section: Optional section to filter
        :return: Dictionary of settings
        """
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            if section:
                cursor.execute('''
                    SELECT key, value FROM settings 
                    WHERE section = ?
                ''', (section,))
            else:
                cursor.execute('''
                    SELECT section, key, value FROM settings
                ''')
            
            if section:
                return dict(cursor.fetchall())
            else:
                settings = {}
                for sec, key, value in cursor.fetchall():
                    if sec not in settings:
                        settings[sec] = {}
                    settings[sec][key] = value
                return settings

    def delete_setting(self, section: str, key: str):
        """
        Delete a specific setting.
        
        :param section: Configuration section
        :param key: Setting key
        """
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                DELETE FROM settings 
                WHERE section = ? AND key = ?
            ''', (section, key))
            conn.commit()

    def reset_settings_to_default(self):
        """
        Reset all settings to default values.
        """
        default_settings = {
            'SCRAPER': {
                'default_timeout': '10',
                'user_agent': 'KnowledgeRetrievalCLI/1.0',
                'crawl_depth': '0',
                'raw_output_dir': '/raw'
            },
            'PROCESSOR': {
                'ollama_url': 'http://localhost:11434',
                'default_model': 'llama3.2:3b',
                'supported_outputs': 'json,markdown'
            },
            'PROCESSOR_INSTRUCTIONS': {
                'markdown': 'Extract key information and format into a clean, readable markdown document. Organize content hierarchically, use headings, bullet points, and code blocks where appropriate. Provide a clear, concise summary at the top.',
                'json': 'Create a structured JSON output that captures the essential information, with clear key-value pairs and nested structures where necessary.'
            },
            'STORAGE': {
                'database_path': 'knowledge_base.db',
                'max_entries': '1000'
            }
        }
        
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            # Clear existing settings
            cursor.execute('DELETE FROM settings')
            
            # Insert default settings
            for section, settings in default_settings.items():
                for key, value in settings.items():
                    cursor.execute('''
                        INSERT INTO settings (section, key, value) 
                        VALUES (?, ?, ?)
                    ''', (section, key, value))
            
            conn.commit()

    def save_scraped_data(self, data: Dict[str, Any]):
        """
        Save scraped data to the database.
        
        :param data: Scraped data dictionary
        """
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT OR REPLACE INTO scraped_data (url, title, content) 
                VALUES (?, ?, ?)
            ''', (
                data.get('url', ''),
                data.get('title', ''),
                json.dumps(data)
            ))
            conn.commit()

    def save_processed_data(self, data: Dict[str, Any], model: Optional[str] = None):
        """
        Save processed data to the database.
        
        :param data: Processed data dictionary
        :param model: AI model used
        """
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO processed_data (
                    original_data, 
                    processed_content, 
                    model_used, 
                    output_format
                ) VALUES (?, ?, ?, ?)
            ''', (
                json.dumps(data.get('original_data', {})),
                data.get('processed_content', ''),
                model or 'unknown',
                data.get('output_format', 'json')
            ))
            conn.commit()

    def get_scraped_data(self, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Retrieve recent scraped data.
        
        :param limit: Number of entries to retrieve
        :return: List of scraped data
        """
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT content FROM scraped_data 
                ORDER BY timestamp DESC 
                LIMIT ?
            ''', (limit,))
            
            return [json.loads(row[0]) for row in cursor.fetchall()]

    def get_processed_data(self, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Retrieve recent processed data.
        
        :param limit: Number of entries to retrieve
        :return: List of processed data
        """
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT original_data, processed_content, model_used, output_format 
                FROM processed_data 
                ORDER BY timestamp DESC 
                LIMIT ?
            ''', (limit,))
            
            return [
                {
                    'original_data': json.loads(row[0]),
                    'processed_content': row[1],
                    'model_used': row[2],
                    'output_format': row[3]
                } for row in cursor.fetchall()
            ]
