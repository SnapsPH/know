#!/usr/bin/env node

// Polyfill for ReadableStream if not defined
if (typeof ReadableStream === 'undefined') {
  global.ReadableStream = require('stream').Readable;
}

const path = require('path');
const fs = require('fs');

function findModule(modulePaths) {
  const searchPaths = [
    path.dirname(process.execPath),
    path.join(path.dirname(process.execPath), '..'),
    path.join(path.dirname(process.execPath), '..', 'dist'),
    process.cwd(),
    __dirname,
    path.join(__dirname, '..'),
    path.resolve(__dirname, '..', 'dist'),
    path.resolve(process.cwd(), 'dist')
  ];

  for (const modulePath of modulePaths) {
    for (const basePath of searchPaths) {
      const fullPath = path.resolve(basePath, modulePath);
      try {
        if (fs.existsSync(fullPath)) {
          return fullPath;
        }
      } catch (error) {
        // Ignore errors
        continue;
      }
    }
  }

  throw new Error(`Cannot find module. Tried paths: ${JSON.stringify(modulePaths)}`);
}

try {
  const modulePaths = ["../dist/cleanup.js","dist/cleanup.js","cleanup.js"];
  const modulePath = findModule(modulePaths);
  const module = require(modulePath);
  
  // Handle different module export styles
  const MainClass = module.default || module;
  
  if (typeof MainClass === 'function') {
    const instance = new MainClass();
    if (typeof instance.start === 'function') {
      instance.start().catch(console.error);
    } else {
      console.error('No start method found');
      process.exit(1);
    }
  } else {
    console.error('Unable to instantiate module');
    process.exit(1);
  }
} catch (error) {
  console.error('Error running command:', error);
  process.exit(1);
}
