#!/usr/bin/env node

import dotenv from 'dotenv';
import SpotifySync from '../src/services/spotifySync.js';
import { SpotifyDatabaseService, initializeSpotifyDatabase } from '../src/db/spotifyDb.js';
import { initializeDatabase } from '../src/db/db.js';
import logger from '../src/utils/logger.js';

// Load environment variables
dotenv.config();

class SpotifySyncScript {
  constructor() {
    // Initialize databases
    initializeDatabase();
    initializeSpotifyDatabase();
    this.dbService = new SpotifyDatabaseService();
    this.spotifySync = new SpotifySync(this.dbService);
  }

  async initialize() {
    // Check if we have stored tokens (you'd implement token storage)
    const accessToken = process.env.SPOTIFY_ACCESS_TOKEN;
    const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN;

    if (!accessToken || !refreshToken) {
      throw new Error('Spotify tokens not found. Please run authorization first.');
    }

    await this.spotifySync.initialize(accessToken, refreshToken);
    logger.info('SpotifySync initialized with stored tokens');
  }

  // Test mode - shows what would be synced without saving
  async runTest() {
    try {
      await this.initialize();
      
      console.log('\n🧪 TESTING INCREMENTAL SYNC (only new tracks since last sync)');
      console.log('=====================================');
      
      const testResult = await this.spotifySync.testIncrementalSync(50);
      
      console.log('\n📊 SYNC SUMMARY:');
      console.log('================');
      console.log(`Message: ${testResult.message}`);
      
      if (testResult.summary) {
        console.log('\n📈 DATA BREAKDOWN:');
        console.log(`  • Plays: ${testResult.summary.plays}`);
        console.log(`  • Unique Tracks: ${testResult.summary.uniqueTracks}`);
        console.log(`  • Unique Artists: ${testResult.summary.uniqueArtists}`);
        console.log(`  • Unique Albums: ${testResult.summary.uniqueAlbums}`);
        console.log(`  • Genres: ${testResult.summary.genres}`);
        console.log(`  • Track-Artist relationships: ${testResult.summary.trackArtistRelationships}`);
        console.log(`  • Artist-Genre relationships: ${testResult.summary.artistGenreRelationships}`);
        
        if (testResult.sampleData.firstPlay) {
          console.log('\n🎵 SAMPLE PLAY:');
          console.log('===============');
          const play = testResult.sampleData.firstPlay;
          console.log(`  Track ID: ${play.track_id}`);
          console.log(`  Played At: ${play.played_at}`);
          console.log(`  Context: ${play.context_type || 'N/A'}`);
        }
        
        if (testResult.sampleData.firstTrack) {
          console.log('\n🎼 SAMPLE TRACK:');
          console.log('================');
          const track = testResult.sampleData.firstTrack;
          console.log(`  Name: ${track.name}`);
          console.log(`  Duration: ${Math.round(track.duration_ms / 1000)}s`);
          console.log(`  Popularity: ${track.popularity}`);
          console.log(`  Explicit: ${track.explicit}`);
        }
        
        if (testResult.sampleData.firstArtist) {
          console.log('\n🎤 SAMPLE ARTIST:');
          console.log('=================');
          const artist = testResult.sampleData.firstArtist;
          console.log(`  Name: ${artist.name}`);
          console.log(`  Popularity: ${artist.popularity || 'N/A'}`);
          console.log(`  Followers: ${artist.followers || 'N/A'}`);
        }
        
        if (testResult.sampleData.genres && testResult.sampleData.genres.length > 0) {
          console.log('\n🎭 SAMPLE GENRES:');
          console.log('=================');
          testResult.sampleData.genres.forEach(genre => console.log(`  • ${genre}`));
        }
      }
      
      return testResult;
      
    } catch (error) {
      console.error('❌ Test failed:', error.message);
      throw error;
    }
  }

  // Production sync - saves to database
  async runSync() {
    try {
      await this.initialize();
      
      logger.info('🔄 Starting incremental Spotify sync...');
      
      const result = await this.spotifySync.syncRecentTracks({
        forceFullSync: false,  // Only get new tracks
        saveToDatabase: true,
        limit: 50
      });
      
      logger.info(`✅ Sync completed: ${result.addedPlays} new plays, ${result.processedTracks} tracks`);
      
      return result;
      
    } catch (error) {
      logger.error(`❌ Sync failed: ${error.message}`);
      throw error;
    }
  }

  // Force full refresh (ignores timestamp)
  async runForceSync() {
    try {
      await this.initialize();
      
      logger.info('🔄 Starting FORCE sync (ignoring last timestamp)...');
      
      const result = await this.spotifySync.syncRecentTracks({
        forceFullSync: true,   // Get recent 50 tracks regardless of timestamp
        saveToDatabase: true,
        limit: 50
      });
      
      logger.info(`✅ Force sync completed: ${result.addedPlays} new plays, ${result.processedTracks} tracks`);
      
      return result;
      
    } catch (error) {
      logger.error(`❌ Force sync failed: ${error.message}`);
      throw error;
    }
  }

  // Authorization helper
  async getAuthUrl() {
    const SpotifyServiceClass = (await import('../src/services/spotify.js')).default;
    const spotifyService = new SpotifyServiceClass();
    return spotifyService.generateAuthUrl(['user-read-recently-played']);
  }
}

// CLI interface
async function main() {
  const script = new SpotifySyncScript();
  const command = process.argv[2];

  try {
    switch (command) {
      case 'test':
        console.log('🧪 Running Spotify sync test...\n');
        await script.runTest();
        break;
        
      case 'sync':
        console.log('🔄 Running incremental Spotify sync...\n');
        const result = await script.runSync();
        console.log(`✅ Added ${result.addedPlays} new plays`);
        break;
        
      case 'force':
        console.log('🔄 Running FORCE Spotify sync...\n');
        const forceResult = await script.runForceSync();
        console.log(`✅ Added ${forceResult.addedPlays} new plays`);
        break;
        
      case 'auth':
        console.log('🔐 Spotify Authorization URL:');
        const authUrl = await script.getAuthUrl();
        console.log(authUrl);
        console.log('\nVisit this URL to authorize the app, then save the tokens to your .env file');
        break;
        
      default:
        console.log('Spotify Sync Script');
        console.log('==================');
        console.log('');
        console.log('Commands:');
        console.log('  test   - Test sync without saving (shows data format)');
        console.log('  sync   - Run incremental sync (only new tracks)');
        console.log('  force  - Force sync (ignore timestamp, get recent 50)');
        console.log('  auth   - Get authorization URL');
        console.log('');
        console.log('Examples:');
        console.log('  node scripts/spotifySync.js test');
        console.log('  node scripts/spotifySync.js sync');
        console.log('  node scripts/spotifySync.js force');
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

export default SpotifySyncScript;