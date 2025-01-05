# @lodi-know/knowledge-retrieval

A powerful web crawler and knowledge processing toolkit for extracting and managing web content with AI-powered capabilities.

## 🚀 Features

- 🌐 Intelligent Web Crawling
- 📄 Multi-format Content Processing
- 🤖 AI-Enhanced Knowledge Extraction
- 🧹 Robust Resource Management

## 📦 Installation

```bash
npm install @lodi-know/knowledge-retrieval
```

## 💻 Quick Start

### CLI Usage

```bash
# Interactive CLI
npx knowledge-retrieval

# Crawl a website
npx knowledge-retrieval crawl https://example.com

# Process crawled resources
npx knowledge-retrieval process
```

### Programmatic Usage

```typescript
import { 
  Crawler, 
  KnowledgeProcessor, 
  ResourceCleaner 
} from '@lodi-know/knowledge-retrieval';

// Crawl a website
const crawler = new Crawler();
await crawler.crawl('https://example.com');

// Process crawled content
const processor = new KnowledgeProcessor();
await processor.processResources();
```

## 🛠️ Configuration

Create a `.env` file with the following options:

```
MAX_CRAWL_DEPTH=3
MAX_CRAWL_PAGES=50
REQUEST_TIMEOUT=5000
```

## 🔧 Commands

- `npm run crawl`: Start web crawling
- `npm run process`: Process crawled resources
- `npm run cleanup`: Clean up crawled and processed data

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## 📄 License

MIT License

## 🏢 Created by Lodi Know
