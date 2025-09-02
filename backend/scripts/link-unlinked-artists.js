#!/usr/bin/env node

// Load environment variables
import 'dotenv/config';

import { initializeDatabase, getPool } from '../src/db/db.js';
import SpotifyService from '../src/services/spotify.js';
import logger from '../src/utils/logger.js';

class UnlinkedArtistLinker {
  constructor(testMode = false) {
    this.testMode = testMode;
    this.spotifyService = new SpotifyService();
    this.pool = null;
    this.processedCount = 0;
    this.linkedCount = 0;
    this.notFoundCount = 0;
  }

  async initialize() {
    logger.info(`🔗 Linking Unlinked Artists ${this.testMode ? '(TEST MODE - NO DATABASE CHANGES)' : ''}`);
    
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

  async findUnlinkedArtists(limit = 20) {
    logger.info(`\n🔍 Finding artists without external_ids (limit: ${limit})...`);
    
    const query = `
      SELECT a.id, a.name, a.last_fetched
      FROM artists a 
      WHERE NOT EXISTS (
        SELECT 1 FROM external_ids ei 
        WHERE ei.entity_id = a.id 
          AND ei.entity_type = 'artist' 
          AND ei.source = 'spotify'
      )
      ORDER BY a.id
      LIMIT $1
    `;
    
    const result = await this.pool.query(query, [limit]);
    logger.info(`📊 Found ${result.rows.length} unlinked artists`);
    
    return result.rows;
  }

  async searchSpotify(artistName) {
    try {
      await this.spotifyService.ensureValidToken();
      
      const query = `"${artistName}"`;
      
      const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=artist&limit=5`, {
        headers: { 'Authorization': `Bearer ${this.spotifyService.accessToken}` }
      });

      if (!response.ok) {
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After') || 1;
          logger.warn(`⏳ Rate limited, waiting ${retryAfter} seconds`);
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
          return this.searchSpotify(artistName); // Retry
        }
        return null;
      }

      const data = await response.json();
      return data.artists?.items || [];
      
    } catch (error) {
      logger.error(`Error searching Spotify for artist "${artistName}": ${error.message}`);
      return null;
    }
  }

  findBestMatch(searchResults, targetName) {
    if (!searchResults || searchResults.length === 0) return null;

    let bestMatch = null;
    let highestScore = 0;

    for (const item of searchResults) {
      const score = this.calculateSimilarity(item.name.toLowerCase(), targetName.toLowerCase());

      if (score > highestScore && score > 0.7) { // Minimum 70% similarity
        highestScore = score;
        bestMatch = item;
      }
    }

    return bestMatch;
  }

  calculateSimilarity(str1, str2) {
    // Enhanced similarity that handles common variations
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

  async linkArtist(artist) {
    const { id, name } = artist;
    
    logger.info(`🔍 Processing artist: "${name}" (ID: ${id})`);
    
    try {
      // Search Spotify for correct match
      const searchResults = await this.searchSpotify(name);
      const bestMatch = this.findBestMatch(searchResults, name);
      
      if (bestMatch) {
        const newSpotifyUri = `spotify:artist:${bestMatch.id}`;
        const similarity = this.calculateSimilarity(bestMatch.name, name);
        
        logger.info(`   ✅ Found match: "${bestMatch.name}" (${Math.round(similarity * 100)}% similarity)`);
        logger.info(`   🔄 Creating external_id: ${newSpotifyUri}`);
        
        if (!this.testMode) {
          // Create new external_ids record
          await this.pool.query(
            `INSERT INTO external_ids (entity_type, entity_id, source, external_id) 
             VALUES ($1, $2, $3, $4)`,
            ['artist', id, 'spotify', newSpotifyUri]
          );
          
          // Update last_fetched
          await this.pool.query(
            `UPDATE artists SET last_fetched = NOW() WHERE id = $1`,
            [id]
          );
        } else {
          logger.info(`   🧪 TEST: Would create external_id record and update last_fetched`);
        }
        
        this.linkedCount++;
      } else {
        logger.info(`   ❌ No suitable match found on Spotify`);
        this.notFoundCount++;
        
        // Still update last_fetched so we skip this artist in future runs
        if (!this.testMode) {
          await this.pool.query(
            `UPDATE artists SET last_fetched = NOW() WHERE id = $1`,
            [id]
          );
        } else {
          logger.info(`   🧪 TEST: Would update last_fetched to mark as processed`);
        }
      }
      
      this.processedCount++;
      
      // Rate limiting delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
    } catch (error) {
      logger.error(`   ❌ Error processing ${name}: ${error.message}`);
    }
  }

  async run(limit = 20) {
    try {
      await this.initialize();
      
      const unlinkedArtists = await this.findUnlinkedArtists(limit);
      
      if (unlinkedArtists.length === 0) {
        logger.info('✅ No unlinked artists found!');
        return;
      }

      logger.info(`\n🚀 Processing ${unlinkedArtists.length} unlinked artists...`);
      
      for (const artist of unlinkedArtists) {
        await this.linkArtist(artist);
      }

      // Final summary
      logger.info(`\n📊 Summary:`);
      logger.info(`   Processed: ${this.processedCount}`);
      logger.info(`   Successfully linked: ${this.linkedCount}`);
      logger.info(`   Not found: ${this.notFoundCount}`);
      logger.info(`   Success rate: ${Math.round((this.linkedCount / this.processedCount) * 100)}%`);

      if (this.testMode) {
        logger.info(`\n🧪 TEST MODE: No changes were made to the database`);
        logger.info(`Run without --test to apply the changes`);
      }

    } catch (error) {
      logger.error(`💥 Link script failed: ${error.message}`);
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
🔗 Unlinked Artist Linking Script

Usage:
  node link-unlinked-artists.js [options]

Options:
  --test, --dry-run    Test mode (no database changes)
  --limit=N           Process N artists (default: 20)
  --help, -h          Show this help

Examples:
  node link-unlinked-artists.js --test --limit=10
  node link-unlinked-artists.js --limit=50
  `);
  process.exit(0);
}

// Run the linker
const linker = new UnlinkedArtistLinker(testMode);
linker.run(limit).catch(error => {
  logger.error(`Fatal error: ${error.message}`);
  process.exit(1);
});