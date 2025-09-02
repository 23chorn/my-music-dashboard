#!/usr/bin/env node

// Load environment variables
import 'dotenv/config';

import { initializeDatabase, getPool } from '../src/db/db.js';
import logger from '../src/utils/logger.js';

class IncompleteExternalIdsFixer {
  constructor(testMode = false) {
    this.testMode = testMode;
    this.pool = null;
    this.processedCount = 0;
    this.fixedCount = 0;
    this.notFoundCount = 0;
  }

  async initialize() {
    logger.info(`🔧 Starting Incomplete External IDs Fix ${this.testMode ? '(TEST MODE - NO DATABASE CHANGES)' : ''}`);
    
    initializeDatabase();
    this.pool = getPool();
    
    logger.info('✅ Database connection initialized');
  }

  async findIncompleteArtistExternalIds() {
    logger.info('\n🔍 Finding incomplete artist external_ids records...');
    
    // Find external_ids records that are missing key fields
    const query = `
      SELECT 
        ei.id as external_ids_id,
        ei.external_id,
        ei.entity_id,
        ei.entity_type,
        ei.source,
        a.id as artist_id,
        a.name as artist_name
      FROM external_ids ei
      LEFT JOIN artists a ON ei.external_id LIKE '%spotify:artist:%' 
        AND ei.external_id = CONCAT('spotify:artist:', SUBSTRING(ei.external_id FROM 'spotify:artist:(.*)'))
        AND a.id::text = SUBSTRING(ei.external_id FROM 'spotify:artist:(.*)')
      WHERE ei.source = 'spotify' 
        AND (ei.entity_type IS NULL OR ei.entity_id IS NULL)
        AND ei.external_id LIKE 'spotify:artist:%'
      ORDER BY ei.id
      LIMIT 200
    `;
    
    const result = await this.pool.query(query);
    logger.info(`📊 Found ${result.rows.length} incomplete artist external_ids records`);
    
    return result.rows;
  }

  async findArtistBySpotifyId(spotifyId) {
    // Try to find artist by looking for existing external_ids with same Spotify ID
    const query = `
      SELECT DISTINCT a.id, a.name 
      FROM artists a
      JOIN external_ids ei ON a.id = ei.entity_id
      WHERE ei.source = 'spotify' 
        AND ei.entity_type = 'artist'
        AND ei.external_id = $1
    `;
    
    const result = await this.pool.query(query, [`spotify:artist:${spotifyId}`]);
    return result.rows[0] || null;
  }

  async findArtistByName(artistName) {
    // Try to find artist by name (fuzzy matching)
    const query = `
      SELECT id, name,
        SIMILARITY(LOWER(name), LOWER($1)) as similarity
      FROM artists 
      WHERE SIMILARITY(LOWER(name), LOWER($1)) > 0.7
      ORDER BY similarity DESC
      LIMIT 5
    `;
    
    try {
      const result = await this.pool.query(query, [artistName]);
      return result.rows[0] || null;
    } catch (error) {
      // Fallback to exact match if SIMILARITY function not available
      const exactQuery = `
        SELECT id, name 
        FROM artists 
        WHERE LOWER(name) = LOWER($1)
        LIMIT 1
      `;
      
      const result = await this.pool.query(exactQuery, [artistName]);
      return result.rows[0] || null;
    }
  }

  async extractSpotifyIdFromUri(spotifyUri) {
    const match = spotifyUri.match(/spotify:artist:(.+)/);
    return match ? match[1] : null;
  }

  async fixIncompleteRecord(record) {
    const { external_ids_id, external_id, entity_id, entity_type } = record;
    
    logger.info(`🔍 Processing external_ids record ${external_ids_id}: ${external_id}`);
    
    try {
      // Extract Spotify ID from URI
      const spotifyId = await this.extractSpotifyIdFromUri(external_id);
      if (!spotifyId) {
        logger.warn(`   ⚠️  Could not extract Spotify ID from: ${external_id}`);
        this.notFoundCount++;
        return;
      }

      let artist = null;
      
      // Try to find artist by Spotify ID first
      artist = await this.findArtistBySpotifyId(spotifyId);
      
      if (!artist) {
        // If we have a partial artist name from somewhere, try to match by name
        // This would require additional logic to extract name from external source
        logger.info(`   ❌ Could not find matching artist for Spotify ID: ${spotifyId}`);
        this.notFoundCount++;
        return;
      }

      logger.info(`   ✅ Found matching artist: "${artist.name}" (ID: ${artist.id})`);
      
      // Update the external_ids record with missing data
      if (!this.testMode) {
        const updateQuery = `
          UPDATE external_ids 
          SET 
            entity_id = $1,
            entity_type = 'artist'
          WHERE id = $2
        `;
        
        await this.pool.query(updateQuery, [artist.id, external_ids_id]);
        logger.info(`   🔄 Updated external_ids record ${external_ids_id}`);
      } else {
        logger.info(`   🧪 TEST: Would update external_ids record ${external_ids_id} with entity_id=${artist.id}, entity_type='artist'`);
      }

      this.fixedCount++;
      
    } catch (error) {
      logger.error(`   ❌ Error processing record ${external_ids_id}: ${error.message}`);
    }
    
    this.processedCount++;
  }

  async run() {
    try {
      await this.initialize();
      
      const incompleteRecords = await this.findIncompleteArtistExternalIds();
      
      if (incompleteRecords.length === 0) {
        logger.info('✅ No incomplete external_ids records found!');
        return;
      }

      logger.info(`\n🚀 Processing ${incompleteRecords.length} incomplete records...`);
      
      for (const record of incompleteRecords) {
        await this.fixIncompleteRecord(record);
        
        // Small delay between operations
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Final summary
      logger.info(`\n📊 Summary:`);
      logger.info(`   Processed: ${this.processedCount}`);
      logger.info(`   Fixed: ${this.fixedCount}`);
      logger.info(`   Not found: ${this.notFoundCount}`);
      logger.info(`   Success rate: ${Math.round((this.fixedCount / this.processedCount) * 100)}%`);

      if (this.testMode) {
        logger.info(`\n🧪 TEST MODE: No changes were made to the database`);
        logger.info(`Run without --test to apply the fixes`);
      }

    } catch (error) {
      logger.error(`💥 Fix script failed: ${error.message}`);
      throw error;
    } finally {
      if (this.pool) {
        await this.pool.end();
      }
    }
  }
}

// Handle command line arguments
const args = process.argv.slice(2);
const testMode = args.includes('--test') || args.includes('--dry-run');

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
🔧 Incomplete External IDs Fix Script

Usage:
  node fix-incomplete-external-ids.js [options]

Options:
  --test, --dry-run    Test mode (no database changes)
  --help, -h          Show this help

Examples:
  node fix-incomplete-external-ids.js --test
  node fix-incomplete-external-ids.js
  `);
  process.exit(0);
}

// Run the fixer
const fixer = new IncompleteExternalIdsFixer(testMode);
fixer.run().catch(error => {
  logger.error(`Fatal error: ${error.message}`);
  process.exit(1);
});