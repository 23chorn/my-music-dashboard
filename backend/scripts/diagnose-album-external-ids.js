#!/usr/bin/env node

// Load environment variables
import 'dotenv/config';

import { initializeDatabase, getPool } from '../src/db/db.js';
import logger from '../src/utils/logger.js';

class AlbumExternalIdsDiagnostic {
  constructor() {
    this.pool = null;
  }

  async initialize() {
    logger.info('🔍 Album External IDs Diagnostic Tool');
    
    initializeDatabase();
    this.pool = getPool();
    
    logger.info('✅ Database connection initialized');
  }

  async diagnose() {
    try {
      await this.initialize();
      
      // 1. Check album-external_ids linkage
      logger.info('\n📊 Checking album-external_ids linkage...');
      
      const linkageQuery = `
        SELECT 
          (SELECT COUNT(*) FROM albums) as total_albums,
          (SELECT COUNT(DISTINCT entity_id) FROM external_ids WHERE entity_type = 'album' AND source = 'spotify') as albums_with_correct_external_ids,
          (SELECT COUNT(*) FROM albums a WHERE NOT EXISTS (SELECT 1 FROM external_ids ei WHERE ei.entity_id = a.id AND ei.entity_type = 'album' AND ei.source = 'spotify')) as albums_without_external_ids
      `;
      
      const linkageResult = await this.pool.query(linkageQuery);
      const linkageStats = linkageResult.rows[0];
      
      logger.info(`   Total albums: ${linkageStats.total_albums}`);
      logger.info(`   Albums with correct external_ids: ${linkageStats.albums_with_correct_external_ids}`);
      logger.info(`   Albums WITHOUT external_ids: ${linkageStats.albums_without_external_ids}`);

      // 2. Check for external_ids pointing to albums but with wrong entity_type
      logger.info('\n🔍 Checking for albums with incorrect entity_type in external_ids...');
      
      const incorrectTypeQuery = `
        SELECT 
          COUNT(*) as total_incorrect,
          COUNT(CASE WHEN ei.entity_type = 'artist' THEN 1 END) as marked_as_artist,
          COUNT(CASE WHEN ei.entity_type = 'track' THEN 1 END) as marked_as_track,
          COUNT(CASE WHEN ei.entity_type NOT IN ('album', 'artist', 'track') THEN 1 END) as other_types
        FROM external_ids ei
        JOIN albums a ON ei.entity_id = a.id
        WHERE ei.source = 'spotify' 
          AND ei.external_id LIKE 'spotify:album:%'
          AND ei.entity_type != 'album'
      `;
      
      const incorrectResult = await this.pool.query(incorrectTypeQuery);
      const incorrectStats = incorrectResult.rows[0];
      
      logger.info(`   Albums with incorrect entity_type: ${incorrectStats.total_incorrect}`);
      logger.info(`   Marked as 'artist': ${incorrectStats.marked_as_artist}`);
      logger.info(`   Marked as 'track': ${incorrectStats.marked_as_track}`);
      logger.info(`   Other types: ${incorrectStats.other_types}`);

      // 3. Show sample albums with incorrect entity_type
      if (parseInt(incorrectStats.total_incorrect) > 0) {
        logger.info('\n📋 Sample albums with incorrect entity_type:');
        
        const sampleIncorrectQuery = `
          SELECT a.id, a.name, ei.entity_type, ei.external_id
          FROM albums a
          JOIN external_ids ei ON a.id = ei.entity_id
          WHERE ei.source = 'spotify' 
            AND ei.external_id LIKE 'spotify:album:%'
            AND ei.entity_type != 'album'
          LIMIT 10
        `;
        
        const sampleIncorrectResult = await this.pool.query(sampleIncorrectQuery);
        
        sampleIncorrectResult.rows.forEach((row, idx) => {
          logger.info(`   ${idx + 1}. ID: ${row.id}, Name: "${row.name}", Entity Type: ${row.entity_type}, URI: ${row.external_id}`);
        });
      }

      // 4. Check albums without external_ids
      if (parseInt(linkageStats.albums_without_external_ids) > 0) {
        logger.info('\n📋 Sample albums without external_ids:');
        
        const unlinkedQuery = `
          SELECT a.id, a.name, a.last_fetched
          FROM albums a 
          WHERE NOT EXISTS (
            SELECT 1 FROM external_ids ei 
            WHERE ei.entity_id = a.id 
              AND ei.entity_type = 'album' 
              AND ei.source = 'spotify'
          )
          ORDER BY a.id
          LIMIT 15
        `;
        
        const unlinkedResult = await this.pool.query(unlinkedQuery);
        
        unlinkedResult.rows.forEach((row, idx) => {
          logger.info(`   ${idx + 1}. ID: ${row.id}, Name: "${row.name}", Last Fetched: ${row.last_fetched || 'NULL'}`);
        });
      }

      // 5. Check albums with old last_fetched
      logger.info('\n📅 Checking albums with old last_fetched...');
      
      const oldFetchedQuery = `
        SELECT 
          COUNT(*) as total_old_fetched,
          COUNT(CASE WHEN last_fetched IS NULL THEN 1 END) as never_fetched,
          COUNT(CASE WHEN last_fetched < '2025-09-02'::date THEN 1 END) as old_fetched_total
        FROM albums
        WHERE last_fetched IS NULL OR last_fetched < '2025-09-02'::date
      `;
      
      const oldFetchedResult = await this.pool.query(oldFetchedQuery);
      const oldStats = oldFetchedResult.rows[0];
      
      logger.info(`   Albums with old last_fetched: ${oldStats.total_old_fetched}`);
      logger.info(`   Never fetched: ${oldStats.never_fetched}`);
      logger.info(`   Old fetched (< 2025-09-02): ${oldStats.old_fetched_total}`);

      // 6. Check external_ids that might be orphaned
      logger.info('\n🔗 Checking album external_ids integrity...');
      
      const orphanedQuery = `
        SELECT 
          COUNT(*) as total_spotify_album_externals,
          COUNT(CASE WHEN NOT EXISTS (SELECT 1 FROM albums a WHERE a.id = ei.entity_id) THEN 1 END) as orphaned_externals
        FROM external_ids ei
        WHERE ei.source = 'spotify' AND ei.external_id LIKE 'spotify:album:%'
      `;
      
      const orphanedResult = await this.pool.query(orphanedQuery);
      const orphanedStats = orphanedResult.rows[0];
      
      logger.info(`   Total Spotify album external_ids: ${orphanedStats.total_spotify_album_externals}`);
      logger.info(`   Orphaned external_ids (no matching album): ${orphanedStats.orphaned_externals}`);

    } catch (error) {
      logger.error(`💥 Diagnostic failed: ${error.message}`);
      throw error;
    } finally {
      if (this.pool) {
        await this.pool.end();
      }
    }
  }
}

// Run the diagnostic
const diagnostic = new AlbumExternalIdsDiagnostic();
diagnostic.diagnose().catch(error => {
  logger.error(`Fatal error: ${error.message}`);
  process.exit(1);
});