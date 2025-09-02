#!/usr/bin/env node

// Load environment variables
import 'dotenv/config';

import { initializeDatabase, getPool } from '../src/db/db.js';
import logger from '../src/utils/logger.js';

class ArtistExternalIdsCleanupDiagnostic {
  constructor() {
    this.pool = null;
  }

  async initialize() {
    logger.info('🧹 Artist External IDs Cleanup Diagnostic Tool');
    
    initializeDatabase();
    this.pool = getPool();
    
    logger.info('✅ Database connection initialized');
  }

  async diagnose() {
    try {
      await this.initialize();
      
      // 1. Find external_ids where entity_id points to an artist but entity_type is wrong
      logger.info('\n📊 Finding external_ids pointing to artists with wrong entity_type...');
      
      const wrongTypeQuery = `
        SELECT 
          COUNT(*) as total_wrong_type,
          COUNT(CASE WHEN ei.entity_type = 'album' THEN 1 END) as marked_as_album,
          COUNT(CASE WHEN ei.entity_type = 'track' THEN 1 END) as marked_as_track,
          COUNT(CASE WHEN ei.entity_type NOT IN ('artist', 'album', 'track') THEN 1 END) as other_types
        FROM external_ids ei
        JOIN artists a ON ei.entity_id = a.id
        WHERE ei.source = 'spotify' 
          AND ei.entity_type != 'artist'
      `;
      
      const wrongTypeResult = await this.pool.query(wrongTypeQuery);
      const wrongStats = wrongTypeResult.rows[0];
      
      logger.info(`   Total external_ids pointing to artists with wrong entity_type: ${wrongStats.total_wrong_type}`);
      logger.info(`   Marked as 'album': ${wrongStats.marked_as_album}`);
      logger.info(`   Marked as 'track': ${wrongStats.marked_as_track}`);
      logger.info(`   Other types: ${wrongStats.other_types}`);

      // 2. Show sample of wrong entity_type records
      if (parseInt(wrongStats.total_wrong_type) > 0) {
        logger.info('\n📋 Sample external_ids pointing to artists with wrong entity_type:');
        
        const sampleWrongQuery = `
          SELECT ei.id, ei.external_id, ei.entity_type, ei.entity_id, a.name as artist_name
          FROM external_ids ei
          JOIN artists a ON ei.entity_id = a.id
          WHERE ei.source = 'spotify' 
            AND ei.entity_type != 'artist'
          ORDER BY ei.entity_type, ei.id
          LIMIT 15
        `;
        
        const sampleWrongResult = await this.pool.query(sampleWrongQuery);
        
        sampleWrongResult.rows.forEach((row, idx) => {
          logger.info(`   ${idx + 1}. External ID: ${row.id}, Artist: "${row.artist_name}" (ID: ${row.entity_id}), Entity Type: ${row.entity_type}, URI: ${row.external_id}`);
        });
      }

      // 3. Check if these artists also have correct artist external_ids
      logger.info('\n🔍 Checking if artists with wrong entity_type also have correct artist external_ids...');
      
      const duplicateCheckQuery = `
        SELECT 
          COUNT(DISTINCT a.id) as artists_with_wrong_type,
          COUNT(DISTINCT CASE WHEN correct_ei.id IS NOT NULL THEN a.id END) as also_have_correct_type,
          COUNT(DISTINCT CASE WHEN correct_ei.id IS NULL THEN a.id END) as only_have_wrong_type
        FROM artists a
        JOIN external_ids wrong_ei ON a.id = wrong_ei.entity_id AND wrong_ei.entity_type != 'artist' AND wrong_ei.source = 'spotify'
        LEFT JOIN external_ids correct_ei ON a.id = correct_ei.entity_id AND correct_ei.entity_type = 'artist' AND correct_ei.source = 'spotify'
      `;
      
      const duplicateCheckResult = await this.pool.query(duplicateCheckQuery);
      const duplicateStats = duplicateCheckResult.rows[0];
      
      logger.info(`   Artists with wrong entity_type external_ids: ${duplicateStats.artists_with_wrong_type}`);
      logger.info(`   Of those, also have correct artist external_ids: ${duplicateStats.also_have_correct_type}`);
      logger.info(`   Of those, ONLY have wrong entity_type (no correct one): ${duplicateStats.only_have_wrong_type}`);

      // 4. Show artists that have both correct and wrong external_ids (safe to delete wrong ones)
      logger.info('\n🔄 Artists with BOTH correct artist external_ids AND wrong entity_type external_ids (safe to clean):');
      
      const safeToDeleteQuery = `
        SELECT DISTINCT
          a.id as artist_id,
          a.name as artist_name,
          correct_ei.external_id as correct_artist_uri,
          COUNT(wrong_ei.id) as wrong_external_ids_count
        FROM artists a
        JOIN external_ids correct_ei ON a.id = correct_ei.entity_id AND correct_ei.entity_type = 'artist' AND correct_ei.source = 'spotify'
        JOIN external_ids wrong_ei ON a.id = wrong_ei.entity_id AND wrong_ei.entity_type != 'artist' AND wrong_ei.source = 'spotify'
        GROUP BY a.id, a.name, correct_ei.external_id
        ORDER BY wrong_external_ids_count DESC
        LIMIT 10
      `;
      
      const safeToDeleteResult = await this.pool.query(safeToDeleteQuery);
      
      safeToDeleteResult.rows.forEach((row, idx) => {
        logger.info(`   ${idx + 1}. Artist: "${row.artist_name}" (ID: ${row.artist_id}) - Correct URI: ${row.correct_artist_uri} - Wrong external_ids: ${row.wrong_external_ids_count}`);
      });

      // 5. Show detailed wrong external_ids for a specific artist
      if (safeToDeleteResult.rows.length > 0) {
        const sampleArtist = safeToDeleteResult.rows[0];
        logger.info(`\n🔍 Detailed wrong external_ids for artist "${sampleArtist.artist_name}":`)
        
        const detailQuery = `
          SELECT ei.id, ei.external_id, ei.entity_type
          FROM external_ids ei
          WHERE ei.entity_id = $1 AND ei.entity_type != 'artist' AND ei.source = 'spotify'
          ORDER BY ei.entity_type, ei.id
        `;
        
        const detailResult = await this.pool.query(detailQuery, [sampleArtist.artist_id]);
        
        detailResult.rows.forEach((row, idx) => {
          logger.info(`     ${idx + 1}. ID: ${row.id}, Type: ${row.entity_type}, URI: ${row.external_id}`);
        });
      }

      // 6. Artists that ONLY have wrong entity_type (need investigation, not deletion)
      if (parseInt(duplicateStats.only_have_wrong_type) > 0) {
        logger.info('\n⚠️  Artists with ONLY wrong entity_type external_ids (need manual review):');
        
        const needReviewQuery = `
          SELECT DISTINCT
            a.id as artist_id,
            a.name as artist_name,
            wrong_ei.external_id as wrong_uri,
            wrong_ei.entity_type as wrong_type
          FROM artists a
          JOIN external_ids wrong_ei ON a.id = wrong_ei.entity_id AND wrong_ei.entity_type != 'artist' AND wrong_ei.source = 'spotify'
          WHERE NOT EXISTS (
            SELECT 1 FROM external_ids correct_ei 
            WHERE correct_ei.entity_id = a.id AND correct_ei.entity_type = 'artist' AND correct_ei.source = 'spotify'
          )
          ORDER BY a.id
          LIMIT 10
        `;
        
        const needReviewResult = await this.pool.query(needReviewQuery);
        
        needReviewResult.rows.forEach((row, idx) => {
          logger.info(`   ${idx + 1}. Artist: "${row.artist_name}" (ID: ${row.artist_id}) - Only has: ${row.wrong_type} URI: ${row.wrong_uri}`);
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
const diagnostic = new ArtistExternalIdsCleanupDiagnostic();
diagnostic.diagnose().catch(error => {
  logger.error(`Fatal error: ${error.message}`);
  process.exit(1);
});