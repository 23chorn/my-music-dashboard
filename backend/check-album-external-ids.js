#!/usr/bin/env node

import { config } from 'dotenv';
import { initializeDatabase, getPool } from './src/db/connection.js';

config();

async function checkAlbumExternalIds() {
  try {
    await initializeDatabase();

    console.log('📊 Analyzing album external ID coverage...\n');

    // Check total albums vs albums with external IDs
    const totalAlbumsQuery = `SELECT COUNT(*) as total_albums FROM albums`;
    const albumsWithSpotifyQuery = `
      SELECT COUNT(DISTINCT a.id) as albums_with_spotify
      FROM albums a
      JOIN external_ids ei ON ei.entity_type = 'album'
        AND ei.entity_id = a.id
        AND ei.source = 'spotify'
    `;

    const [totalResult, spotifyResult] = await Promise.all([
      getPool().query(totalAlbumsQuery),
      getPool().query(albumsWithSpotifyQuery)
    ]);

    const totalAlbums = parseInt(totalResult.rows[0].total_albums);
    const albumsWithSpotify = parseInt(spotifyResult.rows[0].albums_with_spotify);
    const albumsWithoutSpotify = totalAlbums - albumsWithSpotify;
    const percentageWithSpotify = ((albumsWithSpotify / totalAlbums) * 100).toFixed(1);
    const percentageWithoutSpotify = ((albumsWithoutSpotify / totalAlbums) * 100).toFixed(1);

    console.log('📊 Album External ID Statistics:');
    console.log(`   Total albums in database: ${totalAlbums.toLocaleString()}`);
    console.log(`   Albums with Spotify IDs: ${albumsWithSpotify.toLocaleString()} (${percentageWithSpotify}%)`);
    console.log(`   Albums without Spotify IDs: ${albumsWithoutSpotify.toLocaleString()} (${percentageWithoutSpotify}%)`);

    // Check if these are albums that have been played
    const playedAlbumsWithoutSpotifyQuery = `
      SELECT COUNT(DISTINCT tal.album_id) as played_albums_without_spotify
      FROM track_albums tal
      JOIN tracks t ON tal.track_id = t.id
      JOIN plays p ON t.id = p.track_id
      LEFT JOIN external_ids ei ON ei.entity_type = 'album'
        AND ei.entity_id = tal.album_id
        AND ei.source = 'spotify'
      WHERE tal.album_id IS NOT NULL
        AND ei.external_id IS NULL
    `;

    const playedWithoutSpotifyResult = await getPool().query(playedAlbumsWithoutSpotifyQuery);
    const playedAlbumsWithoutSpotify = parseInt(playedWithoutSpotifyResult.rows[0].played_albums_without_spotify);

    console.log(`\n🎵 Played Albums Without Spotify IDs:`);
    console.log(`   Played albums missing Spotify IDs: ${playedAlbumsWithoutSpotify.toLocaleString()}`);
    console.log(`   These albums have tracks you've listened to but can't be enriched`);

    // Get some examples of played albums without Spotify IDs
    const examplesQuery = `
      SELECT DISTINCT
        a.id,
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
      LIMIT 10
    `;

    const examplesResult = await getPool().query(examplesQuery);

    console.log(`\n📋 Top played albums missing Spotify IDs:`);
    examplesResult.rows.forEach((album, i) => {
      const artists = album.artists || 'Unknown Artist';
      console.log(`   ${i+1}. "${album.album_name}" by ${artists} (${album.total_plays} plays)`);
    });

    console.log(`\n💡 Analysis:`);
    if (percentageWithoutSpotify > 50) {
      console.log(`   ⚠️  Over half of albums (${percentageWithoutSpotify}%) are missing Spotify IDs`);
    } else {
      console.log(`   ✓ Most albums (${percentageWithSpotify}%) have Spotify IDs`);
    }

    console.log(`   📈 ${albumsWithSpotify.toLocaleString()} albums can be enriched with full tracklists`);
    console.log(`   🔍 ${playedAlbumsWithoutSpotify.toLocaleString()} played albums need Spotify ID mapping`);

  } catch (error) {
    console.error('Error checking album external IDs:', error);
    process.exit(1);
  }

  process.exit(0);
}

checkAlbumExternalIds();