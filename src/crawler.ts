import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs-extra';
import * as path from 'path';
import { URL } from 'url';
import yargs from 'yargs';

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

export class KnowledgeCrawler {
  private baseStoragePath: string;
  private maxPages: number;
  private maxDepth: number;
  private requestTimeout: number;
  private userAgent: string;
  private resourceName: string;
  private visitedUrls: Set<string> = new Set();
  private crawledPages: number = 0;

  constructor(
    baseStoragePath: string, 
    maxPages: number, 
    maxDepth: number, 
    requestTimeout: number,
    userAgent: string,
    resourceName: string
  ) {
    this.baseStoragePath = baseStoragePath;
    this.maxPages = maxPages;
    this.maxDepth = maxDepth;
    this.requestTimeout = requestTimeout;
    this.userAgent = userAgent;
    this.resourceName = resourceName;

    // Ensure the base storage path exists
    fs.ensureDirSync(this.baseStoragePath);
  }

  private getStoragePath(): string {
    // Ensure raw_data directory exists and create resource-specific subdirectory
    const rawDataPath = path.resolve(this.baseStoragePath, 'raw_data');
    const resourcePath = path.resolve(rawDataPath, this.resourceName);
    fs.ensureDirSync(resourcePath);
    return resourcePath;
  }

  private filterAndResolveLinks(
    links: string[], 
    baseUrl: URL
  ): string[] {
    return links
      .map(href => {
        try {
          // Resolve relative URLs
          const fullUrl = new URL(href, baseUrl.href);
          
          // Keep only URLs from the same domain
          if (fullUrl.hostname === baseUrl.hostname) {
            return fullUrl.href;
          }
          return null;
        } catch {
          return null;
        }
      })
      .filter((url): url is string => url !== null);
  }

  private normalizeUrl(url: string): string {
    return url;
  }

  private async fetchPageContent(url: string): Promise<RawCrawlResult> {
    try {
      const response = await axios.get(url, {
        timeout: this.requestTimeout,
        headers: {
          'User-Agent': this.userAgent
        }
      });

      const $ = cheerio.load(response.data);
      
      // Extract links, filtering to same domain
      const baseUrl = new URL(url);
      const links = this.filterAndResolveLinks(
        $('a[href]')
          .map((_, el) => $(el).attr('href'))
          .get(),
        baseUrl
      );

      const rawResult: RawCrawlResult = {
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
    } catch (error) {
      console.error(`Error fetching page content for ${url}:`, error);
      throw error;
    }
  }

  private async saveRawData(url: string, pageContent: RawCrawlResult): Promise<void> {
    // Save raw data
    const filename = this.generateFilename(url);
    const fullFilePath = path.join(this.getStoragePath(), filename);
    console.log(`Saving crawl result to: ${fullFilePath}`);
    await fs.writeJSON(fullFilePath, pageContent);
  }

  private extractLinks(html: string, url: string): string[] {
    const $ = cheerio.load(html);
    const links = $('a[href]')
      .map((_, el) => $(el).attr('href'))
      .get();

    return this.filterAndResolveLinks(links, new URL(url));
  }

  private isValidLink(link: string, startUrl: string): boolean {
    const linkUrl = new URL(link);
    const startUrlObj = new URL(startUrl);

    return linkUrl.hostname === startUrlObj.hostname;
  }

  private generateFilename(url: string): string {
    const urlObj = new URL(url);
    const sanitizedPath = urlObj.pathname
      .replace(/[^a-z0-9]/gi, '_')
      .substring(0, 50);
    
    return `${urlObj.hostname}_${sanitizedPath}_${Date.now()}.json`;
  }

  async crawl(
    startUrl: string, 
    maxDepth: number = 3, 
    maxPages: number = 100
  ): Promise<void> {
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
    const urlQueue: { url: string; depth: number }[] = [
      { url: normalizedStartUrl, depth: 0 }
    ];

    while (urlQueue.length > 0 && this.crawledPages < maxPages) {
      const { url, depth } = urlQueue.shift()!;

      // Skip if URL has been visited or depth exceeded
      if (
        this.visitedUrls.has(url) || 
        depth > maxDepth
      ) {
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
      } catch (error) {
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
    } else {
      // If it's 'depth:X' format
      crawlDepth = Number(depthArg.split(':')[1]);
    }
  }

  const argv = await yargs(process.argv.slice(2))
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

  const resourceName = argv._[0] as string;
  const startUrl = argv._[1] as string;

  console.log('Base Path:', process.cwd());
  console.log('Resource Name:', resourceName);
  console.log('Start URL:', startUrl);
  console.log('Crawl Depth:', crawlDepth);

  try {
    const crawler = new KnowledgeCrawler(
      process.cwd(),
      argv['max-pages'],
      crawlDepth,
      Number(process.env.REQUEST_TIMEOUT) || 10000,
      'KnowledgeCrawler/1.0',
      resourceName
    );

    await crawler.crawl(startUrl, crawlDepth);
    
    console.log(`Crawling completed for ${resourceName}`);
  } catch (error) {
    console.error('Crawl failed with error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export default KnowledgeCrawler;
