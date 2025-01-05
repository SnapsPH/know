export interface RawCrawlResult {
    url: string;
    html: string;
    extractedAt: string;
    links: string[];
    metadata: {
        title?: string;
        contentType?: string;
    };
}
export declare class KnowledgeCrawler {
    private baseStoragePath;
    private maxPages;
    private maxDepth;
    private requestTimeout;
    private userAgent;
    private resourceName;
    private visitedUrls;
    private crawledPages;
    constructor(baseStoragePath: string, maxPages: number, maxDepth: number, requestTimeout: number, userAgent: string, resourceName: string);
    private getStoragePath;
    private filterAndResolveLinks;
    private normalizeUrl;
    private fetchPageContent;
    private saveRawData;
    private extractLinks;
    private isValidLink;
    private generateFilename;
    crawl(startUrl: string, maxDepth?: number, maxPages?: number): Promise<void>;
}
export default KnowledgeCrawler;
//# sourceMappingURL=crawler.d.ts.map