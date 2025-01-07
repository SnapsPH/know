import requests
from bs4 import BeautifulSoup
from typing import Dict, Any, Optional
import urllib.parse
import os
from config.config import ConfigManager

class WebScraper:
    def __init__(self, config_path: str = 'config/settings.ini'):
        """
        Initialize WebScraper with configuration.
        
        :param config_path: Path to configuration file
        """
        self.config = ConfigManager(config_path)
        self.default_timeout = int(self.config.get('SCRAPER', 'default_timeout', 10))
        self.user_agent = self.config.get('SCRAPER', 'user_agent', 'KnowledgeRetrievalCLI/1.0')
        self.crawl_depth = int(self.config.get('SCRAPER', 'crawl_depth', 0))
        self.raw_output_dir = self.config.get('SCRAPER', 'raw_output_dir', '/raw')

    def _ensure_url_scheme(self, url: str) -> str:
        """
        Ensure the URL has a scheme (http/https).
        
        :param url: Input URL
        :return: URL with scheme
        """
        if not url.startswith(('http://', 'https://')):
            return f'https://{url}'
        return url

    def _save_raw_content(self, url: str, content: str) -> str:
        """
        Save raw scraped content to a file.
        
        :param url: Source URL
        :param content: Raw content to save
        :return: Path to saved raw file
        """
        # Create raw output directory if it doesn't exist
        parsed_url = urllib.parse.urlparse(url)
        resource_name = parsed_url.netloc.replace('.', '_')
        
        raw_dir = os.path.join(self.raw_output_dir, resource_name)
        os.makedirs(raw_dir, exist_ok=True)
        
        # Generate raw file path
        raw_file_path = os.path.join(raw_dir, f"{resource_name}_raw.txt")
        
        with open(raw_file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        return raw_file_path

    def scrape(
        self, 
        url: str, 
        depth: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Scrape content from a given URL.
        
        :param url: URL to scrape
        :param depth: Crawl depth (overrides config if provided)
        :return: Dictionary containing scraped content
        """
        try:
            # Use provided depth or config depth
            crawl_depth = depth if depth is not None else self.crawl_depth
            
            # Ensure URL has a scheme
            full_url = self._ensure_url_scheme(url)
            
            # Validate URL
            parsed_url = urllib.parse.urlparse(full_url)
            if not all([parsed_url.scheme, parsed_url.netloc]):
                raise ValueError(f"Invalid URL: {full_url}")
            
            # Prepare request headers
            headers = {
                'User-Agent': self.user_agent
            }
            
            # Make request with configured timeout
            response = requests.get(
                full_url, 
                headers=headers, 
                timeout=self.default_timeout
            )
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Extract content
            content = soup.get_text()
            
            # Save raw content
            raw_file_path = self._save_raw_content(full_url, content)
            
            # Basic scraping result
            return {
                'url': full_url,
                'title': soup.title.string if soup.title else 'No Title',
                'content': content,
                'raw_file_path': raw_file_path,
                'crawl_depth': crawl_depth
            }
        except (requests.RequestException, ValueError) as e:
            print(f"Error scraping {url}: {e}")
            return {}

    @classmethod
    def scrape_url(
        cls, 
        url: str, 
        depth: Optional[int] = None,
        config_path: str = 'config/settings.ini'
    ) -> Dict[str, Any]:
        """
        Class method to scrape URL using configuration.
        
        :param url: URL to scrape
        :param depth: Crawl depth
        :param config_path: Path to configuration file
        :return: Scraped data dictionary
        """
        scraper = cls(config_path)
        return scraper.scrape(url, depth)
