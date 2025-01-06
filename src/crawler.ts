import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs-extra';
import * as path from 'path';
import { URL } from 'url';
import yargs from 'yargs';
import * as winston from 'winston';
import { SettingsManager } from './settings';

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
  private logger: winston.Logger;
  private logDirectory: string;

  constructor(
    baseStoragePath: string, 
    maxPages: number, 
    maxDepth: number, 
    requestTimeout: number,
    userAgent: string,
    resourceName: string,
    logDirectory: string
  ) {
    this.baseStoragePath = baseStoragePath;
    this.maxPages = maxPages;
    this.maxDepth = maxDepth;
    this.requestTimeout = requestTimeout;
    this.userAgent = userAgent;
    this.resourceName = resourceName;
    this.logDirectory = logDirectory;

    // Ensure log directory exists
    fs.ensureDirSync(logDirectory);

    // Configure logger
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.json()
      ),
      transports: [
        // Write all logs to file
        new winston.transports.File({ 
          filename: path.join(logDirectory, 'crawler-error.log'), 
          level: 'error' 
        }),
        new winston.transports.File({ 
          filename: path.join(logDirectory, 'crawler-combined.log') 
        })
      ]
    });

    // Ensure the base storage path exists
    fs.ensureDirSync(this.baseStoragePath);
  }

  private getStoragePath(): string {
    // Ensure raw_data directory exists and create resource-specific subdirectory
    const rawDataPath = path.join(this.baseStoragePath, 'raw_data');
    const resourcePath = path.join(rawDataPath, this.resourceName);
    
    this.logger.info('Storage Path Details:', {
      baseStoragePath: this.baseStoragePath,
      rawDataPath: rawDataPath,
      resourcePath: resourcePath
    });

    fs.ensureDirSync(resourcePath);
    return resourcePath;
  }

  private filterAndResolveLinks(
    links: unknown[], 
    baseUrl: URL
  ): string[] {
    return links
      .map((link) => {
        try {
          // Normalize the URL
          const normalizedUrl = this.normalizeUrl(link);
          
          // Skip empty URLs
          if (!normalizedUrl) {
            return null;
          }

          // Resolve relative URLs
          const resolvedUrl = new URL(normalizedUrl, baseUrl).toString();
          
          // Additional filtering
          if (!this.isValidUrl(resolvedUrl)) {
            return null;
          }

          return resolvedUrl;
        } catch (error) {
          this.logger.warn(`Error processing link: ${String(link)}`, error);
          return null;
        }
      })
      .filter((url): url is string => url !== null);
  }

  private normalizeUrl(url: unknown): string {
    // Validate input is a string
    if (typeof url !== 'string') {
      this.logger.warn(`Attempted to normalize non-string URL: ${String(url)}`);
      return '';
    }

    // Trim and remove any whitespace
    const cleanUrl = url.trim();

    // If the URL is empty, return empty string
    if (!cleanUrl) {
      return '';
    }

    // If the URL is not a valid HTTP/HTTPS URL, try to construct it
    const lowerUrl = cleanUrl.toLowerCase();
    if (!lowerUrl.startsWith('http://') && !lowerUrl.startsWith('https://')) {
      // For NPM package URLs
      if (cleanUrl.includes('npmjs.com/package/')) {
        return `https://${cleanUrl}`;
      }
      
      // Default to adding https://
      return `https://${cleanUrl}`;
    }
    
    return cleanUrl;
  }

  private isValidUrl(url: string): boolean {
    try {
      // Validate URL format
      const parsedUrl = new URL(url);
      
      // Additional checks
      const validProtocols = ['http:', 'https:'];
      const isValidProtocol = validProtocols.includes(parsedUrl.protocol);
      const hasValidHost = parsedUrl.hostname && parsedUrl.hostname.length > 0;
      
      if (!isValidProtocol) {
        this.logger.warn(`Invalid URL protocol: ${url}`);
        return false;
      }
      
      if (!hasValidHost) {
        this.logger.warn(`Invalid URL hostname: ${url}`);
        return false;
      }
      
      return true;
    } catch (error) {
      this.logger.error(`URL validation error: ${url}`, error);
      return false;
    }
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
      this.logger.error(`Error fetching page content for ${url}:`, error);
      throw error;
    }
  }

  private async saveRawData(url: string, pageContent: RawCrawlResult): Promise<void> {
    // Save raw data
    const filename = this.generateFilename(url);
    const fullFilePath = path.join(this.getStoragePath(), filename);
    this.logger.info(`Saving crawl result to: ${fullFilePath}`);
    await fs.writeJSON(fullFilePath, pageContent);
  }

  private extractLinks(html: string, url: string): string[] {
    const $ = cheerio.load(html);
    const links = $('a[href]')
      .map((_, el) => $(el).attr('href'))
      .get();

    return this.filterAndResolveLinks(links, new URL(url));
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
    try {
      // Normalize and validate the URL
      const normalizedStartUrl = this.normalizeUrl(startUrl);
      
      // Validate input
      if (!this.isValidUrl(normalizedStartUrl)) {
        throw new Error(`Invalid start URL: ${normalizedStartUrl}`);
      }

      // Reset visited URLs and initialize crawl state
      this.visitedUrls.clear();
      this.crawledPages = 0;

      this.logger.info(`Crawling with parameters:
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

          this.logger.info(`Crawling URL: ${url} (Depth: ${depth})`);
          this.logger.info(`Base Storage Path: ${this.baseStoragePath}`);

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
              if (this.isValidUrl(link) && 
                  !this.visitedUrls.has(link)) {
                urlQueue.push({ 
                  url: link, 
                  depth: depth + 1 
                });
              }
            }
          }
        } catch (error) {
          this.logger.error(`Error crawling ${url}:`, error);
          // Continue with next URL even if this one fails
          continue;
        }
      }

      this.logger.info(`Crawl completed. 
- Total Pages Crawled: ${this.crawledPages}
- Total Unique URLs Visited: ${this.visitedUrls.size}`);
    } catch (error) {
      this.logger.error('Critical crawl failure:', error);
      throw error;
    }
  }
}

export class Crawler extends KnowledgeCrawler {
  // This is a simple wrapper class to maintain compatibility
  constructor(
    baseStoragePath: string, 
    maxPages: number, 
    maxDepth: number, 
    requestTimeout: number,
    userAgent: string,
    resourceName: string,
    logDirectory: string
  ) {
    super(
      baseStoragePath, 
      maxPages, 
      maxDepth, 
      requestTimeout,
      userAgent,
      resourceName,
      logDirectory
    );
  }
}

// CLI Interface
async function main() {
  // Detailed logging about execution environment
  console.log('Execution Environment Details:', {
    execPath: process.execPath,
    cwd: process.cwd(),
    argv: process.argv,
    __dirname: __dirname
  });

  // Determine if running as a packaged executable
  const isExe = process.execPath.toLowerCase().endsWith('knowledge-retrieval.exe');
  const isInDist = process.execPath.includes('dist\\exe') || __dirname.includes('dist\\exe');
  const isPackagedApp = isExe && isInDist;

  console.log('Package Detection:', {
    execPath: process.execPath,
    __dirname: __dirname,
    isExe: isExe,
    isInDist: isInDist,
    isPackagedApp: isPackagedApp
  });

  // Initialize settings to get the base storage path
  const settingsManager = new SettingsManager();

  // If packaged, explicitly set the config path to the executable directory
  if (isPackagedApp) {
    const exeConfigPath = path.join(path.dirname(process.execPath), 'know-bot.json');
    
    // If config exists in exe directory, use it
    if (fs.existsSync(exeConfigPath)) {
      console.log('Using config from executable directory:', exeConfigPath);
      settingsManager.setConfigPath(exeConfigPath);
    }
  }

  const settings = settingsManager.getSettings();

  console.log('Config Path:', settingsManager.getConfigPath());
  console.log('Loaded Settings:', JSON.stringify(settings, null, 2));

  // Extract depth from command line arguments manually
  let crawlDepth = settings.maxCrawlDepth; // Use configured depth
  const depthArg = process.argv.find(arg => arg.startsWith('depth:') || arg === '--depth');
  if (depthArg) {
    // If it's '--depth', get the next argument
    if (depthArg === '--depth') {
      const depthIndex = process.argv.indexOf(depthArg);
      crawlDepth = Number(process.argv[depthIndex + 1] || settings.maxCrawlDepth);
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
      default: Number(process.env.MAX_CRAWL_PAGES) || settings.maxCrawlPages
    })
    .demandCommand(2, 'You must provide a resource name and start URL')
    .help()
    .parse();

  const resourceName = argv._[0] as string;
  const startUrl = argv._[1] as string;

  console.log('Base Path:', settings.baseStoragePath);
  console.log('Resource Name:', resourceName);
  console.log('Start URL:', startUrl);
  console.log('Crawl Depth:', crawlDepth);

  try {
    const crawler = new KnowledgeCrawler(
      settings.baseStoragePath,
      argv['max-pages'],
      crawlDepth,
      settings.requestTimeout || 10000,
      settings.userAgent || 'KnowledgeCrawler/1.0',
      resourceName,
      path.join(settings.baseStoragePath, 'logs')
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
