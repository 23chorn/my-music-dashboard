#!/usr/bin/env node

import { config } from 'dotenv';
import SpotifyService from '../src/services/spotify.js';
import logger from '../src/utils/logger.js';

// Load environment variables
config();

async function refreshSpotifyToken() {
  try {
    console.log('🎵 Refreshing Spotify token...\n');

    const spotifyService = new SpotifyService();

    // Check current token status
    console.log('Current access token:', process.env.SPOTIFY_ACCESS_TOKEN ? 'Set' : 'Not set');
    console.log('Current refresh token:', process.env.SPOTIFY_REFRESH_TOKEN ? 'Set' : 'Not set');

    // Try to ensure valid token (this will attempt refresh if needed)
    await spotifyService.ensureValidToken();

    console.log('✅ Spotify token refreshed successfully!');
    console.log('🚀 You can now run the enrichment script');

  } catch (error) {
    console.error('❌ Failed to refresh Spotify token:', error.message);
    console.log('\n💡 You may need to reauthorize the Spotify integration');
    console.log('   Visit the frontend and go through the Spotify auth flow');
    process.exit(1);
  }
}

refreshSpotifyToken();