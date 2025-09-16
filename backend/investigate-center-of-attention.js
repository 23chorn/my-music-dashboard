import { initializeDatabase, getPool, closeDatabase } from './src/db/connection.js';

async function investigateCenterOfAttention() {
  try {
    await initializeDatabase();
    const pool = getPool();

    console.log('=== Investigating Center of Attention album ===');

    // Find the album
    const album = await pool.query(`
      SELECT al.id, al.name, al.release_date
      FROM albums al
      WHERE al.name ILIKE '%center of attention%'
    `);

    if (album.rows.length === 0) {
      console.log('No album found with "Center of Attention" in name');
      return;
    }

    const albumId = album.rows[0].id;
    console.log(`Found album: "${album.rows[0].name}" (ID: ${albumId}), Release: ${album.rows[0].release_date}`);

    // Get current album artists
    const albumArtists = await pool.query(`
      SELECT a.id, a.name
      FROM artists a
      JOIN album_artists aa ON a.id = aa.artist_id
      WHERE aa.album_id = $1
      ORDER BY a.name
    `, [albumId]);

    console.log('\nCurrent album artists:');
    albumArtists.rows.forEach(artist => {
      console.log(`  - ${artist.name} (ID: ${artist.id})`);
    });

    // Get all tracks in the album and their artists
    const tracks = await pool.query(`
      SELECT t.id, t.name as track_name, a.name as artist_name, ta.is_primary
      FROM tracks t
      JOIN track_albums tal ON t.id = tal.track_id
      JOIN track_artists ta ON t.id = ta.track_id
      JOIN artists a ON ta.artist_id = a.id
      WHERE tal.album_id = $1
      ORDER BY t.name, ta.is_primary DESC
    `, [albumId]);

    console.log('\nTracks and their artists:');
    const trackGroups = {};
    tracks.rows.forEach(track => {
      if (!trackGroups[track.track_name]) {
        trackGroups[track.track_name] = [];
      }
      trackGroups[track.track_name].push({
        artist: track.artist_name,
        isPrimary: track.is_primary
      });
    });

    Object.entries(trackGroups).forEach(([trackName, artists]) => {
      console.log(`  "${trackName}":`);
      artists.forEach(artist => {
        console.log(`    - ${artist.artist} (Primary: ${artist.isPrimary})`);
      });
    });

    // Search for Pete Rock and Ini artists
    const peteRockSearch = await pool.query(`
      SELECT id, name FROM artists WHERE name ILIKE '%pete rock%'
    `);

    const iniSearch = await pool.query(`
      SELECT id, name FROM artists WHERE name ILIKE '%ini%'
    `);

    console.log('\nPete Rock artists found:');
    peteRockSearch.rows.forEach(artist => {
      console.log(`  - ${artist.name} (ID: ${artist.id})`);
    });

    console.log('\nIni artists found:');
    iniSearch.rows.forEach(artist => {
      console.log(`  - ${artist.name} (ID: ${artist.id})`);
    });

    // Check if The Worship Initiative is a legitimate artist or if it's incorrectly assigned
    const worshipInitiative = await pool.query(`
      SELECT a.id, a.name, COUNT(tal.track_id) as track_count
      FROM artists a
      LEFT JOIN track_artists ta ON a.id = ta.artist_id
      LEFT JOIN track_albums tal ON ta.track_id = tal.track_id
      WHERE a.name ILIKE '%worship initiative%'
      GROUP BY a.id, a.name
    `);

    console.log('\nThe Worship Initiative artist info:');
    worshipInitiative.rows.forEach(artist => {
      console.log(`  - ${artist.name} (ID: ${artist.id}), Total tracks: ${artist.track_count}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await closeDatabase();
  }
}

investigateCenterOfAttention();