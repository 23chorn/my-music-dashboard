#!/usr/bin/env node

// Load environment variables
import 'dotenv/config';

import { initializeDatabase, getPool } from '../src/db/db.js';
import logger from '../src/utils/logger.js';

class AlbumExternalIdsCleanup {
  constructor(testMode = false) {
    this.testMode = testMode;
    this.pool = null;
    this.deletedCount = 0;
    this.skippedCount = 0;
  }

  async initialize() {
    logger.info(`🧹 Album External IDs Cleanup ${this.testMode ? '(TEST MODE - NO DATABASE CHANGES)' : ''}`);
    
    initializeDatabase();
    this.pool = getPool();
    
    logger.info('✅ Database connection initialized');
  }

  async findSafeToDeleteRecords() {
    logger.info('\n🔍 Finding external_ids records safe to delete...');
    
    // Find external_ids that:
    // 1. Point to albums (entity_id exists in albums table)
    // 2. Have wrong entity_type (not 'album')
    // 3. The album also has a correct album external_id
    const query = `
      SELECT 
        wrong_ei.id as external_id_to_delete,
        wrong_ei.external_id as wrong_uri,
        wrong_ei.entity_type as wrong_type,
        a.id as album_id,
        a.name as album_name,
        correct_ei.external_id as correct_album_uri
      FROM external_ids wrong_ei
      JOIN albums a ON wrong_ei.entity_id = a.id
      JOIN external_ids correct_ei ON a.id = correct_ei.entity_id 
        AND correct_ei.entity_type = 'album' 
        AND correct_ei.source = 'spotify'
      WHERE wrong_ei.source = 'spotify'
        AND wrong_ei.entity_type != 'album'
      ORDER BY a.name, wrong_ei.id
    `;
    
    const result = await this.pool.query(query);
    logger.info(`📊 Found ${result.rows.length} external_ids records safe to delete`);
    
    return result.rows;
  }

  async findRecordsNeedingReview() {
    logger.info('\n⚠️  Finding external_ids records that need manual review...');
    
    // Find external_ids that:
    // 1. Point to albums (entity_id exists in albums table)
    // 2. Have wrong entity_type (not 'album')
    // 3. The album does NOT have a correct album external_id
    const query = `
      SELECT 
        wrong_ei.id as external_id,
        wrong_ei.external_id as wrong_uri,
        wrong_ei.entity_type as wrong_type,
        a.id as album_id,
        a.name as album_name
      FROM external_ids wrong_ei
      JOIN albums a ON wrong_ei.entity_id = a.id
      WHERE wrong_ei.source = 'spotify'
        AND wrong_ei.entity_type != 'album'
        AND NOT EXISTS (
          SELECT 1 FROM external_ids correct_ei 
          WHERE correct_ei.entity_id = a.id 
            AND correct_ei.entity_type = 'album' 
            AND correct_ei.source = 'spotify'
        )
      ORDER BY a.name
      LIMIT 20
    `;
    
    const result = await this.pool.query(query);
    logger.info(`📊 Found ${result.rows.length}+ external_ids records that need manual review (showing first 20)`);
    
    return result.rows;
  }

  async performCleanup(recordsToDelete) {
    if (recordsToDelete.length === 0) {
      logger.info('✅ No records to delete');
      return;
    }

    logger.info(`\n🗑️  ${this.testMode ? 'Would delete' : 'Deleting'} ${recordsToDelete.length} external_ids records...`);
    
    // Group by album for better logging
    const albumGroups = {};
    recordsToDelete.forEach(record => {
      if (!albumGroups[record.album_name]) {
        albumGroups[record.album_name] = [];
      }
      albumGroups[record.album_name].push(record);
    });

    let processedAlbums = 0;
    const totalAlbums = Object.keys(albumGroups).length;

    for (const [albumName, records] of Object.entries(albumGroups)) {
      processedAlbums++;
      logger.info(`\n   💿 Album ${processedAlbums}/${totalAlbums}: "${albumName}" - ${records.length} wrong external_ids`);
      logger.info(`      Correct album URI: ${records[0].correct_album_uri}`);
      
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

      // Add a small delay between album groups for readability in large batches
      if (processedAlbums % 50 === 0) {
        logger.info(`   ... Processed ${processedAlbums}/${totalAlbums} albums so far ...`);
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
        logger.info('\n⚠️  Sample records requiring manual review (NOT deleted):');
        needReview.forEach((record, idx) => {
          logger.info(`   ${idx + 1}. Album: "${record.album_name}" (ID: ${record.album_id}) - ${record.wrong_type} URI: ${record.wrong_uri}`);
        });
        this.skippedCount = needReview.length;
        logger.info(`   ... (showing first 20 of ~1340 albums that need the album fix script)`);
      }

      // Perform cleanup on safe records
      await this.performCleanup(safeToDelete);

      // Final summary
      logger.info(`\n📊 Cleanup Summary:`);
      logger.info(`   External_ids ${this.testMode ? 'would be deleted' : 'deleted'}: ${this.deletedCount}`);
      logger.info(`   Records skipped (need album fix script): ~${this.skippedCount}`);
      
      if (this.deletedCount > 0) {
        logger.info(`\n✅ Benefits:`);
        logger.info(`   - Removed duplicate/incorrect external_ids for albums`);
        logger.info(`   - Cleaned up data integrity issues`);
        logger.info(`   - Albums now have only correct album-type external_ids`);
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
🧹 Album External IDs Cleanup Script

This script removes duplicate/incorrect external_ids records where:
- Album entities have external_ids with wrong entity_type (artist/track instead of album)
- The same album also has a correct album external_id
- Safe cleanup preserves correct data while removing duplicates

Usage:
  node cleanup-album-external-ids.js [options]

Options:
  --test, --dry-run    Test mode (no database changes, show what would be done)
  --help, -h          Show this help

Examples:
  node cleanup-album-external-ids.js --test  # See what would be cleaned
  node cleanup-album-external-ids.js         # Perform actual cleanup

Safety:
  - Only deletes records where album has correct external_id
  - Skips albums with only incorrect external_ids (need album fix script)
  - Shows detailed report of actions taken
  `);
  process.exit(0);
}

// Confirmation prompt for non-test mode
if (!testMode && !args.includes('--confirm')) {
  console.log(`
⚠️  ALBUM EXTERNAL IDS CLEANUP WARNING

This will DELETE external_ids records that point to albums with wrong entity_types.

What it will do:
- Delete ~1100 external_ids records with wrong entity_type (artist/track)
- Only for albums that ALSO have correct album external_ids
- Skip ~1340 albums that only have wrong external_ids (need album fix script)

This is SAFE because:
- Albums keep their correct album external_ids
- Only duplicate/incorrect records are removed
- No album loses their primary external_id

To proceed, run:
  node cleanup-album-external-ids.js --confirm

To test first:
  node cleanup-album-external-ids.js --test
  `);
  process.exit(0);
}

// Run the cleanup
const cleanup = new AlbumExternalIdsCleanup(testMode);
cleanup.run().catch(error => {
  logger.error(`Fatal error: ${error.message}`);
  process.exit(1);
});