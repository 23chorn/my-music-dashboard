import { initializeDatabase, getPool, closeDatabase } from './src/db/connection.js';

async function fixRemainingOrphanedTracks() {
  try {
    await initializeDatabase();
    const pool = getPool();

    console.log('=== Fixing remaining orphaned tracks ===');

    // First, get all orphaned tracks with their current artist relationships
    const orphanedTracks = await pool.query(`
      SELECT t.id, t.name, ta.artist_id, a.name as artist_name, ta.is_primary
      FROM tracks t
      LEFT JOIN track_albums tal ON t.id = tal.track_id
      LEFT JOIN track_artists ta ON t.id = ta.track_id
      LEFT JOIN artists a ON ta.artist_id = a.id
      WHERE tal.album_id IS NULL
      ORDER BY t.id
    `);

    console.log(`Found ${orphanedTracks.rows.length} orphaned track relationships`);

    // Group by track ID to see unique orphaned tracks
    const trackGroups = {};
    orphanedTracks.rows.forEach(row => {
      if (!trackGroups[row.id]) {
        trackGroups[row.id] = {
          name: row.name,
          artists: []
        };
      }
      if (row.artist_id) {
        trackGroups[row.id].artists.push({
          id: row.artist_id,
          name: row.artist_name,
          is_primary: row.is_primary
        });
      }
    });

    console.log(`\\nUnique orphaned tracks: ${Object.keys(trackGroups).length}`);

    let processedCount = 0;
    let fixedCount = 0;

    for (const [trackId, trackData] of Object.entries(trackGroups)) {
      processedCount++;

      if (processedCount % 50 === 0) {
        console.log(`Progress: ${processedCount}/${Object.keys(trackGroups).length} tracks processed...`);
      }

      const primaryArtists = trackData.artists.filter(a => a.is_primary);
      const nonPrimaryArtists = trackData.artists.filter(a => !a.is_primary);

      // If no primary artists but we have non-primary artists, fix the primary flag
      if (primaryArtists.length === 0 && nonPrimaryArtists.length > 0) {
        // Set the first artist as primary
        const artistToMakePrimary = nonPrimaryArtists[0];

        await pool.query(
          'UPDATE track_artists SET is_primary = true WHERE track_id = $1 AND artist_id = $2',
          [trackId, artistToMakePrimary.id]
        );

        console.log(`Fixed Track ${trackId} "${trackData.name}" - Set ${artistToMakePrimary.name} as primary`);

        // Now try to link to an album based on the primary artist
        const albumMatches = await pool.query(`
          SELECT al.id, al.name, al.release_date,
                 COUNT(tal.track_id) as track_count
          FROM albums al
          JOIN album_artists aa ON al.id = aa.album_id
          LEFT JOIN track_albums tal ON al.id = tal.album_id
          WHERE aa.artist_id = $1
          GROUP BY al.id, al.name, al.release_date
          ORDER BY track_count DESC
          LIMIT 5
        `, [artistToMakePrimary.id]); // Simplified query without date comparison

        if (albumMatches.rows.length > 0) {
          const bestAlbum = albumMatches.rows[0];

          // Check if track is already in this album
          const existingLink = await pool.query(
            'SELECT 1 FROM track_albums WHERE track_id = $1 AND album_id = $2',
            [trackId, bestAlbum.id]
          );

          if (existingLink.rows.length === 0) {
            await pool.query(
              'INSERT INTO track_albums (track_id, album_id) VALUES ($1, $2)',
              [trackId, bestAlbum.id]
            );

            console.log(`  → Linked to album "${bestAlbum.name}" (ID: ${bestAlbum.id})`);
            fixedCount++;
          }
        }
      }

      // Process in batches to avoid overwhelming the database
      if (processedCount % 100 === 0) {
        console.log(`Batch processed. Fixed ${fixedCount} tracks so far.`);
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
      }
    }

    // Final count of remaining orphaned tracks
    const finalOrphanedCount = await pool.query(`
      SELECT COUNT(*) as count
      FROM tracks t
      LEFT JOIN track_albums tal ON t.id = tal.track_id
      WHERE tal.album_id IS NULL
    `);

    console.log(`\\n=== Results ===`);
    console.log(`Processed: ${processedCount} orphaned tracks`);
    console.log(`Fixed: ${fixedCount} tracks`);
    console.log(`Remaining orphaned: ${finalOrphanedCount.rows[0].count}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await closeDatabase();
  }
}

fixRemainingOrphanedTracks();