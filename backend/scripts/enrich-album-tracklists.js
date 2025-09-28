#!/usr/bin/env node

import { config } from 'dotenv';
import { initializeDatabase, getPool } from '../src/db/connection.js';
import SpotifyService from '../src/services/spotify.js';
import logger from '../src/utils/logger.js';

// Load environment variables
config();

let spotifyService = null;
let processed = 0;
let albumsUpdated = 0;
let tracksAdded = 0;
let errors = 0;

async function initializeSpotify() {
  try {
    spotifyService = new SpotifyService();
    await spotifyService.ensureValidToken();
    console.log('✅ Spotify service initialized');
  } catch (error) {
    console.error('❌ Failed to initialize Spotify service:', error.message);
    console.log('💡 Try refreshing your Spotify tokens first');
    process.exit(1);
  }
}

async function getAlbumsNeedingEnrichment(limit = 50) {
  const query = `
    SELECT DISTINCT
      a.id as album_id,
      a.name as album_name,
      ei.external_id as spotify_album_id,
      STRING_AGG(DISTINCT ar.name, ', ') as artists,
      COUNT(ta.track_id) as current_track_count
    FROM albums a
    JOIN external_ids ei ON ei.entity_type = 'album'
      AND ei.entity_id = a.id
      AND ei.source = 'spotify'
    LEFT JOIN track_albums ta ON ta.album_id = a.id
    LEFT JOIN album_artists aa ON aa.album_id = a.id
    LEFT JOIN artists ar ON ar.id = aa.artist_id
    WHERE ei.external_id IS NOT NULL
    GROUP BY a.id, a.name, ei.external_id
    HAVING COUNT(ta.track_id) > 0  -- Only albums that have some tracks played
    ORDER BY COUNT(ta.track_id) ASC  -- Start with albums that have fewer tracks
    LIMIT $1
  `;

  const result = await getPool().query(query, [limit]);
  return result.rows;
}

async function findOrCreateTrack(trackData, albumId) {
  const { name, duration_ms, popularity, external_ids, artists } = trackData;

  // First, try to find existing track by Spotify ID
  const spotifyId = external_ids?.spotify;
  if (spotifyId) {
    const existingQuery = `
      SELECT t.id
      FROM tracks t
      JOIN external_ids ei ON ei.entity_type = 'track'
        AND ei.entity_id = t.id
        AND ei.source = 'spotify'
        AND ei.external_id = $1
    `;
    const existingResult = await getPool().query(existingQuery, [spotifyId]);

    if (existingResult.rows.length > 0) {
      return existingResult.rows[0].id;
    }
  }

  // Create new track
  const insertTrackQuery = `
    INSERT INTO tracks (name, duration_ms, popularity)
    VALUES ($1, $2, $3)
    RETURNING id
  `;

  const trackResult = await getPool().query(insertTrackQuery, [
    name,
    duration_ms,
    popularity || null
  ]);

  const trackId = trackResult.rows[0].id;

  // Add Spotify external ID if available
  if (spotifyId) {
    await getPool().query(`
      INSERT INTO external_ids (entity_type, entity_id, source, external_id)
      VALUES ('track', $1, 'spotify', $2)
    `, [trackId, spotifyId]);
  }

  // Link track to artists
  if (artists && artists.length > 0) {
    for (const [index, artistData] of artists.entries()) {
      const artistId = await findOrCreateArtist(artistData);

      await getPool().query(`
        INSERT INTO track_artists (track_id, artist_id, is_primary)
        VALUES ($1, $2, $3)
        ON CONFLICT (track_id, artist_id) DO NOTHING
      `, [trackId, artistId, index === 0]); // First artist is primary
    }
  }

  return trackId;
}

async function findOrCreateArtist(artistData) {
  const { name, external_ids } = artistData;
  const spotifyId = external_ids?.spotify;

  // Try to find existing artist by Spotify ID
  if (spotifyId) {
    const existingQuery = `
      SELECT a.id
      FROM artists a
      JOIN external_ids ei ON ei.entity_type = 'artist'
        AND ei.entity_id = a.id
        AND ei.source = 'spotify'
        AND ei.external_id = $1
    `;
    const existingResult = await getPool().query(existingQuery, [spotifyId]);

    if (existingResult.rows.length > 0) {
      return existingResult.rows[0].id;
    }
  }

  // Try to find by name (fuzzy match)
  const nameQuery = `
    SELECT id FROM artists WHERE LOWER(name) = LOWER($1) LIMIT 1
  `;
  const nameResult = await getPool().query(nameQuery, [name]);

  if (nameResult.rows.length > 0) {
    // Add Spotify ID to existing artist if we have it
    if (spotifyId) {
      await getPool().query(`
        INSERT INTO external_ids (entity_type, entity_id, source, external_id)
        VALUES ('artist', $1, 'spotify', $2)
        ON CONFLICT (entity_type, entity_id, source, external_id) DO NOTHING
      `, [nameResult.rows[0].id, spotifyId]);
    }
    return nameResult.rows[0].id;
  }

  // Create new artist
  const insertQuery = `
    INSERT INTO artists (name) VALUES ($1) RETURNING id
  `;
  const artistResult = await getPool().query(insertQuery, [name]);
  const artistId = artistResult.rows[0].id;

  // Add Spotify external ID if available
  if (spotifyId) {
    await getPool().query(`
      INSERT INTO external_ids (entity_type, entity_id, source, external_id)
      VALUES ('artist', $1, 'spotify', $2)
    `, [artistId, spotifyId]);
  }

  return artistId;
}

async function enrichAlbumTracklist(album) {
  try {
    const { album_id, album_name, spotify_album_id, artists, current_track_count } = album;

    console.log(`\n🎵 Processing "${album_name}" by ${artists || 'Unknown Artist'}`);
    console.log(`   Current tracks: ${current_track_count}, Spotify ID: ${spotify_album_id}`);

    // Get full album data from Spotify
    const albumData = await spotifyService.getAlbum(spotify_album_id);

    if (!albumData || !albumData.tracks || !albumData.tracks.items) {
      console.log(`   ⚠️  No track data available`);
      return false;
    }

    const spotifyTracks = albumData.tracks.items;
    console.log(`   📋 Found ${spotifyTracks.length} tracks on Spotify`);

    let newTracksAdded = 0;

    for (const spotifyTrack of spotifyTracks) {
      try {
        // Prepare track data
        const trackData = {
          name: spotifyTrack.name,
          duration_ms: spotifyTrack.duration_ms,
          popularity: spotifyTrack.popularity || null,
          external_ids: {
            spotify: spotifyTrack.id
          },
          artists: spotifyTrack.artists ? spotifyTrack.artists.map(artist => ({
            name: artist.name,
            external_ids: {
              spotify: artist.id
            }
          })) : []
        };

        // Find or create the track
        const trackId = await findOrCreateTrack(trackData, album_id);

        // Check if track-album relationship already exists
        const relationshipQuery = `
          SELECT 1 FROM track_albums
          WHERE track_id = $1 AND album_id = $2
        `;
        const relationshipResult = await getPool().query(relationshipQuery, [trackId, album_id]);

        if (relationshipResult.rows.length === 0) {
          // Add track to album with track number and disc number
          await getPool().query(`
            INSERT INTO track_albums (track_id, album_id, track_number, disc_number)
            VALUES ($1, $2, $3, $4)
          `, [trackId, album_id, spotifyTrack.track_number, spotifyTrack.disc_number]);

          newTracksAdded++;
        }

      } catch (trackError) {
        console.error(`   ❌ Error processing track "${spotifyTrack.name}":`, trackError.message);
        errors++;
      }

      // Small delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    if (newTracksAdded > 0) {
      console.log(`   ✅ Added ${newTracksAdded} new tracks to album`);
      tracksAdded += newTracksAdded;
      albumsUpdated++;
    } else {
      console.log(`   ✓ Album already complete`);
    }

    return true;

  } catch (error) {
    console.error(`❌ Error enriching album ${album.album_name}:`, error.message);
    return false;
  }
}

async function enrichAlbumTracklists() {
  try {
    await initializeDatabase();
    await initializeSpotify();

    console.log('🎼 Starting album tracklist enrichment...');
    console.log('   This will add missing tracks to albums based on Spotify data\n');

    let batch = 1;
    let hasMore = true;
    const batchSize = 25; // Smaller batches to respect rate limits

    while (hasMore) {
      console.log(`\n📦 Processing batch ${batch} (${batchSize} albums)...`);

      const albums = await getAlbumsNeedingEnrichment(batchSize);

      if (albums.length === 0) {
        console.log('✅ No more albums need tracklist enrichment');
        hasMore = false;
        break;
      }

      console.log(`Found ${albums.length} albums to enrich`);

      for (const album of albums) {
        processed++;

        const success = await enrichAlbumTracklist(album);

        if (!success) {
          errors++;
        }

        // Progress indicator
        if (processed % 5 === 0) {
          console.log(`\n📊 Progress: ${processed} albums processed, ${albumsUpdated} updated, ${tracksAdded} tracks added`);
        }

        // Rate limiting - longer delay between albums
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      batch++;

      // If we got less than the batch size, we're done
      if (albums.length < batchSize) {
        hasMore = false;
      }

      // Additional pause between batches
      if (hasMore) {
        console.log(`\n⏸️  Pausing 5 seconds before next batch...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    // Final statistics
    console.log('\n🎯 Album Tracklist Enrichment Complete!');
    console.log(`   📊 Albums processed: ${processed.toLocaleString()}`);
    console.log(`   ✅ Albums updated: ${albumsUpdated.toLocaleString()}`);
    console.log(`   🎵 New tracks added: ${tracksAdded.toLocaleString()}`);
    console.log(`   ❌ Errors: ${errors.toLocaleString()}`);
    console.log(`   📈 Success rate: ${processed > 0 ? ((albumsUpdated/processed)*100).toFixed(1) : 0}%`);

    console.log('\n💡 Next steps:');
    console.log('   1. Update album page UI to show complete tracklists');
    console.log('   2. Display play counts next to each track');
    console.log('   3. Consider running this enrichment periodically for new albums');

  } catch (error) {
    logger.error('Error in album tracklist enrichment:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n⏹️  Enrichment stopped by user');
  console.log(`📊 Progress so far: ${processed} albums processed, ${albumsUpdated} updated, ${tracksAdded} tracks added`);
  process.exit(0);
});

enrichAlbumTracklists();