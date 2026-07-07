#!/usr/bin/env node
// Read-only audit: finds tracks linked to more than one album where the
// albums' credited artists don't overlap at all — a sign the track row is
// cross-contaminated with a completely different song of the same generic
// title (e.g. "Intro", "The One"), rather than a legitimate case of the same
// recording appearing on a deluxe edition / compilation / soundtrack.
//
// This does NOT fix anything — it only reports, since telling apart
// "legit reissue" from "wrong cross-link" reliably needs checking the
// track's stored Spotify ID against the real Spotify catalog (blocked by
// today's rate limit) or manual judgment, same as the Dune/Kanye case.
//
// Usage: node scripts/audit-track-album-crosslinks.js

import dotenv from 'dotenv';
dotenv.config();

import pkg from 'pg';
const { Pool } = pkg;

function getPool() {
  const dbMode = process.env.DB_MODE || 'production';
  const databaseUrl = dbMode === 'test' ? process.env.TEST_DATABASE_URL : process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error(`Database URL not configured for mode: ${dbMode}`);
  return new Pool({
    connectionString: databaseUrl,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });
}

async function main() {
  const pool = getPool();

  const { rows: candidates } = await pool.query(`
    SELECT t.id, t.name, count(DISTINCT ta.album_id) AS album_count
    FROM tracks t
    JOIN track_albums ta ON ta.track_id = t.id
    GROUP BY t.id, t.name
    HAVING count(DISTINCT ta.album_id) > 1
    ORDER BY album_count DESC
  `);

  console.log(`Checking ${candidates.length} tracks linked to more than one album...\n`);

  let suspects = 0;
  for (const c of candidates) {
    const { rows: albums } = await pool.query(
      `
      SELECT al.id, al.name, (SELECT external_id FROM external_ids WHERE entity_type='album' AND entity_id=al.id AND source='spotify') as spotify_id,
        (SELECT array_agg(artist_id) FROM album_artists WHERE album_id = al.id) as artist_ids
      FROM albums al
      JOIN track_albums ta ON ta.album_id = al.id
      WHERE ta.track_id = $1
      `,
      [c.id]
    );

    const sets = albums.map(a => new Set(a.artist_ids || []));
    let disjoint = true;
    for (let i = 0; i < sets.length && disjoint; i++) {
      for (let j = i + 1; j < sets.length; j++) {
        const a = sets[i], b = sets[j];
        if (a.size > 0 && b.size > 0 && [...a].some(x => b.has(x))) {
          disjoint = false;
          break;
        }
      }
    }

    if (disjoint) {
      suspects++;
      const { rows: plays } = await pool.query('SELECT count(*) AS n FROM plays WHERE track_id = $1', [c.id]);
      const { rows: spotifyRows } = await pool.query(
        `SELECT external_id FROM external_ids WHERE entity_type='track' AND entity_id=$1 AND source='spotify'`,
        [c.id]
      );
      console.log(`SUSPECT: id=${c.id} "${c.name}" (${c.album_count} unrelated albums, ${plays[0].n} plays, spotify=${spotifyRows[0]?.external_id || 'none'})`);
      for (const a of albums) {
        console.log(`    album id=${a.id} "${a.name}"`);
      }
    }
  }

  console.log(`\n${suspects} suspect tracks out of ${candidates.length} multi-album tracks (rest are legit: deluxe editions, compilations, soundtracks, etc.)`);
  await pool.end();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
