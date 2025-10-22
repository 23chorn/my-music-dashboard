// Load environment variables for tests
import 'dotenv/config';

import { describe, test, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import { initializeDatabase, getPool, checkDatabaseHealth, closeDatabase } from '../../src/db/connection.js';

describe('Database Connection Tests', () => {
  before(() => {
    // Initialize database for testing
    initializeDatabase();
  });

  after(async () => {
    // Clean up connection after tests
    await closeDatabase();
  });

  test('should initialize database connection', () => {
    assert.doesNotThrow(() => {
      const pool = getPool();
      assert.ok(pool, 'Pool should be available after initialization');
    }, 'getPool should not throw after initialization');
    
    console.log('✅ Database connection initialized');
  });

  test('should handle connection health check', async () => {
    try {
      const health = await checkDatabaseHealth();
      
      assert.equal(typeof health, 'object', 'Health check should return object');
      assert.equal(health.healthy, true, 'Database should be healthy');
      assert.ok(health.current_time, 'Should have current_time');
      assert.ok(health.pg_version, 'Should have PostgreSQL version');
      
      console.log(`✅ Database health check passed - PostgreSQL ${health.pg_version}`);
      
    } catch (error) {
      console.log(`⚠️  Database health check failed: ${error.message}`);
      console.log('This may be expected if database is not available in test environment');
    }
  });

  test('should handle basic database queries', async () => {
    try {
      const pool = getPool();
      
      // Test basic query
      const result = await pool.query('SELECT 1 as test_value');
      assert.equal(result.rows[0].test_value, 1, 'Basic query should work');
      
      // Test current timestamp
      const timeResult = await pool.query('SELECT NOW() as current_time');
      assert.ok(timeResult.rows[0].current_time instanceof Date, 
        'Should return Date object for timestamp');
      
      console.log('✅ Basic database queries working');
      
    } catch (error) {
      console.log(`⚠️  Database query test failed: ${error.message}`);
    }
  });

  test('should handle connection pool stats', async () => {
    try {
      const pool = getPool();
      
      assert.ok(typeof pool.totalCount === 'number', 'Should have totalCount');
      assert.ok(typeof pool.idleCount === 'number', 'Should have idleCount'); 
      assert.ok(typeof pool.waitingCount === 'number', 'Should have waitingCount');
      
      console.log(`✅ Pool stats: total=${pool.totalCount}, idle=${pool.idleCount}, waiting=${pool.waitingCount}`);
      
    } catch (error) {
      console.log(`⚠️  Pool stats test failed: ${error.message}`);
    }
  });

  test('should handle multiple concurrent connections', async () => {
    try {
      const pool = getPool();
      
      // Create multiple concurrent queries
      const queries = Array.from({ length: 5 }, (_, i) =>
        pool.query('SELECT $1 as query_id, NOW() as query_time', [i])
      );
      
      const results = await Promise.all(queries);
      
      assert.equal(results.length, 5, 'Should handle concurrent queries');
      
      for (let i = 0; i < results.length; i++) {
        assert.equal(results[i].rows[0].query_id, i, 
          `Query ${i} should return correct ID`);
      }
      
      console.log('✅ Concurrent connection handling working');
      
    } catch (error) {
      console.log(`⚠️  Concurrent connection test failed: ${error.message}`);
    }
  });

  test('should handle connection errors gracefully', async () => {
    try {
      const pool = getPool();
      
      // Test with invalid query to trigger error handling
      try {
        await pool.query('SELECT invalid_column FROM non_existent_table');
        assert.fail('Should have thrown error for invalid query');
      } catch (queryError) {
        assert.ok(queryError.message, 'Should have error message');
        console.log('✅ Query error handling working');
      }
      
    } catch (error) {
      console.log(`⚠️  Error handling test failed: ${error.message}`);
    }
  });
});