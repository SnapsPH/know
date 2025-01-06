import axios from 'axios';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as cheerio from 'cheerio';
import * as winston from 'winston';
import * as os from 'os';
import { createLogger, logError } from './logger';

export interface ProcessedKnowledge {
  source: string;
  extractedAt: string;
  content: string | Record<string, unknown>;
}

export class KnowledgeProcessor {
  private ollamaUrl: string;
  private ollamaModel: string;
  private rawDataPath: string;
  private processedDataPath: string;
  private logger: winston.Logger;

  constructor(
    ollamaUrl: string,
    ollamaModel: string,
    rawDataPath: string, 
    processedDataPath: string
  ) {
    this.ollamaUrl = ollamaUrl;
    this.ollamaModel = ollamaModel;

    // Determine the most appropriate base path
    const basePath = this.findAppropriateBasePath([
      process.cwd(),
      path.dirname(process.execPath),
      os.homedir()
    ]);

    // Resolve paths with multiple fallback strategies
    this.rawDataPath = this.resolveDataPath(
      basePath, 
      rawDataPath, 
      'raw_data'
    );
    this.processedDataPath = this.resolveDataPath(
      basePath, 
      processedDataPath, 
      'processed_data'
    );
    
    // Create module-specific logger
    this.logger = createLogger('knowledge-processor');

    // Ensure data directories exist
    try {
      fs.ensureDirSync(this.rawDataPath);
      fs.ensureDirSync(path.join(this.processedDataPath, 'docs'));
      fs.ensureDirSync(path.join(this.processedDataPath, 'json'));

      this.logger.info(`Initialized processor for model: ${ollamaModel}`);
      this.logger.info(`Raw data path: ${this.rawDataPath}`);
      this.logger.info(`Processed data path: ${this.processedDataPath}`);
    } catch (error) {
      logError(this.logger, 'Failed to create data directories', error as Error);
    }
  }

  private findAppropriateBasePath(basePaths: string[]): string {
    for (const basePath of basePaths) {
      try {
        // Attempt to create a test directory
        const testDir = path.join(basePath, '.know-bot-test');
        fs.ensureDirSync(testDir);
        fs.removeSync(testDir);
        return basePath;
      } catch {
        // If path is not writable, continue to next
        continue;
      }
    }

    // Fallback to home directory if no writable path found
    return os.homedir();
  }

  private resolveDataPath(
    basePath: string, 
    providedPath: string, 
    defaultDirName: string
  ): string {
    // Possible path variations
    const possiblePaths = [
      providedPath,
      path.join(basePath, 'knowledge_retrieval', defaultDirName),
      path.join(basePath, defaultDirName),
      path.join(basePath, 'knowledge_retrieval'),
      basePath
    ];

    // Find first path that can be created or exists
    for (const dataPath of possiblePaths) {
      try {
        const fullPath = path.join(dataPath, defaultDirName);
        fs.ensureDirSync(fullPath);
        return fullPath;
      } catch {
        continue;
      }
    }

    // Absolute fallback
    const fallbackPath = path.join(basePath, defaultDirName);
    fs.ensureDirSync(fallbackPath);
    return fallbackPath;
  }

  async processRawData(
    resourceName: string, 
    mode: 'docs' | 'json' = 'docs'
  ): Promise<ProcessedKnowledge[]> {
    // Determine the correct raw data path
    let rawDataPath = path.join(this.rawDataPath, resourceName);
    const processedDataPath = path.join(this.processedDataPath, mode, resourceName);
    
    this.logger.info(`Attempting to process resource: ${resourceName}`);
    this.logger.info(`Raw data path: ${rawDataPath}`);
    this.logger.info(`Processed data path: ${processedDataPath}`);
    
    // Ensure processed data directory exists
    try {
      fs.ensureDirSync(processedDataPath);
    } catch (error) {
      logError(this.logger, 'Failed to create processed data directory', error as Error);
      throw error;
    }
    
    // Check if raw data directory exists
    if (!fs.existsSync(rawDataPath)) {
      this.logger.warn(`Raw data directory not found: ${rawDataPath}`);
      this.logger.warn(`Current working directory: ${process.cwd()}`);
      
      // List and check potential alternative paths
      const potentialPaths = [
        path.join(process.cwd(), 'raw_data', resourceName),
        path.join(process.cwd(), resourceName),
        path.join(this.rawDataPath.replace(/knowledge_retrieval/g, ''), 'raw_data', resourceName)
      ];
      
      // Find the first existing path
      const existingPath = potentialPaths.find(potentialPath => {
        const exists = fs.existsSync(potentialPath);
        if (exists) {
          this.logger.warn(`Found alternative path: ${potentialPath}`);
        }
        return exists;
      });

      // If no existing path found, throw an error
      if (!existingPath) {
        throw new Error(`No raw data found for resource: ${resourceName}`);
      }

      // Update rawDataPath to the existing path
      rawDataPath = existingPath;
    }
    
    // Get all raw files
    const rawFiles = await fs.readdir(rawDataPath);
    const jsonFiles = rawFiles.filter(f => path.extname(f) === '.json');

    // Check if any JSON files exist
    if (jsonFiles.length === 0) {
      this.logger.warn(`No JSON files found in raw data directory: ${rawDataPath}`);
      throw new Error(`No JSON files found for resource: ${resourceName}`);
    }

    const processedResults: ProcessedKnowledge[] = [];

    this.logger.info(`Processing resource: ${resourceName} in ${mode} mode`);

    for (const rawFile of jsonFiles) {
      const rawFilePath = path.join(rawDataPath, rawFile);
      
      try {
        const rawData = await fs.readJSON(rawFilePath);

        const processedKnowledge = await this.processContent(
          rawData.html, 
          rawData.url, 
          mode
        );

        // Generate filename with correct extension
        const processedFilename = `${path.parse(rawFile).name}.${mode === 'docs' ? 'md' : 'json'}`;
        const processedFilePath = path.join(processedDataPath, processedFilename);

        // Write ONLY the specified file type
        if (mode === 'docs') {
          await fs.writeFile(
            processedFilePath,
            processedKnowledge.content as string
          );
        } else {
          await fs.writeJSON(
            processedFilePath,
            processedKnowledge
          );
        }

        processedResults.push(processedKnowledge);
        this.logger.info(`Processed file: ${rawFile}`);
      } catch (error) {
        logError(this.logger, `Failed to process file: ${rawFile}`, error as Error, { 
          resourceName, 
          mode, 
          filePath: rawFilePath 
        });
      }
    }

    // Create a consolidated knowledge file
    try {
      await fs.writeJSON(
        path.join(this.processedDataPath, `${resourceName}_consolidated.json`),
        processedResults
      );
      this.logger.info(`Created consolidated file for resource: ${resourceName}`);
    } catch (error) {
      logError(this.logger, 'Failed to create consolidated file', error as Error, { 
        resourceName 
      });
    }

    this.logger.info(`Processed ${processedResults.length} files for resource: ${resourceName}`);
    return processedResults;
  }

  private async processContent(
    html: string, 
    sourceUrl: string, 
    mode: 'docs' | 'json'
  ): Promise<ProcessedKnowledge> {
    const $ = cheerio.load(html);
    
    // Remove unnecessary elements
    $('script, style, nav, header, footer, .sidebar, .navigation').remove();
    
    // Extract main content
    const mainContent = $('main, article, .content, #content').text() || 
                        $('body').text();

    // Prepare prompt based on mode
    const prompt = mode === 'docs' 
      ? this.getDocsProcessingPrompt(mainContent)
      : this.getJsonProcessingPrompt(mainContent);

    // Call Ollama for processing
    const processedContent = await this.callOllamaAPI(prompt);

    return {
      source: sourceUrl,
      extractedAt: new Date().toISOString(),
      content: processedContent
    };
  }

  private getDocsProcessingPrompt(content: string): string {
    return `You are a professional technical writer. Process the following web content and convert it into a well-structured, readable markdown documentation. 

Key requirements:
- Remove any irrelevant content, advertisements, or navigation elements
- Focus on creating a clear, concise, and informative documentation
- Use proper markdown formatting (headings, lists, code blocks, etc.)
- Maintain the original technical context and information
- Ensure the content is easy to read and understand

Raw Content:
\`\`\`
${content.slice(0, 10000)}
\`\`\`

Processed Markdown Documentation:`;
  }

  private getJsonProcessingPrompt(content: string): string {
    return `You are a structured data extraction expert. From the following web content, extract and structure the most relevant technical information into a clean, organized JSON format.

Key requirements:
- Extract only the most relevant technical information
- Create a structured JSON with meaningful keys
- Remove any irrelevant content, advertisements, or navigation elements
- Focus on technical details, API descriptions, or key information
- Ensure the JSON is clean, readable, and contains only high-quality information

Raw Content:
\`\`\`
${content.slice(0, 10000)}
\`\`\`

Processed Structured JSON:`;
  }

  private async callOllamaAPI(prompt: string): Promise<string | Record<string, unknown>> {
    try {
      const response = await axios.post(`${this.ollamaUrl}/api/generate`, {
        model: this.ollamaModel,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.7,
          num_predict: 4096
        }
      });

      // Try to parse JSON for JSON mode, otherwise return as string
      try {
        return JSON.parse(response.data.response);
      } catch {
        return response.data.response;
      }
    } catch (error) {
      console.error('Ollama API call failed:', error);
      throw error;
    }
  }
}

async function main() {
  const resourceName = process.argv[2];
  const mode = process.argv[3] as 'docs' | 'json' | undefined;

  if (!resourceName) {
    console.error('Please provide a resource name');
    process.exit(1);
  }

  // Read environment variables
  const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
  const ollamaModel = process.env.OLLAMA_MODEL || 'llama3.2:3b';
  const basePath = process.env.BASE_STORAGE_PATH 
    ? path.resolve(process.cwd(), process.env.BASE_STORAGE_PATH.replace(/^\//, '').replace(/'/g, ''))
    : process.cwd();

  const processor = new KnowledgeProcessor(
    ollamaUrl,
    ollamaModel,
    basePath,
    basePath
  );

  try {
    const processingMode = mode === 'json' ? 'json' : 'docs';
    await processor.processRawData(resourceName, processingMode);
    console.log(`Processing completed for ${resourceName} in ${processingMode} mode`);
  } catch (error) {
    console.error('Processing failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export default KnowledgeProcessor;
