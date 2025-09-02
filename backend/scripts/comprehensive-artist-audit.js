#!/usr/bin/env node

// Load environment variables
import 'dotenv/config';

import { initializeDatabase, getPool } from '../src/db/db.js';
import logger from '../src/utils/logger.js';

class ComprehensiveArtistAudit {
  constructor() {
    this.pool = null;
  }

  async initialize() {
    logger.info('🔍 Comprehensive Artist Audit Tool');
    
    initializeDatabase();
    this.pool = getPool();
    
    logger.info('✅ Database connection initialized');
  }

  async audit() {
    try {
      await this.initialize();
      
      // 1. Check all artists vs external_ids linkage
      logger.info('\n📊 Checking artist-external_ids linkage...');
      
      const linkageQuery = `
        SELECT 
          (SELECT COUNT(*) FROM artists) as total_artists,
          (SELECT COUNT(DISTINCT entity_id) FROM external_ids WHERE entity_type = 'artist' AND source = 'spotify') as artists_with_external_ids,
          (SELECT COUNT(*) FROM artists a WHERE NOT EXISTS (SELECT 1 FROM external_ids ei WHERE ei.entity_id = a.id AND ei.entity_type = 'artist' AND ei.source = 'spotify')) as artists_without_external_ids
      `;
      
      const linkageResult = await this.pool.query(linkageQuery);
      const linkageStats = linkageResult.rows[0];
      
      logger.info(`   Total artists: ${linkageStats.total_artists}`);
      logger.info(`   Artists with external_ids: ${linkageStats.artists_with_external_ids}`);
      logger.info(`   Artists WITHOUT external_ids: ${linkageStats.artists_without_external_ids}`);
      
      // 2. Show artists without external_ids
      if (parseInt(linkageStats.artists_without_external_ids) > 0) {
        logger.info('\n📋 Artists without external_ids:');
        
        const unlinkedQuery = `
          SELECT a.id, a.name, a.last_fetched
          FROM artists a 
          WHERE NOT EXISTS (
            SELECT 1 FROM external_ids ei 
            WHERE ei.entity_id = a.id 
              AND ei.entity_type = 'artist' 
              AND ei.source = 'spotify'
          )
          ORDER BY a.id
          LIMIT 20
        `;
        
        const unlinkedResult = await this.pool.query(unlinkedQuery);
        
        unlinkedResult.rows.forEach((row, idx) => {
          logger.info(`   ${idx + 1}. ID: ${row.id}, Name: "${row.name}", Last Fetched: ${row.last_fetched || 'NULL'}`);
        });
      }

      // 3. Check for artists with old last_fetched (regardless of external_ids)
      logger.info('\n📅 Checking all artists with old last_fetched...');
      
      const oldFetchedQuery = `
        SELECT 
          COUNT(*) as total_old_fetched,
          COUNT(CASE WHEN last_fetched IS NULL THEN 1 END) as never_fetched,
          COUNT(CASE WHEN last_fetched < '2025-09-02'::date THEN 1 END) as old_fetched_total
        FROM artists
        WHERE last_fetched IS NULL OR last_fetched < '2025-09-02'::date
      `;
      
      const oldFetchedResult = await this.pool.query(oldFetchedQuery);
      const oldStats = oldFetchedResult.rows[0];
      
      logger.info(`   Artists with old last_fetched: ${oldStats.total_old_fetched}`);
      logger.info(`   Never fetched: ${oldStats.never_fetched}`);
      logger.info(`   Old fetched (< 2025-09-02): ${oldStats.old_fetched_total}`);

      // 4. Show sample of artists with old last_fetched
      if (parseInt(oldStats.total_old_fetched) > 0) {
        logger.info('\n📋 Sample artists with old last_fetched:');
        
        const sampleOldQuery = `
          SELECT a.id, a.name, a.last_fetched,
            CASE WHEN EXISTS (
              SELECT 1 FROM external_ids ei 
              WHERE ei.entity_id = a.id 
                AND ei.entity_type = 'artist' 
                AND ei.source = 'spotify'
            ) THEN 'YES' ELSE 'NO' END as has_external_id
          FROM artists a
          WHERE last_fetched IS NULL OR last_fetched < '2025-09-02'::date
          ORDER BY a.last_fetched NULLS FIRST
          LIMIT 15
        `;
        
        const sampleResult = await this.pool.query(sampleOldQuery);
        
        sampleResult.rows.forEach((row, idx) => {
          logger.info(`   ${idx + 1}. ID: ${row.id}, Name: "${row.name}", Last Fetched: ${row.last_fetched || 'NULL'}, Has External ID: ${row.has_external_id}`);
        });
      }

      // 5. Check external_ids that might be orphaned or have wrong entity_id
      logger.info('\n🔗 Checking external_ids integrity...');
      
      const orphanedQuery = `
        SELECT 
          COUNT(*) as total_spotify_artist_externals,
          COUNT(CASE WHEN NOT EXISTS (SELECT 1 FROM artists a WHERE a.id = ei.entity_id) THEN 1 END) as orphaned_externals
        FROM external_ids ei
        WHERE ei.entity_type = 'artist' AND ei.source = 'spotify'
      `;
      
      const orphanedResult = await this.pool.query(orphanedQuery);
      const orphanedStats = orphanedResult.rows[0];
      
      logger.info(`   Total Spotify artist external_ids: ${orphanedStats.total_spotify_artist_externals}`);
      logger.info(`   Orphaned external_ids (no matching artist): ${orphanedStats.orphaned_externals}`);

      // 6. Show sample orphaned external_ids if any
      if (parseInt(orphanedStats.orphaned_externals) > 0) {
        logger.info('\n📋 Sample orphaned external_ids:');
        
        const orphanedSampleQuery = `
          SELECT ei.id, ei.external_id, ei.entity_id, ei.entity_type
          FROM external_ids ei
          WHERE ei.entity_type = 'artist' 
            AND ei.source = 'spotify'
            AND NOT EXISTS (SELECT 1 FROM artists a WHERE a.id = ei.entity_id)
          LIMIT 10
        `;
        
        const orphanedSampleResult = await this.pool.query(orphanedSampleQuery);
        
        orphanedSampleResult.rows.forEach((row, idx) => {
          logger.info(`   ${idx + 1}. External ID: ${row.id}, URI: ${row.external_id}, Points to artist_id: ${row.entity_id}`);
        });
      }

    } catch (error) {
      logger.error(`💥 Audit failed: ${error.message}`);
      throw error;
    } finally {
      if (this.pool) {
        await this.pool.end();
      }
    }
  }
}

// Run the audit
const audit = new ComprehensiveArtistAudit();
audit.audit().catch(error => {
  logger.error(`Fatal error: ${error.message}`);
  process.exit(1);
});