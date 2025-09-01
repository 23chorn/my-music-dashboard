#!/usr/bin/env node

import dotenv from 'dotenv';
import { initializeDatabase } from '../src/db/db.js';
import logger from '../src/utils/logger.js';

// Load environment variables
dotenv.config();

class SimpleSpotifySync {
  constructor() {
    initializeDatabase();
    this.baseUrl = 'https://api.spotify.com/v1/me/player/recently-played';
  }

  async refreshAccessToken() {
    if (!process.env.SPOTIFY_REFRESH_TOKEN) {
      throw new Error('SPOTIFY_REFRESH_TOKEN not found in environment');
    }

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64')}`
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: process.env.SPOTIFY_REFRESH_TOKEN
      })
    });

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.status}`);
    }

    const data = await response.json();
    return data.access_token;
  }

  async getRecentTracks(accessToken, limit = 50) {
    const url = `${this.baseUrl}?limit=${limit}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Spotify API error: ${response.status}`);
    }

    const data = await response.json();
    return data.items || [];
  }

  async syncPlays() {
    try {
      logger.info('🔄 Starting simple Spotify sync...');
      
      // Get fresh access token
      const accessToken = await this.refreshAccessToken();
      logger.info('✅ Refreshed Spotify access token');

      // Get recent tracks
      const recentTracks = await this.getRecentTracks(accessToken, 50);
      logger.info(`📥 Fetched ${recentTracks.length} recent tracks from Spotify`);

      if (recentTracks.length === 0) {
        logger.info('No recent tracks found');
        return { addedPlays: 0, message: 'No recent tracks' };
      }

      // This would need to be implemented based on your current database structure
      // For now, just log what we would sync
      logger.info('📊 Sample track data:');
      const sampleTrack = recentTracks[0];
      logger.info(`   Track: ${sampleTrack.track.name}`);
      logger.info(`   Artist: ${sampleTrack.track.artists[0].name}`);
      logger.info(`   Played at: ${sampleTrack.played_at}`);
      
      // Return summary for GitHub Actions logging
      return {
        addedPlays: 0, // Would be actual count if implemented
        processedTracks: recentTracks.length,
        message: 'Sync completed (demo mode - no database writes)'
      };

    } catch (error) {
      logger.error(`❌ Sync failed: ${error.message}`);
      throw error;
    }
  }
}

// CLI interface
async function main() {
  const command = process.argv[2] || 'sync';
  const sync = new SimpleSpotifySync();

  try {
    switch (command) {
      case 'sync':
      case 'test':
        console.log('🔄 Running simple Spotify sync...\n');
        const result = await sync.syncPlays();
        console.log(`✅ Sync completed`);
        console.log(`   Message: ${result.message}`);
        console.log(`   Processed tracks: ${result.processedTracks}`);
        console.log(`   Added plays: ${result.addedPlays}`);
        break;
        
      default:
        console.log('Simple Spotify Sync Script');
        console.log('===========================');
        console.log('');
        console.log('Commands:');
        console.log('  sync - Run sync (same as test for now)');
        console.log('  test - Test sync connection');
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

export default SimpleSpotifySync;