# Knowledge Retrieval

A powerful web crawler and knowledge processing toolkit for extracting and managing web content. This package provides an interactive CLI for crawling websites, processing content, and managing knowledge bases.

## Installation

```bash
npm install @darkbing/knowledge-retrieval
```

## Features

- **Web Crawler**: Configurable depth and page limits
- **Content Processing**: Markdown and JSON output formats
- **AI Integration**: Compatible with various LLM models
- **Settings Management**: Interactive configuration
- **Customizable Headers**: Support for authentication and custom requests
- **Organized Storage**: Structured data storage with raw and processed content

## Quick Start

1. Install the package globally (optional):
```bash
npm install -g @darkbing/knowledge-retrieval
```

2. Create a `.env` file with your configuration:
```env
BASE_STORAGE_PATH=./knowledge_retrieval
MODEL_NAME=ollama/mistral
```

3. Start the interactive CLI:
```bash
npx knowledge-retrieval
```

## Interactive CLI

The CLI provides several options:

- **Crawl Website**: Start a new crawling session
- **Process Data**: Convert raw data to structured format
- **Cleanup**: Remove temporary files
- **Settings**: Manage configuration

### Settings Management

Configure your crawler through the interactive settings menu:

1. **Crawler Settings**
   - Max crawl depth
   - Max pages to crawl
   - Request timeout
   - User agent

2. **Storage Settings**
   - Base storage path
   - Raw data directory
   - Processed data directory

3. **Processing Settings**
   - Default processing mode (markdown/json)
   - Model name for AI processing

4. **Custom Headers**
   - Add/remove custom HTTP headers
   - Support for authentication tokens

## Programmatic Usage

```typescript
import { KnowledgeRetrieval, SettingsManager } from '@darkbing/knowledge-retrieval';

// Initialize with custom settings
const settings = new SettingsManager();
await settings.updateSettings({
  maxCrawlDepth: 3,
  maxCrawlPages: 50,
  modelName: 'ollama/mistral'
});

// Create crawler instance
const crawler = new KnowledgeRetrieval(settings);

// Start crawling
await crawler.crawl('https://example.com');

// Process crawled data
await crawler.processData();
```

## Configuration

### Default Settings

```json
{
  "maxCrawlDepth": 3,
  "maxCrawlPages": 50,
  "requestTimeout": 5000,
  "userAgent": "KnowledgeRetrievalBot/1.0",
  "baseStoragePath": "./knowledge_retrieval",
  "rawDataDir": "raw_data",
  "processedDataDir": "processed_data",
  "defaultProcessingMode": "markdown",
  "modelName": "ollama/mistral"
}
```

Settings are stored in `know-bot.json` and can be managed through the interactive CLI or programmatically.

## Development

1. Clone the repository:
```bash
git clone https://github.com/SnapsPH/know.git
cd knowledge-retrieval
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

4. Run tests:
```bash
npm test
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details.

## Support

- GitHub Issues: [Report a bug](https://github.com/SnapsPH/know/issues)
- Email: [your-email@example.com](mailto:your-email@example.com)

## Changelog

### 1.0.0
- Initial release
- Interactive CLI with settings management
- Web crawler with configurable depth and limits
- Content processing with markdown and JSON support
- AI integration with model selection
- Custom headers support
- Comprehensive test coverage
