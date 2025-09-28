#!/usr/bin/env node

import { config } from 'dotenv';
import { initializeDatabase, getPool } from '../src/db/connection.js';
import SpotifyService from '../src/services/spotify.js';
import logger from '../src/utils/logger.js';

// Load environment variables
config();

let spotifyService = null;
let processed = 0;
let updated = 0;
let errors = 0;

async function initializeSpotify() {
  try {
    spotifyService = new SpotifyService();
    // Use client credentials for album data access (doesn't need user auth)
    await spotifyService.getClientCredentialsToken();
    console.log('✅ Spotify service initialized with client credentials');
  } catch (error) {
    console.error('❌ Failed to initialize Spotify service:', error.message);
    console.log('💡 Make sure SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET are set');
    process.exit(1);
  }
}

async function getTrackAlbumsNeedingEnrichment(limit = 100) {
  const query = `
    SELECT
      ta.track_id,
      ta.album_id,
      t.name as track_name,
      a.name as album_name,
      ei_track.external_id as spotify_track_id,
      ei_album.external_id as spotify_album_id
    FROM track_albums ta
    JOIN tracks t ON ta.track_id = t.id
    JOIN albums a ON ta.album_id = a.id
    LEFT JOIN external_ids ei_track ON ei_track.entity_type = 'track'
      AND ei_track.entity_id = ta.track_id
      AND ei_track.source = 'spotify'
    LEFT JOIN external_ids ei_album ON ei_album.entity_type = 'album'
      AND ei_album.entity_id = ta.album_id
      AND ei_album.source = 'spotify'
    WHERE ta.track_number IS NULL
      AND ei_track.external_id IS NOT NULL
      AND ei_album.external_id IS NOT NULL
    ORDER BY ta.track_id, ta.album_id
    LIMIT $1
  `;

  const result = await getPool().query(query, [limit]);
  return result.rows;
}

async function enrichTrackNumber(trackAlbum) {
  try {
    const { track_id, album_id, spotify_track_id, spotify_album_id, track_name, album_name } = trackAlbum;

    // Extract just the ID from spotify:track:id format if needed
    const trackId = spotify_track_id.replace('spotify:track:', '');

    // Get album tracks from Spotify to find track number
    const albumData = await spotifyService.getAlbum(spotify_album_id);

    if (!albumData || !albumData.tracks || !albumData.tracks.items) {
      console.log(`⚠️  No track data for album: ${album_name}`);
      return false;
    }

    // Find the track in the album's tracklist
    const spotifyTrack = albumData.tracks.items.find(track => track.id === trackId);

    if (!spotifyTrack) {
      console.log(`⚠️  Track "${track_name}" not found in album "${album_name}" tracklist`);
      return false;
    }

    // Update the track_albums table with track number and disc number
    const updateQuery = `
      UPDATE track_albums
      SET track_number = $1, disc_number = $2
      WHERE track_id = $3 AND album_id = $4
    `;

    await getPool().query(updateQuery, [
      spotifyTrack.track_number,
      spotifyTrack.disc_number,
      track_id,
      album_id
    ]);

    console.log(`✅ Updated "${track_name}" - Track ${spotifyTrack.track_number}, Disc ${spotifyTrack.disc_number}`);
    return true;

  } catch (error) {
    console.error(`❌ Error enriching track ${trackAlbum.track_name}:`, error.message);
    return false;
  }
}

async function enrichTrackNumbers() {
  try {
    await initializeDatabase();
    await initializeSpotify();

    console.log('🎵 Starting track number enrichment...\n');

    let batch = 1;
    let hasMore = true;
    const batchSize = 50; // Process in smaller batches to respect rate limits

    while (hasMore) {
      console.log(`\n📦 Processing batch ${batch} (${batchSize} records)...`);

      const trackAlbums = await getTrackAlbumsNeedingEnrichment(batchSize);

      if (trackAlbums.length === 0) {
        console.log('✅ No more track-album relationships need enrichment');
        hasMore = false;
        break;
      }

      console.log(`Found ${trackAlbums.length} track-album relationships to enrich`);

      for (const trackAlbum of trackAlbums) {
        processed++;

        const success = await enrichTrackNumber(trackAlbum);

        if (success) {
          updated++;
        } else {
          errors++;
        }

        // Progress indicator
        if (processed % 10 === 0) {
          console.log(`📊 Progress: ${processed} processed, ${updated} updated, ${errors} errors`);
        }

        // Rate limiting - wait between requests
        await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
      }

      batch++;

      // If we got less than the batch size, we're done
      if (trackAlbums.length < batchSize) {
        hasMore = false;
      }
    }

    // Final statistics
    console.log('\n🎯 Track Number Enrichment Complete!');
    console.log(`   📊 Total processed: ${processed.toLocaleString()}`);
    console.log(`   ✅ Successfully updated: ${updated.toLocaleString()}`);
    console.log(`   ❌ Errors: ${errors.toLocaleString()}`);
    console.log(`   📈 Success rate: ${processed > 0 ? ((updated/processed)*100).toFixed(1) : 0}%`);

    // Run check script to show final status
    console.log('\n📋 Running final track numbers check...');
    await new Promise(resolve => setTimeout(resolve, 1000));

  } catch (error) {
    logger.error('Error in track number enrichment:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n⏹️  Enrichment stopped by user');
  console.log(`📊 Progress so far: ${processed} processed, ${updated} updated, ${errors} errors`);
  process.exit(0);
});

enrichTrackNumbers();