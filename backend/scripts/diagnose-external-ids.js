#!/usr/bin/env node

// Load environment variables
import 'dotenv/config';

import { initializeDatabase, getPool } from '../src/db/db.js';
import logger from '../src/utils/logger.js';

class ExternalIdsDiagnostic {
  constructor() {
    this.pool = null;
  }

  async initialize() {
    logger.info('🔍 External IDs Diagnostic Tool');
    
    initializeDatabase();
    this.pool = getPool();
    
    logger.info('✅ Database connection initialized');
  }

  async diagnose() {
    try {
      await this.initialize();
      
      // 1. Check for external_ids with missing entity_id or entity_type
      logger.info('\n📊 Checking for incomplete external_ids records...');
      
      const incompleteQuery = `
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN entity_id IS NULL THEN 1 END) as missing_entity_id,
          COUNT(CASE WHEN entity_type IS NULL THEN 1 END) as missing_entity_type,
          COUNT(CASE WHEN entity_id IS NULL OR entity_type IS NULL THEN 1 END) as incomplete_total
        FROM external_ids 
        WHERE source = 'spotify' AND external_id LIKE 'spotify:artist:%'
      `;
      
      const incompleteResult = await this.pool.query(incompleteQuery);
      const stats = incompleteResult.rows[0];
      
      logger.info(`   Total artist external_ids: ${stats.total}`);
      logger.info(`   Missing entity_id: ${stats.missing_entity_id}`);
      logger.info(`   Missing entity_type: ${stats.missing_entity_type}`);
      logger.info(`   Total incomplete: ${stats.incomplete_total}`);
      
      // 2. Show sample of incomplete records
      if (parseInt(stats.incomplete_total) > 0) {
        logger.info('\n📋 Sample incomplete records:');
        
        const sampleQuery = `
          SELECT id, external_id, entity_id, entity_type, source
          FROM external_ids 
          WHERE source = 'spotify' 
            AND external_id LIKE 'spotify:artist:%'
            AND (entity_id IS NULL OR entity_type IS NULL)
          LIMIT 10
        `;
        
        const sampleResult = await this.pool.query(sampleQuery);
        
        sampleResult.rows.forEach((row, idx) => {
          logger.info(`   ${idx + 1}. ID: ${row.id}, URI: ${row.external_id}, entity_id: ${row.entity_id || 'NULL'}, entity_type: ${row.entity_type || 'NULL'}`);
        });
      }
      
      // 3. Check artists with old/missing last_fetched
      logger.info('\n📅 Checking artists with old/missing last_fetched...');
      
      const artistsQuery = `
        SELECT 
          COUNT(*) as total_artists,
          COUNT(CASE WHEN last_fetched IS NULL THEN 1 END) as never_fetched,
          COUNT(CASE WHEN last_fetched < '2025-09-02'::date THEN 1 END) as old_fetched
        FROM artists a
        WHERE EXISTS (
          SELECT 1 FROM external_ids ei 
          WHERE ei.entity_id = a.id 
            AND ei.entity_type = 'artist' 
            AND ei.source = 'spotify'
        )
      `;
      
      const artistsResult = await this.pool.query(artistsQuery);
      const artistStats = artistsResult.rows[0];
      
      logger.info(`   Total artists with external_ids: ${artistStats.total_artists}`);
      logger.info(`   Never fetched: ${artistStats.never_fetched}`);
      logger.info(`   Old fetched (< 2025-09-02): ${artistStats.old_fetched}`);
      
      // 4. Show sample artists that should be processed
      logger.info('\n📋 Sample artists that should be processed:');
      
      const artistSampleQuery = `
        SELECT a.id, a.name, a.last_fetched, ei.external_id
        FROM artists a
        JOIN external_ids ei ON a.id = ei.entity_id
        WHERE ei.entity_type = 'artist' 
          AND ei.source = 'spotify'
          AND (a.last_fetched IS NULL OR a.last_fetched < '2025-09-02'::date)
        LIMIT 10
      `;
      
      const artistSampleResult = await this.pool.query(artistSampleQuery);
      
      artistSampleResult.rows.forEach((row, idx) => {
        logger.info(`   ${idx + 1}. ID: ${row.id}, Name: "${row.name}", Last Fetched: ${row.last_fetched || 'NULL'}`);
      });

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
const diagnostic = new ExternalIdsDiagnostic();
diagnostic.diagnose().catch(error => {
  logger.error(`Fatal error: ${error.message}`);
  process.exit(1);
});