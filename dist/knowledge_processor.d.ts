export interface ProcessedKnowledge {
    source: string;
    extractedAt: string;
    content: string | Record<string, unknown>;
}
export declare class KnowledgeProcessor {
    private ollamaUrl;
    private ollamaModel;
    private rawDataPath;
    private processedDataPath;
    constructor(ollamaUrl: string, ollamaModel: string, rawDataPath: string, processedDataPath: string);
    processRawData(resourceName: string, mode?: 'docs' | 'json'): Promise<ProcessedKnowledge[]>;
    private processContent;
    private getDocsProcessingPrompt;
    private getJsonProcessingPrompt;
    private callOllamaAPI;
}
export default KnowledgeProcessor;
//# sourceMappingURL=knowledge_processor.d.ts.map