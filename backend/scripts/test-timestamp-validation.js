#!/usr/bin/env node

import { formatTimestampForDB } from '../src/utils/timezone.js';

console.log('🧪 Testing timestamp validation...\n');

// Test cases
const testCases = [
  // Valid cases
  { input: 1609459200, description: 'Valid Unix timestamp (Jan 1, 2021)', expected: 'success' },
  { input: Date.now() / 1000, description: 'Current timestamp in seconds', expected: 'success' },
  { input: Date.now(), description: 'Current timestamp in milliseconds', expected: 'success' },
  { input: new Date(), description: 'Date object', expected: 'success' },
  { input: '2023-01-01T12:00:00Z', description: 'ISO date string', expected: 'success' },
  
  // Invalid cases that should be rejected
  { input: 0, description: 'Zero timestamp', expected: 'null' },
  { input: -1, description: 'Negative timestamp', expected: 'null' },
  { input: null, description: 'Null input', expected: 'null' },
  { input: undefined, description: 'Undefined input', expected: 'null' },
  { input: 'invalid-date', description: 'Invalid date string', expected: 'null' },
  { input: 123, description: 'Too small timestamp (1970)', expected: 'null' },
  { input: 99999999999999, description: 'Too large timestamp (far future)', expected: 'null' },
  { input: new Date('invalid'), description: 'Invalid Date object', expected: 'null' },
  { input: {}, description: 'Object input', expected: 'null' },
  { input: [], description: 'Array input', expected: 'null' },
];

console.log('Test Results:');
console.log('=============');

let passCount = 0;
let totalCount = testCases.length;

testCases.forEach((testCase, index) => {
  const result = formatTimestampForDB(testCase.input);
  const resultType = result === null ? 'null' : 'success';
  const passed = resultType === testCase.expected;
  
  if (passed) passCount++;
  
  const status = passed ? '✅ PASS' : '❌ FAIL';
  const resultDisplay = result === null ? 'null' : `${result.toISOString()}`;
  
  console.log(`${status} Test ${index + 1}: ${testCase.description}`);
  console.log(`     Input: ${testCase.input}`);
  console.log(`     Expected: ${testCase.expected}, Got: ${resultDisplay}`);
  console.log('');
});

console.log(`Summary: ${passCount}/${totalCount} tests passed`);

if (passCount === totalCount) {
  console.log('🎉 All tests passed! Timestamp validation is working correctly.');
  process.exit(0);
} else {
  console.log('💥 Some tests failed. Please check the validation logic.');
  process.exit(1);
}