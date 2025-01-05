import { SettingsManager } from '../settings';
import * as path from 'path';
import * as fs from 'fs-extra';

describe('SettingsManager', () => {
  const testConfigPath = path.join(__dirname, 'test-know-bot.json');

  beforeEach(() => {
    // Clean up any existing test config
    if (fs.existsSync(testConfigPath)) {
      fs.unlinkSync(testConfigPath);
    }
  });

  afterEach(() => {
    // Clean up after tests
    if (fs.existsSync(testConfigPath)) {
      fs.unlinkSync(testConfigPath);
    }
  });

  it('should initialize with default settings', () => {
    const settings = new SettingsManager(testConfigPath);
    const currentSettings = settings.getSettings();

    expect(currentSettings).toHaveProperty('maxCrawlDepth', 3);
    expect(currentSettings).toHaveProperty('maxCrawlPages', 50);
    expect(currentSettings).toHaveProperty('requestTimeout', 5000);
    expect(currentSettings).toHaveProperty('userAgent', 'KnowledgeRetrievalBot/1.0');
  });

  it('should save and load settings', async () => {
    const settings = new SettingsManager(testConfigPath);
    const updates = {
      maxCrawlDepth: 5,
      maxCrawlPages: 100,
    };

    await settings.updateSettings(updates);
    const currentSettings = settings.getSettings();

    expect(currentSettings.maxCrawlDepth).toBe(5);
    expect(currentSettings.maxCrawlPages).toBe(100);
  });

  it('should handle custom headers', async () => {
    const settings = new SettingsManager(testConfigPath);
    const updates = {
      headers: {
        'Authorization': 'Bearer test-token',
        'Custom-Header': 'test-value'
      }
    };

    await settings.updateSettings(updates);
    const currentSettings = settings.getSettings();

    expect(currentSettings.headers).toBeDefined();
    expect(currentSettings.headers?.['Authorization']).toBe('Bearer test-token');
    expect(currentSettings.headers?.['Custom-Header']).toBe('test-value');
  });
});
