#!/usr/bin/env node

// Load environment variables
import 'dotenv/config';

import { initializeDatabase, getPool } from '../src/db/db.js';
import SpotifyService from '../src/services/spotify.js';
import logger from '../src/utils/logger.js';

class ExternalIdsFixer {
  constructor(testMode = false) {
    this.testMode = testMode;
    this.spotifyService = new SpotifyService();
    this.pool = null;
    this.processedCount = 0;
    this.fixedCount = 0;
    this.notFoundCount = 0;
  }

  async initialize() {
    logger.info(`🔧 Starting External IDs Fix ${this.testMode ? '(TEST MODE - NO DATABASE CHANGES)' : ''}`);
    
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

  async searchSpotify(entityType, name, artist = null) {
    try {
      await this.spotifyService.ensureValidToken();
      
      let query = `"${name}"`;
      if (artist && entityType !== 'artist') {
        query += ` artist:"${artist}"`;
      }
      
      const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=${entityType}&limit=5`, {
        headers: { 'Authorization': `Bearer ${this.spotifyService.accessToken}` }
      });

      if (!response.ok) {
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After') || 1;
          logger.warn(`⏳ Rate limited, waiting ${retryAfter} seconds`);
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
          return this.searchSpotify(entityType, name, artist); // Retry
        }
        return null;
      }

      const data = await response.json();
      return data[`${entityType}s`]?.items || [];
      
    } catch (error) {
      logger.error(`Error searching Spotify for ${entityType} "${name}": ${error.message}`);
      return null;
    }
  }

  findBestMatch(searchResults, targetName, targetArtist = null) {
    if (!searchResults || searchResults.length === 0) return null;

    let bestMatch = null;
    let highestScore = 0;

    for (const item of searchResults) {
      let score = this.calculateSimilarity(item.name.toLowerCase(), targetName.toLowerCase());
      
      // Boost score if artist matches (for tracks/albums)
      if (targetArtist && item.artists) {
        const hasMatchingArtist = item.artists.some(artist => 
          this.calculateSimilarity(artist.name.toLowerCase(), targetArtist.toLowerCase()) > 0.8
        );
        if (hasMatchingArtist) score += 0.3;
      }

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

  async fixEntity(entityType, limit = 50) {
    logger.info(`\n🎯 Fixing ${entityType} external IDs (batch of ${limit})...`);

    let query;
    switch(entityType) {
      case 'track':
        query = `
          SELECT t.id, t.name, ei.external_id, a.name as artist_name
          FROM tracks t
          JOIN external_ids ei ON t.id = ei.entity_id
          JOIN track_artists ta ON t.id = ta.track_id  
          JOIN artists a ON ta.artist_id = a.id
          WHERE ei.entity_type = 'track' AND ei.source = 'spotify'
          LIMIT $1
        `;
        break;
      case 'album':
        query = `
          SELECT al.id, al.name, ei.external_id, a.name as artist_name
          FROM albums al
          JOIN external_ids ei ON al.id = ei.entity_id
          JOIN album_artists aa ON al.id = aa.album_id  
          JOIN artists a ON aa.artist_id = a.id
          WHERE ei.entity_type = 'album' AND ei.source = 'spotify'
              AND (al.last_fetched IS NULL OR al.last_fetched < '2025-09-02'::date)
          LIMIT $1
        `;
        break;
      case 'artist':
        query = `
          SELECT a.id, a.name, ei.external_id, ei.entity_id
          FROM artists a
          JOIN external_ids ei ON a.id = ei.entity_id
            WHERE (a.last_fetched IS NULL OR a.last_fetched < '2025-09-02'::date)
          LIMIT $1
        `;
        break;
    }

    const entities = await this.pool.query(query, [limit]);
    
    if (entities.rows.length === 0) {
      logger.info(`   ✅ No ${entityType} entities found that need processing (all up to date)`);
      return 0;
    }
    
    logger.info(`   📊 Found ${entities.rows.length} ${entityType} entities to process (skipping those already processed today)`);
    
    for (const entity of entities.rows) {
      const { id, name, artist_name, entity_id } = entity;
      
      // Check for ID mismatch (only for artists since we added entity_id to that query)
      if (entityType === 'artist' && entity_id && id !== entity_id) {
        logger.warn(`   ⚠️  ID MISMATCH: artist.id=${id} but external_ids.entity_id=${entity_id} for "${name}"`);
      }
      
      logger.info(`🔍 Processing ${entityType}: "${name}" ${artist_name ? `by ${artist_name}` : ''}`);
      
      try {
        // Search Spotify for correct match
        const searchResults = await this.searchSpotify(entityType, name, artist_name);
        const bestMatch = this.findBestMatch(searchResults, name, artist_name);
        
        if (bestMatch) {
          const newSpotifyUri = `spotify:${entityType}:${bestMatch.id}`;
          const similarity = this.calculateSimilarity(bestMatch.name, name);
          
          logger.info(`   ✅ Found match: "${bestMatch.name}" (${Math.round(similarity * 100)}% similarity)`);
          logger.info(`   🔄 Updating URI: ${newSpotifyUri}`);
          
          if (!this.testMode) {
            // Update external_ids
            await this.pool.query(
              `UPDATE external_ids 
               SET external_id = $1 
               WHERE entity_type = $2 AND entity_id = $3 AND source = 'spotify'`,
              [newSpotifyUri, entityType, id]
            );
            
            // Update last_fetched for artists
            if (entityType === 'artist') {
              await this.pool.query(
                `UPDATE artists SET last_fetched = NOW() WHERE id = $1`,
                [id]
              );
            }
          }
          
          this.fixedCount++;
        } else {
          logger.info(`   ❌ No suitable match found on Spotify`);
          this.notFoundCount++;
          
          // Still update last_fetched for artists even if no match found, so we skip them in future runs
          if (!this.testMode && entityType === 'artist') {
            await this.pool.query(
              `UPDATE artists SET last_fetched = NOW() WHERE id = $1`,
              [id]
            );
          }
        }
        
        this.processedCount++;
        
        // Rate limiting delay
        await new Promise(resolve => setTimeout(resolve, 300));
        
      } catch (error) {
        logger.error(`   ❌ Error processing ${name}: ${error.message}`);
      }
    }
    
    return entities.rows.length;
  }

  async run(entityType = 'all', limit = 50) {
    try {
      await this.initialize();
      
      const entityTypes = entityType === 'all' ? ['artist', 'album', 'track'] : [entityType];
      
      for (const type of entityTypes) {
        const processed = await this.fixEntity(type, limit);
        if (processed < limit) {
          logger.info(`✅ Completed all ${type} entities`);
        }
      }

      logger.info(`\n📊 Summary:`);
      logger.info(`   Processed: ${this.processedCount}`);
      logger.info(`   Fixed: ${this.fixedCount}`);
      logger.info(`   Not found: ${this.notFoundCount}`);
      logger.info(`   Success rate: ${Math.round((this.fixedCount / this.processedCount) * 100)}%`);

      if (this.testMode) {
        logger.info(`\n🧪 TEST MODE: No changes were made to the database`);
        logger.info(`Run without --test to apply the fixes`);
      }

    } catch (error) {
      logger.error(`💥 Fix script failed: ${error.message}`);
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
const entityType = args.find(arg => ['artist', 'album', 'track', 'all'].includes(arg)) || 'all';
const limitArg = args.find(arg => arg.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 50;

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
🔧 External IDs Fix Script

Usage:
  node fix-external-ids.js [entity_type] [options]

Entity Types:
  all      Fix all entity types (default)
  artist   Fix only artist external IDs  
  album    Fix only album external IDs
  track    Fix only track external IDs

Options:
  --test, --dry-run    Test mode (no database changes)
  --limit=N           Process N entities per type (default: 50)
  --help, -h          Show this help

Examples:
  node fix-external-ids.js --test --limit=10
  node fix-external-ids.js track --limit=25
  node fix-external-ids.js all --limit=100
  `);
  process.exit(0);
}

// Run the fixer
const fixer = new ExternalIdsFixer(testMode);
fixer.run(entityType, limit).catch(error => {
  logger.error(`Fatal error: ${error.message}`);
  process.exit(1);
});