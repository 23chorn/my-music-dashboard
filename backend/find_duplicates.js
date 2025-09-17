import { initializeDatabase, getPool } from './src/db/connection.js';

async function findDuplicates() {
  try {
    await initializeDatabase();
    const pool = getPool();

    console.log('Searching for duplicate "Who Shot Me?" tracks...\n');

    const result = await pool.query(`
      SELECT
        t.id,
        t.track,
        t.duration_ms,
        a.album,
        ar.artist,
        (SELECT COUNT(*) FROM plays WHERE track_id = t.id) as play_count
      FROM tracks t
      JOIN track_albums ta ON t.id = ta.track_id
      JOIN albums a ON ta.album_id = a.id
      JOIN track_artists tar ON t.id = tar.track_id AND tar.is_primary = true
      JOIN artists ar ON tar.artist_id = ar.id
      WHERE LOWER(t.track) LIKE '%who shot me%'
      ORDER BY play_count DESC;
    `);

    if (result.rows.length === 0) {
      console.log('No tracks found matching "Who Shot Me"');
      return;
    }

    console.log('Found tracks matching "Who Shot Me":');
    result.rows.forEach(row => {
      console.log(`ID: ${row.id}, Track: "${row.track}", Album: "${row.album}", Artist: "${row.artist}", Plays: ${row.play_count}, Duration: ${row.duration_ms}ms`);
    });

    // Now let's also search for other potential duplicates on Still Brazy album
    console.log('\n\nSearching for potential duplicates on Still Brazy album...\n');

    const stillBrazyDupes = await pool.query(`
      WITH track_counts AS (
        SELECT
          LOWER(TRIM(t.track)) as normalized_track,
          t.id,
          t.track,
          a.album,
          ar.artist,
          (SELECT COUNT(*) FROM plays WHERE track_id = t.id) as play_count,
          t.duration_ms
        FROM tracks t
        JOIN track_albums ta ON t.id = ta.track_id
        JOIN albums a ON ta.album_id = a.id
        JOIN track_artists tar ON t.id = tar.track_id AND tar.is_primary = true
        JOIN artists ar ON tar.artist_id = ar.id
        WHERE LOWER(a.album) LIKE '%still brazy%'
      )
      SELECT
        normalized_track,
        COUNT(*) as duplicate_count,
        array_agg(id ORDER BY play_count DESC) as track_ids,
        array_agg(track ORDER BY play_count DESC) as track_names,
        array_agg(play_count ORDER BY play_count DESC) as play_counts,
        array_agg(duration_ms ORDER BY play_count DESC) as durations
      FROM track_counts
      GROUP BY normalized_track
      HAVING COUNT(*) > 1
      ORDER BY MAX(play_count) DESC;
    `);

    if (stillBrazyDupes.rows.length > 0) {
      console.log('Found duplicate tracks on Still Brazy:');
      stillBrazyDupes.rows.forEach(row => {
        console.log(`\nDuplicate: "${row.normalized_track}"`);
        console.log(`  Count: ${row.duplicate_count} versions`);
        for (let i = 0; i < row.track_ids.length; i++) {
          console.log(`  ID: ${row.track_ids[i]}, Name: "${row.track_names[i]}", Plays: ${row.play_counts[i]}, Duration: ${row.durations[i]}ms`);
        }
      });
    } else {
      console.log('No duplicate tracks found on Still Brazy album');
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit(0);
  }
}

findDuplicates();