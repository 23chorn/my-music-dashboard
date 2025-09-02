#!/usr/bin/env node

// Load environment variables
import 'dotenv/config';

import { initializeDatabase, getPool } from '../src/db/db.js';
import logger from '../src/utils/logger.js';

class ArtistExternalIdsCleanup {
  constructor(testMode = false) {
    this.testMode = testMode;
    this.pool = null;
    this.deletedCount = 0;
    this.skippedCount = 0;
  }

  async initialize() {
    logger.info(`🧹 Artist External IDs Cleanup ${this.testMode ? '(TEST MODE - NO DATABASE CHANGES)' : ''}`);
    
    initializeDatabase();
    this.pool = getPool();
    
    logger.info('✅ Database connection initialized');
  }

  async findSafeToDeleteRecords() {
    logger.info('\n🔍 Finding external_ids records safe to delete...');
    
    // Find external_ids that:
    // 1. Point to artists (entity_id exists in artists table)
    // 2. Have wrong entity_type (not 'artist')
    // 3. The artist also has a correct artist external_id
    const query = `
      SELECT 
        wrong_ei.id as external_id_to_delete,
        wrong_ei.external_id as wrong_uri,
        wrong_ei.entity_type as wrong_type,
        a.id as artist_id,
        a.name as artist_name,
        correct_ei.external_id as correct_artist_uri
      FROM external_ids wrong_ei
      JOIN artists a ON wrong_ei.entity_id = a.id
      JOIN external_ids correct_ei ON a.id = correct_ei.entity_id 
        AND correct_ei.entity_type = 'artist' 
        AND correct_ei.source = 'spotify'
      WHERE wrong_ei.source = 'spotify'
        AND wrong_ei.entity_type != 'artist'
      ORDER BY a.name, wrong_ei.id
    `;
    
    const result = await this.pool.query(query);
    logger.info(`📊 Found ${result.rows.length} external_ids records safe to delete`);
    
    return result.rows;
  }

  async findRecordsNeedingReview() {
    logger.info('\n⚠️  Finding external_ids records that need manual review...');
    
    // Find external_ids that:
    // 1. Point to artists (entity_id exists in artists table)
    // 2. Have wrong entity_type (not 'artist')
    // 3. The artist does NOT have a correct artist external_id
    const query = `
      SELECT 
        wrong_ei.id as external_id,
        wrong_ei.external_id as wrong_uri,
        wrong_ei.entity_type as wrong_type,
        a.id as artist_id,
        a.name as artist_name
      FROM external_ids wrong_ei
      JOIN artists a ON wrong_ei.entity_id = a.id
      WHERE wrong_ei.source = 'spotify'
        AND wrong_ei.entity_type != 'artist'
        AND NOT EXISTS (
          SELECT 1 FROM external_ids correct_ei 
          WHERE correct_ei.entity_id = a.id 
            AND correct_ei.entity_type = 'artist' 
            AND correct_ei.source = 'spotify'
        )
      ORDER BY a.name
    `;
    
    const result = await this.pool.query(query);
    logger.info(`📊 Found ${result.rows.length} external_ids records that need manual review`);
    
    return result.rows;
  }

  async performCleanup(recordsToDelete) {
    if (recordsToDelete.length === 0) {
      logger.info('✅ No records to delete');
      return;
    }

    logger.info(`\n🗑️  ${this.testMode ? 'Would delete' : 'Deleting'} ${recordsToDelete.length} external_ids records...`);
    
    // Group by artist for better logging
    const artistGroups = {};
    recordsToDelete.forEach(record => {
      if (!artistGroups[record.artist_name]) {
        artistGroups[record.artist_name] = [];
      }
      artistGroups[record.artist_name].push(record);
    });

    for (const [artistName, records] of Object.entries(artistGroups)) {
      logger.info(`\n   🎤 Artist: "${artistName}" - ${records.length} wrong external_ids`);
      logger.info(`      Correct artist URI: ${records[0].correct_artist_uri}`);
      
      for (const record of records) {
        logger.info(`      🗑️  ${this.testMode ? 'Would delete' : 'Deleting'} ${record.wrong_type} URI: ${record.wrong_uri} (ID: ${record.external_id_to_delete})`);
        
        if (!this.testMode) {
          await this.pool.query(
            'DELETE FROM external_ids WHERE id = $1',
            [record.external_id_to_delete]
          );
        }
        
        this.deletedCount++;
      }
    }
  }

  async run() {
    try {
      await this.initialize();
      
      // Find records safe to delete
      const safeToDelete = await this.findSafeToDeleteRecords();
      
      // Find records needing review (don't delete these)
      const needReview = await this.findRecordsNeedingReview();
      
      if (needReview.length > 0) {
        logger.info('\n⚠️  Records requiring manual review (NOT deleted):');
        needReview.forEach((record, idx) => {
          logger.info(`   ${idx + 1}. Artist: "${record.artist_name}" (ID: ${record.artist_id}) - ${record.wrong_type} URI: ${record.wrong_uri}`);
        });
        this.skippedCount = needReview.length;
      }

      // Perform cleanup on safe records
      await this.performCleanup(safeToDelete);

      // Final summary
      logger.info(`\n📊 Cleanup Summary:`);
      logger.info(`   External_ids ${this.testMode ? 'would be deleted' : 'deleted'}: ${this.deletedCount}`);
      logger.info(`   Records skipped (need manual review): ${this.skippedCount}`);
      
      if (this.deletedCount > 0) {
        logger.info(`\n✅ Benefits:`);
        logger.info(`   - Removed duplicate/incorrect external_ids for artists`);
        logger.info(`   - Cleaned up data integrity issues`);
        logger.info(`   - Artists now have only correct artist-type external_ids`);
      }

      if (this.testMode) {
        logger.info(`\n🧪 TEST MODE: No changes were made to the database`);
        logger.info(`Run without --test to perform the actual cleanup`);
      }

    } catch (error) {
      logger.error(`💥 Cleanup failed: ${error.message}`);
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
🧹 Artist External IDs Cleanup Script

This script removes duplicate/incorrect external_ids records where:
- Artist entities have external_ids with wrong entity_type (album/track instead of artist)
- The same artist also has a correct artist external_id
- Safe cleanup preserves correct data while removing duplicates

Usage:
  node cleanup-artist-external-ids.js [options]

Options:
  --test, --dry-run    Test mode (no database changes, show what would be done)
  --help, -h          Show this help

Examples:
  node cleanup-artist-external-ids.js --test  # See what would be cleaned
  node cleanup-artist-external-ids.js         # Perform actual cleanup

Safety:
  - Only deletes records where artist has correct external_id
  - Skips artists with only incorrect external_ids (need manual review)
  - Shows detailed report of actions taken
  `);
  process.exit(0);
}

// Confirmation prompt for non-test mode
if (!testMode && !args.includes('--confirm')) {
  console.log(`
⚠️  EXTERNAL IDS CLEANUP WARNING

This will DELETE external_ids records that point to artists with wrong entity_types.

What it will do:
- Delete ~1009 external_ids records with wrong entity_type (album/track)
- Only for artists that ALSO have correct artist external_ids
- Skip 9 artists that only have wrong external_ids (need manual review)

This is SAFE because:
- Artists keep their correct artist external_ids
- Only duplicate/incorrect records are removed
- No artist loses their primary external_id

To proceed, run:
  node cleanup-artist-external-ids.js --confirm

To test first:
  node cleanup-artist-external-ids.js --test
  `);
  process.exit(0);
}

// Run the cleanup
const cleanup = new ArtistExternalIdsCleanup(testMode);
cleanup.run().catch(error => {
  logger.error(`Fatal error: ${error.message}`);
  process.exit(1);
});