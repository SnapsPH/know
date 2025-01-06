import * as path from 'path';
import * as fs from 'fs-extra';
import { SettingsManager } from './settings';

export function runWithConfigLoader(scriptName: string, mainFunction: (settings: any) => Promise<void>) {
  try {
    // Create settings manager which handles all the complex config loading logic
    const settingsManager = new SettingsManager();
    const settings = settingsManager.getSettings();

    console.log(`🚀 Running ${scriptName} with configuration:`);
    console.log(JSON.stringify(settings, null, 2));

    // Execute the main function with loaded settings
    mainFunction(settings)
      .then(() => {
        console.log(`✅ ${scriptName} completed successfully`);
        process.exit(0);
      })
      .catch((error) => {
        console.error(`❌ ${scriptName} failed:`, error);
        process.exit(1);
      });

  } catch (error) {
    console.error(`❌ Failed to load configuration for ${scriptName}:`, error);
    process.exit(1);
  }
}
