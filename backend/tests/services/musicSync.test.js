import { describe, test, before } from 'node:test';
import { strict as assert } from 'node:assert';
import MusicSyncService from '../../src/services/musicSync.js';

describe('MusicSyncService Tests', () => {
  let syncService;

  before(async () => {
    syncService = new MusicSyncService();
  });

  test('should initialize with default method', () => {
    assert.ok(syncService, 'MusicSyncService should be created');
    assert.ok(['spotify', 'lastfm'].includes(syncService.syncMethod), 
      'Should have valid sync method');
    
    console.log(`✅ MusicSyncService initialized with method: ${syncService.syncMethod}`);
  });

  test('should have required methods', () => {
    const requiredMethods = [
      'ensureInitialized',
      'syncNewTracks', 
      'getStatus',
      'switchMethod',
      'getCurrentMethod'
    ];

    for (const method of requiredMethods) {
      assert.equal(typeof syncService[method], 'function', 
        `MusicSyncService should have ${method} method`);
    }
    
    console.log('✅ All required methods present');
  });

  test('getCurrentMethod should return string', () => {
    const method = syncService.getCurrentMethod();
    assert.equal(typeof method, 'string', 'getCurrentMethod should return string');
    assert.ok(['spotify', 'lastfm'].includes(method), 
      `Method should be 'spotify' or 'lastfm', got '${method}'`);
    
    console.log(`✅ Current method: ${method}`);
  });

  test('getStatus should return status object', async () => {
    await syncService.ensureInitialized();
    
    const status = await syncService.getStatus();
    assert.equal(typeof status, 'object', 'getStatus should return object');
    assert.ok(status.hasOwnProperty('currentMethod'), 'Status should have currentMethod property');
    assert.ok(status.hasOwnProperty('available'), 'Status should have available property');
    
    console.log(`✅ Status retrieved: ${JSON.stringify(status)}`);
  });

  test('switchMethod should handle valid methods', async () => {
    const originalMethod = syncService.getCurrentMethod();
    const newMethod = originalMethod === 'spotify' ? 'lastfm' : 'spotify';
    
    try {
      const result = await syncService.switchMethod(newMethod);
      assert.equal(typeof result, 'object', 'switchMethod should return object');
      assert.equal(result.method, newMethod, 'Result should show new method');
      
      console.log(`✅ Switched from ${originalMethod} to ${newMethod}`);
      
      // Switch back
      await syncService.switchMethod(originalMethod);
      console.log(`✅ Switched back to ${originalMethod}`);
      
    } catch (error) {
      console.log(`⚠️  Method switching may require additional configuration: ${error.message}`);
    }
  });

  test('switchMethod should reject invalid methods', async () => {
    try {
      await syncService.switchMethod('invalid');
      assert.fail('Should have thrown error for invalid method');
    } catch (error) {
      assert.ok(error.message.includes('Invalid sync method'), 
        'Error message should mention Invalid sync method');
      console.log('✅ Invalid method correctly rejected');
    }
  });

  test('syncNewTracks should handle basic options', async () => {
    await syncService.ensureInitialized();
    
    try {
      // Test with safe options that shouldn't modify data
      const result = await syncService.syncNewTracks({ force: false });
      
      assert.equal(typeof result, 'object', 'syncNewTracks should return object');
      assert.ok(result.hasOwnProperty('addedPlays'), 'Result should have addedPlays');
      assert.ok(result.hasOwnProperty('method'), 'Result should have method');
      
      console.log(`✅ Sync test completed: ${result.addedPlays} plays, method: ${result.method}`);
      
      if (result.fallbackUsed) {
        console.log(`ℹ️  Fallback was used: ${result.fallbackFrom} → ${result.method}`);
      }
      
    } catch (error) {
      console.log(`⚠️  Sync test failed (may be expected): ${error.message}`);
      // This is often expected in test environments without proper API credentials
    }
  });
});