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
  version?: number;
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
    modelName: 'llama3.2:3b',
    version: 1
  };

  private configPath: string;
  private settings: KnowBotSettings;

  constructor(configPath?: string) {
    // Determine the most appropriate config path
    this.configPath = this.determineConfigPath(configPath);
    
    // Attempt to load settings from the config file
    this.settings = this.loadOrCreateSettings();

    // Additional logging for debugging
    console.log('📦 Package Detection:', {
      execPath: process.execPath,
      __dirname: __dirname,
      cwd: process.cwd(),
      isPackaged: this.isPackagedApp()
    });

    // Logging config resolution details
    console.log('Searching for config in paths:', this.getPossibleConfigPaths());

    // Override base storage path for packaged apps if not explicitly set
    this.adjustBaseStoragePathForPackagedApp();

    // Initialize directories based on the loaded/modified settings
    this.initializeDirectories();
  }

  // Method to explicitly set config path
  public setConfigPath(configPath: string): void {
    this.configPath = configPath;
    // Reload settings from the new path
    this.settings = this.loadOrCreateSettings();
  }

  private getPossibleConfigPaths(): string[] {
    const potentialPaths = [
      // Executable directory
      path.dirname(process.execPath),
      
      // Dist directories
      path.join(path.dirname(process.execPath), 'dist', 'exe', 'windows'),
      path.join(path.dirname(process.execPath), 'dist', 'exe'),
      path.join(path.dirname(process.execPath), 'dist'),
      
      // Project root directories
      process.cwd(),
      path.resolve(process.cwd(), '..'),
      path.resolve(__dirname, '..'),
      path.resolve(__dirname, '..', '..'),
      
      // User home directory
      os.homedir()
    ];

    // Deduplicate and map to config file paths
    const configPaths = potentialPaths
      .map(dir => path.join(dir, SettingsManager.DEFAULT_CONFIG_FILE))
      .filter((configPath, index, self) => 
        self.indexOf(configPath) === index // Remove duplicates
      );

    console.log('🔍 Searching for configuration in paths:', configPaths);
    return configPaths;
  }

  private determineConfigPath(providedPath?: string): string {
    // If a path is explicitly provided, use it
    if (providedPath && fs.existsSync(providedPath)) {
      console.log(`📋 Using explicitly provided config: ${providedPath}`);
      return providedPath;
    }

    // Search through possible paths
    const possiblePaths = this.getPossibleConfigPaths();
    
    for (const configPath of possiblePaths) {
      try {
        if (fs.existsSync(configPath)) {
          console.log(`📋 Config found at: ${configPath}`);
          return configPath;
        }
      } catch (error) {
        console.warn(`Error checking config path ${configPath}:`, error);
      }
    }

    // If no config found, create in the most appropriate location
    const defaultConfigPath = path.join(
      this.isPackagedApp() 
        ? path.dirname(process.execPath) 
        : process.cwd(), 
      SettingsManager.DEFAULT_CONFIG_FILE
    );
    
    console.log(`✨ Created default config at: ${defaultConfigPath}`);
    this.createDefaultConfig(defaultConfigPath);
    
    return defaultConfigPath;
  }

  private createDefaultConfig(configPath: string): void {
    try {
      // Ensure directory exists
      fs.ensureDirSync(path.dirname(configPath));
      
      // Adjust base storage path for packaged vs development
      const defaultSettings = { 
        ...SettingsManager.DEFAULT_SETTINGS,
        baseStoragePath: this.isPackagedApp()
          ? path.join(path.dirname(process.execPath), 'knowledge_retrieval')
          : path.join(process.cwd(), 'knowledge_retrieval')
      };

      // Write default settings
      fs.writeFileSync(
        configPath, 
        JSON.stringify(defaultSettings, null, 2)
      );

      console.log('📝 Default configuration created:', defaultSettings);
    } catch (error) {
      console.error('❌ Failed to create default config:', error);
    }
  }

  private isPackagedApp(): boolean {
    // Check if running from the packaged executable
    const isExe = process.execPath.toLowerCase().includes('knowledge-retrieval.exe');
    const isInDist = process.execPath.includes('dist\\exe') || 
                     __dirname.includes('dist\\exe') || 
                     process.cwd().includes('dist\\exe');
    
    console.log('📦 Package Detection:', {
      execPath: process.execPath,
      __dirname: __dirname,
      cwd: process.cwd(),
      isExe,
      isInDist: process.execPath.includes('dist\\exe') || 
                __dirname.includes('dist\\exe') || 
                process.cwd().includes('dist\\exe')
    });

    return isExe && isInDist;
  }

  private adjustBaseStoragePathForPackagedApp() {
    const isPackaged = this.isPackagedApp();
    const exeDir = path.dirname(process.execPath);
    const currentBasePath = this.settings.baseStoragePath;

    // Check if base path needs adjustment
    const needsAdjustment = 
      isPackaged && 
      (!currentBasePath.includes(exeDir) || 
       currentBasePath.includes(process.cwd()));

    if (needsAdjustment) {
      const newBasePath = path.join(exeDir, 'knowledge_retrieval');
      
      this.settings.baseStoragePath = newBasePath;
      
      // Update data directories to match new base path
      this.settings.dataDirectories = {
        raw: path.join(newBasePath, 'raw_data'),
        processed: path.join(newBasePath, 'processed_data'),
        logs: path.join(newBasePath, 'logs')
      };

      console.log('🔧 Adjusted base storage path for packaged app:', {
        oldPath: currentBasePath,
        newPath: newBasePath
      });
    }
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
          const mergedSettings: KnowBotSettings = {
            ...SettingsManager.DEFAULT_SETTINGS,
            ...loadedSettings,
            // Ensure data directories are absolute paths
            dataDirectories: {
              raw: path.isAbsolute(loadedSettings.dataDirectories?.raw ?? '') 
                ? loadedSettings.dataDirectories.raw 
                : path.join(this.settings.baseStoragePath, 'raw_data'),
              processed: path.isAbsolute(loadedSettings.dataDirectories?.processed ?? '') 
                ? loadedSettings.dataDirectories.processed 
                : path.join(this.settings.baseStoragePath, 'processed_data'),
              logs: path.isAbsolute(loadedSettings.dataDirectories?.logs ?? '') 
                ? loadedSettings.dataDirectories.logs 
                : path.join(this.settings.baseStoragePath, 'logs')
            },
            // Ensure version is set
            version: loadedSettings.version ?? SettingsManager.DEFAULT_SETTINGS.version
          };

          console.log(`📋 Configuration loaded from: ${this.configPath}`);
          console.log('🔧 Configuration Details:');
          console.log(`   - Model: ${mergedSettings.modelName}`);
          console.log(`   - Processing Mode: ${mergedSettings.defaultProcessingMode}`);
          console.log(`   - Max Crawl Depth: ${mergedSettings.maxCrawlDepth}`);
          console.log(`   - Base Storage Path: ${mergedSettings.baseStoragePath}`);
          console.log(`   - Version: ${mergedSettings.version}`);

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

  public async validateSettings(): Promise<void> {
    try {
      // Check if base storage path exists
      if (!fs.existsSync(this.settings.baseStoragePath)) {
        throw new Error(`Base storage path does not exist: ${this.settings.baseStoragePath}`);
      }

      // Check if data directories exist
      const dataDirectories = this.settings.dataDirectories;
      const directoryKeys = Object.keys(dataDirectories) as Array<keyof typeof dataDirectories>;
      
      for (const key of directoryKeys) {
        const dirPath = dataDirectories[key];
        if (!fs.existsSync(dirPath)) {
          throw new Error(`Data directory does not exist: ${dirPath}`);
        }
      }

      console.log('✅ Settings are valid');
    } catch (error) {
      console.error('❌ Error validating settings:', error);
      throw error;
    }
  }

  public async checkForUpdates(): Promise<void> {
    try {
      // Check if a newer version of the configuration file exists
      const latestConfigPath = path.join(__dirname, 'latest-config.json');
      if (fs.existsSync(latestConfigPath)) {
        const latestConfig = JSON.parse(fs.readFileSync(latestConfigPath, 'utf-8'));
        
        // Add version to the interface
        interface VersionedConfig extends KnowBotSettings {
          version?: number;
        }

        const typedLatestConfig = latestConfig as VersionedConfig;
        const typedCurrentSettings = this.settings as VersionedConfig;

        // Only update if version exists and is newer
        if (typedLatestConfig.version && 
            (!typedCurrentSettings.version || 
             typedLatestConfig.version > typedCurrentSettings.version)) {
          console.log('📣 A newer version of the configuration file is available');
          await this.saveSettings({
            ...latestConfig,
            version: typedLatestConfig.version
          });
        }
      }
    } catch (error) {
      console.error('❌ Error checking for updates:', error);
    }
  }
}
