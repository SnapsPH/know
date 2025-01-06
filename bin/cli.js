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

// Robust module finder
function findModule(moduleName, additionalPaths = []) {
  const searchPaths = [
    process.cwd(),
    __dirname,
    path.join(__dirname, '..'),
    path.join(process.cwd(), 'dist'),
    path.join(process.cwd(), 'node_modules'),
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

async function main() {
  try {
    // Log execution context
    console.log('Executable Path:', process.execPath);
    console.log('Current Working Directory:', process.cwd());
    console.log('__dirname:', __dirname);

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
