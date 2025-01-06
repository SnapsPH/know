import { EventEmitter } from 'events';
import * as fs from 'fs-extra';
import * as path from 'path';

import { SettingsManager, KnowBotSettings } from './settings';
import { safePrompt, crawlPrompts, mainMenuChoices } from './cli/prompts';
import { getResourceDetails, displayResourceDetails } from './cli/resource-management';
import { runCrawlCommand } from './cli/crawl-management';
import { ResourceCleaner } from './cleanup'; // Fix import
import { KnowledgeProcessor } from './knowledge_processor';
import * as winston from 'winston';
import { createLogger, logError } from './logger';

class KnowledgeInteractiveCLI extends EventEmitter {
  private basePath: string;
  private settings: SettingsManager;
  private cleaner: ResourceCleaner; // Explicitly type as imported class
  private processor: KnowledgeProcessor;
  private logger: winston.Logger;

  constructor() {
    super();
    this.basePath = process.cwd();
    
    // Create module-specific logger
    this.logger = createLogger('interactive-cli');

    try {
      this.settings = new SettingsManager();
      
      // Explicitly pass base path from settings
      const settingsData = this.settings.getSettings();
      this.cleaner = new ResourceCleaner(settingsData.baseStoragePath);
      
      this.processor = new KnowledgeProcessor(
        process.env.OLLAMA_URL || 'http://localhost:11434',
        settingsData.modelName,
        settingsData.dataDirectories.raw,
        settingsData.dataDirectories.processed
      );

      this.logger.info('Interactive CLI initialized successfully');
    } catch (error) {
      logError(this.logger, 'Failed to initialize Interactive CLI', error as Error);
      process.exit(1);
    }

    // Handle process termination
    process.on('SIGINT', () => {
      this.logger.info('Gracefully shutting down...');
      process.exit(0);
    });
  }

  async start() {
    try {
      console.clear();
      
      // Display configuration details
      const settings = this.settings.getSettings();
      console.log('🌟 Knowledge Retrieval Interactive CLI 🌟');
      console.log('----------------------------------------');
      console.log('📋 Current Configuration:');
      console.log(`   - Model: ${settings.modelName}`);
      console.log(`   - Processing Mode: ${settings.defaultProcessingMode}`);
      console.log(`   - Max Crawl Depth: ${settings.maxCrawlDepth}`);
      console.log(`   - Base Storage Path: ${settings.baseStoragePath}`);
      console.log('----------------------------------------');

      const { action } = await safePrompt<{ action: string }>([
        {
          type: 'list',
          name: 'action',
          message: 'What would you like to do?',
          choices: mainMenuChoices
        }
      ]);

      this.logger.info(`Selected action: ${action}`);

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
        case 'Manage Settings':
          await this.manageSettings();
          break;
        case 'Exit':
          this.logger.info('User selected Exit');
          console.log('Goodbye! 👋');
          process.exit(0);
      }
    } catch (error) {
      logError(this.logger, 'CLI Main Menu Error', error as Error);
      await this.start();
    }
  }

  async crawlNewResource() {
    try {
      console.log('Starting New Resource Crawl...');
      
      const { resourceName, url, depth, process: processImmediately } = await safePrompt<{
        resourceName: string, 
        url: string, 
        depth: string, 
        process: boolean
      }>(crawlPrompts);

      console.log(`\nCrawling ${url} with depth: ${depth}`);
      
      const crawlSuccess = await runCrawlCommand(
        resourceName, 
        url, 
        Number(depth), 
        this.settings
      );

      if (crawlSuccess && processImmediately) {
        await this.processResource(resourceName);
      }

      await this.start();
    } catch (error) {
      console.error('Crawl Resource Error:', error);
      await this.start();
    }
  }

  async processResource(specificResource?: string) {
    try {
      console.clear();
      console.log('🔄 Process Existing Resource');
      console.log('----------------------------');

      // If no specific resource is provided, allow user to select
      if (!specificResource) {
        const rawResources = getResourceDetails(this.basePath, 'raw');
        
        if (Object.keys(rawResources).length === 0) {
          console.log('No resources available to process.');
          await this.start();
          return;
        }

        const { selectedResource } = await safePrompt<{ selectedResource: string }>([
          {
            type: 'list',
            name: 'selectedResource',
            message: 'Select a resource to process:',
            choices: Object.keys(rawResources)
          }
        ]);

        specificResource = selectedResource;
      }

      // Prompt for processing mode
      const { processingMode } = await safePrompt<{ processingMode: 'docs' | 'json' }>([
        {
          type: 'list',
          name: 'processingMode',
          message: 'Select processing mode:',
          choices: ['docs', 'json'],
          default: this.settings.getSettings().defaultProcessingMode
        }
      ]);

      console.log(`Processing resource: ${specificResource} in ${processingMode} mode`);
      
      try {
        const processedResults = await this.processor.processRawData(
          specificResource, 
          processingMode
        );

        console.log(`✅ Resource "${specificResource}" processed successfully.`);
        console.log(`Processed ${processedResults.length} files.`);
      } catch (processingError: unknown) {
        const errorMessage = processingError instanceof Error 
          ? processingError.message 
          : String(processingError);

        console.error(`❌ Error processing resource: ${errorMessage}`);
        console.log('Possible reasons:');
        console.log('- No raw data found for the selected resource');
        console.log('- No JSON files in the resource directory');
        console.log('- Permissions or file system issues');
      }
      
      await this.start();
    } catch (error) {
      console.error('Process Resource Error:', error);
      await this.start();
    }
  }

  async viewResources() {
    try {
      console.clear();
      console.log('🔍 Resource Overview');
      console.log('-------------------');

      // Collect raw and processed resources
      const rawResources = getResourceDetails(this.basePath, 'raw');
      const processedResources = getResourceDetails(this.basePath, 'processed');

      console.log('\n📥 Raw Resources:');
      displayResourceDetails(rawResources);

      console.log('\n📄 Processed Resources:');
      displayResourceDetails(processedResources);

      // Prompt for next action
      const { continueAction } = await safePrompt<{ continueAction: string }>([
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
    } catch (error) {
      console.error('View Resources Error:', error);
      await this.start();
    }
  }

  async cleanupResources() {
    try {
      console.clear();
      console.log('🧹 Cleanup Resources');
      console.log('-------------------');

      const { cleanupMode } = await safePrompt<{ cleanupMode: 'all' | 'raw' | 'processed' | 'cancel' }>([
        {
          type: 'list',
          name: 'cleanupMode',
          message: 'Select cleanup mode:',
          choices: [
            { name: 'Clean All Resources', value: 'all' },
            { name: 'Clean Raw Data', value: 'raw' },
            { name: 'Clean Processed Data', value: 'processed' },
            { name: 'Cancel', value: 'cancel' }
          ]
        }
      ]);

      if (cleanupMode === 'cancel') {
        await this.start();
        return;
      }

      await this.cleaner.cleanupResources(cleanupMode);
      console.log('✅ Cleanup completed successfully.');
      
      await this.start();
    } catch (error) {
      console.error('Cleanup Resources Error:', error);
      await this.start();
    }
  }

  async batchProcess() {
    try {
      console.clear();
      console.log('🔄 Batch Process Resources');
      console.log('-------------------------');

      const rawResources = getResourceDetails(this.basePath, 'raw');
      const resourceNames = Object.keys(rawResources);

      if (resourceNames.length === 0) {
        console.log('No resources available for batch processing.');
        await this.start();
        return;
      }

      const { selectedResources, processingMode } = await safePrompt<{ 
        selectedResources: string[], 
        processingMode: 'docs' | 'json' 
      }>([
        {
          type: 'checkbox',
          name: 'selectedResources',
          message: 'Select resources to process:',
          choices: resourceNames
        },
        {
          type: 'list',
          name: 'processingMode',
          message: 'Select processing mode:',
          choices: ['docs', 'json'],
          default: this.settings.getSettings().defaultProcessingMode
        }
      ]);

      if (selectedResources.length === 0) {
        console.log('No resources selected.');
        await this.start();
        return;
      }

      console.log(`Processing ${selectedResources.length} resources in ${processingMode} mode...`);
      
      for (const resource of selectedResources) {
        console.log(`Processing ${resource}...`);
        await this.processor.processRawData(resource, processingMode);
      }

      console.log('✅ Batch processing completed successfully.');
      await this.start();
    } catch (error) {
      console.error('Batch Process Error:', error);
      await this.start();
    }
  }

  async manageSettings() {
    try {
      console.clear();
      console.log('⚙️ Manage Settings');
      console.log('-----------------');

      const currentSettings = this.settings.getSettings();
      let settingsToUpdate: Partial<KnowBotSettings> = {};

      const { settingToModify } = await safePrompt<{ settingToModify: string }>([
        {
          type: 'list',
          name: 'settingToModify',
          message: 'Select setting to modify:',
          choices: [
            'Crawl Depth',
            'Max Crawl Pages',
            'Request Timeout',
            'User Agent',
            'Processing Mode',
            'Ollama Model',
            'HTTP Headers',
            'Return to Main Menu'
          ]
        }
      ]);

      switch (settingToModify) {
        case 'Crawl Depth':
          const { maxCrawlDepth } = await safePrompt<{ maxCrawlDepth: number }>([
            {
              type: 'number',
              name: 'maxCrawlDepth',
              message: 'Enter max crawl depth:',
              default: currentSettings.maxCrawlDepth
            }
          ]);
          settingsToUpdate.maxCrawlDepth = maxCrawlDepth;
          break;
        
        case 'Max Crawl Pages':
          const { maxCrawlPages } = await safePrompt<{ maxCrawlPages: number }>([
            {
              type: 'number',
              name: 'maxCrawlPages',
              message: 'Enter max crawl pages:',
              default: currentSettings.maxCrawlPages
            }
          ]);
          settingsToUpdate.maxCrawlPages = maxCrawlPages;
          break;
        
        case 'Request Timeout':
          const { requestTimeout } = await safePrompt<{ requestTimeout: number }>([
            {
              type: 'number',
              name: 'requestTimeout',
              message: 'Enter request timeout (ms):',
              default: currentSettings.requestTimeout
            }
          ]);
          settingsToUpdate.requestTimeout = requestTimeout;
          break;
        
        case 'User Agent':
          const { userAgent } = await safePrompt<{ userAgent: string }>([
            {
              type: 'input',
              name: 'userAgent',
              message: 'Enter user agent:',
              default: currentSettings.userAgent
            }
          ]);
          settingsToUpdate.userAgent = userAgent;
          break;
        
        case 'Processing Mode':
          const { processingMode } = await safePrompt<{ processingMode: 'markdown' | 'json' }>([
            {
              type: 'list',
              name: 'processingMode',
              message: 'Select default processing mode:',
              choices: ['markdown', 'json'],
              default: currentSettings.defaultProcessingMode
            }
          ]);
          settingsToUpdate.defaultProcessingMode = processingMode;
          break;
        
        case 'Ollama Model':
          const { ollamaModel } = await safePrompt<{ ollamaModel: string }>([
            {
              type: 'input',
              name: 'ollamaModel',
              message: 'Enter Ollama model:',
              default: currentSettings.modelName
            }
          ]);
          settingsToUpdate.modelName = ollamaModel;
          break;
        
        case 'HTTP Headers':
          let headers = { ...currentSettings.headers || {} };
          
          while (true) {
            console.log('Current HTTP Headers:', headers);
            console.log('');

            const { action } = await safePrompt<{ action: string }>([
              {
                type: 'list',
                name: 'action',
                message: 'Header Management:',
                choices: [
                  'Add/Modify Header',
                  'Remove Header',
                  'Return to Settings'
                ]
              }
            ]);

            switch (action) {
              case 'Add/Modify Header':
                const { key, value } = await safePrompt<{ key: string, value: string }>([
                  {
                    type: 'input',
                    name: 'key',
                    message: 'Enter header name:'
                  },
                  {
                    type: 'input',
                    name: 'value',
                    message: 'Enter header value:'
                  }
                ]);
                headers[key] = value;
                break;
　　　　　　　case 'Remove Header':
                const { headerToRemove } = await safePrompt<{ headerToRemove: string }>([
                  {
                    type: 'list',
                    name: 'headerToRemove',
                    message: 'Select header to remove:',
                    choices: Object.keys(headers)
                  }
                ]);
                delete headers[headerToRemove];
                break;
　　　　　　　case 'Return to Settings':
                settingsToUpdate.headers = headers;
                break;
            }

            if (action === 'Return to Settings') break;
          }
          break;
　　　　　case 'Return to Main Menu':
          await this.start();
          return;
      }

      // Save updated settings
      await this.settings.saveSettings(settingsToUpdate);
      console.log('✅ Settings updated successfully.');
      
      await this.start();
    } catch (error) {
      console.error('Manage Settings Error:', error);
      await this.start();
    }
  }
}

export default KnowledgeInteractiveCLI;

// Only create and start CLI if this file is being run directly
if (require.main === module) {
  const cli = new KnowledgeInteractiveCLI();
  cli.start().catch(console.error);
}
