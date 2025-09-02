#!/usr/bin/env node

// Load environment variables
import 'dotenv/config';

import { initializeDatabase, getPool } from '../src/db/db.js';
import SpotifyService from '../src/services/spotify.js';
import logger from '../src/utils/logger.js';

class ExternalIdInvestigator {
  constructor() {
    this.spotifyService = new SpotifyService();
    this.pool = null;
  }

  async initialize() {
    logger.info(`🔍 Starting External IDs Investigation`);
    
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

  async investigateScope() {
    // Get counts of external_ids by type
    const countsQuery = `
      SELECT entity_type, source, COUNT(*) as count
      FROM external_ids 
      GROUP BY entity_type, source
      ORDER BY entity_type, source
    `;
    
    const counts = await this.pool.query(countsQuery);
    logger.info('📊 External IDs by type and source:');
    counts.rows.forEach(row => {
      logger.info(`   ${row.entity_type} (${row.source}): ${row.count}`);
    });

    return counts.rows;
  }

  async sampleSpotifyMatches(entityType, limit = 5) {
    logger.info(`\n🎯 Sampling ${entityType} Spotify matches (${limit} records):`);

    let entityTable, nameColumn;
    switch(entityType) {
      case 'track':
        entityTable = 'tracks';
        nameColumn = 'name';
        break;
      case 'artist':
        entityTable = 'artists';
        nameColumn = 'name';
        break;
      case 'album':
        entityTable = 'albums';
        nameColumn = 'name';
        break;
      default:
        logger.error(`Unknown entity type: ${entityType}`);
        return;
    }

    const sampleQuery = `
      SELECT 
        e.id as entity_id,
        e.name as entity_name,
        ei.external_id as spotify_uri
      FROM ${entityTable} e
      JOIN external_ids ei ON e.id = ei.entity_id
      WHERE ei.entity_type = $1 AND ei.source = 'spotify'
      ORDER BY RANDOM()
      LIMIT $2
    `;

    const samples = await this.pool.query(sampleQuery, [entityType, limit]);

    for (const sample of samples.rows) {
      const spotifyId = sample.spotify_uri.replace(`spotify:${entityType}:`, '');
      
      try {
        await this.spotifyService.ensureValidToken();
        
        let spotifyData;
        if (entityType === 'track') {
          const response = await fetch(`https://api.spotify.com/v1/tracks/${spotifyId}`, {
            headers: { 'Authorization': `Bearer ${this.spotifyService.accessToken}` }
          });
          spotifyData = response.ok ? await response.json() : null;
        } else if (entityType === 'artist') {
          const response = await fetch(`https://api.spotify.com/v1/artists/${spotifyId}`, {
            headers: { 'Authorization': `Bearer ${this.spotifyService.accessToken}` }
          });
          spotifyData = response.ok ? await response.json() : null;
        } else if (entityType === 'album') {
          const response = await fetch(`https://api.spotify.com/v1/albums/${spotifyId}`, {
            headers: { 'Authorization': `Bearer ${this.spotifyService.accessToken}` }
          });
          spotifyData = response.ok ? await response.json() : null;
        }

        const dbName = sample.entity_name;
        const spotifyName = spotifyData?.name || 'NOT FOUND';
        const match = dbName.toLowerCase() === spotifyName.toLowerCase();
        
        logger.info(`   ${match ? '✅' : '❌'} DB: "${dbName}" | Spotify: "${spotifyName}"`);
        
        if (!match && spotifyData) {
          const similarity = this.calculateSimilarity(dbName, spotifyName);
          logger.info(`      Similarity: ${Math.round(similarity * 100)}%`);
        }

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error) {
        logger.error(`   ❌ Error checking ${sample.spotify_uri}: ${error.message}`);
      }
    }
  }

  calculateSimilarity(str1, str2) {
    // Simple Levenshtein distance-based similarity
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = this.levenshteinDistance(longer.toLowerCase(), shorter.toLowerCase());
    return (longer.length - distance) / longer.length;
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

  async run() {
    try {
      await this.initialize();
      
      // Get overall scope
      const counts = await this.investigateScope();
      
      // Sample each entity type that has Spotify data
      for (const count of counts) {
        if (count.source === 'spotify' && count.count > 0) {
          await this.sampleSpotifyMatches(count.entity_type, 5);
        }
      }

      logger.info('\n📋 Investigation Summary:');
      logger.info('This gives you a sample of how many external_ids are correctly matched.');
      logger.info('Next steps:');
      logger.info('1. Review the matches above');
      logger.info('2. If many are wrong, run the fix script');
      logger.info('3. Re-run track enrichment after fixing');

    } catch (error) {
      logger.error(`💥 Investigation failed: ${error.message}`);
      throw error;
    } finally {
      if (this.pool) {
        await this.pool.end();
      }
    }
  }
}

// Run the investigation
const investigator = new ExternalIdInvestigator();
investigator.run().catch(error => {
  logger.error(`Fatal error: ${error.message}`);
  process.exit(1);
});