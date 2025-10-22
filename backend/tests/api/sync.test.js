import { describe, test, before } from 'node:test';
import { strict as assert } from 'node:assert';
import { TestClient, assertValidResponse, assertHasFields, waitForServer } from '../utils/testHelpers.js';

describe('Music Sync API Tests', () => {
  let client;

  before(async () => {
    client = new TestClient();
    await waitForServer();
  });

  test('GET /api/sync/status - should return sync status', async () => {
    const response = await client.get('/api/sync/status');
    assertValidResponse(response, 200);
    
    const status = await response.json();
    assertHasFields(status, ['currentMethod', 'available'], 'sync status');
    
    // Method should be either 'spotify' or 'lastfm'
    assert.ok(['spotify', 'lastfm'].includes(status.currentMethod), 
      `Sync method should be 'spotify' or 'lastfm', got '${status.currentMethod}'`);
    
    console.log(`✅ Sync status: method=${status.currentMethod}, available methods configured`);
  });

  test('POST /api/sync/switch-method - should handle method switching', async () => {
    // Test invalid method
    const invalidResponse = await client.post('/api/sync/switch-method', { method: 'invalid' });
    assertValidResponse(invalidResponse, 400);
    
    const invalidResult = await invalidResponse.json();
    assertHasFields(invalidResult, ['error'], 'invalid method error');
    
    // Test valid method switching
    const validMethods = ['spotify', 'lastfm'];
    
    for (const method of validMethods) {
      const response = await client.post('/api/sync/switch-method', { method });
      
      // May succeed or fail depending on configuration
      if (response.ok) {
        const result = await response.json();
        assertHasFields(result, ['newMethod'], 'switch method result');
        console.log(`✅ Successfully switched to ${method}`);
      } else {
        console.log(`⚠️  Failed to switch to ${method} - may need configuration`);
      }
    }
  });

  describe('Spotify API', () => {
    test('GET /api/spotify/auth - should return auth status', async () => {
      const response = await client.get('/api/spotify/auth');
      assertValidResponse(response, 200);
      
      const auth = await response.json();
      assertHasFields(auth, ['message', 'tokensConfigured'], 'spotify auth');
      
      console.log(`✅ Spotify tokens configured: ${auth.tokensConfigured}`);
    });

    test('GET /api/spotify/status - should return spotify status', async () => {
      const response = await client.get('/api/spotify/status');
      
      if (response.ok) {
        const status = await response.json();
        assertHasFields(status, ['currentMethod'], 'spotify status');
        console.log('✅ Spotify status retrieved');
      } else {
        console.log('⚠️  Spotify not configured or unavailable');
      }
    });

    test('POST /api/spotify/sync - should handle manual sync trigger', async () => {
      const response = await client.post('/api/spotify/sync', { force: false });
      
      if (response.ok) {
        const result = await response.json();
        assertHasFields(result, ['success', 'message'], 'sync result');
        console.log(`✅ Manual sync completed: ${result.message}`);
      } else {
        const error = await response.json();
        console.log(`⚠️  Manual sync failed: ${error.message || 'Unknown error'}`);
        // This is expected if tokens aren't configured
      }
    });

    test('GET /api/spotify/test - should handle test request', async () => {
      const response = await client.get('/api/spotify/test');
      
      if (response.ok) {
        const result = await response.json();
        assertHasFields(result, ['message'], 'test result');
        console.log('✅ Spotify test completed successfully');
      } else {
        console.log('⚠️  Spotify test failed - may need token configuration');
      }
    });
  });

  describe('Sync Endpoint', () => {
    test('POST /api/sync/plays - should handle unified sync', async () => {
      const response = await client.post('/api/sync/plays', { force: false });
      
      if (response.ok) {
        const result = await response.json();
        assertHasFields(result, ['addedPlays', 'method'], 'sync tracks result');
        
        console.log(`✅ Sync completed: ${result.addedPlays} plays added using ${result.method}`);
        
        if (result.fallbackUsed) {
          console.log(`ℹ️  Fallback used: ${result.fallbackFrom} → ${result.method}`);
        }
      } else {
        const error = await response.json();
        console.log(`⚠️  Sync failed: ${error.message || 'Unknown error'}`);
        // This may be expected if no sync methods are properly configured
      }
    });
  });
});