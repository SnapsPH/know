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
const inquirer_1 = __importDefault(require("inquirer"));
const child_process_1 = require("child_process");
const path = __importStar(require("path"));
const fs = __importStar(require("fs-extra"));
const settings_1 = require("./settings");
class KnowledgeInteractiveCLI {
    constructor() {
        this.basePath = process.cwd();
        this.rawDataPath = path.resolve(this.basePath, 'raw_data');
        this.processedDataPath = path.resolve(this.basePath, 'processed_data');
        this.settings = new settings_1.SettingsManager();
    }
    async start() {
        console.clear();
        console.log('🌟 Knowledge Retrieval Interactive CLI 🌟');
        console.log('----------------------------------------');
        const { action } = await inquirer_1.default.prompt([
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
                    'Manage Settings',
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
            case 'Manage Settings':
                await this.manageSettings();
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
        const { continueAction } = await inquirer_1.default.prompt([
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
    listResourcesInDirectory(directoryPath) {
        try {
            return fs.readdirSync(directoryPath)
                .filter(f => fs.statSync(path.join(directoryPath, f)).isDirectory());
        }
        catch (error) {
            // If directory doesn't exist, return empty array
            return [];
        }
    }
    async processResource(specificResource) {
        // Wait for Ollama to start (if needed)
        await this.ensureOllamaReady();
        const rawDataPath = path.resolve(this.basePath, 'raw_data');
        const resources = specificResource
            ? [specificResource]
            : fs.readdirSync(rawDataPath).filter(f => fs.statSync(path.join(rawDataPath, f)).isDirectory());
        if (resources.length === 0) {
            console.log('No resources available to process.');
            return this.start();
        }
        const { selectedResource, processingMode } = await inquirer_1.default.prompt([
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
        const processProcess = (0, child_process_1.spawn)('npm', ['run', `process:${processingMode}`, selectedResource], {
            stdio: 'inherit',
            shell: true
        });
        processProcess.on('close', async (code) => {
            if (code === 0) {
                console.log('Processing completed successfully!');
            }
            else {
                console.error('Processing failed.');
            }
            await this.start();
        });
    }
    async ensureOllamaReady() {
        return new Promise((resolve) => {
            // Check if Ollama is running or needs to be started
            const ollamaProcess = (0, child_process_1.spawn)('ollama', ['list'], {
                stdio: 'ignore',
                shell: true
            });
            ollamaProcess.on('close', (code) => {
                if (code === 0) {
                    // Ollama is running
                    resolve();
                }
                else {
                    // Try to start Ollama
                    console.log('Starting Ollama...');
                    const startProcess = (0, child_process_1.spawn)('ollama', ['serve'], {
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
        const { url, resourceName, depth } = await inquirer_1.default.prompt([
            {
                type: 'input',
                name: 'url',
                message: 'Enter the URL to crawl:',
                validate: (input) => !!input || 'URL is required'
            },
            {
                type: 'input',
                name: 'resourceName',
                message: 'Enter a name for this resource:',
                validate: (input) => !!input || 'Resource name is required'
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
        ]);
        console.log(`\nCrawling ${url} with resource name: ${resourceName}`);
        const crawlProcess = (0, child_process_1.spawn)('npm', ['run', 'crawl', resourceName, url, depth], {
            stdio: 'inherit',
            shell: true
        });
        crawlProcess.on('close', async (code) => {
            if (code === 0) {
                const continueChoice = await inquirer_1.default.prompt([
                    {
                        type: 'confirm',
                        name: 'process',
                        message: 'Would you like to process the crawled resource now?',
                        default: true
                    }
                ]);
                if (continueChoice.process) {
                    await this.processResource(resourceName);
                }
                else {
                    await this.start();
                }
            }
            else {
                console.error('Crawling failed.');
                await this.start();
            }
        });
    }
    async cleanupResources() {
        const { cleanupMode } = await inquirer_1.default.prompt([
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
        const cleanupProcess = (0, child_process_1.spawn)('npm', ['run', 'cleanup', cleanupMode], {
            stdio: 'inherit',
            shell: true
        });
        cleanupProcess.on('close', async (code) => {
            if (code === 0) {
                console.log('Cleanup completed successfully!');
            }
            else {
                console.error('Cleanup failed.');
            }
            await this.start();
        });
    }
    async batchProcess() {
        const rawDataPath = path.resolve(this.basePath, 'raw_data');
        const resources = fs.readdirSync(rawDataPath).filter(f => fs.statSync(path.join(rawDataPath, f)).isDirectory());
        if (resources.length === 0) {
            console.log('No resources available to batch process.');
            return this.start();
        }
        const { selectedResources, processingMode } = await inquirer_1.default.prompt([
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
            const processProcess = (0, child_process_1.spawn)('npm', ['run', `process:${processingMode}`, resource], {
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
    async manageSettings() {
        while (true) {
            // Get fresh settings each time
            const currentSettings = this.settings.getSettings();
            const { action } = await inquirer_1.default.prompt([
                {
                    type: 'list',
                    name: 'action',
                    message: 'Settings Management',
                    choices: [
                        { name: '👀 View Current Settings', value: 'view' },
                        { name: '✏️ Edit Settings', value: 'edit' },
                        { name: '🔄 Reset to Defaults', value: 'reset' },
                        { name: '↩️ Back to Main Menu', value: 'back' }
                    ]
                }
            ]);
            if (action === 'back')
                break;
            switch (action) {
                case 'view':
                    console.log('\nCurrent Settings:');
                    console.log(JSON.stringify(currentSettings, null, 2));
                    break;
                case 'edit':
                    await this.editSettings();
                    break;
                case 'reset':
                    const { confirm } = await inquirer_1.default.prompt([
                        {
                            type: 'confirm',
                            name: 'confirm',
                            message: 'Are you sure you want to reset all settings to defaults?',
                            default: false
                        }
                    ]);
                    if (confirm) {
                        await this.settings.resetToDefaults();
                    }
                    break;
            }
        }
    }
    async editSettings() {
        // Get fresh settings
        const currentSettings = this.settings.getSettings();
        const { section } = await inquirer_1.default.prompt([
            {
                type: 'list',
                name: 'section',
                message: 'Which settings would you like to edit?',
                choices: [
                    { name: '🕷️ Crawler Settings', value: 'crawler' },
                    { name: '📁 Storage Settings', value: 'storage' },
                    { name: '⚙️ Processing Settings', value: 'processing' },
                    { name: '🔧 Custom Headers', value: 'headers' }
                ]
            }
        ]);
        let updates = {};
        switch (section) {
            case 'crawler': {
                const crawlerSettings = await inquirer_1.default.prompt([
                    {
                        type: 'number',
                        name: 'maxCrawlDepth',
                        message: 'Maximum crawl depth:',
                        default: currentSettings.maxCrawlDepth
                    },
                    {
                        type: 'number',
                        name: 'maxCrawlPages',
                        message: 'Maximum pages to crawl:',
                        default: currentSettings.maxCrawlPages
                    },
                    {
                        type: 'number',
                        name: 'requestTimeout',
                        message: 'Request timeout (ms):',
                        default: currentSettings.requestTimeout
                    },
                    {
                        type: 'input',
                        name: 'userAgent',
                        message: 'User Agent:',
                        default: currentSettings.userAgent
                    }
                ]);
                updates = crawlerSettings;
                break;
            }
            case 'storage': {
                const storageSettings = await inquirer_1.default.prompt([
                    {
                        type: 'input',
                        name: 'baseStoragePath',
                        message: 'Base storage path:',
                        default: currentSettings.baseStoragePath
                    },
                    {
                        type: 'input',
                        name: 'rawDataDir',
                        message: 'Raw data directory:',
                        default: currentSettings.rawDataDir
                    },
                    {
                        type: 'input',
                        name: 'processedDataDir',
                        message: 'Processed data directory:',
                        default: currentSettings.processedDataDir
                    }
                ]);
                updates = storageSettings;
                break;
            }
            case 'processing': {
                const processingSettings = await inquirer_1.default.prompt([
                    {
                        type: 'list',
                        name: 'defaultProcessingMode',
                        message: 'Default processing mode:',
                        choices: ['markdown', 'json'],
                        default: currentSettings.defaultProcessingMode
                    },
                    {
                        type: 'input',
                        name: 'modelName',
                        message: 'Model name:',
                        default: currentSettings.modelName
                    }
                ]);
                updates = processingSettings;
                break;
            }
            case 'headers': {
                // Initialize headers with existing headers or empty object
                const headers = currentSettings.headers ?? {};
                while (true) {
                    // Show current headers if any exist
                    if (Object.keys(headers).length > 0) {
                        console.log('\nCurrent Headers:');
                        Object.entries(headers).forEach(([key, value]) => {
                            console.log(`${key}: ${value}`);
                        });
                        console.log('');
                    }
                    const { action } = await inquirer_1.default.prompt([
                        {
                            type: 'list',
                            name: 'action',
                            message: 'Custom Headers Management',
                            choices: [
                                { name: 'Add Header', value: 'add' },
                                ...(Object.keys(headers).length > 0 ? [{ name: 'Remove Header', value: 'remove' }] : []),
                                { name: 'Done', value: 'done' }
                            ]
                        }
                    ]);
                    if (action === 'done')
                        break;
                    if (action === 'add') {
                        const { key, value } = await inquirer_1.default.prompt([
                            {
                                type: 'input',
                                name: 'key',
                                message: 'Header name:',
                                validate: (input) => {
                                    if (!input.trim())
                                        return 'Header name cannot be empty';
                                    return true;
                                }
                            },
                            {
                                type: 'input',
                                name: 'value',
                                message: 'Header value:',
                                validate: (input) => {
                                    if (!input.trim())
                                        return 'Header value cannot be empty';
                                    return true;
                                }
                            }
                        ]);
                        headers[key.trim()] = value.trim();
                        console.log(`✅ Added header: ${key}`);
                    }
                    else if (action === 'remove') {
                        const { key } = await inquirer_1.default.prompt([
                            {
                                type: 'list',
                                name: 'key',
                                message: 'Select header to remove:',
                                choices: Object.keys(headers)
                            }
                        ]);
                        delete headers[key];
                        console.log(`🗑️ Removed header: ${key}`);
                    }
                }
                updates = { headers };
                break;
            }
        }
        if (Object.keys(updates).length > 0) {
            await this.settings.updateSettings(updates);
        }
    }
}
// Ensure the class is exported as default
exports.default = KnowledgeInteractiveCLI;
async function main() {
    const cli = new KnowledgeInteractiveCLI();
    await cli.start();
}
main().catch(console.error);
//# sourceMappingURL=interactive.js.map