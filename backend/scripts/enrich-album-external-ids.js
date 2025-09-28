#!/usr/bin/env node

import { config } from 'dotenv';
import { initializeDatabase, getPool } from '../src/db/connection.js';
import SpotifyService from '../src/services/spotify.js';
import logger from '../src/utils/logger.js';

// Load environment variables
config();

let spotifyService = null;
let processed = 0;
let matched = 0;
let errors = 0;

async function initializeSpotify() {
  try {
    spotifyService = new SpotifyService();
    // Use client credentials for search operations (doesn't need user auth)
    await spotifyService.getClientCredentialsToken();
    console.log('✅ Spotify service initialized with client credentials');
  } catch (error) {
    console.error('❌ Failed to initialize Spotify service:', error.message);
    console.log('💡 Make sure SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET are set');
    process.exit(1);
  }
}

async function getAlbumsWithoutSpotifyIds(limit = 50) {
  const query = `
    SELECT DISTINCT
      a.id as album_id,
      a.name as album_name,
      STRING_AGG(DISTINCT ar.name, ', ') as artists,
      COUNT(DISTINCT p.id) as total_plays
    FROM albums a
    JOIN track_albums tal ON a.id = tal.album_id
    JOIN tracks t ON tal.track_id = t.id
    JOIN plays p ON t.id = p.track_id
    LEFT JOIN album_artists aa ON a.id = aa.album_id
    LEFT JOIN artists ar ON aa.artist_id = ar.id
    LEFT JOIN external_ids ei ON ei.entity_type = 'album'
      AND ei.entity_id = a.id
      AND ei.source = 'spotify'
    WHERE ei.external_id IS NULL
    GROUP BY a.id, a.name
    ORDER BY total_plays DESC
    LIMIT $1
  `;

  const result = await getPool().query(query, [limit]);
  return result.rows;
}

async function searchSpotifyForAlbum(albumName, artistNames) {
  try {
    // Clean up the search query
    const cleanAlbumName = albumName.replace(/[()[\]]/g, '').trim();
    const cleanArtistNames = artistNames ? artistNames.split(',')[0].trim() : '';

    // Try different search strategies
    const searchQueries = [
      `album:"${cleanAlbumName}" artist:"${cleanArtistNames}"`,
      `"${cleanAlbumName}" "${cleanArtistNames}"`,
      `${cleanAlbumName} ${cleanArtistNames}`
    ];

    for (const query of searchQueries) {
      try {
        const searchResults = await spotifyService.searchAlbums(query, 10);

        if (searchResults && searchResults.albums && searchResults.albums.items.length > 0) {
          // Look for the best match
          for (const album of searchResults.albums.items) {
            const spotifyAlbumName = album.name.toLowerCase();
            const ourAlbumName = cleanAlbumName.toLowerCase();

            // Check if album names are similar
            if (spotifyAlbumName.includes(ourAlbumName) || ourAlbumName.includes(spotifyAlbumName) ||
                spotifyAlbumName === ourAlbumName) {

              // Check if artist matches
              const spotifyArtist = album.artists[0]?.name.toLowerCase() || '';
              const ourArtist = cleanArtistNames.toLowerCase();

              if (spotifyArtist.includes(ourArtist) || ourArtist.includes(spotifyArtist) ||
                  spotifyArtist === ourArtist) {
                return {
                  id: album.id,
                  name: album.name,
                  artist: album.artists[0]?.name,
                  confidence: 'high'
                };
              }
            }
          }

          // If no high confidence match, return the first result with lower confidence
          const firstResult = searchResults.albums.items[0];
          return {
            id: firstResult.id,
            name: firstResult.name,
            artist: firstResult.artists[0]?.name,
            confidence: 'low'
          };
        }
      } catch (searchError) {
        console.log(`   ⚠️  Search failed for query "${query}": ${searchError.message}`);
      }

      // Rate limiting delay between search attempts
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return null;
  } catch (error) {
    console.error(`   ❌ Error searching for album: ${error.message}`);
    return null;
  }
}

async function addSpotifyIdToAlbum(albumId, spotifyId) {
  try {
    // First check if it already exists
    const existingResult = await getPool().query(`
      SELECT 1 FROM external_ids
      WHERE entity_type = 'album' AND entity_id = $1 AND source = 'spotify'
    `, [albumId]);

    if (existingResult.rows.length > 0) {
      console.log(`   ℹ️  Album already has Spotify ID, skipping`);
      return true;
    }

    // Insert new record with proper Spotify URI format
    await getPool().query(`
      INSERT INTO external_ids (entity_type, entity_id, source, external_id)
      VALUES ('album', $1, 'spotify', $2)
    `, [albumId, `spotify:album:${spotifyId}`]);
    return true;
  } catch (error) {
    console.error(`   ❌ Error adding Spotify ID: ${error.message}`);
    return false;
  }
}

async function enrichAlbumWithSpotifyId(album) {
  try {
    const { album_id, album_name, artists, total_plays } = album;

    console.log(`\n🔍 Searching for "${album_name}" by ${artists || 'Unknown Artist'} (${total_plays} plays)`);

    const spotifyResult = await searchSpotifyForAlbum(album_name, artists);

    if (spotifyResult) {
      console.log(`   ✅ Found: "${spotifyResult.name}" by ${spotifyResult.artist} (${spotifyResult.confidence} confidence)`);
      console.log(`   📝 Spotify ID: ${spotifyResult.id}`);

      const success = await addSpotifyIdToAlbum(album_id, spotifyResult.id);
      if (success) {
        console.log(`   💾 Added Spotify ID to database`);
        matched++;
        return true;
      }
    } else {
      console.log(`   ❌ No match found on Spotify`);
    }

    return false;

  } catch (error) {
    console.error(`❌ Error enriching album ${album.album_name}:`, error.message);
    return false;
  }
}

async function enrichAlbumExternalIds() {
  try {
    await initializeDatabase();
    await initializeSpotify();

    console.log('🎼 Starting album Spotify ID enrichment...');
    console.log('   This will search Spotify for albums missing external IDs\\n');

    let batch = 1;
    let hasMore = true;
    const batchSize = 25; // Smaller batches to respect rate limits

    while (hasMore) {
      console.log(`\\n📦 Processing batch ${batch} (${batchSize} albums)...`);

      const albums = await getAlbumsWithoutSpotifyIds(batchSize);

      if (albums.length === 0) {
        console.log('✅ No more albums need Spotify ID enrichment');
        hasMore = false;
        break;
      }

      console.log(`Found ${albums.length} albums to enrich`);

      for (const album of albums) {
        processed++;

        const success = await enrichAlbumWithSpotifyId(album);

        if (!success) {
          errors++;
        }

        // Progress indicator
        if (processed % 10 === 0) {
          console.log(`\\n📊 Progress: ${processed} albums processed, ${matched} matched, ${errors} failed`);
        }

        // Rate limiting - longer delay between searches
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      batch++;

      // If we got less than the batch size, we're done
      if (albums.length < batchSize) {
        hasMore = false;
      }

      // Additional pause between batches
      if (hasMore) {
        console.log(`\\n⏸️  Pausing 5 seconds before next batch...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    // Final statistics
    console.log('\\n🎯 Album Spotify ID Enrichment Complete!');
    console.log(`   📊 Albums processed: ${processed.toLocaleString()}`);
    console.log(`   ✅ Albums matched: ${matched.toLocaleString()}`);
    console.log(`   ❌ Albums failed: ${errors.toLocaleString()}`);
    console.log(`   📈 Success rate: ${processed > 0 ? ((matched/processed)*100).toFixed(1) : 0}%`);

    console.log('\\n💡 Next steps:');
    console.log('   1. Run album tracklist enrichment for newly matched albums');
    console.log('   2. Review failed matches and consider manual mapping');
    console.log('   3. Run this script again to catch any remaining albums');

  } catch (error) {
    logger.error('Error in album Spotify ID enrichment:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\\n\\n⏹️  Enrichment stopped by user');
  console.log(`📊 Progress so far: ${processed} albums processed, ${matched} matched, ${errors} failed`);
  process.exit(0);
});

enrichAlbumExternalIds();