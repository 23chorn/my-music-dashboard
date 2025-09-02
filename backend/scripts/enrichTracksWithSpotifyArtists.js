#!/usr/bin/env node

// Load environment variables
import 'dotenv/config';

import { initializeDatabase, getPool } from '../src/db/db.js';
import SpotifyService from '../src/services/spotify.js';
import logger from '../src/utils/logger.js';

class TrackArtistEnricher {
  constructor(testMode = false) {
    this.testMode = testMode;
    this.spotifyService = new SpotifyService();
    this.processedCount = 0;
    this.updatedCount = 0;
    this.cleanedTracksCount = 0;
    this.pool = null;
  }

  async initialize() {
    logger.info(`🎵 Starting Track Artist Enrichment ${this.testMode ? '(TEST MODE - NO DATABASE CHANGES)' : ''}`);
    
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

  // Get tracks that have Spotify URIs but haven't been enriched yet
  async getUnenrichedTracksWithSpotifyUris(limit = 100) {
    const query = `
      SELECT DISTINCT
        t.id,
        t.name,
        ei.external_id as spotify_uri,
        COUNT(ta.artist_id) as current_artist_count
      FROM tracks t
      JOIN external_ids ei ON ei.entity_type = 'track' AND ei.entity_id = t.id AND ei.source = 'spotify'
      LEFT JOIN track_artists ta ON t.id = ta.track_id
      WHERE ei.external_id LIKE 'spotify:track:%'
      GROUP BY t.id, t.name, ei.external_id
      HAVING COUNT(ta.artist_id) <= 1  -- Only process tracks with 0 or 1 artists (likely need enrichment)
      ORDER BY t.id
      LIMIT $1
    `;
    
    try {
      const result = await this.pool.query(query, [limit]);
      logger.info(`📊 Found ${result.rows.length} unenriched tracks with Spotify URIs to process`);
      if (result.rows.length < limit) {
        logger.info(`ℹ️  Note: Only ${result.rows.length} tracks need enrichment (others already processed)`);
      }
      return result.rows;
    } catch (error) {
      logger.error(`Error fetching unenriched tracks: ${error.message}`);
      throw error;
    }
  }

  // Extract Spotify track ID from URI (spotify:track:4iV5W9uYEdYUVa79Axb7Rh)
  extractSpotifyId(uri) {
    return uri.replace('spotify:track:', '');
  }

  // Fetch track details from Spotify API
  async fetchSpotifyTrackDetails(spotifyId) {
    try {
      await this.spotifyService.ensureValidToken();
      
      const response = await fetch(`https://api.spotify.com/v1/tracks/${spotifyId}`, {
        headers: {
          'Authorization': `Bearer ${this.spotifyService.accessToken}`,
        },
      });

      if (!response.ok) {
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After') || 1;
          logger.warn(`⏳ Rate limited, waiting ${retryAfter} seconds`);
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
          return this.fetchSpotifyTrackDetails(spotifyId); // Retry
        }
        
        logger.error(`❌ Failed to fetch track ${spotifyId}: ${response.status}`);
        return null;
      }

      const data = await response.json();
      return data;
    } catch (error) {
      logger.error(`Error fetching Spotify track ${spotifyId}: ${error.message}`);
      return null;
    }
  }

  // Find or create artist and return ID
  async findOrCreateArtist(artistData) {
    if (this.testMode) {
      logger.info(`🧪 TEST: Would find/create artist: ${artistData.name}`);
      return `test_artist_${artistData.id}`;
    }

    try {
      // Check if artist already exists by Spotify ID
      let result = await this.pool.query(
        `SELECT entity_id FROM external_ids 
         WHERE entity_type = 'artist' AND source = 'spotify' AND external_id = $1`,
        [artistData.id]
      );

      if (result.rows.length > 0) {
        return result.rows[0].entity_id;
      }

      // Check if artist exists by name
      result = await this.pool.query(
        `SELECT id FROM artists WHERE LOWER(name) = LOWER($1)`,
        [artistData.name]
      );

      let artistId;
      if (result.rows.length > 0) {
        artistId = result.rows[0].id;
        
        // Update image if we have one and it's missing
        if (artistData.images && artistData.images.length > 0) {
          await this.pool.query(
            `UPDATE artists SET image_url = COALESCE(image_url, $1) WHERE id = $2`,
            [artistData.images[0].url, artistId]
          );
        }
      } else {
        // Create new artist
        const imageUrl = artistData.images && artistData.images.length > 0 ? artistData.images[0].url : null;
        result = await this.pool.query(
          `INSERT INTO artists (name, image_url) VALUES ($1, $2) RETURNING id`,
          [artistData.name, imageUrl]
        );
        artistId = result.rows[0].id;
        logger.info(`➕ Created new artist: ${artistData.name}`);
      }

      // Store Spotify ID mapping
      await this.pool.query(
        `INSERT INTO external_ids (entity_type, entity_id, source, external_id) 
         VALUES ('artist', $1, 'spotify', $2) 
         ON CONFLICT ON CONSTRAINT external_ids_unique_entity_source DO NOTHING`,
        [artistId, artistData.id]
      );

      return artistId;
    } catch (error) {
      logger.error(`Error finding/creating artist ${artistData.name}: ${error.message}`);
      throw error;
    }
  }

  // Store track-artist relationship
  async storeTrackArtistRelationship(trackId, artistId) {
    if (this.testMode) {
      logger.info(`🧪 TEST: Would store track-artist relationship: track ${trackId} -> artist ${artistId}`);
      return;
    }

    try {
      await this.pool.query(
        `INSERT INTO track_artists (track_id, artist_id) 
         VALUES ($1, $2) 
         ON CONFLICT (track_id, artist_id) DO NOTHING`,
        [trackId, artistId]
      );
    } catch (error) {
      logger.error(`Error storing track-artist relationship: ${error.message}`);
      throw error;
    }
  }

  // Clean track names by removing featuring artists
  cleanTrackName(trackName) {
    const originalName = trackName;
    
    // Patterns to match featuring artists (case insensitive)
    const patterns = [
      /\s*\(\s*feat\.?\s+[^)]+\)/gi,        // (feat. Artist)
      /\s*\(\s*featuring\s+[^)]+\)/gi,     // (featuring Artist)  
      /\s*\(\s*ft\.?\s+[^)]+\)/gi,         // (ft. Artist)
      /\s*\(\s*with\s+[^)]+\)/gi,          // (with Artist)
      /\s*feat\.?\s+.+$/gi,                // feat. Artist (at end)
      /\s*featuring\s+.+$/gi,              // featuring Artist (at end)
      /\s*ft\.?\s+.+$/gi,                  // ft. Artist (at end)
      /\s*with\s+.+$/gi,                   // with Artist (at end)
      /\s*-\s*feat\.?\s+.+$/gi,            // - feat. Artist
      /\s*-\s*featuring\s+.+$/gi,          // - featuring Artist
      /\s*-\s*ft\.?\s+.+$/gi,              // - ft. Artist
    ];

    let cleanedName = trackName;
    patterns.forEach(pattern => {
      cleanedName = cleanedName.replace(pattern, '');
    });

    // Clean up extra whitespace and trim
    cleanedName = cleanedName.replace(/\s+/g, ' ').trim();

    return {
      cleanedName,
      wasChanged: cleanedName !== originalName,
      originalName
    };
  }

  // Update track name in database
  async updateTrackName(trackId, cleanedName) {
    if (this.testMode) {
      logger.info(`🧪 TEST: Would update track name for track ${trackId} to: "${cleanedName}"`);
      return;
    }

    try {
      await this.pool.query(
        `UPDATE tracks SET name = $1 WHERE id = $2`,
        [cleanedName, trackId]
      );
    } catch (error) {
      logger.error(`Error updating track name: ${error.message}`);
      throw error;
    }
  }

  // Process a single track
  async processTrack(track) {
    const { id: trackId, name: trackName, spotify_uri } = track;
    const spotifyId = this.extractSpotifyId(spotify_uri);
    
    logger.info(`🎵 Processing: "${trackName}" (${spotifyId})`);

    try {
      // Fetch track details from Spotify
      const spotifyTrack = await this.fetchSpotifyTrackDetails(spotifyId);
      if (!spotifyTrack) {
        logger.error(`❌ Could not fetch Spotify data for track: ${trackName}`);
        return;
      }

      // Process all artists for this track
      const artistIds = [];
      for (const artistData of spotifyTrack.artists) {
        const artistId = await this.findOrCreateArtist(artistData);
        artistIds.push(artistId);
        
        // Store track-artist relationship
        await this.storeTrackArtistRelationship(trackId, artistId);
        logger.info(`🔗 Linked artist: ${artistData.name} -> track: ${trackName}`);
      }

      // Clean the track name
      const { cleanedName, wasChanged, originalName } = this.cleanTrackName(trackName);
      
      if (wasChanged) {
        await this.updateTrackName(trackId, cleanedName);
        logger.info(`✨ Cleaned track name: "${originalName}" -> "${cleanedName}"`);
        this.cleanedTracksCount++;
      }

      this.updatedCount++;
      logger.info(`✅ Successfully processed track: ${trackName} (${artistIds.length} artists)`);

    } catch (error) {
      logger.error(`❌ Error processing track ${trackName}: ${error.message}`);
    }

    this.processedCount++;

    // Add small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Main processing method
  async run(limit = 100) {
    try {
      await this.initialize();
      
      const tracks = await this.getUnenrichedTracksWithSpotifyUris(limit);
      
      if (tracks.length === 0) {
        logger.info('ℹ️ No tracks found with Spotify URIs to process');
        return;
      }

      logger.info(`🚀 Starting to process ${tracks.length} tracks...`);
      
      for (const track of tracks) {
        await this.processTrack(track);
      }

      // Final summary
      logger.info(`
🎉 Track Artist Enrichment Complete!
📊 Summary:
  - Tracks processed: ${this.processedCount}
  - Tracks updated: ${this.updatedCount}  
  - Track names cleaned: ${this.cleanedTracksCount}
  - Mode: ${this.testMode ? 'TEST (no changes made)' : 'PRODUCTION'}
      `);

    } catch (error) {
      logger.error(`💥 Script failed: ${error.message}`);
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

// Get limit from command line (e.g., --limit=50)
let limit = 100; // default
const limitArg = args.find(arg => arg.startsWith('--limit='));
if (limitArg) {
  limit = parseInt(limitArg.split('=')[1]);
  if (isNaN(limit) || limit <= 0) {
    logger.error('Invalid limit value. Using default of 100.');
    limit = 100;
  }
}

// Show help
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
🎵 Track Artist Enrichment Script

Usage:
  node enrichTracksWithSpotifyArtists.js [options]

Options:
  --test, --dry-run    Run in test mode (no database changes)
  --limit=N           Process N tracks (default: 100)
  --help, -h          Show this help

Examples:
  node enrichTracksWithSpotifyArtists.js --test
  node enrichTracksWithSpotifyArtists.js --limit=50
  node enrichTracksWithSpotifyArtists.js --test --limit=25
  `);
  process.exit(0);
}

// Run the enrichment
const enricher = new TrackArtistEnricher(testMode);
enricher.run(limit).catch(error => {
  logger.error(`Fatal error: ${error.message}`);
  process.exit(1);
});