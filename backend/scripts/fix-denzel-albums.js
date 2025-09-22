import { initializeDatabase, getPool, closeDatabase } from '../src/db/connection.js';

async function fixDenzelAlbums() {
  try {
    await initializeDatabase();
    const pool = getPool();

    console.log('=== Fixing Denzel Curry track album assignments ===');

    // Define the correct album mappings
    const trackMappings = [
      // Melt My Eyez tracks should go to album 8977
      { trackId: 24168, targetAlbum: 8977, trackName: 'Melt Session #1 [Feat. Robert Glasper]' },
      { trackId: 19182, targetAlbum: 8977, trackName: 'Worst Comes To Worst' },
      { trackId: 19183, targetAlbum: 8977, trackName: 'John Wayne [Feat. Buzzy Lee]' },
      { trackId: 24169, targetAlbum: 8977, trackName: 'Mental [Feat. Saul Williams & Bridget Perez]' },
      { trackId: 19185, targetAlbum: 8977, trackName: 'Troubles [Feat. T-Pain]' },
      { trackId: 19187, targetAlbum: 8977, trackName: 'X-Wing' },
      { trackId: 19188, targetAlbum: 8977, trackName: 'Angelz [Feat. Karriem Riggins]' },
      { trackId: 19184, targetAlbum: 8977, trackName: 'The Last' },
      { trackId: 19194, targetAlbum: 8977, trackName: 'The Ills' },

      // 32 Zel tracks should go to album 7411
      { trackId: 13947, targetAlbum: 7411, trackName: '32 Ave Intro' },

      // Imperial tracks should go to album 6100
      { trackId: 13264, targetAlbum: 6100, trackName: 'Ultimate' },
      { trackId: 13427, targetAlbum: 6100, trackName: 'Envy Me' },

      // TA13OO tracks should go to album 7660
      { trackId: 19189, targetAlbum: 7660, trackName: 'The Smell Of Death' },
      { trackId: 19190, targetAlbum: 7660, trackName: 'Sanjuro' },
      { trackId: 19191, targetAlbum: 7660, trackName: 'Zatoichi [Feat. slowthai]' },

      // Singles should go to their own albums (matching existing structure)
      { trackId: 8288, targetAlbum: 8288, trackName: 'HOODLUMZ (with PlayThatBoiZay & A$AP Rocky)' },
      { trackId: 21372, targetAlbum: 8288, trackName: 'HOODLUMZ (with PlayThatBoiZay & A$AP Rocky)' },
      { trackId: 13642, targetAlbum: 8290, trackName: 'BLACK FLAG FREESTYLE (with That Mexican OT)' },
      { trackId: 13430, targetAlbum: 8247, trackName: 'HOT ONE (with TiaCorine & A$AP Ferg)' },
      { trackId: 21440, targetAlbum: 8247, trackName: 'HOT ONE (with TiaCorine & A$AP Ferg)' },
    ];

    let fixedCount = 0;

    for (const mapping of trackMappings) {
      try {
        // Check current album assignment
        const currentAssignment = await pool.query(
          'SELECT album_id FROM track_albums WHERE track_id = $1',
          [mapping.trackId]
        );

        if (currentAssignment.rows.length > 0 && currentAssignment.rows[0].album_id !== mapping.targetAlbum) {
          // Update to correct album
          await pool.query(
            'UPDATE track_albums SET album_id = $1 WHERE track_id = $2',
            [mapping.targetAlbum, mapping.trackId]
          );

          console.log(`✓ Fixed "${mapping.trackName}" (${mapping.trackId}) → Album ${mapping.targetAlbum}`);
          fixedCount++;
        } else if (currentAssignment.rows.length === 0) {
          // Insert new assignment
          await pool.query(
            'INSERT INTO track_albums (track_id, album_id) VALUES ($1, $2)',
            [mapping.trackId, mapping.targetAlbum]
          );

          console.log(`✓ Added "${mapping.trackName}" (${mapping.trackId}) → Album ${mapping.targetAlbum}`);
          fixedCount++;
        } else {
          console.log(`- "${mapping.trackName}" already correctly assigned`);
        }

      } catch (error) {
        console.error(`Error fixing ${mapping.trackName}: ${error.message}`);
      }
    }

    // Remove remaining tracks from the problematic album 8291 that don't belong to KOTMS Vol. 2
    const kotmsVol2Tracks = [
      'CHOOSE WISELY INTERMISSION',
      'COLE PIMP',
      'G\'Z UP',
      'HEADCRACK INTERLUDE',
      'HIT THE FLOOR',
      'KOTMS II OUTRO',
      'LUNATIC INTERLUDE',
      'SET IT',
      'SKED',
      'ULTRA SHXT',
      'WISHLIST'
    ];

    // Get remaining tracks in album 8291
    const remainingTracks = await pool.query(`
      SELECT t.id, t.name
      FROM tracks t
      JOIN track_albums tal ON t.id = tal.track_id
      WHERE tal.album_id = 8291
    `);

    console.log('\\n=== Remaining tracks in KOTMS Vol. 2 ===');
    for (const track of remainingTracks.rows) {
      const belongsInKotms = kotmsVol2Tracks.some(kotmsTrack =>
        track.name.toLowerCase().includes(kotmsTrack.toLowerCase())
      );

      if (belongsInKotms) {
        console.log(`✓ Keeping "${track.name}" in KOTMS Vol. 2`);
      } else {
        console.log(`? "${track.name}" might need manual review`);
      }
    }

    // Final verification - show track counts for each album
    const albumCounts = await pool.query(`
      SELECT al.id, al.name, COUNT(tal.track_id) as track_count
      FROM albums al
      JOIN album_artists aa ON al.id = aa.album_id
      JOIN artists a ON aa.artist_id = a.id
      LEFT JOIN track_albums tal ON al.id = tal.album_id
      WHERE a.name ILIKE '%denzel curry%'
      GROUP BY al.id, al.name
      ORDER BY al.release_date DESC
    `);

    console.log('\\n=== Updated Denzel Curry album track counts ===');
    albumCounts.rows.forEach(album => {
      console.log(`${album.name}: ${album.track_count} tracks`);
    });

    console.log(`\\n✅ Fixed ${fixedCount} track assignments`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await closeDatabase();
  }
}

fixDenzelAlbums();