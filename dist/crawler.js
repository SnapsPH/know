"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KnowledgeCrawler = void 0;
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const url_1 = require("url");
const yargs_1 = __importDefault(require("yargs"));
class KnowledgeCrawler {
    constructor(baseStoragePath, maxPages, maxDepth, requestTimeout, userAgent, resourceName) {
        this.visitedUrls = new Set();
        this.crawledPages = 0;
        this.baseStoragePath = baseStoragePath;
        this.maxPages = maxPages;
        this.maxDepth = maxDepth;
        this.requestTimeout = requestTimeout;
        this.userAgent = userAgent;
        this.resourceName = resourceName;
        // Ensure the base storage path exists
        fs.ensureDirSync(this.baseStoragePath);
    }
    getStoragePath() {
        // Ensure raw_data directory exists and create resource-specific subdirectory
        const rawDataPath = path.resolve(this.baseStoragePath, 'raw_data');
        const resourcePath = path.resolve(rawDataPath, this.resourceName);
        fs.ensureDirSync(resourcePath);
        return resourcePath;
    }
    filterAndResolveLinks(links, baseUrl) {
        return links
            .map(href => {
            try {
                // Resolve relative URLs
                const fullUrl = new url_1.URL(href, baseUrl.href);
                // Keep only URLs from the same domain
                if (fullUrl.hostname === baseUrl.hostname) {
                    return fullUrl.href;
                }
                return null;
            }
            catch {
                return null;
            }
        })
            .filter((url) => url !== null);
    }
    normalizeUrl(url) {
        return url;
    }
    async fetchPageContent(url) {
        try {
            const response = await axios_1.default.get(url, {
                timeout: this.requestTimeout,
                headers: {
                    'User-Agent': this.userAgent
                }
            });
            const $ = cheerio.load(response.data);
            // Extract links, filtering to same domain
            const baseUrl = new url_1.URL(url);
            const links = this.filterAndResolveLinks($('a[href]')
                .map((_, el) => $(el).attr('href'))
                .get(), baseUrl);
            const rawResult = {
                url: url,
                html: response.data,
                extractedAt: new Date().toISOString(),
                links: links,
                metadata: {
                    title: $('title').text(),
                    contentType: response.headers['content-type']
                }
            };
            return rawResult;
        }
        catch (error) {
            console.error(`Error fetching page content for ${url}:`, error);
            throw error;
        }
    }
    async saveRawData(url, pageContent) {
        // Save raw data
        const filename = this.generateFilename(url);
        const fullFilePath = path.join(this.getStoragePath(), filename);
        console.log(`Saving crawl result to: ${fullFilePath}`);
        await fs.writeJSON(fullFilePath, pageContent);
    }
    extractLinks(html, url) {
        const $ = cheerio.load(html);
        const links = $('a[href]')
            .map((_, el) => $(el).attr('href'))
            .get();
        return this.filterAndResolveLinks(links, new url_1.URL(url));
    }
    isValidLink(link, startUrl) {
        const linkUrl = new url_1.URL(link);
        const startUrlObj = new url_1.URL(startUrl);
        return linkUrl.hostname === startUrlObj.hostname;
    }
    generateFilename(url) {
        const urlObj = new url_1.URL(url);
        const sanitizedPath = urlObj.pathname
            .replace(/[^a-z0-9]/gi, '_')
            .substring(0, 50);
        return `${urlObj.hostname}_${sanitizedPath}_${Date.now()}.json`;
    }
    async crawl(startUrl, maxDepth = 3, maxPages = 100) {
        // Normalize and validate the URL
        const normalizedStartUrl = this.normalizeUrl(startUrl);
        // Reset visited URLs and initialize crawl state
        this.visitedUrls.clear();
        this.crawledPages = 0;
        console.log(`Crawling with parameters:
- Start URL: ${normalizedStartUrl}
- Max Depth: ${maxDepth}
- Max Pages: ${maxPages}`);
        // Create a queue for URLs to crawl
        const urlQueue = [
            { url: normalizedStartUrl, depth: 0 }
        ];
        while (urlQueue.length > 0 && this.crawledPages < maxPages) {
            const { url, depth } = urlQueue.shift();
            // Skip if URL has been visited or depth exceeded
            if (this.visitedUrls.has(url) ||
                depth > maxDepth) {
                continue;
            }
            try {
                // Mark URL as visited
                this.visitedUrls.add(url);
                console.log(`Crawling URL: ${url} (Depth: ${depth})`);
                console.log(`Base Storage Path: ${this.baseStoragePath}`);
                // Fetch and process the page
                const pageContent = await this.fetchPageContent(url);
                // Save the raw data
                await this.saveRawData(url, pageContent);
                this.crawledPages++;
                // Only queue links if depth is strictly less than maxDepth
                if (depth < maxDepth) {
                    const links = this.extractLinks(pageContent.html, url);
                    for (const link of links) {
                        // Only queue links that are within the same domain
                        if (this.isValidLink(link, normalizedStartUrl) &&
                            !this.visitedUrls.has(link)) {
                            urlQueue.push({
                                url: link,
                                depth: depth + 1
                            });
                        }
                    }
                }
            }
            catch (error) {
                console.error(`Error crawling ${url}:`, error);
                // Continue with next URL even if this one fails
                continue;
            }
        }
        console.log(`Crawl completed. 
- Total Pages Crawled: ${this.crawledPages}
- Total Unique URLs Visited: ${this.visitedUrls.size}`);
    }
}
exports.KnowledgeCrawler = KnowledgeCrawler;
// CLI Interface
async function main() {
    // Extract depth from command line arguments manually
    let crawlDepth = 3; // default depth
    const depthArg = process.argv.find(arg => arg.startsWith('depth:') || arg === '--depth');
    if (depthArg) {
        // If it's '--depth', get the next argument
        if (depthArg === '--depth') {
            const depthIndex = process.argv.indexOf(depthArg);
            crawlDepth = Number(process.argv[depthIndex + 1] || 3);
        }
        else {
            // If it's 'depth:X' format
            crawlDepth = Number(depthArg.split(':')[1]);
        }
    }
    const argv = await (0, yargs_1.default)(process.argv.slice(2))
        .usage('$0 <resource_name> <start_url> [options]')
        .positional('resource_name', {
        describe: 'Name of the resource being crawled',
        type: 'string'
    })
        .positional('start_url', {
        describe: 'Starting URL to crawl',
        type: 'string'
    })
        .option('depth', {
        alias: 'd',
        type: 'number',
        description: 'Maximum crawl depth',
        default: crawlDepth
    })
        .option('max-pages', {
        alias: 'm',
        type: 'number',
        description: 'Maximum number of pages to crawl',
        default: Number(process.env.MAX_CRAWL_PAGES) || 100
    })
        .demandCommand(2, 'You must provide a resource name and start URL')
        .help()
        .parse();
    const resourceName = argv._[0];
    const startUrl = argv._[1];
    console.log('Base Path:', process.cwd());
    console.log('Resource Name:', resourceName);
    console.log('Start URL:', startUrl);
    console.log('Crawl Depth:', crawlDepth);
    try {
        const crawler = new KnowledgeCrawler(process.cwd(), argv['max-pages'], crawlDepth, Number(process.env.REQUEST_TIMEOUT) || 10000, 'KnowledgeCrawler/1.0', resourceName);
        await crawler.crawl(startUrl, crawlDepth);
        console.log(`Crawling completed for ${resourceName}`);
    }
    catch (error) {
        console.error('Crawl failed with error:', error);
        process.exit(1);
    }
}
if (require.main === module) {
    main().catch(console.error);
}
exports.default = KnowledgeCrawler;
//# sourceMappingURL=crawler.js.map