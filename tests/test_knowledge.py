import unittest
from scraper.scraper import WebScraper
from processor.processor import DataProcessor
from storage.database import DataStorage
from utils.formatter import DataFormatter

class TestKnowledgeRetrieval(unittest.TestCase):
    def setUp(self):
        self.test_url = "https://example.com"

    def test_web_scraper(self):
        """Test web scraping functionality."""
        scraped_data = WebScraper.scrape(self.test_url)
        self.assertIn('url', scraped_data)
        self.assertIn('content', scraped_data)

    def test_data_processor(self):
        """Test data processing with Ollama."""
        test_data = {'content': 'Sample text to process'}
        processed_data = DataProcessor.process_with_ollama(test_data)
        self.assertIn('ai_summary', processed_data)

    def test_data_storage(self):
        """Test database storage functionality."""
        storage = DataStorage(':memory:')  # Use in-memory database for testing
        test_data = {'url': self.test_url, 'content': 'Test content'}
        
        storage.save_scraped_data(test_data)
        # Add assertions to check data storage

    def test_data_formatter(self):
        """Test different data formatting methods."""
        test_data = {'key1': 'value1', 'key2': 'value2'}
        
        json_output = DataFormatter.to_json(test_data)
        self.assertIn('key1', json_output)
        
        markdown_output = DataFormatter.to_markdown(test_data)
        self.assertIn('## Key1', markdown_output)

if __name__ == '__main__':
    unittest.main()
