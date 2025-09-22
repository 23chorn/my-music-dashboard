import dotenv from 'dotenv';
import { initializeDatabase, getPool } from '../src/db/connection.js';

dotenv.config();

async function simpleMerge() {
  try {
    console.log('=== Simple Duplicate Track Merge ===\n');

    await initializeDatabase();
    const pool = getPool();

    console.log('🔄 Starting merge operations...');

    // Execute all operations in one transaction
    await pool.query('BEGIN');

    try {
      // Who Shot Me merge: 24949 → 24914
      console.log('1. Moving "Who Shot Me?" plays: 24949 → 24914');
      const plays1 = await pool.query('UPDATE plays SET track_id = 24914 WHERE track_id = 24949');
      console.log(`   Moved ${plays1.rowCount} plays`);

      console.log('2. Removing track 24949 relationships and record');
      await pool.query('DELETE FROM track_artists WHERE track_id = 24949');
      await pool.query('DELETE FROM track_albums WHERE track_id = 24949');
      const track1 = await pool.query('DELETE FROM tracks WHERE id = 24949');
      console.log(`   Removed ${track1.rowCount} track record`);

      // Word Is Bond merge: 24948 → 24913
      console.log('3. Moving "Word Is Bond" plays: 24948 → 24913');
      const plays2 = await pool.query('UPDATE plays SET track_id = 24913 WHERE track_id = 24948');
      console.log(`   Moved ${plays2.rowCount} plays`);

      console.log('4. Removing track 24948 relationships and record');
      await pool.query('DELETE FROM track_artists WHERE track_id = 24948');
      await pool.query('DELETE FROM track_albums WHERE track_id = 24948');
      const track2 = await pool.query('DELETE FROM tracks WHERE id = 24948');
      console.log(`   Removed ${track2.rowCount} track record`);

      await pool.query('COMMIT');
      console.log('\n✅ SUCCESS! All operations completed successfully!');

    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    process.exit(0);
  }
}

simpleMerge();