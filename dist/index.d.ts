export { default as Crawler } from './crawler';
export { default as KnowledgeProcessor } from './knowledge_processor';
export { default as InteractiveCLI } from './interactive';
export { default as ResourceCleaner } from './cleanup';
export declare const utils: {};
export interface CrawlConfig {
    maxDepth?: number;
    maxPages?: number;
    timeout?: number;
}
export declare enum ProcessingMode {
    MARKDOWN = "markdown",
    JSON = "json"
}
export interface ResourceInfo {
    name: string;
    url: string;
    crawlDepth: number;
}
//# sourceMappingURL=index.d.ts.map