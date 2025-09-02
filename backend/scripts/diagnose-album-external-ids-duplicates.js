#!/usr/bin/env node

// Load environment variables
import 'dotenv/config';

import { initializeDatabase, getPool } from '../src/db/db.js';
import logger from '../src/utils/logger.js';

class AlbumExternalIdsCleanupDiagnostic {
  constructor() {
    this.pool = null;
  }

  async initialize() {
    logger.info('🧹 Album External IDs Cleanup Diagnostic Tool');
    
    initializeDatabase();
    this.pool = getPool();
    
    logger.info('✅ Database connection initialized');
  }

  async diagnose() {
    try {
      await this.initialize();
      
      // 1. Find external_ids where entity_id points to an album but entity_type is wrong
      logger.info('\n📊 Finding external_ids pointing to albums with wrong entity_type...');
      
      const wrongTypeQuery = `
        SELECT 
          COUNT(*) as total_wrong_type,
          COUNT(CASE WHEN ei.entity_type = 'artist' THEN 1 END) as marked_as_artist,
          COUNT(CASE WHEN ei.entity_type = 'track' THEN 1 END) as marked_as_track,
          COUNT(CASE WHEN ei.entity_type NOT IN ('album', 'artist', 'track') THEN 1 END) as other_types
        FROM external_ids ei
        JOIN albums a ON ei.entity_id = a.id
        WHERE ei.source = 'spotify' 
          AND ei.entity_type != 'album'
      `;
      
      const wrongTypeResult = await this.pool.query(wrongTypeQuery);
      const wrongStats = wrongTypeResult.rows[0];
      
      logger.info(`   Total external_ids pointing to albums with wrong entity_type: ${wrongStats.total_wrong_type}`);
      logger.info(`   Marked as 'artist': ${wrongStats.marked_as_artist}`);
      logger.info(`   Marked as 'track': ${wrongStats.marked_as_track}`);
      logger.info(`   Other types: ${wrongStats.other_types}`);

      // 2. Show sample of wrong entity_type records
      if (parseInt(wrongStats.total_wrong_type) > 0) {
        logger.info('\n📋 Sample external_ids pointing to albums with wrong entity_type:');
        
        const sampleWrongQuery = `
          SELECT ei.id, ei.external_id, ei.entity_type, ei.entity_id, a.name as album_name
          FROM external_ids ei
          JOIN albums a ON ei.entity_id = a.id
          WHERE ei.source = 'spotify' 
            AND ei.entity_type != 'album'
          ORDER BY ei.entity_type, ei.id
          LIMIT 15
        `;
        
        const sampleWrongResult = await this.pool.query(sampleWrongQuery);
        
        sampleWrongResult.rows.forEach((row, idx) => {
          logger.info(`   ${idx + 1}. External ID: ${row.id}, Album: "${row.album_name}" (ID: ${row.entity_id}), Entity Type: ${row.entity_type}, URI: ${row.external_id}`);
        });
      }

      // 3. Check if these albums also have correct album external_ids
      logger.info('\n🔍 Checking if albums with wrong entity_type also have correct album external_ids...');
      
      const duplicateCheckQuery = `
        SELECT 
          COUNT(DISTINCT a.id) as albums_with_wrong_type,
          COUNT(DISTINCT CASE WHEN correct_ei.id IS NOT NULL THEN a.id END) as also_have_correct_type,
          COUNT(DISTINCT CASE WHEN correct_ei.id IS NULL THEN a.id END) as only_have_wrong_type
        FROM albums a
        JOIN external_ids wrong_ei ON a.id = wrong_ei.entity_id AND wrong_ei.entity_type != 'album' AND wrong_ei.source = 'spotify'
        LEFT JOIN external_ids correct_ei ON a.id = correct_ei.entity_id AND correct_ei.entity_type = 'album' AND correct_ei.source = 'spotify'
      `;
      
      const duplicateCheckResult = await this.pool.query(duplicateCheckQuery);
      const duplicateStats = duplicateCheckResult.rows[0];
      
      logger.info(`   Albums with wrong entity_type external_ids: ${duplicateStats.albums_with_wrong_type}`);
      logger.info(`   Of those, also have correct album external_ids: ${duplicateStats.also_have_correct_type}`);
      logger.info(`   Of those, ONLY have wrong entity_type (no correct one): ${duplicateStats.only_have_wrong_type}`);

      // 4. Show albums that have both correct and wrong external_ids (safe to delete wrong ones)
      if (parseInt(duplicateStats.also_have_correct_type) > 0) {
        logger.info('\n🔄 Albums with BOTH correct album external_ids AND wrong entity_type external_ids (safe to clean):');
        
        const safeToDeleteQuery = `
          SELECT DISTINCT
            a.id as album_id,
            a.name as album_name,
            correct_ei.external_id as correct_album_uri,
            COUNT(wrong_ei.id) as wrong_external_ids_count
          FROM albums a
          JOIN external_ids correct_ei ON a.id = correct_ei.entity_id AND correct_ei.entity_type = 'album' AND correct_ei.source = 'spotify'
          JOIN external_ids wrong_ei ON a.id = wrong_ei.entity_id AND wrong_ei.entity_type != 'album' AND wrong_ei.source = 'spotify'
          GROUP BY a.id, a.name, correct_ei.external_id
          ORDER BY wrong_external_ids_count DESC
          LIMIT 10
        `;
        
        const safeToDeleteResult = await this.pool.query(safeToDeleteQuery);
        
        safeToDeleteResult.rows.forEach((row, idx) => {
          logger.info(`   ${idx + 1}. Album: "${row.album_name}" (ID: ${row.album_id}) - Correct URI: ${row.correct_album_uri} - Wrong external_ids: ${row.wrong_external_ids_count}`);
        });

        // 5. Show detailed wrong external_ids for a specific album
        if (safeToDeleteResult.rows.length > 0) {
          const sampleAlbum = safeToDeleteResult.rows[0];
          logger.info(`\n🔍 Detailed wrong external_ids for album "${sampleAlbum.album_name}":`)
          
          const detailQuery = `
            SELECT ei.id, ei.external_id, ei.entity_type
            FROM external_ids ei
            WHERE ei.entity_id = $1 AND ei.entity_type != 'album' AND ei.source = 'spotify'
            ORDER BY ei.entity_type, ei.id
          `;
          
          const detailResult = await this.pool.query(detailQuery, [sampleAlbum.album_id]);
          
          detailResult.rows.forEach((row, idx) => {
            logger.info(`     ${idx + 1}. ID: ${row.id}, Type: ${row.entity_type}, URI: ${row.external_id}`);
          });
        }
      }

      // 6. Albums that ONLY have wrong entity_type (need investigation, not deletion)
      if (parseInt(duplicateStats.only_have_wrong_type) > 0) {
        logger.info('\n⚠️  Albums with ONLY wrong entity_type external_ids (need manual review):');
        
        const needReviewQuery = `
          SELECT DISTINCT
            a.id as album_id,
            a.name as album_name,
            wrong_ei.external_id as wrong_uri,
            wrong_ei.entity_type as wrong_type
          FROM albums a
          JOIN external_ids wrong_ei ON a.id = wrong_ei.entity_id AND wrong_ei.entity_type != 'album' AND wrong_ei.source = 'spotify'
          WHERE NOT EXISTS (
            SELECT 1 FROM external_ids correct_ei 
            WHERE correct_ei.entity_id = a.id AND correct_ei.entity_type = 'album' AND correct_ei.source = 'spotify'
          )
          ORDER BY a.id
          LIMIT 10
        `;
        
        const needReviewResult = await this.pool.query(needReviewQuery);
        
        needReviewResult.rows.forEach((row, idx) => {
          logger.info(`   ${idx + 1}. Album: "${row.album_name}" (ID: ${row.album_id}) - Only has: ${row.wrong_type} URI: ${row.wrong_uri}`);
        });
      }

      // 7. Check for external_ids with album URIs but pointing to non-album entities
      logger.info('\n🔍 Checking for album URIs pointing to wrong entity types...');
      
      const albumUriWrongEntityQuery = `
        SELECT 
          COUNT(*) as total_album_uris_wrong_entity,
          COUNT(CASE WHEN ei.entity_type = 'artist' THEN 1 END) as pointing_to_artists,
          COUNT(CASE WHEN ei.entity_type = 'track' THEN 1 END) as pointing_to_tracks
        FROM external_ids ei
        WHERE ei.source = 'spotify' 
          AND ei.external_id LIKE 'spotify:album:%'
          AND ei.entity_type != 'album'
      `;
      
      const albumUriWrongResult = await this.pool.query(albumUriWrongEntityQuery);
      const albumUriStats = albumUriWrongResult.rows[0];
      
      logger.info(`   Album URIs (spotify:album:*) with wrong entity_type: ${albumUriStats.total_album_uris_wrong_entity}`);
      logger.info(`   Album URIs pointing to artists: ${albumUriStats.pointing_to_artists}`);
      logger.info(`   Album URIs pointing to tracks: ${albumUriStats.pointing_to_tracks}`);

      // 8. Sample album URIs with wrong entity types
      if (parseInt(albumUriStats.total_album_uris_wrong_entity) > 0) {
        logger.info('\n📋 Sample album URIs with wrong entity_type:');
        
        const albumUriSampleQuery = `
          SELECT ei.id, ei.external_id, ei.entity_type, ei.entity_id
          FROM external_ids ei
          WHERE ei.source = 'spotify' 
            AND ei.external_id LIKE 'spotify:album:%'
            AND ei.entity_type != 'album'
          LIMIT 10
        `;
        
        const albumUriSampleResult = await this.pool.query(albumUriSampleQuery);
        
        albumUriSampleResult.rows.forEach((row, idx) => {
          logger.info(`   ${idx + 1}. ID: ${row.id}, Album URI: ${row.external_id}, Entity Type: ${row.entity_type}, Entity ID: ${row.entity_id}`);
        });
      }

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
const diagnostic = new AlbumExternalIdsCleanupDiagnostic();
diagnostic.diagnose().catch(error => {
  logger.error(`Fatal error: ${error.message}`);
  process.exit(1);
});