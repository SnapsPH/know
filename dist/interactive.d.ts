declare class KnowledgeInteractiveCLI {
    private basePath;
    private rawDataPath;
    private processedDataPath;
    private settings;
    constructor();
    start(): Promise<void>;
    viewResources(): Promise<void>;
    private listResourcesInDirectory;
    processResource(specificResource?: string): Promise<void>;
    private ensureOllamaReady;
    crawlNewResource(): Promise<void>;
    cleanupResources(): Promise<void>;
    batchProcess(): Promise<void>;
    manageSettings(): Promise<void>;
    editSettings(): Promise<void>;
}
export default KnowledgeInteractiveCLI;
//# sourceMappingURL=interactive.d.ts.map