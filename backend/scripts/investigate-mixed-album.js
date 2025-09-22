import { initializeDatabase, getPool, closeDatabase } from '../src/db/connection.js';

async function investigateMixedAlbum() {
  try {
    await initializeDatabase();
    const pool = getPool();

    console.log('=== Investigating mixed tracks in Melt My Eyez album ===');

    // Get all tracks in album ID 8291 (the one with mixed tracks)
    const albumTracks = await pool.query(`
      SELECT t.id, t.name as track_name, t.duration_ms,
             a.name as artist_name, ta.is_primary,
             COUNT(p.id) as play_count,
             MIN(p.played_at) as first_played
      FROM tracks t
      JOIN track_albums tal ON t.id = tal.track_id
      JOIN track_artists ta ON t.id = ta.track_id
      JOIN artists a ON ta.artist_id = a.id
      LEFT JOIN plays p ON t.id = p.track_id
      WHERE tal.album_id = 8291
      GROUP BY t.id, t.name, t.duration_ms, a.name, ta.is_primary
      ORDER BY t.name, ta.is_primary DESC
    `);

    console.log(`\nFound ${albumTracks.rows.length} track entries in album ID 8291:`);

    // Group tracks by track name to see which tracks appear multiple times
    const trackGroups = {};
    albumTracks.rows.forEach(track => {
      if (!trackGroups[track.track_name]) {
        trackGroups[track.track_name] = [];
      }
      trackGroups[track.track_name].push(track);
    });

    // Show all tracks with their details
    Object.entries(trackGroups).forEach(([trackName, tracks]) => {
      console.log(`\n"${trackName}":`);
      tracks.forEach(track => {
        const firstPlayed = track.first_played ?
          new Date(track.first_played * 1000).toISOString().split('T')[0] : 'Never';
        console.log(`  Track ID: ${track.id}, Artist: ${track.artist_name}, Primary: ${track.is_primary}, Plays: ${track.play_count}, First: ${firstPlayed}`);
      });
    });

    // Get the actual tracklist for "Melt My Eyez See Your Future" from external sources
    // These are the known tracks that should be in this album
    const correctTracklist = [
      'Melt Session #1',
      'Walkin',
      'Worst Comes to Worst',
      'John Wayne (feat. Buzzy Lee)',
      'Mental',
      'Troubles',
      'Ain\'t No Way (feat. 6LACK & JID)',
      'X-Wing',
      'Angelz',
      'The Last',
      'The Ills'
    ];

    console.log('\n=== Known correct tracklist for Melt My Eyez ===');
    correctTracklist.forEach((title, index) => {
      console.log(`${index + 1}. ${title}`);
    });

    // Find tracks that don't belong in this album
    const tracksToMove = [];
    Object.entries(trackGroups).forEach(([trackName, tracks]) => {
      const isCorrectTrack = correctTracklist.some(correctTitle =>
        trackName.toLowerCase().includes(correctTitle.toLowerCase()) ||
        correctTitle.toLowerCase().includes(trackName.toLowerCase())
      );

      if (!isCorrectTrack) {
        tracksToMove.push(...tracks);
      }
    });

    console.log(`\n=== Tracks that should be moved (${tracksToMove.length}) ===`);
    tracksToMove.forEach(track => {
      console.log(`Track ID: ${track.id}, "${track.track_name}" by ${track.artist_name}, Plays: ${track.play_count}`);
    });

    // Get all Denzel Curry albums for reference
    const denzelAlbums = await pool.query(`
      SELECT al.id, al.name, al.release_date, COUNT(tal.track_id) as track_count
      FROM albums al
      JOIN album_artists aa ON al.id = aa.album_id
      JOIN artists a ON aa.artist_id = a.id
      LEFT JOIN track_albums tal ON al.id = tal.album_id
      WHERE a.name ILIKE '%denzel curry%'
      GROUP BY al.id, al.name, al.release_date
      ORDER BY al.release_date DESC
    `);

    console.log('\n=== All Denzel Curry albums ===');
    denzelAlbums.rows.forEach(album => {
      console.log(`Album ID: ${album.id}, "${album.name}" (${album.release_date?.toISOString().split('T')[0]}), Tracks: ${album.track_count}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await closeDatabase();
  }
}

investigateMixedAlbum();