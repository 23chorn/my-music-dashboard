#!/usr/bin/env node

import dotenv from 'dotenv';
import SpotifyService from '../src/services/spotify.js';
import logger from '../src/utils/logger.js';

// Load environment variables
dotenv.config();

async function exchangeCodeForTokens(authorizationCode) {
  const spotifyService = new SpotifyService();
  
  try {
    console.log('🔄 Exchanging authorization code for tokens...\n');
    
    const tokens = await spotifyService.getUserAccessToken(authorizationCode);
    
    console.log('✅ SUCCESS! Tokens obtained:');
    console.log('============================');
    console.log(`Access Token: ${tokens.accessToken}`);
    console.log(`Refresh Token: ${tokens.refreshToken}`);
    console.log(`Expires In: ${tokens.expiresIn} seconds (${Math.round(tokens.expiresIn / 60)} minutes)`);
    
    console.log('\n📝 ADD THESE TO YOUR .env FILE:');
    console.log('================================');
    console.log(`SPOTIFY_ACCESS_TOKEN=${tokens.accessToken}`);
    console.log(`SPOTIFY_REFRESH_TOKEN=${tokens.refreshToken}`);
    
    console.log('\n🧪 NEXT STEPS:');
    console.log('==============');
    console.log('1. Add the tokens above to your .env file');
    console.log('2. Run: node scripts/spotifySync.js test');
    console.log('3. If test works, run: node scripts/spotifySync.js sync');
    
    return tokens;
    
  } catch (error) {
    console.error('❌ Token exchange failed:', error.message);
    throw error;
  }
}

// CLI interface
async function main() {
  const authCode = process.argv[2];
  
  if (!authCode) {
    console.log('Spotify Token Exchange');
    console.log('======================');
    console.log('');
    console.log('Usage:');
    console.log('  node scripts/handleSpotifyAuth.js <authorization_code>');
    console.log('');
    console.log('After visiting the auth URL and getting redirected,');
    console.log('copy the "code" parameter from the redirect URL and run:');
    console.log('');
    console.log('Example:');
    console.log('  node scripts/handleSpotifyAuth.js AQC8ZXr8kF9X...');
    return;
  }
  
  try {
    await exchangeCodeForTokens(authCode);
  } catch (error) {
    console.error('❌ Authorization failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default exchangeCodeForTokens;