#!/usr/bin/env node

// Polyfill for ReadableStream if not defined
if (typeof ReadableStream === 'undefined') {
  global.ReadableStream = require('stream').Readable;
}

const fs = require('fs');
const path = require('path');

// Robust logging function
function logError(error) {
  const logDir = path.join(process.cwd(), 'logs');
  fs.mkdirSync(logDir, { recursive: true });
  
  const logFile = path.join(logDir, 'cli-errors.log');
  const timestamp = new Date().toISOString();
  const errorMessage = `${timestamp} - Fatal Error: ${error.stack || error.message || error}\n`;
  
  try {
    fs.appendFileSync(logFile, errorMessage);
    console.error(errorMessage);
  } catch (logError) {
    console.error('Logging failed:', logError);
  }
}

// Robust path resolution for configuration and executable location
function getExecutableDirectory() {
  if (process.pkg) {
    return path.dirname(process.execPath);
  }
  return process.cwd();
}

function resolveConfigPath(configFileName = 'know-bot.json') {
  const execDir = getExecutableDirectory();
  const configPaths = [
    path.join(execDir, configFileName),  // Executable directory
    path.join(process.cwd(), configFileName),  // Current working directory
    path.join(__dirname, '..', configFileName),  // Project root
    path.join(__dirname, configFileName)  // Bin directory
  ];

  for (const configPath of configPaths) {
    try {
      if (fs.existsSync(configPath)) {
        console.log(`Configuration found at: ${configPath}`);
        return configPath;
      }
    } catch (error) {
      continue;
    }
  }

  throw new Error(`Configuration file ${configFileName} not found in any expected locations.`);
}

// Robust module finder
function findModule(moduleName, additionalPaths = []) {
  const searchPaths = [
    getExecutableDirectory(),
    __dirname,
    path.join(__dirname, '..'),
    path.join(getExecutableDirectory(), 'dist'),
    path.join(getExecutableDirectory(), 'node_modules'),
    ...additionalPaths
  ];

  for (const searchPath of searchPaths) {
    const possiblePaths = [
      path.join(searchPath, moduleName),
      path.join(searchPath, 'dist', moduleName),
      path.join(searchPath, moduleName.replace('.js', ''), 'index.js')
    ];

    for (const modulePath of possiblePaths) {
      try {
        if (fs.existsSync(modulePath)) {
          return modulePath;
        }
      } catch (error) {
        // Ignore errors, continue searching
      }
    }
  }

  throw new Error(`Cannot find module: ${moduleName}`);
}

function loadConfiguration() {
  try {
    const configPath = resolveConfigPath();
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (error) {
    logError(error);
    throw error;
  }
}

async function main() {
  try {
    // Log execution context
    console.log('Executable Path:', process.execPath);
    console.log('Current Working Directory:', process.cwd());
    console.log('__dirname:', __dirname);

    // Load configuration
    const config = loadConfiguration();

    // Find and load interactive module
    const interactivePath = findModule('interactive.js');
    console.log('Interactive Module Path:', interactivePath);
    
    const { default: KnowledgeInteractiveCLI } = require(interactivePath);
    
    // Ensure Winston is available globally
    global.winston = require('winston');
    
    // Initialize and start CLI
    const cli = new KnowledgeInteractiveCLI();
    await cli.start();
  } catch (error) {
    logError(error);
    process.exit(1);
  }
}

// Global error handling
process.on('uncaughtException', (error) => {
  logError(error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logError({
    message: 'Unhandled Rejection',
    reason: reason,
    promise: promise
  });
  process.exit(1);
});

main();

module.exports = {
  resolveConfigPath,
  getExecutableDirectory
};
