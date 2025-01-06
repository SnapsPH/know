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
  dataDirectories: {
    raw: string;
    processed: string;
    logs: string;
  };
  
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
    dataDirectories: {
      raw: path.join(process.cwd(), 'knowledge_retrieval', 'raw_data'),
      processed: path.join(process.cwd(), 'knowledge_retrieval', 'processed_data'),
      logs: path.join(process.cwd(), 'knowledge_retrieval', 'logs')
    },
    defaultProcessingMode: 'markdown',
    modelName: 'ollama/mistral'
  };

  private configPath: string;
  private settings: KnowBotSettings;

  constructor(configPath?: string) {
    // Use provided config path or determine it dynamically
    this.configPath = this.determineConfigPath(configPath);
    
    // Attempt to load settings from the config file
    this.settings = this.loadOrCreateSettings();

    // Additional logging for debugging
    console.log('Final Config Path:', this.configPath);
    console.log('Final Settings:', JSON.stringify(this.settings, null, 2));

    // Override base storage path for packaged apps if not explicitly set
    if (this.isPackagedApp() && 
        this.settings.baseStoragePath.includes('knowledge_retrieval\\knowledge_retrieval')) {
      const exeDir = path.dirname(process.execPath);
      this.settings.baseStoragePath = path.join(exeDir, 'knowledge_retrieval');
      
      // Update data directories to match new base path
      this.settings.dataDirectories = {
        raw: path.join(this.settings.baseStoragePath, 'raw_data'),
        processed: path.join(this.settings.baseStoragePath, 'processed_data'),
        logs: path.join(this.settings.baseStoragePath, 'logs_data')
      };

      console.log('🔧 Overriding base storage path for packaged app:', this.settings.baseStoragePath);
    }

    // Initialize directories based on the loaded/modified settings
    this.initializeDirectories();
  }

  // Method to explicitly set config path
  public setConfigPath(configPath: string): void {
    this.configPath = configPath;
    // Reload settings from the new path
    this.settings = this.loadOrCreateSettings();
  }

  private isPackagedApp(): boolean {
    // Check if running from the packaged executable
    const isExe = process.execPath.toLowerCase().endsWith('knowledge-retrieval.exe');
    const isInDist = process.execPath.includes('dist\\exe') || __dirname.includes('dist\\exe');
    
    console.log('Package Detection:', {
      execPath: process.execPath,
      __dirname: __dirname,
      isExe: isExe,
      isInDist: isInDist
    });

    return isExe && isInDist;
  }

  private determineConfigPath(providedPath?: string): string {
    const isPackagedApp = this.isPackagedApp();

    // Possible paths to search for config, with special handling for packaged apps
    const possiblePaths = [
      providedPath,
      isPackagedApp ? path.dirname(process.execPath) : null,
      isPackagedApp ? path.resolve(path.dirname(process.execPath), '..') : null,
      isPackagedApp ? path.resolve(path.dirname(process.execPath), '..', '..') : null,
      process.execPath ? path.dirname(process.execPath) : null,
      process.cwd(),
      os.homedir()
    ].filter((p): p is string => p !== null && p !== undefined);

    // Debugging log to show all paths being checked
    console.log('Searching for config in paths:', possiblePaths);

    for (const basePath of possiblePaths) {
      const potentialConfigPath = path.join(basePath, SettingsManager.DEFAULT_CONFIG_FILE);
      
      // Log each path being checked
      console.log(`Checking potential config path: ${potentialConfigPath}`);
      
      if (fs.existsSync(potentialConfigPath)) {
        console.log(`📋 Config found at: ${potentialConfigPath}`);
        return potentialConfigPath;
      }
    }

    // If no existing config, create in the most appropriate location
    const defaultConfigPath = isPackagedApp
      ? path.join(path.dirname(process.execPath), SettingsManager.DEFAULT_CONFIG_FILE)
      : path.join(process.cwd(), SettingsManager.DEFAULT_CONFIG_FILE);
    
    try {
      // Ensure directory exists
      fs.ensureDirSync(path.dirname(defaultConfigPath));
      
      // Write default settings if file doesn't exist
      if (!fs.existsSync(defaultConfigPath)) {
        // Use the configuration from the main project if running as packaged app
        const sourceConfigPath = path.join(
          path.resolve(__dirname, '..', '..'), 
          SettingsManager.DEFAULT_CONFIG_FILE
        );

        let settingsToWrite = SettingsManager.DEFAULT_SETTINGS;
        
        // Try to read settings from source config if it exists
        if (fs.existsSync(sourceConfigPath)) {
          try {
            const sourceSettings = JSON.parse(
              fs.readFileSync(sourceConfigPath, 'utf-8')
            );
            settingsToWrite = {
              ...SettingsManager.DEFAULT_SETTINGS,
              ...sourceSettings
            };
          } catch (readError) {
            console.warn('Could not read source config:', readError);
          }
        }

        // Update base storage path for packaged app
        if (isPackagedApp) {
          settingsToWrite.baseStoragePath = path.dirname(process.execPath);
          
          // Update data directories to match new base path
          settingsToWrite.dataDirectories = {
            raw: path.join(settingsToWrite.baseStoragePath, 'raw_data'),
            processed: path.join(settingsToWrite.baseStoragePath, 'processed_data'),
            logs: path.join(settingsToWrite.baseStoragePath, 'logs_data')
          };
        }

        fs.writeFileSync(
          defaultConfigPath, 
          JSON.stringify(settingsToWrite, null, 2)
        );
        
        console.log(`✨ Created default config at: ${defaultConfigPath}`);
      }
    } catch (writeError) {
      console.error('❌ Failed to create default config:', writeError);
    }

    return defaultConfigPath;
  }

  private initializeDirectories(): void {
    const { 
      baseStoragePath, 
      dataDirectories 
    } = this.settings;

    // Determine the most appropriate base path for creating directories
    const basePath = this.getAppropriateBasePath();

    // Ensure base storage path exists
    try {
      fs.ensureDirSync(basePath);
    } catch (error) {
      console.error(`❌ Failed to create base storage directory: ${basePath}`, error);
    }

    // Create data directories with robust path resolution
    const directoriesToCreate = [
      { key: 'raw', subDirs: [''] },
      { key: 'processed', subDirs: ['docs', 'json'] },
      { key: 'logs', subDirs: [''] }
    ];

    directoriesToCreate.forEach(({ key, subDirs }) => {
      const baseDir = this.resolveDirectoryPath(basePath, key);
      
      try {
        fs.ensureDirSync(baseDir);
        
        // Create subdirectories if applicable
        subDirs.forEach(subDir => {
          const fullPath = subDir 
            ? path.join(baseDir, subDir) 
            : baseDir;
          
          try {
            fs.ensureDirSync(fullPath);
            console.log(`✅ Created directory: ${fullPath}`);
          } catch (subDirError) {
            console.warn(`⚠️ Could not create subdirectory: ${fullPath}`, subDirError);
          }
        });
      } catch (dirError) {
        console.error(`❌ Failed to create directory for ${key}:`, dirError);
      }
    });
  }

  private getAppropriateBasePath(): string {
    const possibleBasePaths = [
      process.cwd(),
      path.dirname(process.execPath),
      os.homedir(),
      this.settings.baseStoragePath
    ];

    // Find a writable path
    for (const basePath of possibleBasePaths) {
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

  private resolveDirectoryPath(basePath: string, dirKey: string): string {
    // Resolve directory path with fallback strategies
    const possiblePaths = [
      path.join(basePath, 'knowledge_retrieval', `${dirKey}_data`),
      path.join(basePath, `${dirKey}_data`),
      path.join(basePath, 'knowledge_retrieval', dirKey),
      path.join(basePath, dirKey)
    ];

    // Return first path that can be created or exists
    for (const dirPath of possiblePaths) {
      try {
        fs.ensureDirSync(dirPath);
        return dirPath;
      } catch {
        continue;
      }
    }

    // Absolute fallback
    const fallbackPath = path.join(basePath, `${dirKey}_data`);
    fs.ensureDirSync(fallbackPath);
    return fallbackPath;
  }

  private loadOrCreateSettings(): KnowBotSettings {
    try {
      // Check if config file exists
      if (fs.existsSync(this.configPath)) {
        const fileContent = fs.readFileSync(this.configPath, 'utf-8');
        
        try {
          // Parse the JSON configuration
          const loadedSettings = JSON.parse(fileContent);
          
          // Merge loaded settings with default settings to ensure all fields are present
          const mergedSettings = {
            ...SettingsManager.DEFAULT_SETTINGS,
            ...loadedSettings
          };

          console.log(`📋 Configuration loaded from: ${this.configPath}`);
          console.log('🔧 Configuration Details:');
          console.log(`   - Model: ${mergedSettings.modelName}`);
          console.log(`   - Processing Mode: ${mergedSettings.defaultProcessingMode}`);
          console.log(`   - Max Crawl Depth: ${mergedSettings.maxCrawlDepth}`);
          console.log(`   - Base Storage Path: ${mergedSettings.baseStoragePath}`);

          return mergedSettings;
        } catch (parseError) {
          console.error(`❌ Error parsing configuration file: ${this.configPath}`, parseError);
          console.log('🔄 Falling back to default settings');
          return SettingsManager.DEFAULT_SETTINGS;
        }
      } else {
        console.warn(`⚠️ No configuration found at: ${this.configPath}`);
        console.log('🆕 Creating default configuration');
        
        // Write default settings
        fs.writeFileSync(
          this.configPath, 
          JSON.stringify(SettingsManager.DEFAULT_SETTINGS, null, 2)
        );

        return SettingsManager.DEFAULT_SETTINGS;
      }
    } catch (error) {
      console.error('❌ Error loading configuration:', error);
      return SettingsManager.DEFAULT_SETTINGS;
    }
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
      
      // Re-initialize directories in case paths changed
      this.initializeDirectories();
      
      console.log('✅ Settings saved successfully');
    } catch (error) {
      console.error('❌ Error saving settings:', error);
      throw error;
    }
  }

  public async updateSettings(updates: Partial<KnowBotSettings>): Promise<void> {
    await this.saveSettings(updates);
    // Reload settings after save to ensure consistency
    this.settings = this.loadOrCreateSettings();
  }

  public async resetToDefaults(): Promise<void> {
    await this.saveSettings(SettingsManager.DEFAULT_SETTINGS);
    // Reload settings after reset
    this.settings = this.loadOrCreateSettings();
  }

  public getConfigPath(): string {
    return this.configPath;
  }

  public getSettings(): KnowBotSettings {
    return { ...this.settings };
  }
}
