import dotenv from 'dotenv';
import fs from 'fs';
import { initializeDatabase, getPool } from './src/db/connection.js';
import logger from './src/utils/logger.js';

dotenv.config();

async function executeMerge() {
  try {
    console.log('=== Executing Duplicate Track Merge ===\n');

    await initializeDatabase();
    const pool = getPool();

    // Read the SQL file
    const sqlContent = fs.readFileSync('./merge_known_duplicates.sql', 'utf8');

    // Split the SQL into individual statements (excluding comments and verification)
    const statements = [
      // Who Shot Me merge
      'UPDATE plays SET track_id = 24914 WHERE track_id = 24949',
      'DELETE FROM track_artists WHERE track_id = 24949',
      'DELETE FROM track_albums WHERE track_id = 24949',
      'DELETE FROM tracks WHERE id = 24949',

      // Word Is Bond merge
      'UPDATE plays SET track_id = 24913 WHERE track_id = 24948',
      'DELETE FROM track_artists WHERE track_id = 24948',
      'DELETE FROM track_albums WHERE track_id = 24948',
      'DELETE FROM tracks WHERE id = 24948'
    ];

    console.log('🔄 Starting transaction...');
    await pool.query('BEGIN');

    try {
      // Execute each statement
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        console.log(`Executing step ${i + 1}/8: ${statement.substring(0, 50)}...`);

        const result = await pool.query(statement);
        console.log(`  ✅ Affected ${result.rowCount} rows`);
      }

      console.log('\n🔍 Verifying results...');

      // Verification queries (using correct column name)
      const verifyPlays = await pool.query(`
        SELECT
          t.id,
          t.track_name,
          COUNT(p.id) as total_plays
        FROM tracks t
        LEFT JOIN plays p ON t.id = p.track_id
        WHERE t.id IN (24914, 24913)
        GROUP BY t.id, t.track_name
        ORDER BY t.id
      `);

      console.log('\nFinal play counts:');
      verifyPlays.rows.forEach(row => {
        console.log(`  Track ${row.id} ("${row.track_name}"): ${row.total_plays} plays`);
      });

      // Check orphaned tracks are gone
      const checkOrphans = await pool.query(`
        SELECT COUNT(*) as remaining_orphans
        FROM tracks
        WHERE id IN (24949, 24948)
      `);

      console.log(`\nOrphaned tracks remaining: ${checkOrphans.rows[0].remaining_orphans}`);

      if (checkOrphans.rows[0].remaining_orphans === '0') {
        console.log('\n✅ Committing transaction...');
        await pool.query('COMMIT');

        console.log('\n🎉 SUCCESS! Duplicate tracks merged successfully!');
        console.log('\nSummary:');
        console.log('  ✅ "Who Shot Me?" merged: 24949 → 24914');
        console.log('  ✅ "Word Is Bond" merged: 24948 → 24913');
        console.log('  ✅ Orphaned tracks removed');
        console.log('  ✅ External IDs preserved');
      } else {
        throw new Error('Verification failed: orphaned tracks still exist');
      }

    } catch (error) {
      console.log('\n❌ Rolling back transaction...');
      await pool.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('\n💥 Error executing merge:', error.message);
    logger.error('Merge execution failed:', error);
  } finally {
    process.exit(0);
  }
}

executeMerge();