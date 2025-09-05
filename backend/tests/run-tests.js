#!/usr/bin/env node

/**
 * Test runner for Music Dashboard Backend
 * 
 * Usage:
 *   node tests/run-tests.js [--watch] [--api] [--services] [--db] [--verbose]
 */

import { spawn } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';

const args = process.argv.slice(2);

// Parse command line arguments
const options = {
  watch: args.includes('--watch'),
  api: args.includes('--api'),
  services: args.includes('--services'), 
  db: args.includes('--db'),
  verbose: args.includes('--verbose'),
  help: args.includes('--help') || args.includes('-h')
};

if (options.help) {
  console.log(`
🧪 Music Dashboard Test Runner

Usage:
  node tests/run-tests.js [options]

Options:
  --watch     Run tests in watch mode (re-run on file changes)
  --api       Run only API tests
  --services  Run only service tests
  --db        Run only database tests
  --verbose   Show verbose output
  --help, -h  Show this help

Examples:
  node tests/run-tests.js                # Run all tests
  node tests/run-tests.js --api          # Run only API tests
  node tests/run-tests.js --watch        # Run tests in watch mode
  node tests/run-tests.js --api --verbose # Run API tests with verbose output

Environment Variables:
  TEST_BASE_URL      Base URL for API tests (default: http://localhost:3001)
  TEST_TIMEOUT       Test timeout in ms (default: 5000)
  TEST_DATABASE_URL  Test database URL (optional)
`);
  process.exit(0);
}

// Determine which tests to run
let testPattern = 'tests/**/*.test.js';

if (options.api) {
  testPattern = 'tests/api/*.test.js';
} else if (options.services) {
  testPattern = 'tests/services/*.test.js';
} else if (options.db) {
  testPattern = 'tests/db/*.test.js';
}

// Build Node.js test command
const nodeArgs = ['--test'];

if (options.watch) {
  nodeArgs.push('--watch');
}

if (options.verbose) {
  nodeArgs.push('--test-reporter=spec');
}

nodeArgs.push(testPattern);

// Set test environment
const env = {
  ...process.env,
  NODE_ENV: 'test',
  TEST_BASE_URL: process.env.TEST_BASE_URL || 'http://localhost:3001',
  TEST_TIMEOUT: process.env.TEST_TIMEOUT || '5000'
};

console.log('🧪 Starting Music Dashboard Tests');
console.log(`📊 Pattern: ${testPattern}`);
console.log(`🔗 Base URL: ${env.TEST_BASE_URL}`);
console.log(`⏱️  Timeout: ${env.TEST_TIMEOUT}ms`);

if (options.watch) {
  console.log('👀 Watch mode enabled - tests will re-run on file changes');
}

console.log('─'.repeat(50));

// Check if server is likely running
const serverRunning = await checkServer(env.TEST_BASE_URL);
if (!serverRunning) {
  console.log('⚠️  Warning: Server may not be running at', env.TEST_BASE_URL);
  console.log('   Start the server with: npm start');
  console.log('   Or run tests against a different URL with: TEST_BASE_URL=http://localhost:3001 npm test');
  console.log('');
}

// Run tests
const testProcess = spawn('node', nodeArgs, {
  stdio: 'inherit',
  env: env,
  shell: false
});

testProcess.on('close', (code) => {
  console.log('─'.repeat(50));
  if (code === 0) {
    console.log('✅ All tests completed successfully!');
  } else {
    console.log(`❌ Tests failed with exit code ${code}`);
  }
  process.exit(code);
});

testProcess.on('error', (error) => {
  console.error('❌ Failed to start test process:', error.message);
  process.exit(1);
});

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n🛑 Test run interrupted by user');
  testProcess.kill('SIGINT');
});

// Simple server check
async function checkServer(baseUrl) {
  try {
    const fetch = await import('node-fetch').then(m => m.default);
    const response = await fetch(baseUrl, { timeout: 2000 });
    return response.ok;
  } catch (error) {
    return false;
  }
}