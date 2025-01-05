// Main exports for the Knowledge Retrieval module

// Crawler
export { default as Crawler } from './crawler';

// Knowledge Processor
export { default as KnowledgeProcessor } from './knowledge_processor';

// Interactive CLI
export { default as InteractiveCLI } from './interactive';

// Cleanup Utility
export { default as ResourceCleaner } from './cleanup';

// Utility Functions (if needed, create a utils.ts file)
export const utils = {
  // Add any utility functions here
};

// Configuration and Types
export interface CrawlConfig {
  maxDepth?: number;
  maxPages?: number;
  timeout?: number;
}

export enum ProcessingMode {
  MARKDOWN = 'markdown',
  JSON = 'json'
}

export interface ResourceInfo {
  name: string;
  url: string;
  crawlDepth: number;
}
