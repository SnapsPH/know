declare class KnowledgeInteractiveCLI {
    private basePath;
    private rawDataPath;
    private processedDataPath;
    constructor();
    start(): Promise<void>;
    viewResources(): Promise<void>;
    private listResourcesInDirectory;
    processResource(specificResource?: string): Promise<void>;
    private ensureOllamaReady;
    crawlNewResource(): Promise<void>;
    cleanupResources(): Promise<void>;
    batchProcess(): Promise<void>;
}
export default KnowledgeInteractiveCLI;
//# sourceMappingURL=interactive.d.ts.map