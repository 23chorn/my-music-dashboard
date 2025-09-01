#!/usr/bin/env node

import dotenv from 'dotenv';
import pkg from 'pg';
const { Pool } = pkg;
import logger from '../src/utils/logger.js';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function cleanupDuplicateAlbums() {
  try {
    logger.info('🧹 Starting duplicate album cleanup...');
    
    // Find albums with the same normalized name
    const duplicateAlbums = await pool.query(`
      WITH normalized_albums AS (
        SELECT 
          id,
          name,
          LOWER(TRIM(REGEXP_REPLACE(name, '\\s+', ' ', 'g'))) as normalized_name,
          ROW_NUMBER() OVER (
            PARTITION BY LOWER(TRIM(REGEXP_REPLACE(name, '\\s+', ' ', 'g'))) 
            ORDER BY 
              CASE WHEN name = UPPER(name) THEN 2 ELSE 1 END, -- Prefer non-ALL-CAPS
              LENGTH(name), -- Then prefer shorter names
              id -- Finally by ID for consistency
          ) as rn
        FROM albums
      ),
      duplicates AS (
        SELECT 
          normalized_name,
          COUNT(*) as duplicate_count,
          MIN(id) as keep_id,
          ARRAY_AGG(id ORDER BY rn) as all_ids
        FROM normalized_albums
        WHERE normalized_name IN (
          SELECT normalized_name 
          FROM normalized_albums 
          GROUP BY normalized_name 
          HAVING COUNT(*) > 1
        )
        GROUP BY normalized_name
      )
      SELECT * FROM duplicates
    `);

    if (duplicateAlbums.rows.length === 0) {
      logger.info('✅ No duplicate albums found');
      return;
    }

    logger.info(`Found ${duplicateAlbums.rows.length} sets of duplicate albums`);

    await pool.query('BEGIN');

    try {
      for (const duplicate of duplicateAlbums.rows) {
        const keepId = duplicate.keep_id;
        const allIds = duplicate.all_ids;
        const removeIds = allIds.filter(id => id !== keepId);

        logger.info(`Processing "${duplicate.normalized_name}": keeping ${keepId}, removing [${removeIds.join(', ')}]`);

        if (removeIds.length > 0) {
          // Simple approach: delete all relationships for duplicate albums
          // and let foreign key constraints handle the cleanup properly
          
          // Delete track-album relationships
          const deleteTrackAlbums = await pool.query(`
            DELETE FROM track_albums WHERE album_id = ANY($1)
          `, [removeIds]);
          logger.info(`  Deleted ${deleteTrackAlbums.rowCount} track-album relationships`);

          // Delete album-artist relationships
          const deleteAlbumArtists = await pool.query(`
            DELETE FROM album_artists WHERE album_id = ANY($1)
          `, [removeIds]);
          logger.info(`  Deleted ${deleteAlbumArtists.rowCount} album-artist relationships`);

          // Delete external IDs
          const deleteExternalIds = await pool.query(`
            DELETE FROM external_ids 
            WHERE entity_type = 'album' AND entity_id = ANY($1)
          `, [removeIds]);
          logger.info(`  Deleted ${deleteExternalIds.rowCount} external IDs`);

          // Delete the duplicate albums
          const deleteAlbums = await pool.query(`
            DELETE FROM albums WHERE id = ANY($1)
          `, [removeIds]);
          logger.info(`  Deleted ${deleteAlbums.rowCount} duplicate albums`);
        }
      }

      await pool.query('COMMIT');
      logger.info('✅ Duplicate album cleanup completed successfully');

    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    logger.error(`❌ Error during cleanup: ${error.message}`);
    throw error;
  } finally {
    await pool.end();
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  cleanupDuplicateAlbums()
    .then(() => {
      console.log('🎉 Cleanup completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Cleanup failed:', error.message);
      process.exit(1);
    });
}

export default cleanupDuplicateAlbums;