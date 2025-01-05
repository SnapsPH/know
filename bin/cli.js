#!/usr/bin/env node
const { InteractiveCLI } = require('../dist/index');

async function main() {
  try {
    const cli = new InteractiveCLI();
    await cli.start();
  } catch (error) {
    console.error('Knowledge Retrieval CLI Error:', error);
    process.exit(1);
  }
}

main();
