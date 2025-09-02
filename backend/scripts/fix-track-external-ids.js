#!/usr/bin/env node

// Load environment variables
import 'dotenv/config';

import { initializeDatabase, getPool } from '../src/db/db.js';
import SpotifyService from '../src/services/spotify.js';
import logger from '../src/utils/logger.js';

class TrackExternalIdsFixer {
  constructor(testMode = false) {
    this.testMode = testMode;
    this.spotifyService = new SpotifyService();
    this.pool = null;
    this.processedCount = 0;
    this.fixedCount = 0;
    this.createdCount = 0;
    this.notFoundCount = 0;
  }

  async initialize() {
    logger.info(`🎵 Track External IDs Fixer ${this.testMode ? '(TEST MODE - NO DATABASE CHANGES)' : ''}`);
    
    initializeDatabase();
    this.pool = getPool();
    
    // Initialize Spotify service with user tokens
    const accessToken = process.env.SPOTIFY_ACCESS_TOKEN;
    const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN;
    
    if (!accessToken || !refreshToken) {
      throw new Error('Missing Spotify tokens. Set SPOTIFY_ACCESS_TOKEN and SPOTIFY_REFRESH_TOKEN environment variables.');
    }
    
    this.spotifyService.setTokens(accessToken, refreshToken);
    logger.info('✅ Spotify service initialized');
  }

  async findTracksToProcess(limit = 20) {
    logger.info(`\n🔍 Finding tracks to process (limit: ${limit})...`);
    
    // Get tracks that either:
    // 1. Have no external_ids at all, OR
    // 2. Have external_ids but old last_fetched (need re-processing)
    const query = `
      SELECT DISTINCT
        t.id, 
        t.name as track_name, 
        t.last_fetched,
        string_agg(DISTINCT ar.name, ', ' ORDER BY ar.name) as artist_names,
        a.name as album_name,
        ei.external_id as current_spotify_uri,
        CASE WHEN ei.id IS NULL THEN 'missing' ELSE 'existing' END as external_id_status
      FROM tracks t
      JOIN track_artists ta ON t.id = ta.track_id
      JOIN artists ar ON ta.artist_id = ar.id
      LEFT JOIN track_albums tal ON t.id = tal.track_id
      LEFT JOIN albums a ON tal.album_id = a.id
      LEFT JOIN external_ids ei ON t.id = ei.entity_id AND ei.entity_type = 'track' AND ei.source = 'spotify'
      WHERE (t.last_fetched IS NULL OR t.last_fetched < '2025-09-02'::date)
      GROUP BY t.id, t.name, t.last_fetched, a.name, ei.external_id, ei.id
      ORDER BY t.id
      LIMIT $1
    `;
    
    const result = await this.pool.query(query, [limit]);
    logger.info(`📊 Found ${result.rows.length} tracks to process`);
    
    return result.rows;
  }

  async searchSpotify(trackName, artistName, albumName = null) {
    try {
      await this.spotifyService.ensureValidToken();
      
      // Build search query - prioritize track and artist, optionally include album
      let query = `track:"${trackName}" artist:"${artistName}"`;
      if (albumName) {
        query += ` album:"${albumName}"`;
      }
      
      const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=10`, {
        headers: { 'Authorization': `Bearer ${this.spotifyService.accessToken}` }
      });

      if (!response.ok) {
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After') || 1;
          logger.warn(`⏳ Rate limited, waiting ${retryAfter} seconds`);
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
          return this.searchSpotify(trackName, artistName, albumName); // Retry
        }
        return null;
      }

      const data = await response.json();
      return data.tracks?.items || [];
      
    } catch (error) {
      logger.error(`Error searching Spotify for track "${trackName}" by ${artistName}: ${error.message}`);
      return null;
    }
  }

  findBestMatch(searchResults, targetTrack, targetArtist, targetAlbum = null) {
    if (!searchResults || searchResults.length === 0) return null;

    let bestMatch = null;
    let highestScore = 0;

    for (const item of searchResults) {
      // Calculate track name similarity
      let trackScore = this.calculateSimilarity(item.name.toLowerCase(), targetTrack.toLowerCase());
      
      // Calculate artist similarity (boost if artist matches)
      let artistScore = 0;
      if (targetArtist && item.artists) {
        const artistMatches = item.artists.some(artist => 
          this.calculateSimilarity(artist.name.toLowerCase(), targetArtist.toLowerCase()) > 0.8
        );
        if (artistMatches) artistScore = 0.4; // Higher weight for artist match in tracks
      }

      // Calculate album similarity (optional boost)
      let albumScore = 0;
      if (targetAlbum && item.album && item.album.name) {
        const albumSimilarity = this.calculateSimilarity(item.album.name.toLowerCase(), targetAlbum.toLowerCase());
        if (albumSimilarity > 0.8) albumScore = 0.2;
      }

      const totalScore = trackScore + artistScore + albumScore;

      if (totalScore > highestScore && trackScore > 0.6) { // Minimum 60% track name similarity
        highestScore = totalScore;
        bestMatch = item;
      }
    }

    return bestMatch;
  }

  calculateSimilarity(str1, str2) {
    str1 = this.normalizeString(str1);
    str2 = this.normalizeString(str2);
    
    if (str1 === str2) return 1.0;
    
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  normalizeString(str) {
    return str
      .toLowerCase()
      // Remove common track suffixes that might differ between sources
      .replace(/\s*\(feat\.?[^)]*\)/gi, '') // Remove (feat. Artist)
      .replace(/\s*\[feat\.?[^)]*\]/gi, '') // Remove [feat. Artist]
      .replace(/\s*-\s*prod\.?\s*by.*/gi, '') // Remove - Prod. By Producer
      .replace(/\s*\(prod\.?\s*by[^)]*\)/gi, '') // Remove (Prod. By Producer)
      .replace(/[^\w\s]/g, ' ')  // Replace special chars with spaces
      .replace(/\s+/g, ' ')      // Collapse multiple spaces
      .trim();
  }

  levenshteinDistance(str1, str2) {
    const matrix = [];
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[str2.length][str1.length];
  }

  async processTrack(trackData) {
    const { id, track_name, artist_names, album_name, current_spotify_uri, external_id_status } = trackData;
    
    // Use the first artist for search (most tracks have primary artist first)
    const primaryArtist = artist_names.split(', ')[0];
    
    logger.info(`🔍 Processing track: "${track_name}" by ${primaryArtist} (ID: ${id}) [${external_id_status}]`);
    
    try {
      // Search Spotify for correct match
      const searchResults = await this.searchSpotify(track_name, primaryArtist, album_name);
      const bestMatch = this.findBestMatch(searchResults, track_name, primaryArtist, album_name);
      
      if (bestMatch) {
        const newSpotifyUri = `spotify:track:${bestMatch.id}`;
        const trackSimilarity = this.calculateSimilarity(bestMatch.name, track_name);
        const spotifyArtist = bestMatch.artists[0]?.name || 'Unknown';
        const spotifyAlbum = bestMatch.album?.name || 'Unknown';
        
        logger.info(`   ✅ Found match: "${bestMatch.name}" by ${spotifyArtist} from "${spotifyAlbum}" (${Math.round(trackSimilarity * 100)}% similarity)`);
        logger.info(`   🔄 URI: ${newSpotifyUri}`);
        
        if (!this.testMode) {
          if (external_id_status === 'missing') {
            // Create new external_ids record
            await this.pool.query(
              `INSERT INTO external_ids (entity_type, entity_id, source, external_id) 
               VALUES ($1, $2, $3, $4)`,
              ['track', id, 'spotify', newSpotifyUri]
            );
            this.createdCount++;
            logger.info(`   ✅ Created new external_id record`);
          } else {
            // Update existing external_ids record
            await this.pool.query(
              `UPDATE external_ids 
               SET external_id = $1 
               WHERE entity_type = 'track' AND entity_id = $2 AND source = 'spotify'`,
              [newSpotifyUri, id]
            );
            this.fixedCount++;
            logger.info(`   ✅ Updated existing external_id record`);
          }
          
          // Update last_fetched
          await this.pool.query(
            `UPDATE tracks SET last_fetched = NOW() WHERE id = $1`,
            [id]
          );
        } else {
          if (external_id_status === 'missing') {
            logger.info(`   🧪 TEST: Would create external_id record`);
          } else {
            logger.info(`   🧪 TEST: Would update external_id from ${current_spotify_uri} to ${newSpotifyUri}`);
          }
          logger.info(`   🧪 TEST: Would update last_fetched`);
        }
        
      } else {
        logger.info(`   ❌ No suitable match found on Spotify`);
        this.notFoundCount++;
        
        // Still update last_fetched so we skip this track in future runs
        if (!this.testMode) {
          await this.pool.query(
            `UPDATE tracks SET last_fetched = NOW() WHERE id = $1`,
            [id]
          );
        } else {
          logger.info(`   🧪 TEST: Would update last_fetched to mark as processed`);
        }
      }
      
      this.processedCount++;
      
      // Rate limiting delay - longer for tracks since there are many more
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      logger.error(`   ❌ Error processing ${track_name}: ${error.message}`);
    }
  }

  async run(limit = 20) {
    try {
      await this.initialize();
      
      const tracksToProcess = await this.findTracksToProcess(limit);
      
      if (tracksToProcess.length === 0) {
        logger.info('✅ No tracks found that need processing!');
        return;
      }

      logger.info(`\n🚀 Processing ${tracksToProcess.length} tracks...`);
      
      for (const track of tracksToProcess) {
        await this.processTrack(track);
      }

      // Final summary
      logger.info(`\n📊 Summary:`);
      logger.info(`   Processed: ${this.processedCount}`);
      logger.info(`   Created new external_ids: ${this.createdCount}`);
      logger.info(`   Fixed existing external_ids: ${this.fixedCount}`);
      logger.info(`   Not found: ${this.notFoundCount}`);
      logger.info(`   Success rate: ${Math.round(((this.createdCount + this.fixedCount) / this.processedCount) * 100)}%`);

      if (this.testMode) {
        logger.info(`\n🧪 TEST MODE: No changes were made to the database`);
        logger.info(`Run without --test to apply the changes`);
      }

    } catch (error) {
      logger.error(`💥 Track fix script failed: ${error.message}`);
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
const limitArg = args.find(arg => arg.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 20;

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
🎵 Track External IDs Fix Script

Usage:
  node fix-track-external-ids.js [options]

Options:
  --test, --dry-run    Test mode (no database changes)
  --limit=N           Process N tracks (default: 20)
  --help, -h          Show this help

Examples:
  node fix-track-external-ids.js --test --limit=10
  node fix-track-external-ids.js --limit=50

Notes:
  - Uses track name + primary artist for Spotify search
  - Album name used as optional matching boost
  - Handles featuring artist variations in track names
  - 500ms delay between API calls for rate limiting
  - Updates last_fetched for efficient batch processing
  `);
  process.exit(0);
}

// Run the fixer
const fixer = new TrackExternalIdsFixer(testMode);
fixer.run(limit).catch(error => {
  logger.error(`Fatal error: ${error.message}`);
  process.exit(1);
});