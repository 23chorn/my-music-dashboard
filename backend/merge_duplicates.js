import dotenv from 'dotenv';
dotenv.config();

import { initializeDatabase, getPool } from './src/db/connection.js';
import logger from './src/utils/logger.js';

async function mergeDuplicateTracks(keepTrackId, removeTrackId) {
  const pool = getPool();

  try {
    // Start transaction
    await pool.query('BEGIN');

    // Get track info for logging
    const keepTrack = await pool.query('SELECT title FROM tracks WHERE id = $1', [keepTrackId]);
    const removeTrack = await pool.query('SELECT title FROM tracks WHERE id = $1', [removeTrackId]);

    if (keepTrack.rows.length === 0 || removeTrack.rows.length === 0) {
      throw new Error('One or both tracks not found');
    }

    console.log(`Merging "${removeTrack.rows[0].title}" (ID: ${removeTrackId}) into "${keepTrack.rows[0].title}" (ID: ${keepTrackId})`);

    // 1. Move all plays from removeTrackId to keepTrackId
    const playsResult = await pool.query(
      'UPDATE plays SET track_id = $1 WHERE track_id = $2',
      [keepTrackId, removeTrackId]
    );
    console.log(`Moved ${playsResult.rowCount} plays from track ${removeTrackId} to ${keepTrackId}`);

    // 2. Remove external_ids for the track we're removing
    const externalIdsResult = await pool.query(
      'DELETE FROM external_ids WHERE entity_id = $1 AND entity_type = $2',
      [removeTrackId, 'track']
    );
    console.log(`Removed ${externalIdsResult.rowCount} external IDs for track ${removeTrackId}`);

    // 3. Remove track_artists relationships for the track we're removing
    const trackArtistsResult = await pool.query(
      'DELETE FROM track_artists WHERE track_id = $1',
      [removeTrackId]
    );
    console.log(`Removed ${trackArtistsResult.rowCount} track_artists relationships for track ${removeTrackId}`);

    // 4. Remove track_albums relationships for the track we're removing
    const trackAlbumsResult = await pool.query(
      'DELETE FROM track_albums WHERE track_id = $1',
      [removeTrackId]
    );
    console.log(`Removed ${trackAlbumsResult.rowCount} track_albums relationships for track ${removeTrackId}`);

    // 5. Finally, remove the duplicate track
    const tracksResult = await pool.query(
      'DELETE FROM tracks WHERE id = $1',
      [removeTrackId]
    );
    console.log(`Removed ${tracksResult.rowCount} track record for track ${removeTrackId}`);

    // Commit transaction
    await pool.query('COMMIT');

    console.log(`✅ Successfully merged track ${removeTrackId} into ${keepTrackId}`);

    // Verify the merge
    const finalPlayCount = await pool.query(
      'SELECT COUNT(*) as play_count FROM plays WHERE track_id = $1',
      [keepTrackId]
    );
    console.log(`Track ${keepTrackId} now has ${finalPlayCount.rows[0].play_count} total plays`);

  } catch (error) {
    // Rollback on error
    await pool.query('ROLLBACK');
    console.error('Error merging tracks:', error.message);
    throw error;
  }
}

async function mergeDuplicates() {
  try {
    await initializeDatabase();

    // Merge "Who Shot Me?" tracks
    console.log('=== Merging "Who Shot Me?" duplicates ===\n');
    await mergeDuplicateTracks(24914, 24949); // Keep 24914 (73 plays), remove 24949 (7 plays)

    console.log('\n✅ All duplicates merged successfully!');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit(0);
  }
}

mergeDuplicates();