#!/usr/bin/env node
// One-off backfill: many tracks have NULL (or wrong) track_number/disc_number
// because that data only ever came from whatever metadata happened to be
// attached to a "recently played" event, never from Spotify's authoritative
// album tracklist. That's why getAlbumTracklist's ORDER BY falls back to
// alphabetical for those tracks, scrambling album order.
//
// This fetches each album's real tracklist from Spotify (GET /albums/{id})
// and updates track_albums.track_number/disc_number to match, for tracks
// that are already in the DB. It does NOT create new track rows for
// never-played tracks (that's a separate, bigger product decision).
//
// Usage:
//   node scripts/backfill-track-numbers.js            # dry run, prints report only
//   node scripts/backfill-track-numbers.js --execute   # actually updates

import dotenv from 'dotenv';
dotenv.config();

import pkg from 'pg';
const { Pool } = pkg;
import SpotifyService from '../src/services/external/spotify/spotifyClient.js';

const EXECUTE = process.argv.includes('--execute');

function getPool() {
  const dbMode = process.env.DB_MODE || 'production';
  const databaseUrl = dbMode === 'test' ? process.env.TEST_DATABASE_URL : process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error(`Database URL not configured for mode: ${dbMode}`);
  return new Pool({
    connectionString: databaseUrl,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });
}

function normalize(name) {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

async function getAlbumsWithSpotifyId(pool) {
  const { rows } = await pool.query(`
    SELECT a.id AS album_id, a.name AS album_name, ei.external_id AS spotify_id
    FROM albums a
    JOIN external_ids ei ON ei.entity_type = 'album' AND ei.entity_id = a.id AND ei.source = 'spotify'
    ORDER BY a.id
  `);
  return rows;
}

async function main() {
  const pool = getPool();
  const spotify = new SpotifyService();
  spotify.setTokens(process.env.SPOTIFY_ACCESS_TOKEN, process.env.SPOTIFY_REFRESH_TOKEN);
  await spotify.ensureValidToken();

  console.log(EXECUTE ? '⚠️  EXECUTE mode: changes WILL be written\n' : '🔍 DRY RUN (pass --execute to apply)\n');

  const albums = await getAlbumsWithSpotifyId(pool);
  console.log(`Checking ${albums.length} albums with a Spotify ID...\n`);

  let albumsChanged = 0;
  let tracksUpdated = 0;
  let apiErrors = 0;
  let processed = 0;

  async function getAlbumWithRetry(spotifyId, maxRetries = 5) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await spotify.getAlbum(spotifyId);
      } catch (err) {
        if (err.status === 429 && attempt < maxRetries) {
          const waitMs = (err.retryAfter ? err.retryAfter * 1000 : 2000 * Math.pow(2, attempt));
          console.log(`  rate limited, waiting ${Math.round(waitMs / 1000)}s...`);
          await new Promise(resolve => setTimeout(resolve, waitMs));
          continue;
        }
        throw err;
      }
    }
  }

  for (const album of albums) {
    processed++;
    try {
      const spotifyAlbum = await getAlbumWithRetry(album.spotify_id);
      const spotifyTracks = spotifyAlbum?.tracks?.items || [];
      if (spotifyTracks.length === 0) continue;

      // Existing tracks on this album, matched by spotify id primarily, else exact name
      const { rows: dbTracks } = await pool.query(
        `
        SELECT t.id, t.name, ta.track_number, ta.disc_number,
          (SELECT external_id FROM external_ids WHERE entity_type='track' AND entity_id=t.id AND source='spotify') AS spotify_id
        FROM tracks t
        JOIN track_albums ta ON ta.track_id = t.id
        WHERE ta.album_id = $1
        `,
        [album.album_id]
      );

      const bySpotifyId = new Map(dbTracks.filter(t => t.spotify_id).map(t => [t.spotify_id, t]));
      const byName = new Map();
      for (const t of dbTracks) {
        const key = normalize(t.name);
        if (!byName.has(key)) byName.set(key, []);
        byName.get(key).push(t);
      }

      let albumHadChange = false;

      for (const st of spotifyTracks) {
        let match = bySpotifyId.get(st.id);
        if (!match) {
          const candidates = byName.get(normalize(st.name));
          if (candidates && candidates.length === 1) match = candidates[0];
        }
        if (!match) continue;

        const needsUpdate = match.track_number !== st.track_number || match.disc_number !== st.disc_number;
        if (needsUpdate) {
          console.log(
            `  "${st.name}" — ${album.album_name}: ${match.disc_number ?? '—'}/${match.track_number ?? '—'} -> ${st.disc_number}/${st.track_number}`
          );
          tracksUpdated++;
          albumHadChange = true;
          if (EXECUTE) {
            await pool.query(
              `UPDATE track_albums SET track_number = $1, disc_number = $2 WHERE track_id = $3 AND album_id = $4`,
              [st.track_number, st.disc_number, match.id, album.album_id]
            );
          }
        }
      }

      if (albumHadChange) albumsChanged++;
    } catch (err) {
      apiErrors++;
      console.error(`  ⚠️  ${album.album_name}: ${err.message}`);
    }

    if (processed % 25 === 0) {
      console.log(`progress: ${processed}/${albums.length} albums checked, ${tracksUpdated} track numbers ${EXECUTE ? 'updated' : 'would update'} so far`);
    }

    // Respect Spotify rate limits. Bumped from 300ms after two separate runs
    // tripped a many-hour Retry-After penalty (12.6h, then 8.8h) partway
    // through ~2800 albums — 300ms/req wasn't conservative enough.
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  console.log(`\nSummary: ${albumsChanged} albums with changes, ${tracksUpdated} track numbers ${EXECUTE ? 'updated' : 'would be updated'}, ${apiErrors} API errors.`);
  if (!EXECUTE) console.log('Re-run with --execute to apply.');

  await pool.end();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
