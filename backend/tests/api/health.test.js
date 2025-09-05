import { describe, test, before } from 'node:test';
import { strict as assert } from 'node:assert';
import { TestClient, assertValidResponse, assertHasFields, waitForServer, testDatabaseHealth } from '../utils/testHelpers.js';

describe('Health & Status API Tests', () => {
  let client;

  before(async () => {
    client = new TestClient();
    await waitForServer();
  });

  test('GET / - should return server info', async () => {
    const response = await client.get('/');
    assertValidResponse(response, 200);
    
    const text = await response.text();
    console.log('✅ Server root response received');
    
    // Should contain basic API info
    assert.ok(text.includes('My Music Dashboard API'), 'Response should mention the API name');
    assert.ok(text.includes('/api/'), 'Response should mention API endpoints');
  });

  test('GET /api/health/database - should return database health', async () => {
    const response = await client.get('/api/health/database');
    
    if (response.status === 200) {
      const health = await response.json();
      assertHasFields(health, ['status', 'healthy', 'timestamp'], 'health response');
      
      assert.equal(health.status, 'healthy', 'Database should be healthy');
      assert.equal(health.healthy, true, 'Health flag should be true');
      
      console.log('✅ Database health check passed');
    } else {
      // Database might be unavailable in test environment
      console.log('⚠️  Database health check failed - this may be expected in test environment');
      const error = await response.json();
      assertHasFields(error, ['status', 'error', 'timestamp'], 'error response');
    }
  });

  test('GET /api/unique-counts - should return data counts', async () => {
    const response = await client.get('/api/unique-counts');
    assertValidResponse(response, 200);
    
    const counts = await response.json();
    assertHasFields(counts, ['uniqueArtistCount', 'uniqueAlbumCount', 'uniqueTrackCount', 'playCount'], 'unique counts');
    
    // Should be numbers
    assert.equal(typeof counts.uniqueArtistCount, 'number', 'uniqueArtistCount should be a number');
    assert.equal(typeof counts.uniqueAlbumCount, 'number', 'uniqueAlbumCount should be a number');  
    assert.equal(typeof counts.uniqueTrackCount, 'number', 'uniqueTrackCount should be a number');
    assert.equal(typeof counts.playCount, 'number', 'playCount should be a number');
    
    console.log(`✅ Unique counts: ${counts.uniqueArtistCount} artists, ${counts.uniqueAlbumCount} albums, ${counts.uniqueTrackCount} tracks, ${counts.playCount} plays`);
  });

  test('GET /api/timezone-info - should return timezone information', async () => {
    const response = await client.get('/api/timezone-info');
    assertValidResponse(response, 200);
    
    const timezone = await response.json();
    assertHasFields(timezone, ['timezone', 'offset', 'localTime'], 'timezone info');
    
    console.log('✅ Timezone info retrieved');
  });
});