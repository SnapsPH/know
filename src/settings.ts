import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

export interface KnowBotSettings {
  // Crawler Settings
  maxCrawlDepth: number;
  maxCrawlPages: number;
  requestTimeout: number;
  userAgent: string;
  
  // Storage Settings
  baseStoragePath: string;
  rawDataDir: string;
  processedDataDir: string;
  
  // Processing Settings
  defaultProcessingMode: 'markdown' | 'json';
  modelName: string;
  
  // Custom Headers (optional)
  headers?: Record<string, string>;
}

export class SettingsManager {
  private static readonly DEFAULT_CONFIG_FILE = 'know-bot.json';
  private static readonly DEFAULT_SETTINGS: KnowBotSettings = {
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

  private configPath: string;
  private settings: KnowBotSettings;

  constructor(configPath?: string) {
    this.configPath = configPath || path.join(process.cwd(), SettingsManager.DEFAULT_CONFIG_FILE);
    this.settings = this.loadSettings();
  }

  private loadSettings(): KnowBotSettings {
    try {
      if (fs.existsSync(this.configPath)) {
        const fileContent = fs.readFileSync(this.configPath, 'utf-8');
        const savedSettings = JSON.parse(fileContent) as Partial<KnowBotSettings>;
        return { ...SettingsManager.DEFAULT_SETTINGS, ...savedSettings };
      }
    } catch (error) {
      console.warn('Error loading settings:', error);
    }
    return { ...SettingsManager.DEFAULT_SETTINGS };
  }

  public async saveSettings(settings: Partial<KnowBotSettings>): Promise<void> {
    try {
      // Merge new settings with existing ones
      const updatedSettings: KnowBotSettings = {
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
    } catch (error) {
      console.error('❌ Error saving settings:', error);
      throw error;
    }
  }

  public getSettings(): KnowBotSettings {
    return { ...this.settings };
  }

  public async updateSettings(updates: Partial<KnowBotSettings>): Promise<void> {
    await this.saveSettings(updates);
    // Reload settings after save to ensure consistency
    this.settings = this.loadSettings();
  }

  public async resetToDefaults(): Promise<void> {
    await this.saveSettings(SettingsManager.DEFAULT_SETTINGS);
    // Reload settings after reset
    this.settings = this.loadSettings();
  }

  public getConfigPath(): string {
    return this.configPath;
  }
}
