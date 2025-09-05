#!/usr/bin/env node

import dotenv from 'dotenv';
import { initializeDatabase } from '../src/db/db.js';
import MusicSyncService from '../src/services/musicSync.js';
import logger from '../../src/utils/logger.js';

// Load environment variables
dotenv.config();

class ScheduledMusicSync {
  constructor() {
    // Initialize main database connection with retry
    this.initializeDatabaseWithRetry();
    
    // Use the same MusicSyncService that the UI uses
    this.musicSync = new MusicSyncService();
  }

  async initializeDatabaseWithRetry(maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        initializeDatabase();
        logger.info('Database initialization succeeded');
        return;
      } catch (error) {
        logger.warn(`Database initialization attempt ${i + 1}/${maxRetries} failed: ${error.message}`);
        if (i === maxRetries - 1) {
          logger.error('Database initialization failed after all retries');
          throw error;
        }
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
      }
    }
  }

  async runSync(options = {}) {
    const { mode = 'sync' } = options;
    
    try {
      logger.info(`🔄 Starting scheduled music sync (mode: ${mode})`);
      
      // Wait for MusicSync to initialize
      await this.musicSync.ensureInitialized();
      
      const force = mode === 'force';
      
      // Use the same sync method as the UI
      const result = await this.musicSync.syncNewTracks({ force });
      
      logger.info(`✅ Scheduled music sync completed via ${result.method.toUpperCase()}`);
      logger.info(`   Added plays: ${result.addedPlays}`);
      logger.info(`   Processed tracks: ${result.processedTracks}`);
      logger.info(`   Message: ${result.message}`);
      
      if (result.fallbackUsed) {
        logger.warn(`⚠️  Fallback used: ${result.fallbackFrom} → ${result.method}`);
        logger.warn(`   Reason: ${result.fallbackReason}`);
      }
      
      return result;
      
    } catch (error) {
      logger.error(`❌ Scheduled music sync failed: ${error.message}`);
      throw error;
    }
  }

  async getStatus() {
    try {
      await this.musicSync.ensureInitialized();
      return await this.musicSync.getStatus();
    } catch (error) {
      logger.error(`Error getting sync status: ${error.message}`);
      throw error;
    }
  }
}

// CLI interface
async function main() {
  const command = process.argv[2] || 'sync';
  const sync = new ScheduledMusicSync();

  try {
    switch (command) {
      case 'sync':
        console.log('🔄 Running incremental sync...\n');
        const result = await sync.runSync({ mode: 'sync' });
        console.log(`✅ Sync completed via ${result.method.toUpperCase()}`);
        console.log(`   Added plays: ${result.addedPlays}`);
        console.log(`   Processed tracks: ${result.processedTracks}`);
        if (result.fallbackUsed) {
          console.log(`   ⚠️  Used fallback: ${result.fallbackFrom} → ${result.method}`);
        }
        break;
        
      case 'test':
        console.log('🧪 Running test sync...\n');
        const testResult = await sync.runSync({ mode: 'sync' });
        console.log(`✅ Test completed via ${testResult.method.toUpperCase()}`);
        console.log(`   Added plays: ${testResult.addedPlays}`);
        console.log(`   Processed tracks: ${testResult.processedTracks}`);
        break;
        
      case 'force':
        console.log('🔄 Running force sync...\n');
        const forceResult = await sync.runSync({ mode: 'force' });
        console.log(`✅ Force sync completed via ${forceResult.method.toUpperCase()}`);
        console.log(`   Added plays: ${forceResult.addedPlays}`);
        console.log(`   Processed tracks: ${forceResult.processedTracks}`);
        break;
        
      case 'status':
        console.log('📊 Getting sync status...\n');
        const status = await sync.getStatus();
        console.log('Sync Status:');
        console.log(`   Current method: ${status.currentMethod.toUpperCase()}`);
        console.log(`   Last sync: ${status.lastSync || 'Never'}`);
        console.log(`   Last.fm configured: ${status.available.lastfm.configured}`);
        console.log(`   Spotify configured: ${status.available.spotify.configured}`);
        console.log(`   Spotify ready: ${status.available.spotify.ready}`);
        break;
        
      default:
        console.log('Scheduled Music Sync Script');
        console.log('============================');
        console.log('');
        console.log('This script uses the same MusicSyncService as the UI.');
        console.log('');
        console.log('Commands:');
        console.log('  sync   - Run incremental sync (only new tracks)');
        console.log('  test   - Same as sync (for compatibility)');
        console.log('  force  - Force sync (ignore timestamp)');
        console.log('  status - Show sync status');
        console.log('');
        console.log('Sync Method:');
        console.log('  - Uses SYNC_METHOD environment variable');
        console.log('  - Falls back from Spotify to Last.fm if needed');
        console.log('  - Matches exact UI behavior');
        break;
    }
  } catch (error) {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default ScheduledMusicSync;