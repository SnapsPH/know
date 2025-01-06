import { spawn } from 'child_process';
import * as fs from 'fs-extra';
import * as path from 'path';
import { SettingsManager } from '../settings';

export async function runCrawlCommand(
  resourceName: string, 
  url: string, 
  depth: number, 
  settingsManager: SettingsManager
): Promise<boolean> {
  try {
    const logDirectory = path.join(
      settingsManager.getSettings().dataDirectories.logs, 
      'crawl'
    );
    fs.ensureDirSync(logDirectory);

    const errorLogPath = path.join(
      settingsManager.getSettings().dataDirectories.logs, 
      'crawl-errors.log'
    );
    
    return new Promise((resolve, reject) => {
      const crawlProcess = spawn('npm', ['run', 'crawl', resourceName, url, `depth:${depth}`], { 
        stdio: 'pipe',
        shell: true 
      });

      // Capture and log stdout
      crawlProcess.stdout.on('data', (data) => {
        console.log(data.toString().trim());
      });

      // Capture and log stderr
      crawlProcess.stderr.on('data', (data) => {
        const errorMessage = data.toString().trim();
        console.error('Crawl Error:', errorMessage);
        try {
          fs.ensureDirSync(path.dirname(errorLogPath));
          fs.appendFileSync(
            errorLogPath, 
            `${new Date().toISOString()} - Crawl Error: ${errorMessage}\n`
          );
        } catch (logError) {
          console.error('Failed to log error to file:', logError);
        }
      });

      // Handle process completion
      crawlProcess.on('close', (code) => {
        if (code === 0) {
          console.log('Crawl completed successfully');
          resolve(true);
        } else {
          console.error(`Crawl failed with exit code ${code}`);
          resolve(false);
        }
      });

      crawlProcess.on('error', (err) => {
        console.error('Crawl process error:', err);
        reject(err);
      });
    });
  } catch (error) {
    console.error('Crawl Execution Error:', error);
    return false;
  }
}

export async function performWebCrawl(
  resourceName: string,
  url: string, 
  maxPages: number, 
  maxDepth: number, 
  settingsManager: SettingsManager
): Promise<boolean> {
  try {
    const logDirectory = path.join(
      settingsManager.getSettings().dataDirectories.logs, 
      'crawl'
    );
    fs.ensureDirSync(logDirectory);

    // Import Crawler dynamically to avoid circular dependency
    const { Crawler } = await import('../crawler');

    const crawler = new Crawler(
      settingsManager.getSettings().dataDirectories.raw,
      maxPages,
      maxDepth,
      Number(process.env.REQUEST_TIMEOUT) || 10000,
      'KnowledgeCrawler/1.0',
      resourceName,
      logDirectory
    );

    await crawler.crawl(url, maxDepth);

    console.log(`✅ Crawl completed successfully for: ${url}`);
    return true;
  } catch (error) {
    console.error('❌ Crawl failed:', error);
    
    const errorLogPath = path.join(
      settingsManager.getSettings().dataDirectories.logs, 
      'crawl-errors.log'
    );
    
    try {
      fs.ensureDirSync(path.dirname(errorLogPath));
      fs.appendFileSync(
        errorLogPath, 
        `${new Date().toISOString()} - Crawl Error: ${error}\n`
      );
    } catch (logError) {
      console.error('Failed to log error to file:', logError);
    }

    return false;
  }
}
