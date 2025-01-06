#!/usr/bin/env node

// Polyfill for ReadableStream if not defined
if (typeof ReadableStream === 'undefined') {
  global.ReadableStream = require('stream').Readable;
}

const path = require('path');
const fs = require('fs');

// Helper function to find the first existing module path
function findModule(paths) {
  for (const modulePath of paths) {
    try {
      const fullPath = path.resolve(__dirname, modulePath);
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    } catch (error) {
      console.warn(`Could not check path: ${modulePath}`, error);
    }
  }
  throw new Error('No valid module path found')
}

try {
  const modulePaths = ["../dist/interactive.js","dist/interactive.js","interactive.js"];
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
