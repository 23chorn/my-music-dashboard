#!/usr/bin/env node

import dotenv from 'dotenv';
import SpotifySyncScript from './spotifySync.js';
import logger from '../src/utils/logger.js';

// Load environment variables
dotenv.config();

class ScheduledSpotifySync {
  constructor() {
    this.syncScript = new SpotifySyncScript();
    this.isRunning = false;
  }

  // Run the sync job
  async runSyncJob() {
    if (this.isRunning) {
      logger.warn('Spotify sync already in progress, skipping...');
      return;
    }

    this.isRunning = true;
    
    try {
      logger.info('⏰ Scheduled Spotify sync started');
      const result = await this.syncScript.runSync();
      
      if (result.addedPlays > 0) {
        logger.info(`✅ Scheduled sync completed: ${result.addedPlays} new plays added`);
      } else {
        logger.info('✅ Scheduled sync completed: No new plays found');
      }
      
      return result;
      
    } catch (error) {
      logger.error(`❌ Scheduled sync failed: ${error.message}`);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  // Manual trigger for testing
  async manualSync() {
    return await this.runSyncJob();
  }

  // Health check
  getStatus() {
    return {
      isRunning: this.isRunning,
      message: 'GitHub Actions will handle scheduling'
    };
  }
}

// CLI interface
async function main() {
  const scheduler = new ScheduledSpotifySync();
  const command = process.argv[2];

  try {
    switch (command) {
      case 'sync':
        console.log('🔄 Running Spotify sync for GitHub Actions...\n');
        const result = await scheduler.manualSync();
        console.log(`✅ Sync completed: ${result.addedPlays} new plays added`);
        break;
        
      case 'test':
        console.log('🧪 Testing manual sync...\n');
        const testResult = await scheduler.manualSync();
        console.log('✅ Manual sync completed');
        console.log(`   Added plays: ${testResult.addedPlays}`);
        console.log(`   Processed tracks: ${testResult.processedTracks}`);
        break;
        
      case 'status':
        const status = scheduler.getStatus();
        console.log('📊 Scheduler Status:');
        console.log(`   Running: ${status.isRunning}`);
        console.log(`   Message: ${status.message}`);
        break;
        
      default:
        console.log('Spotify Sync for GitHub Actions');
        console.log('===============================');
        console.log('');
        console.log('Commands:');
        console.log('  sync   - Run incremental sync (for GitHub Actions)');
        console.log('  test   - Run a manual sync once');
        console.log('  status - Show sync status');
        console.log('');
        console.log('Examples:');
        console.log('  node scripts/scheduledSpotifySync.js sync');
        console.log('  node scripts/scheduledSpotifySync.js test');
        break;
    }
  } catch (error) {
    console.error('❌ Sync failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default ScheduledSpotifySync;