#!/usr/bin/env node

// Load environment variables
import 'dotenv/config';

import { initializeDatabase, getPool } from '../src/db/db.js';
import logger from '../src/utils/logger.js';

class ExternalIdsUriFormatFixer {
  constructor(testMode = false) {
    this.testMode = testMode;
    this.pool = null;
    this.fixedCount = 0;
  }

  async initialize() {
    logger.info(`🔧 External IDs URI Format Fixer ${this.testMode ? '(TEST MODE - NO DATABASE CHANGES)' : ''}`);
    
    initializeDatabase();
    this.pool = getPool();
    
    logger.info('✅ Database connection initialized');
  }

  async findMalformedUris() {
    logger.info('\n🔍 Finding external_ids with malformed URIs...');
    
    const queries = [
      {
        type: 'track',
        query: `
          SELECT id, external_id, entity_type, entity_id
          FROM external_ids 
          WHERE source = 'spotify' 
            AND entity_type = 'track'
            AND external_id NOT LIKE 'spotify:track:%'
            AND LENGTH(external_id) = 22  -- Spotify track IDs are 22 chars
          ORDER BY id
        `
      },
      {
        type: 'album',
        query: `
          SELECT id, external_id, entity_type, entity_id
          FROM external_ids 
          WHERE source = 'spotify' 
            AND entity_type = 'album'
            AND external_id NOT LIKE 'spotify:album:%'
            AND LENGTH(external_id) = 22  -- Spotify album IDs are 22 chars
          ORDER BY id
        `
      },
      {
        type: 'artist',
        query: `
          SELECT id, external_id, entity_type, entity_id
          FROM external_ids 
          WHERE source = 'spotify' 
            AND entity_type = 'artist'
            AND external_id NOT LIKE 'spotify:artist:%'
            AND LENGTH(external_id) = 22  -- Spotify artist IDs are 22 chars
          ORDER BY id
        `
      }
    ];

    const results = {};
    
    for (const queryInfo of queries) {
      const result = await this.pool.query(queryInfo.query);
      results[queryInfo.type] = result.rows;
      logger.info(`   ${queryInfo.type}s with malformed URIs: ${result.rows.length}`);
    }
    
    return results;
  }

  async fixUris(malformedData) {
    let totalFixed = 0;

    for (const [entityType, records] of Object.entries(malformedData)) {
      if (records.length === 0) {
        logger.info(`\n✅ No malformed ${entityType} URIs to fix`);
        continue;
      }

      logger.info(`\n🔧 Fixing ${records.length} malformed ${entityType} URIs...`);

      for (const record of records) {
        const currentUri = record.external_id;
        const correctUri = `spotify:${entityType}:${currentUri}`;
        
        logger.info(`   Fixing: ${currentUri} → ${correctUri}`);
        
        if (!this.testMode) {
          try {
            await this.pool.query(
              'UPDATE external_ids SET external_id = $1 WHERE id = $2',
              [correctUri, record.id]
            );
            this.fixedCount++;
          } catch (error) {
            logger.error(`   Error fixing record ${record.id}: ${error.message}`);
          }
        } else {
          logger.info(`   🧪 TEST: Would fix record ${record.id}`);
        }
        
        totalFixed++;
      }
    }

    return totalFixed;
  }

  async run() {
    try {
      await this.initialize();
      
      // Find all malformed URIs
      const malformedData = await this.findMalformedUris();
      
      // Count total issues
      const totalIssues = Object.values(malformedData).reduce((sum, records) => sum + records.length, 0);
      
      if (totalIssues === 0) {
        logger.info('\n✅ No malformed URIs found - all external_ids have correct format!');
        return;
      }

      // Show sample of issues
      logger.info('\n📋 Sample malformed URIs:');
      for (const [entityType, records] of Object.entries(malformedData)) {
        if (records.length > 0) {
          logger.info(`   ${entityType} examples:`);
          records.slice(0, 3).forEach(record => {
            logger.info(`     ${record.external_id} (should be spotify:${entityType}:${record.external_id})`);
          });
        }
      }

      // Fix the URIs
      const processedCount = await this.fixUris(malformedData);

      // Final summary
      logger.info(`\n📊 Summary:`);
      logger.info(`   Total malformed URIs found: ${totalIssues}`);
      logger.info(`   Records ${this.testMode ? 'that would be' : ''} fixed: ${this.fixedCount}`);

      if (this.testMode) {
        logger.info(`\n🧪 TEST MODE: No changes were made to the database`);
        logger.info(`Run without --test to fix the URIs`);
      } else {
        logger.info(`\n✅ URI format fix completed!`);
        logger.info(`All new plays should now have correctly formatted external_ids`);
      }

    } catch (error) {
      logger.error(`💥 URI format fix failed: ${error.message}`);
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
🔧 External IDs URI Format Fix Script

This script fixes external_ids that are missing the 'spotify:' prefix.

Examples:
- 2rKNlxKBZvpSpuIChBdHts → spotify:track:2rKNlxKBZvpSpuIChBdHts
- 2TLqwyhFd2gr8ACn4G7xiT → spotify:album:2TLqwyhFd2gr8ACn4G7xiT

Usage:
  node fix-external-ids-uri-format.js [options]

Options:
  --test, --dry-run    Test mode (no database changes)
  --help, -h          Show this help

Examples:
  node fix-external-ids-uri-format.js --test
  node fix-external-ids-uri-format.js
  `);
  process.exit(0);
}

// Run the fixer
const fixer = new ExternalIdsUriFormatFixer(testMode);
fixer.run().catch(error => {
  logger.error(`Fatal error: ${error.message}`);
  process.exit(1);
});