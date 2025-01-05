import axios from 'axios';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as cheerio from 'cheerio';

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

  constructor(
    ollamaUrl: string,
    ollamaModel: string,
    rawDataPath: string, 
    processedDataPath: string
  ) {
    this.ollamaUrl = ollamaUrl;
    this.ollamaModel = ollamaModel;
    this.rawDataPath = path.resolve(rawDataPath, 'raw_data');
    this.processedDataPath = path.resolve(processedDataPath, 'processed_data');
    
    fs.ensureDirSync(this.processedDataPath);
  }

  async processRawData(
    resourceName: string, 
    mode: 'docs' | 'json' = 'docs'
  ): Promise<ProcessedKnowledge[]> {
    const rawDataPath = path.join(this.rawDataPath, resourceName);
    const processedDataPath = path.join(this.processedDataPath, mode, resourceName);
    
    // Ensure processed data directory exists
    fs.ensureDirSync(processedDataPath);
    
    // Get all raw files
    const rawFiles = await fs.readdir(rawDataPath);
    const processedResults: ProcessedKnowledge[] = [];

    for (const rawFile of rawFiles) {
      if (path.extname(rawFile) !== '.json') continue;

      const rawFilePath = path.join(rawDataPath, rawFile);
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
    }

    // Create a consolidated knowledge file
    await fs.writeJSON(
      path.join(this.processedDataPath, `${resourceName}_consolidated.json`),
      processedResults
    );

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
