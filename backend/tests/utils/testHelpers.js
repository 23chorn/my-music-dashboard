import { strict as assert } from 'node:assert';
import { test, describe, before, after, beforeEach, afterEach } from 'node:test';
import fetch from 'node-fetch';

/**
 * Test utilities for music dashboard application
 */

// Test server configuration
export const TEST_CONFIG = {
  baseUrl: process.env.TEST_BASE_URL || 'http://localhost:3001',
  timeout: parseInt(process.env.TEST_TIMEOUT) || 5000,
  // Use test database if configured
  testDatabase: process.env.TEST_DATABASE_URL || null
};

/**
 * HTTP client for API testing
 */
export class TestClient {
  constructor(baseUrl = TEST_CONFIG.baseUrl) {
    this.baseUrl = baseUrl;
    this.timeout = TEST_CONFIG.timeout;
  }

  async get(path, options = {}) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'GET',
      timeout: this.timeout,
      ...options
    });
    
    return {
      status: response.status,
      ok: response.ok,
      headers: response.headers,
      json: async () => await response.json(),
      text: async () => await response.text()
    };
  }

  async post(path, data, options = {}) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: JSON.stringify(data),
      timeout: this.timeout,
      ...options
    });

    return {
      status: response.status,
      ok: response.ok,
      headers: response.headers,
      json: async () => await response.json(),
      text: async () => await response.text()
    };
  }
}

/**
 * Wait for server to be ready
 */
export async function waitForServer(maxAttempts = 10, delay = 1000) {
  const client = new TestClient();
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await client.get('/');
      if (response.ok) {
        console.log('✅ Server is ready');
        return true;
      }
    } catch (error) {
      console.log(`⏳ Attempt ${attempt}/${maxAttempts}: Server not ready, waiting...`);
    }
    
    if (attempt < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error('Server failed to start within timeout period');
}

/**
 * Test database health
 */
export async function testDatabaseHealth() {
  const client = new TestClient();
  
  try {
    const response = await client.get('/api/health/database');
    const health = await response.json();
    
    if (response.status === 200 && health.status === 'healthy') {
      console.log('✅ Database is healthy');
      return health;
    } else {
      throw new Error(`Database unhealthy: ${health.error || 'Unknown error'}`);
    }
  } catch (error) {
    throw new Error(`Database health check failed: ${error.message}`);
  }
}

/**
 * Assert response structure
 */
export function assertValidResponse(response, expectedStatus = 200) {
  assert.equal(response.status, expectedStatus, 
    `Expected status ${expectedStatus}, got ${response.status}`);
  assert.equal(response.ok, expectedStatus < 400, 
    `Response ok should be ${expectedStatus < 400}, got ${response.ok}`);
}

/**
 * Assert API response has required fields
 */
export function assertHasFields(obj, fields, objName = 'object') {
  for (const field of fields) {
    assert.ok(obj.hasOwnProperty(field), 
      `${objName} should have field '${field}'`);
    assert.notEqual(obj[field], undefined, 
      `${objName}.${field} should not be undefined`);
  }
}

/**
 * Assert array of objects has consistent structure
 */
export function assertArrayStructure(arr, requiredFields, arrayName = 'array') {
  assert.ok(Array.isArray(arr), `${arrayName} should be an array`);
  
  if (arr.length > 0) {
    // Check first item has all required fields
    assertHasFields(arr[0], requiredFields, `${arrayName}[0]`);
    
    // Check all items have same keys
    const firstKeys = Object.keys(arr[0]).sort();
    for (let i = 1; i < Math.min(arr.length, 5); i++) { // Check first 5 items
      const currentKeys = Object.keys(arr[i]).sort();
      assert.deepEqual(currentKeys, firstKeys, 
        `${arrayName}[${i}] should have same structure as ${arrayName}[0]`);
    }
  }
}

/**
 * Generate test data
 */
export const TestData = {
  // Mock track data
  mockTrack: {
    id: 1,
    track: 'Test Song',
    artist: 'Test Artist',
    album: 'Test Album',
    playcount: 5
  },

  // Mock artist data  
  mockArtist: {
    artistId: 1,
    artist: 'Test Artist',
    image: null,
    playcount: 10
  },

  // Mock album data
  mockAlbum: {
    albumId: 1,
    album: 'Test Album',
    artist: 'Test Artist',
    image: null,
    playcount: 8
  }
};

/**
 * Test suite helpers
 */
export { test, describe, before, after, beforeEach, afterEach };