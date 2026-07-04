#!/usr/bin/env node

// Pulls the account's full Last.fm scrobble history once and caches it
// locally as {uts, artist, track, album}. Used by fix-merged-track-plays.js
// to look up which real song was actually playing at a given played_at
// timestamp, since our own `plays` table only stores track_id + played_at.
//
// Last.fm scrobble timestamps, when present, have been verified to match
// our played_at exactly. Coverage isn't complete though — Last.fm's own
// reported total (82,332 at time of writing) is well short of our 129,646
// plays, so a meaningful fraction of plays will have no scrobble to match
// against. That's expected; fix-merged-track-plays.js leaves those alone.

import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.join(__dirname, '.cache');
const CACHE_FILE = path.join(CACHE_DIR, 'lastfm-history.json');

const API_KEY = process.env.LASTFM_API_KEY;
const USERNAME = process.env.LASTFM_USERNAME;
const BASE_URL = 'https://ws.audioscrobbler.com/2.0/';
const REQUEST_DELAY_MS = 250; // ~4 req/sec, well under Last.fm's informal rate limit

async function fetchPage(page, retries = 3) {
  const params = new URLSearchParams({
    method: 'user.getrecenttracks',
    user: USERNAME,
    api_key: API_KEY,
    format: 'json',
    limit: '200',
    page: String(page)
  });

  let response;
  try {
    response = await fetch(`${BASE_URL}?${params}`, { signal: AbortSignal.timeout(15000) });
  } catch (error) {
    if (retries > 0) {
      await new Promise(r => setTimeout(r, 1000));
      return fetchPage(page, retries - 1);
    }
    throw new Error(`Last.fm request timed out on page ${page}: ${error.message}`);
  }

  if (!response.ok) {
    if (retries > 0) {
      await new Promise(r => setTimeout(r, 1000));
      return fetchPage(page, retries - 1);
    }
    throw new Error(`Last.fm API error ${response.status} on page ${page}`);
  }

  const data = await response.json();
  if (data.error) throw new Error(`Last.fm API error: ${data.message}`);
  return data.recenttracks;
}

async function main() {
  if (!API_KEY || !USERNAME) throw new Error('LASTFM_API_KEY / LASTFM_USERNAME not configured');

  console.log(`Fetching full Last.fm scrobble history for ${USERNAME}...\n`);

  const first = await fetchPage(1);
  const totalPages = Number(first['@attr'].totalPages);
  const total = Number(first['@attr'].total);
  console.log(`${total} scrobbles across ${totalPages} pages\n`);

  const scrobbles = [];
  const collect = (recenttracks) => {
    const tracks = Array.isArray(recenttracks.track) ? recenttracks.track : [recenttracks.track].filter(Boolean);
    for (const t of tracks) {
      if (!t.date?.uts) continue; // skip "now playing" entry with no timestamp
      scrobbles.push({
        uts: Number(t.date.uts),
        track: t.name,
        artist: t.artist?.['#text'] || t.artist?.name || '',
        album: t.album?.['#text'] || ''
      });
    }
  };

  collect(first);

  for (let page = 2; page <= totalPages; page++) {
    if (page % 20 === 0) console.log(`   ...page ${page}/${totalPages}`);
    const recenttracks = await fetchPage(page);
    collect(recenttracks);
    await new Promise(r => setTimeout(r, REQUEST_DELAY_MS));
  }

  scrobbles.sort((a, b) => a.uts - b.uts);

  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(CACHE_FILE, JSON.stringify(scrobbles));

  const first_ts = scrobbles[0] ? new Date(scrobbles[0].uts * 1000).toISOString() : 'n/a';
  const last_ts = scrobbles.at(-1) ? new Date(scrobbles.at(-1).uts * 1000).toISOString() : 'n/a';
  console.log(`\nCached ${scrobbles.length} scrobbles to ${CACHE_FILE}`);
  console.log(`Date range: ${first_ts} to ${last_ts}`);
}

main().catch(error => {
  console.error('Error:', error.message);
  process.exitCode = 1;
});
