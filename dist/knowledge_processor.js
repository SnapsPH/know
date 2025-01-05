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
exports.KnowledgeProcessor = void 0;
const axios_1 = __importDefault(require("axios"));
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const cheerio = __importStar(require("cheerio"));
class KnowledgeProcessor {
    constructor(ollamaUrl, ollamaModel, rawDataPath, processedDataPath) {
        this.ollamaUrl = ollamaUrl;
        this.ollamaModel = ollamaModel;
        this.rawDataPath = path.resolve(rawDataPath, 'raw_data');
        this.processedDataPath = path.resolve(processedDataPath, 'processed_data');
        fs.ensureDirSync(this.processedDataPath);
    }
    async processRawData(resourceName, mode = 'docs') {
        const rawDataPath = path.join(this.rawDataPath, resourceName);
        const processedDataPath = path.join(this.processedDataPath, mode, resourceName);
        // Ensure processed data directory exists
        fs.ensureDirSync(processedDataPath);
        // Get all raw files
        const rawFiles = await fs.readdir(rawDataPath);
        const processedResults = [];
        for (const rawFile of rawFiles) {
            if (path.extname(rawFile) !== '.json')
                continue;
            const rawFilePath = path.join(rawDataPath, rawFile);
            const rawData = await fs.readJSON(rawFilePath);
            const processedKnowledge = await this.processContent(rawData.html, rawData.url, mode);
            // Generate filename with correct extension
            const processedFilename = `${path.parse(rawFile).name}.${mode === 'docs' ? 'md' : 'json'}`;
            const processedFilePath = path.join(processedDataPath, processedFilename);
            // Write ONLY the specified file type
            if (mode === 'docs') {
                await fs.writeFile(processedFilePath, processedKnowledge.content);
            }
            else {
                await fs.writeJSON(processedFilePath, processedKnowledge);
            }
            processedResults.push(processedKnowledge);
        }
        // Create a consolidated knowledge file
        await fs.writeJSON(path.join(this.processedDataPath, `${resourceName}_consolidated.json`), processedResults);
        return processedResults;
    }
    async processContent(html, sourceUrl, mode) {
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
    getDocsProcessingPrompt(content) {
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
    getJsonProcessingPrompt(content) {
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
    async callOllamaAPI(prompt) {
        try {
            const response = await axios_1.default.post(`${this.ollamaUrl}/api/generate`, {
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
            }
            catch {
                return response.data.response;
            }
        }
        catch (error) {
            console.error('Ollama API call failed:', error);
            throw error;
        }
    }
}
exports.KnowledgeProcessor = KnowledgeProcessor;
async function main() {
    const resourceName = process.argv[2];
    const mode = process.argv[3];
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
    const processor = new KnowledgeProcessor(ollamaUrl, ollamaModel, basePath, basePath);
    try {
        const processingMode = mode === 'json' ? 'json' : 'docs';
        await processor.processRawData(resourceName, processingMode);
        console.log(`Processing completed for ${resourceName} in ${processingMode} mode`);
    }
    catch (error) {
        console.error('Processing failed:', error);
        process.exit(1);
    }
}
if (require.main === module) {
    main().catch(console.error);
}
exports.default = KnowledgeProcessor;
//# sourceMappingURL=knowledge_processor.js.map