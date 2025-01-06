import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';
import * as winston from 'winston';
import { createLogger, logError } from './logger';

class ResourceCleaner {
  private basePath: string;
  private rawDataPath: string;
  private processedDataPath: string;
  private logger: winston.Logger;

  constructor(basePath: string = process.cwd()) {
    this.basePath = basePath;
    this.rawDataPath = path.resolve(basePath, 'raw_data');
    this.processedDataPath = path.resolve(basePath, 'processed_data');
    
    // Create module-specific logger
    this.logger = createLogger('resource-cleaner');
  }

  async cleanupResources(mode: 'all' | 'raw' | 'processed' = 'all') {
    this.logger.info(`Performing ${mode} cleanup...`);

    try {
      // Ensure base directories exist
      fs.ensureDirSync(this.rawDataPath);
      fs.ensureDirSync(this.processedDataPath);

      // Cleanup raw data
      if (mode === 'raw' || mode === 'all') {
        await this.forceCleanDirectory(this.rawDataPath);
        this.logger.info('Raw data cleaned successfully');
      }

      // Cleanup processed data
      if (mode === 'processed' || mode === 'all') {
        // Clean both docs and json processed directories
        const processedModes = ['docs', 'json'];
        for (const processedMode of processedModes) {
          const processedModePath = path.resolve(this.processedDataPath, processedMode);
          await this.forceCleanDirectory(processedModePath);
        }
        this.logger.info('Processed data cleaned successfully');
      }

      this.logger.info('Cleanup completed successfully');
    } catch (error) {
      logError(this.logger, 'Cleanup failed', error as Error, { mode });
      process.exit(1);
    }
  }

  private async forceCleanDirectory(directoryPath: string): Promise<void> {
    try {
      // Check if directory exists
      if (!fs.existsSync(directoryPath)) {
        fs.ensureDirSync(directoryPath);
        this.logger.info(`Created directory: ${directoryPath}`);
        return;
      }

      // Windows-specific aggressive file closure
      if (os.platform() === 'win32') {
        this.windowsForceClose(directoryPath);
      }

      // Get all items in the directory
      const items = fs.readdirSync(directoryPath);

      // Remove each item with multiple strategies
      for (const item of items) {
        const itemPath = path.resolve(directoryPath, item);
        
        try {
          // First, try standard removal
          if (fs.statSync(itemPath).isDirectory()) {
            await this.removeDirectoryWithRetry(itemPath);
          } else {
            this.removeFileWithRetry(itemPath);
          }
          this.logger.info(`Removed item: ${item}`);
        } catch (error) {
          logError(this.logger, `Could not remove ${item} immediately`, error as Error, {
            itemPath
          });
          
          // Last resort: force delete
          this.forceDelete(itemPath);
        }
      }

      this.logger.info(`Cleaned directory: ${directoryPath}`);
    } catch (error) {
      logError(this.logger, `Error cleaning ${directoryPath}`, error as Error, {
        directoryPath
      });
      throw error;
    }
  }

  private removeFileWithRetry(filePath: string, maxRetries: number = 3): void {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        fs.unlinkSync(filePath);
        return;
      } catch (error) {
        if (attempt === maxRetries) throw error;
        this.sleepSync(100 * attempt);
      }
    }
  }

  private async removeDirectoryWithRetry(dirPath: string, maxRetries: number = 3): Promise<void> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await fs.remove(dirPath);
        return;
      } catch (error) {
        if (attempt === maxRetries) throw error;
        this.sleepSync(100 * attempt);
      }
    }
  }

  private sleepSync(ms: number): void {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      // Busy wait
    }
  }

  private windowsForceClose(directoryPath: string): void {
    try {
      // Use PowerShell to forcibly close file handles
      execSync(`powershell "Get-Process | Where-Object { $_.Modules | Where-Object { $_.FileName -like '${directoryPath}*' } } | Stop-Process -Force"`, { 
        stdio: 'ignore' 
      });
    } catch {
      console.warn('Could not forcibly close file handles via PowerShell.');
    }
  }

  private forceDelete(itemPath: string): void {
    try {
      if (os.platform() === 'win32') {
        // Windows-specific force delete
        execSync(`powershell "Remove-Item '${itemPath}' -Force -Recurse"`, { 
          stdio: 'ignore' 
        });
      } else {
        // Unix-like systems
        execSync(`rm -rf "${itemPath}"`, { 
          stdio: 'ignore' 
        });
      }
    } catch (error) {
      console.error(`Failed to force delete ${itemPath}:`, error);
    }
  }
}

// CLI Entry Point
async function main() {
  const cleaner = new ResourceCleaner();
  
  // Get cleanup mode from command line
  const mode = process.argv[2] as 'all' | 'raw' | 'processed' || 'all';

  try {
    await cleaner.cleanupResources(mode);
  } catch (error) {
    console.error('Cleanup failed:', error);
    process.exit(1);
  }
}

// Only run main if this file is being run directly
if (require.main === module) {
  main();
}

export default ResourceCleaner;
