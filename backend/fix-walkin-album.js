import { initializeDatabase, getPool, closeDatabase } from './src/db/connection.js';

async function fixWalkinAlbum() {
  try {
    await initializeDatabase();
    const pool = getPool();

    console.log('=== Fixing Walkin track album linkage ===');

    // First, find the current album linkage for Walkin
    const currentLinkage = await pool.query(`
      SELECT t.id, t.name as track_name, al.id as album_id, al.name as album_name, a.name as artist_name
      FROM tracks t
      JOIN track_albums tal ON t.id = tal.track_id
      JOIN albums al ON tal.album_id = al.id
      JOIN track_artists ta ON t.id = ta.track_id AND ta.is_primary = true
      JOIN artists a ON ta.artist_id = a.id
      WHERE t.id = 19181
    `);

    console.log('Current Walkin linkage:');
    currentLinkage.rows.forEach(row => {
      console.log(`  Track: "${row.track_name}" by ${row.artist_name} → Album: "${row.album_name}" (ID: ${row.album_id})`);
    });

    // Find Denzel Curry's albums, specifically looking for "Melt My Eyez"
    const denzelAlbums = await pool.query(`
      SELECT al.id, al.name, al.release_date
      FROM albums al
      JOIN album_artists aa ON al.id = aa.album_id
      JOIN artists a ON aa.artist_id = a.id
      WHERE a.name ILIKE '%denzel curry%'
      ORDER BY al.release_date DESC
    `);

    console.log('\nDenzel Curry albums:');
    denzelAlbums.rows.forEach(album => {
      console.log(`  Album ID: ${album.id}, Name: "${album.name}", Release: ${album.release_date}`);
    });

    // Find the correct "Melt My Eyez" album
    const meltMyEyezAlbum = denzelAlbums.rows.find(album =>
      album.name.toLowerCase().includes('melt my eyez')
    );

    if (meltMyEyezAlbum) {
      console.log(`\nFound correct album: "${meltMyEyezAlbum.name}" (ID: ${meltMyEyezAlbum.id})`);

      // Remove current album linkage
      await pool.query('DELETE FROM track_albums WHERE track_id = 19181');
      console.log('Removed old album linkage');

      // Add correct album linkage
      await pool.query(
        'INSERT INTO track_albums (track_id, album_id) VALUES ($1, $2)',
        [19181, meltMyEyezAlbum.id]
      );
      console.log(`Linked "Walkin" to "${meltMyEyezAlbum.name}"`);

      // Verify the fix
      const verification = await pool.query(`
        SELECT t.name as track_name, al.name as album_name, a.name as artist_name
        FROM tracks t
        JOIN track_albums tal ON t.id = tal.track_id
        JOIN albums al ON tal.album_id = al.id
        JOIN track_artists ta ON t.id = ta.track_id AND ta.is_primary = true
        JOIN artists a ON ta.artist_id = a.id
        WHERE t.id = 19181
      `);

      console.log('\nVerification:');
      verification.rows.forEach(row => {
        console.log(`  Track: "${row.track_name}" by ${row.artist_name} → Album: "${row.album_name}"`);
      });

    } else {
      console.log('\nCould not find "Melt My Eyez" album');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await closeDatabase();
  }
}

fixWalkinAlbum();