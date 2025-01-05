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
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const child_process_1 = require("child_process");
class ResourceCleaner {
    constructor(basePath = process.cwd()) {
        this.basePath = basePath;
        this.rawDataPath = path.resolve(basePath, 'raw_data');
        this.processedDataPath = path.resolve(basePath, 'processed_data');
    }
    async cleanupResources(mode = 'all') {
        console.log(`🧹 Performing ${mode} cleanup...`);
        try {
            // Ensure base directories exist
            fs.ensureDirSync(this.rawDataPath);
            fs.ensureDirSync(this.processedDataPath);
            // Cleanup raw data
            if (mode === 'raw' || mode === 'all') {
                await this.forceCleanDirectory(this.rawDataPath);
                console.log('✅ Raw data cleaned successfully');
            }
            // Cleanup processed data
            if (mode === 'processed' || mode === 'all') {
                // Clean both docs and json processed directories
                const processedModes = ['docs', 'json'];
                for (const processedMode of processedModes) {
                    const processedModePath = path.resolve(this.processedDataPath, processedMode);
                    await this.forceCleanDirectory(processedModePath);
                }
                console.log('✅ Processed data cleaned successfully');
            }
            console.log('🎉 Cleanup completed successfully!');
        }
        catch (error) {
            console.error('❌ Cleanup failed:', error);
            process.exit(1);
        }
    }
    async forceCleanDirectory(directoryPath) {
        try {
            // Check if directory exists
            if (!fs.existsSync(directoryPath)) {
                fs.ensureDirSync(directoryPath);
                return;
            }
            // Windows-specific aggressive file closure
            if (os.platform() === 'win32') {
                this.windowsForceClose(directoryPath);
            }
            // Get all items in the directory
            const items = fs.readdirSync(directoryPath);
            // Remove each item with multiple strategies
            for (const item of items) {
                const itemPath = path.resolve(directoryPath, item);
                try {
                    // First, try standard removal
                    if (fs.statSync(itemPath).isDirectory()) {
                        await this.removeDirectoryWithRetry(itemPath);
                    }
                    else {
                        this.removeFileWithRetry(itemPath);
                    }
                }
                catch (error) {
                    console.warn(`Warning: Could not remove ${itemPath} immediately:`, error);
                    // Last resort: force delete
                    this.forceDelete(itemPath);
                }
            }
            console.log(`Cleaned directory: ${directoryPath}`);
        }
        catch (error) {
            console.error(`Error cleaning ${directoryPath}:`, error);
            throw error;
        }
    }
    removeFileWithRetry(filePath, maxRetries = 3) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                fs.unlinkSync(filePath);
                return;
            }
            catch (error) {
                if (attempt === maxRetries)
                    throw error;
                this.sleepSync(100 * attempt);
            }
        }
    }
    async removeDirectoryWithRetry(dirPath, maxRetries = 3) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                await fs.remove(dirPath);
                return;
            }
            catch (error) {
                if (attempt === maxRetries)
                    throw error;
                this.sleepSync(100 * attempt);
            }
        }
    }
    sleepSync(ms) {
        const end = Date.now() + ms;
        while (Date.now() < end) {
            // Busy wait
        }
    }
    windowsForceClose(directoryPath) {
        try {
            // Use PowerShell to forcibly close file handles
            (0, child_process_1.execSync)(`powershell "Get-Process | Where-Object { $_.Modules | Where-Object { $_.FileName -like '${directoryPath}*' } } | Stop-Process -Force"`, {
                stdio: 'ignore'
            });
        }
        catch {
            console.warn('Could not forcibly close file handles via PowerShell.');
        }
    }
    forceDelete(itemPath) {
        try {
            if (os.platform() === 'win32') {
                // Windows-specific force delete
                (0, child_process_1.execSync)(`powershell "Remove-Item '${itemPath}' -Force -Recurse"`, {
                    stdio: 'ignore'
                });
            }
            else {
                // Unix-like systems
                (0, child_process_1.execSync)(`rm -rf "${itemPath}"`, {
                    stdio: 'ignore'
                });
            }
        }
        catch (error) {
            console.error(`Failed to force delete ${itemPath}:`, error);
        }
    }
}
// CLI Entry Point
async function main() {
    const cleaner = new ResourceCleaner();
    // Get cleanup mode from command line
    const mode = process.argv[2] || 'all';
    try {
        await cleaner.cleanupResources(mode);
    }
    catch (error) {
        console.error('Cleanup failed:', error);
        process.exit(1);
    }
}
// Only run main if this file is being run directly
if (require.main === module) {
    main();
}
exports.default = ResourceCleaner;
//# sourceMappingURL=cleanup.js.map