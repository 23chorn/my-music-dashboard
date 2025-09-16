import { initializeDatabase, getPool, closeDatabase } from './src/db/connection.js';

async function fixCenterOfAttention() {
  try {
    await initializeDatabase();
    const pool = getPool();

    console.log('=== Fixing Center of Attention album ===');

    const albumId = 6167;
    const worshipInitiativeId = 2901;
    const iniId = 1420;
    const peteRockId = 3078;

    console.log('Step 1: Updating album artists...');

    // Remove The Worship Initiative from album artists
    await pool.query(
      'DELETE FROM album_artists WHERE album_id = $1 AND artist_id = $2',
      [albumId, worshipInitiativeId]
    );
    console.log('✓ Removed The Worship Initiative from album artists');

    // Add InI as album artist
    const iniAlbumExists = await pool.query(
      'SELECT 1 FROM album_artists WHERE album_id = $1 AND artist_id = $2',
      [albumId, iniId]
    );

    if (iniAlbumExists.rows.length === 0) {
      await pool.query(
        'INSERT INTO album_artists (album_id, artist_id) VALUES ($1, $2)',
        [albumId, iniId]
      );
      console.log('✓ Added InI as album artist');
    }

    // Add Pete Rock as album artist (as producer/collaborator)
    const peteRockAlbumExists = await pool.query(
      'SELECT 1 FROM album_artists WHERE album_id = $1 AND artist_id = $2',
      [albumId, peteRockId]
    );

    if (peteRockAlbumExists.rows.length === 0) {
      await pool.query(
        'INSERT INTO album_artists (album_id, artist_id) VALUES ($1, $2)',
        [albumId, peteRockId]
      );
      console.log('✓ Added Pete Rock as album artist');
    }

    console.log('\\nStep 2: Updating track artists...');

    // Get all tracks in the album
    const tracks = await pool.query(`
      SELECT DISTINCT t.id, t.name
      FROM tracks t
      JOIN track_albums tal ON t.id = tal.track_id
      WHERE tal.album_id = $1
    `, [albumId]);

    let updatedTracks = 0;

    for (const track of tracks.rows) {
      // Remove The Worship Initiative from track artists
      const deletedRows = await pool.query(
        'DELETE FROM track_artists WHERE track_id = $1 AND artist_id = $2',
        [track.id, worshipInitiativeId]
      );

      if (deletedRows.rowCount > 0) {
        console.log(`✓ Removed The Worship Initiative from "${track.name}"`);
      }

      // Add InI as primary artist for all tracks
      const iniTrackExists = await pool.query(
        'SELECT 1 FROM track_artists WHERE track_id = $1 AND artist_id = $2',
        [track.id, iniId]
      );

      if (iniTrackExists.rows.length === 0) {
        await pool.query(
          'INSERT INTO track_artists (track_id, artist_id, is_primary) VALUES ($1, $2, $3)',
          [track.id, iniId, true]
        );
        console.log(`✓ Added InI as primary artist for "${track.name}"`);
        updatedTracks++;
      }

      // For tracks that explicitly feature Pete Rock, add him as a featured artist
      if (track.name.toLowerCase().includes('pete rock')) {
        const peteRockTrackExists = await pool.query(
          'SELECT 1 FROM track_artists WHERE track_id = $1 AND artist_id = $2',
          [track.id, peteRockId]
        );

        if (peteRockTrackExists.rows.length === 0) {
          await pool.query(
            'INSERT INTO track_artists (track_id, artist_id, is_primary) VALUES ($1, $2, $3)',
            [track.id, peteRockId, false]
          );
          console.log(`✓ Added Pete Rock as featured artist for "${track.name}"`);
        }
      }
    }

    console.log('\\nStep 3: Verification...');

    // Verify the album artists
    const newAlbumArtists = await pool.query(`
      SELECT a.name
      FROM artists a
      JOIN album_artists aa ON a.id = aa.artist_id
      WHERE aa.album_id = $1
      ORDER BY a.name
    `, [albumId]);

    console.log('New album artists:');
    newAlbumArtists.rows.forEach(artist => {
      console.log(`  - ${artist.name}`);
    });

    // Show a few example tracks with their new artists
    const sampleTracks = await pool.query(`
      SELECT t.name as track_name, a.name as artist_name, ta.is_primary
      FROM tracks t
      JOIN track_albums tal ON t.id = tal.track_id
      JOIN track_artists ta ON t.id = ta.track_id
      JOIN artists a ON ta.artist_id = a.id
      WHERE tal.album_id = $1
      ORDER BY t.name, ta.is_primary DESC
      LIMIT 10
    `, [albumId]);

    console.log('\\nSample track artists (first 5 tracks):');
    const trackGroups = {};
    sampleTracks.rows.forEach(track => {
      if (!trackGroups[track.track_name]) {
        trackGroups[track.track_name] = [];
      }
      trackGroups[track.track_name].push({
        artist: track.artist_name,
        isPrimary: track.is_primary
      });
    });

    Object.entries(trackGroups).slice(0, 5).forEach(([trackName, artists]) => {
      console.log(`  "${trackName}": ${artists.map(a => `${a.artist}${a.isPrimary ? ' (primary)' : ''}`).join(', ')}`);
    });

    console.log(`\\n✅ Successfully updated ${updatedTracks} tracks`);
    console.log('✅ Center of Attention is now correctly attributed to InI & Pete Rock');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await closeDatabase();
  }
}

fixCenterOfAttention();