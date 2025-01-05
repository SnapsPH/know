export interface KnowBotSettings {
    maxCrawlDepth: number;
    maxCrawlPages: number;
    requestTimeout: number;
    userAgent: string;
    baseStoragePath: string;
    rawDataDir: string;
    processedDataDir: string;
    defaultProcessingMode: 'markdown' | 'json';
    modelName: string;
    headers?: Record<string, string>;
}
export declare class SettingsManager {
    private static readonly DEFAULT_CONFIG_FILE;
    private static readonly DEFAULT_SETTINGS;
    private configPath;
    private settings;
    constructor(configPath?: string);
    private loadSettings;
    saveSettings(settings: Partial<KnowBotSettings>): Promise<void>;
    getSettings(): KnowBotSettings;
    updateSettings(updates: Partial<KnowBotSettings>): Promise<void>;
    resetToDefaults(): Promise<void>;
    getConfigPath(): string;
}
//# sourceMappingURL=settings.d.ts.map