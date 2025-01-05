import inquirer from 'inquirer';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as os from 'os';

// Extend inquirer types to include our custom prompts
interface CustomPrompt {
  type: string;
  name: string;
  message: string;
  choices?: Array<string | { name: string; value: string }>;
  validate?: (input: string) => boolean | string;
  default?: any;
}

class KnowledgeInteractiveCLI {
  private basePath: string;
  private rawDataPath: string;
  private processedDataPath: string;

  constructor() {
    this.basePath = process.cwd();
    this.rawDataPath = path.resolve(this.basePath, 'raw_data');
    this.processedDataPath = path.resolve(this.basePath, 'processed_data');
  }

  async start() {
    console.clear();
    console.log('🌟 Knowledge Retrieval Interactive CLI 🌟');
    console.log('----------------------------------------');

    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          'Crawl New Resource',
          'Process Existing Resource',
          'Cleanup Resources',
          'Batch Process',
          'View Existing Resources',
          'Exit'
        ]
      }
    ]);

    switch (action) {
      case 'Crawl New Resource':
        await this.crawlNewResource();
        break;
      case 'Process Existing Resource':
        await this.processResource();
        break;
      case 'Cleanup Resources':
        await this.cleanupResources();
        break;
      case 'Batch Process':
        await this.batchProcess();
        break;
      case 'View Existing Resources':
        await this.viewResources();
        break;
      case 'Exit':
        console.log('Goodbye! 👋');
        process.exit(0);
    }
  }

  async viewResources() {
    console.clear();
    console.log('🔍 Resource Overview');
    console.log('-------------------');

    // Collect raw and processed resources
    const rawResources = this.listResourcesInDirectory(this.rawDataPath);
    const processedDocsResources = this.listResourcesInDirectory(path.join(this.processedDataPath, 'docs'));
    const processedJsonResources = this.listResourcesInDirectory(path.join(this.processedDataPath, 'json'));

    // Detailed view with resource details
    console.log('\n📥 Raw Resources:');
    rawResources.forEach(resource => {
      const resourcePath = path.join(this.rawDataPath, resource);
      const fileCount = fs.readdirSync(resourcePath).filter(f => f.endsWith('.json')).length;
      console.log(`  • ${resource} (${fileCount} files)`);
    });

    console.log('\n📄 Processed Markdown Resources:');
    processedDocsResources.forEach(resource => {
      const resourcePath = path.join(this.processedDataPath, 'docs', resource);
      const fileCount = fs.readdirSync(resourcePath).filter(f => f.endsWith('.md')).length;
      console.log(`  • ${resource} (${fileCount} files)`);
    });

    console.log('\n📊 Processed JSON Resources:');
    processedJsonResources.forEach(resource => {
      const resourcePath = path.join(this.processedDataPath, 'json', resource);
      const fileCount = fs.readdirSync(resourcePath).filter(f => f.endsWith('.json')).length;
      console.log(`  • ${resource} (${fileCount} files)`);
    });

    // Prompt for next action
    const { continueAction } = await inquirer.prompt([
      {
        type: 'list',
        name: 'continueAction',
        message: 'What would you like to do next?',
        choices: [
          'Return to Main Menu',
          'Process a Resource',
          'Exit'
        ]
      }
    ]);

    switch (continueAction) {
      case 'Return to Main Menu':
        await this.start();
        break;
      case 'Process a Resource':
        await this.processResource();
        break;
      case 'Exit':
        console.log('Goodbye! 👋');
        process.exit(0);
    }
  }

  private listResourcesInDirectory(directoryPath: string): string[] {
    try {
      return fs.readdirSync(directoryPath)
        .filter(f => fs.statSync(path.join(directoryPath, f)).isDirectory());
    } catch (error) {
      // If directory doesn't exist, return empty array
      return [];
    }
  }

  async processResource(specificResource?: string) {
    // Wait for Ollama to start (if needed)
    await this.ensureOllamaReady();

    const rawDataPath = path.resolve(this.basePath, 'raw_data');
    const resources = specificResource 
      ? [specificResource] 
      : fs.readdirSync(rawDataPath).filter(f => 
          fs.statSync(path.join(rawDataPath, f)).isDirectory()
        );

    if (resources.length === 0) {
      console.log('No resources available to process.');
      return this.start();
    }

    const { selectedResource, processingMode } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedResource',
        message: 'Select a resource to process:',
        choices: resources
      },
      {
        type: 'list',
        name: 'processingMode',
        message: 'Select processing mode:',
        choices: [
          { name: 'Documentation (Markdown)', value: 'docs' },
          { name: 'Structured JSON', value: 'json' }
        ]
      }
    ]);

    console.log(`Processing ${selectedResource} in ${processingMode} mode`);
    
    const processProcess = spawn('npm', ['run', `process:${processingMode}`, selectedResource], { 
      stdio: 'inherit',
      shell: true 
    });

    processProcess.on('close', async (code) => {
      if (code === 0) {
        console.log('Processing completed successfully!');
      } else {
        console.error('Processing failed.');
      }
      await this.start();
    });
  }

  private async ensureOllamaReady(): Promise<void> {
    return new Promise((resolve) => {
      // Check if Ollama is running or needs to be started
      const ollamaProcess = spawn('ollama', ['list'], { 
        stdio: 'ignore',
        shell: true 
      });

      ollamaProcess.on('close', (code) => {
        if (code === 0) {
          // Ollama is running
          resolve();
        } else {
          // Try to start Ollama
          console.log('Starting Ollama...');
          const startProcess = spawn('ollama', ['serve'], { 
            stdio: 'ignore',
            shell: true,
            detached: true
          });

          // Wait a bit to ensure Ollama is up
          setTimeout(resolve, 5000);
        }
      });
    });
  }

  async crawlNewResource() {
    const { url, resourceName, depth } = await inquirer.prompt([
      {
        type: 'input',
        name: 'url',
        message: 'Enter the URL to crawl:',
        validate: (input: string) => !!input || 'URL is required'
      },
      {
        type: 'input',
        name: 'resourceName',
        message: 'Enter a name for this resource:',
        validate: (input: string) => !!input || 'Resource name is required'
      },
      {
        type: 'list',
        name: 'depth',
        message: 'Select crawl depth:',
        choices: [
          { name: 'Single Page (depth:0)', value: 'depth:0' },
          { name: 'Direct Links (depth:1)', value: 'depth:1' },
          { name: 'Comprehensive (depth:3)', value: 'depth:3' }
        ]
      }
    ] as CustomPrompt[]);

    console.log(`\nCrawling ${url} with resource name: ${resourceName}`);
    
    const crawlProcess = spawn('npm', ['run', 'crawl', resourceName, url, depth], { 
      stdio: 'inherit',
      shell: true 
    });

    crawlProcess.on('close', async (code) => {
      if (code === 0) {
        const continueChoice = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'process',
            message: 'Would you like to process the crawled resource now?',
            default: true
          }
        ]);

        if (continueChoice.process) {
          await this.processResource(resourceName);
        } else {
          await this.start();
        }
      } else {
        console.error('Crawling failed.');
        await this.start();
      }
    });
  }

  async cleanupResources() {
    const { cleanupMode } = await inquirer.prompt([
      {
        type: 'list',
        name: 'cleanupMode',
        message: 'Select cleanup mode:',
        choices: [
          { name: 'Clean All Resources', value: 'all' },
          { name: 'Clean Raw Data', value: 'raw' },
          { name: 'Clean Processed Data', value: 'processed' }
        ]
      }
    ]);

    console.log(`Performing ${cleanupMode} cleanup`);
    
    const cleanupProcess = spawn('npm', ['run', 'cleanup', cleanupMode], { 
      stdio: 'inherit',
      shell: true 
    });

    cleanupProcess.on('close', async (code) => {
      if (code === 0) {
        console.log('Cleanup completed successfully!');
      } else {
        console.error('Cleanup failed.');
      }
      await this.start();
    });
  }

  async batchProcess() {
    const rawDataPath = path.resolve(this.basePath, 'raw_data');
    const resources = fs.readdirSync(rawDataPath).filter(f => 
      fs.statSync(path.join(rawDataPath, f)).isDirectory()
    );

    if (resources.length === 0) {
      console.log('No resources available to batch process.');
      return this.start();
    }

    const { selectedResources, processingMode } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'selectedResources',
        message: 'Select resources to batch process:',
        choices: resources
      },
      {
        type: 'list',
        name: 'processingMode',
        message: 'Select processing mode:',
        choices: [
          { name: 'Documentation (Markdown)', value: 'docs' },
          { name: 'Structured JSON', value: 'json' }
        ]
      }
    ]);

    console.log(`Batch processing ${selectedResources.length} resources in ${processingMode} mode`);
    
    for (const resource of selectedResources) {
      console.log(`Processing ${resource}...`);
      const processProcess = spawn('npm', ['run', `process:${processingMode}`, resource], { 
        stdio: 'inherit',
        shell: true 
      });

      await new Promise((resolve) => {
        processProcess.on('close', resolve);
      });
    }

    console.log('Batch processing completed!');
    await this.start();
  }
}

// Ensure the class is exported as default
export default KnowledgeInteractiveCLI;

async function main() {
  const cli = new KnowledgeInteractiveCLI();
  await cli.start();
}

main().catch(console.error);
