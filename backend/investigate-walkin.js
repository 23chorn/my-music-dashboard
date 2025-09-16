import { initializeDatabase, getPool, closeDatabase } from './src/db/connection.js';

async function investigateWalkinTrack() {
  try {
    await initializeDatabase();
    const pool = getPool();

    console.log('=== Investigating Walkin track status ===');

    // Find all Walkin tracks
    const walkinResult = await pool.query(`
      SELECT t.id, t.name, t.duration_ms, ta.artist_id, a.name as artist_name, ta.is_primary
      FROM tracks t
      LEFT JOIN track_artists ta ON t.id = ta.track_id
      LEFT JOIN artists a ON ta.artist_id = a.id
      WHERE t.name ILIKE '%walkin%'
      ORDER BY t.id, ta.is_primary DESC
    `);

    console.log('\nWalkin tracks found:');
    walkinResult.rows.forEach(row => {
      console.log(`  Track ID: ${row.id}, Name: "${row.name}", Artist: ${row.artist_name}, Primary: ${row.is_primary}`);
    });

    // Check if any Walkin tracks are still orphaned (no album association)
    const orphanedWalkin = await pool.query(`
      SELECT t.id, t.name, COUNT(tal.album_id) as album_count
      FROM tracks t
      LEFT JOIN track_albums tal ON t.id = tal.track_id
      WHERE t.name ILIKE '%walkin%'
      GROUP BY t.id, t.name
      HAVING COUNT(tal.album_id) = 0
    `);

    console.log('\nOrphaned Walkin tracks (no album):');
    orphanedWalkin.rows.forEach(row => {
      console.log(`  Track ID: ${row.id}, Name: "${row.name}"`);
    });

    // For each orphaned Walkin track, check what albums the artist has released
    for (const track of orphanedWalkin.rows) {
      console.log(`\n--- Checking potential albums for Track ID ${track.id}: "${track.name}" ---`);

      const artistAlbums = await pool.query(`
        SELECT DISTINCT al.id, al.name, al.release_date, COUNT(tal.track_id) as track_count
        FROM albums al
        JOIN album_artists aa ON al.id = aa.album_id
        JOIN track_artists ta ON aa.artist_id = ta.artist_id
        JOIN track_albums tal ON al.id = tal.album_id
        WHERE ta.track_id = $1 AND ta.is_primary = true
        GROUP BY al.id, al.name, al.release_date
        ORDER BY al.release_date DESC
      `, [track.id]);

      console.log(`  Found ${artistAlbums.rows.length} potential albums from the same artist:`);
      artistAlbums.rows.forEach(album => {
        console.log(`    Album ID: ${album.id}, Name: "${album.name}", Release: ${album.release_date}, Tracks: ${album.track_count}`);
      });

      // Check if the track has play history to estimate release timeframe
      const playHistory = await pool.query(`
        SELECT MIN(played_at) as first_play, MAX(played_at) as last_play, COUNT(*) as play_count
        FROM plays
        WHERE track_id = $1
      `, [track.id]);

      if (playHistory.rows[0].first_play) {
        const firstPlay = new Date(playHistory.rows[0].first_play * 1000);
        const lastPlay = new Date(playHistory.rows[0].last_play * 1000);
        console.log(`  Play history: First: ${firstPlay.toISOString().split('T')[0]}, Last: ${lastPlay.toISOString().split('T')[0]}, Count: ${playHistory.rows[0].play_count}`);
      }
    }

    // Check current total orphaned track count
    const orphanedCount = await pool.query(`
      SELECT COUNT(*) as count
      FROM tracks t
      LEFT JOIN track_albums tal ON t.id = tal.track_id
      WHERE tal.album_id IS NULL
    `);

    console.log(`\n=== Summary ===`);
    console.log(`Total orphaned tracks: ${orphanedCount.rows[0].count}`);
    console.log(`Orphaned Walkin tracks: ${orphanedWalkin.rows.length}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await closeDatabase();
  }
}

investigateWalkinTrack();