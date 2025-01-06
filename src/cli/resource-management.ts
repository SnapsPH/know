import * as fs from 'fs-extra';
import * as path from 'path';

export function listResourcesInDirectory(directoryPath: string): string[] {
  try {
    // Ensure directory exists before attempting to read
    if (!fs.existsSync(directoryPath)) {
      fs.ensureDirSync(directoryPath);
      return [];
    }

    return fs.readdirSync(directoryPath)
      .filter(f => {
        try {
          return fs.statSync(path.join(directoryPath, f)).isDirectory();
        } catch {
          return false;
        }
      });
  } catch (error) {
    console.warn(`⚠️ Error listing resources in ${directoryPath}:`, error);
    return [];
  }
}

export function getResourceDetails(basePath: string, resourceType: 'raw' | 'processed') {
  const resourcePaths = {
    raw: path.join(basePath, 'raw_data'),
    processedDocs: path.join(basePath, 'processed_data', 'docs'),
    processedJson: path.join(basePath, 'processed_data', 'json')
  };

  const resourceDetails: Record<string, { fileCount: number, path: string }> = {};

  const resourceTypes = resourceType === 'raw' 
    ? [resourcePaths.raw] 
    : [resourcePaths.processedDocs, resourcePaths.processedJson];

  resourceTypes.forEach(resourceDir => {
    try {
      // Ensure directory exists
      fs.ensureDirSync(resourceDir);

      const resources = listResourcesInDirectory(resourceDir);
      resources.forEach(resource => {
        const resourcePath = path.join(resourceDir, resource);
        
        try {
          const fileCount = fs.readdirSync(resourcePath)
            .filter(f => f.endsWith(resourceType === 'raw' ? '.json' : '.md'))
            .length;
          
          resourceDetails[resource] = { fileCount, path: resourcePath };
        } catch (resourceError) {
          console.warn(`⚠️ Error processing resource ${resource}:`, resourceError);
        }
      });
    } catch (error) {
      console.warn(`⚠️ Error processing resources in ${resourceDir}:`, error);
    }
  });

  return resourceDetails;
}

export function displayResourceDetails(details: Record<string, { fileCount: number, path: string }>) {
  if (Object.keys(details).length === 0) {
    console.log('  • No resources found.');
    return;
  }

  Object.entries(details).forEach(([name, { fileCount, path: resourcePath }]) => {
    console.log(`  • ${name} (${fileCount} files) - ${resourcePath}`);
  });
}
