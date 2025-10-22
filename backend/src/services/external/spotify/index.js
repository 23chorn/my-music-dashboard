/**
 * Spotify Integration Module
 * All Spotify-related services consolidated
 */

// Spotify API client
export { default as SpotifyService } from './spotifyClient.js';

// Spotify music synchronization
export { default as SpotifyMusicSync } from './spotifySync.js';

// Spotify data processing
export { default as SpotifyDataProcessor } from './spotifyProcessor.js';

// Spotify database operations
export { default as LegacySpotifyDatabaseService, LegacySpotifyDatabaseService as SpotifyDb } from './spotifyDb.js';
