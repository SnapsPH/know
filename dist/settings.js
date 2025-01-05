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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsManager = void 0;
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
class SettingsManager {
    constructor(configPath) {
        this.configPath = configPath || path.join(process.cwd(), SettingsManager.DEFAULT_CONFIG_FILE);
        this.settings = this.loadSettings();
    }
    loadSettings() {
        try {
            if (fs.existsSync(this.configPath)) {
                const fileContent = fs.readFileSync(this.configPath, 'utf-8');
                const savedSettings = JSON.parse(fileContent);
                return { ...SettingsManager.DEFAULT_SETTINGS, ...savedSettings };
            }
        }
        catch (error) {
            console.warn('Error loading settings:', error);
        }
        return { ...SettingsManager.DEFAULT_SETTINGS };
    }
    async saveSettings(settings) {
        try {
            // Merge new settings with existing ones
            const updatedSettings = {
                ...this.settings,
                ...settings,
                // Ensure numeric values
                maxCrawlDepth: Number(settings.maxCrawlDepth ?? this.settings.maxCrawlDepth),
                maxCrawlPages: Number(settings.maxCrawlPages ?? this.settings.maxCrawlPages),
                requestTimeout: Number(settings.requestTimeout ?? this.settings.requestTimeout)
            };
            // Convert any relative paths to absolute
            if (!path.isAbsolute(updatedSettings.baseStoragePath)) {
                updatedSettings.baseStoragePath = path.resolve(process.cwd(), updatedSettings.baseStoragePath);
            }
            // Save to file
            await fs.writeFile(this.configPath, JSON.stringify(updatedSettings, null, 2));
            // Update internal settings
            this.settings = updatedSettings;
            console.log('✅ Settings saved successfully');
        }
        catch (error) {
            console.error('❌ Error saving settings:', error);
            throw error;
        }
    }
    getSettings() {
        return { ...this.settings };
    }
    async updateSettings(updates) {
        await this.saveSettings(updates);
        // Reload settings after save to ensure consistency
        this.settings = this.loadSettings();
    }
    async resetToDefaults() {
        await this.saveSettings(SettingsManager.DEFAULT_SETTINGS);
        // Reload settings after reset
        this.settings = this.loadSettings();
    }
    getConfigPath() {
        return this.configPath;
    }
}
exports.SettingsManager = SettingsManager;
SettingsManager.DEFAULT_CONFIG_FILE = 'know-bot.json';
SettingsManager.DEFAULT_SETTINGS = {
    maxCrawlDepth: 3,
    maxCrawlPages: 50,
    requestTimeout: 5000,
    userAgent: 'KnowledgeRetrievalBot/1.0',
    baseStoragePath: path.join(process.cwd(), 'knowledge_retrieval'),
    rawDataDir: 'raw_data',
    processedDataDir: 'processed_data',
    defaultProcessingMode: 'markdown',
    modelName: 'ollama/mistral'
};
//# sourceMappingURL=settings.js.map