declare class ResourceCleaner {
    private basePath;
    private rawDataPath;
    private processedDataPath;
    constructor(basePath?: string);
    cleanupResources(mode?: 'all' | 'raw' | 'processed'): Promise<void>;
    private forceCleanDirectory;
    private removeFileWithRetry;
    private removeDirectoryWithRetry;
    private sleepSync;
    private windowsForceClose;
    private forceDelete;
}
export default ResourceCleaner;
//# sourceMappingURL=cleanup.d.ts.map