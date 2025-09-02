#!/usr/bin/env node

// Load environment variables
import 'dotenv/config';

import { initializeDatabase, getPool } from '../src/db/db.js';
import SpotifyService from '../src/services/spotify.js';
import logger from '../src/utils/logger.js';

class MissingAlbumExternalIdsReviewer {
  constructor(testMode = false) {
    this.testMode = testMode;
    this.spotifyService = new SpotifyService();
    this.pool = null;
    this.reviewedCount = 0;
    this.foundCount = 0;
    this.createdCount = 0;
  }

  async initialize() {
    logger.info(`🔍 Missing Album External IDs Reviewer ${this.testMode ? '(TEST MODE - NO DATABASE CHANGES)' : ''}`);
    
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

  async findMissingAlbums(limit = 20) {
    logger.info(`\n🔍 Finding albums without external_ids (limit: ${limit})...`);
    
    const query = `
      SELECT 
        a.id, 
        a.name as album_name, 
        a.last_fetched,
        string_agg(DISTINCT ar.name, ', ' ORDER BY ar.name) as artist_names
      FROM albums a
      JOIN album_artists aa ON a.id = aa.album_id
      JOIN artists ar ON aa.artist_id = ar.id
      LEFT JOIN external_ids ei ON a.id = ei.entity_id AND ei.entity_type = 'album' AND ei.source = 'spotify'
      WHERE ei.id IS NULL
      GROUP BY a.id, a.name, a.last_fetched
      ORDER BY a.id
      LIMIT $1
    `;
    
    const result = await this.pool.query(query, [limit]);
    logger.info(`📊 Found ${result.rows.length} albums without external_ids`);
    
    return result.rows;
  }

  async searchSpotifyBroad(albumName, artistName) {
    try {
      await this.spotifyService.ensureValidToken();
      
      // Try multiple search strategies
      const searchStrategies = [
        // Strategy 1: Exact album and artist match
        `album:"${albumName}" artist:"${artistName}"`,
        // Strategy 2: Relaxed album search with artist
        `"${albumName}" artist:"${artistName}"`,
        // Strategy 3: Just album name with artist constraint
        `${albumName} artist:"${artistName}"`,
        // Strategy 4: Very broad search
        `${albumName} ${artistName}`
      ];

      for (let i = 0; i < searchStrategies.length; i++) {
        const query = searchStrategies[i];
        logger.info(`   Trying strategy ${i + 1}: ${query}`);

        const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=album&limit=20`, {
          headers: { 'Authorization': `Bearer ${this.spotifyService.accessToken}` }
        });

        if (!response.ok) {
          if (response.status === 429) {
            const retryAfter = response.headers.get('Retry-After') || 1;
            logger.warn(`⏳ Rate limited, waiting ${retryAfter} seconds`);
            await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
            i--; // Retry same strategy
            continue;
          }
          continue; // Try next strategy
        }

        const data = await response.json();
        const results = data.albums?.items || [];
        
        if (results.length > 0) {
          logger.info(`   Strategy ${i + 1} found ${results.length} results`);
          return results;
        }
      }

      return [];
      
    } catch (error) {
      logger.error(`Error searching Spotify for album "${albumName}" by ${artistName}: ${error.message}`);
      return [];
    }
  }

  findBestMatch(searchResults, targetAlbum, targetArtist) {
    if (!searchResults || searchResults.length === 0) return null;

    let bestMatch = null;
    let highestScore = 0;

    for (const item of searchResults) {
      // Calculate album name similarity
      let albumScore = this.calculateSimilarity(item.name.toLowerCase(), targetAlbum.toLowerCase());
      
      // Calculate artist similarity
      let artistScore = 0;
      if (targetArtist && item.artists) {
        const artistMatches = item.artists.some(artist => 
          this.calculateSimilarity(artist.name.toLowerCase(), targetArtist.toLowerCase()) > 0.7
        );
        if (artistMatches) artistScore = 0.4;
      }

      const totalScore = albumScore + artistScore;

      if (totalScore > highestScore && albumScore > 0.6) { // Minimum 60% album similarity
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
      .replace(/[^a-z0-9\s]/g, ' ')  // Replace special chars with spaces
      .replace(/\s+/g, ' ')          // Collapse multiple spaces
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

  async reviewAlbum(albumData) {
    const { id, album_name, artist_names, last_fetched } = albumData;
    
    // Use primary artist (first one)
    const primaryArtist = artist_names.split(', ')[0];
    
    logger.info(`\n🔍 Reviewing: "${album_name}" by ${primaryArtist} (ID: ${id})`);
    logger.info(`   Last fetched: ${last_fetched || 'Never'}`);
    
    try {
      const searchResults = await this.searchSpotifyBroad(album_name, primaryArtist);
      const bestMatch = this.findBestMatch(searchResults, album_name, primaryArtist);
      
      if (bestMatch) {
        const albumSimilarity = this.calculateSimilarity(bestMatch.name, album_name);
        const spotifyArtist = bestMatch.artists[0]?.name || 'Unknown';
        const newSpotifyUri = `spotify:album:${bestMatch.id}`;
        
        logger.info(`   ✅ POTENTIAL MATCH FOUND:`);
        logger.info(`      Spotify: "${bestMatch.name}" by ${spotifyArtist}`);
        logger.info(`      Similarity: ${Math.round(albumSimilarity * 100)}%`);
        logger.info(`      URI: ${newSpotifyUri}`);
        logger.info(`      Release Date: ${bestMatch.release_date || 'Unknown'}`);
        
        if (!this.testMode) {
          // Create external_ids record
          await this.pool.query(
            `INSERT INTO external_ids (entity_type, entity_id, source, external_id) 
             VALUES ($1, $2, $3, $4)`,
            ['album', id, 'spotify', newSpotifyUri]
          );
          
          // Update last_fetched
          await this.pool.query(
            `UPDATE albums SET last_fetched = NOW() WHERE id = $1`,
            [id]
          );
          
          this.createdCount++;
          logger.info(`   ✅ Created external_id record and updated last_fetched`);
        } else {
          logger.info(`   🧪 TEST: Would create external_id record`);
        }
        
        this.foundCount++;
      } else {
        logger.info(`   ❌ No suitable match found (likely not on Spotify)`);
        
        if (!this.testMode) {
          // Update last_fetched to mark as reviewed
          await this.pool.query(
            `UPDATE albums SET last_fetched = NOW() WHERE id = $1`,
            [id]
          );
          logger.info(`   ✅ Updated last_fetched to mark as reviewed`);
        }
      }
      
      this.reviewedCount++;
      
      // Rate limiting delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
    } catch (error) {
      logger.error(`   ❌ Error reviewing ${album_name}: ${error.message}`);
    }
  }

  async run(limit = 20) {
    try {
      await this.initialize();
      
      const albumsToReview = await this.findMissingAlbums(limit);
      
      if (albumsToReview.length === 0) {
        logger.info('✅ No albums found that need review!');
        return;
      }

      logger.info(`\n🚀 Reviewing ${albumsToReview.length} albums with missing external_ids...`);
      
      for (const album of albumsToReview) {
        await this.reviewAlbum(album);
      }

      // Final summary
      logger.info(`\n📊 Review Summary:`);
      logger.info(`   Albums reviewed: ${this.reviewedCount}`);
      logger.info(`   Matches found: ${this.foundCount}`);
      logger.info(`   External_ids created: ${this.createdCount}`);
      logger.info(`   Not found rate: ${Math.round(((this.reviewedCount - this.foundCount) / this.reviewedCount) * 100)}%`);

      if (this.testMode) {
        logger.info(`\n🧪 TEST MODE: No changes were made to the database`);
        logger.info(`Run without --test to apply the changes`);
      }

    } catch (error) {
      logger.error(`💥 Review failed: ${error.message}`);
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
🔍 Missing Album External IDs Review Script

This script reviews albums that don't have external_ids and tries 
multiple search strategies to find them on Spotify.

Usage:
  node review-missing-album-external-ids.js [options]

Options:
  --test, --dry-run    Test mode (no database changes)
  --limit=N           Review N albums (default: 20)
  --help, -h          Show this help

Examples:
  node review-missing-album-external-ids.js --test --limit=10
  node review-missing-album-external-ids.js --limit=50

Notes:
  - Uses multiple search strategies for better matching
  - Shows detailed match information for manual review
  - Many albums may be mixtapes/unofficial releases not on Spotify
  - Updates last_fetched for all reviewed albums
  `);
  process.exit(0);
}

// Run the reviewer
const reviewer = new MissingAlbumExternalIdsReviewer(testMode);
reviewer.run(limit).catch(error => {
  logger.error(`Fatal error: ${error.message}`);
  process.exit(1);
});