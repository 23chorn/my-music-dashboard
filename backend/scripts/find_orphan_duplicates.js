import dotenv from 'dotenv';
dotenv.config();

async function findOrphanDuplicates() {
  const API_BASE_URL = 'http://localhost:3001';

  console.log('=== Finding duplicate tracks where one lacks external IDs ===\n');

  try {
    // First, let's verify our known duplicate
    console.log('=== Known Duplicate: "Who Shot Me?" ===');
    const whoShotResponse = await fetch(`${API_BASE_URL}/api/search?q=who shot me`);
    const whoShotData = await whoShotResponse.json();

    console.log('Found tracks:');
    for (const track of whoShotData.tracks) {
      try {
        const externalResponse = await fetch(`${API_BASE_URL}/api/spotify/entity-url?id=${track.id}&type=track`);
        const hasSpotifyId = externalResponse.ok;
        console.log(`  ID: ${track.id}, Plays: ${track.playcount}, Spotify: ${hasSpotifyId ? '✅' : '❌'}`);
      } catch (error) {
        console.log(`  ID: ${track.id}, Plays: ${track.playcount}, Spotify: ❓`);
      }
    }

    // Now let's search for a broader pattern
    console.log('\n=== Searching for YG tracks ===');
    const ygResponse = await fetch(`${API_BASE_URL}/api/search?q=YG`);
    const ygData = await ygResponse.json();

    // Group tracks by name to find potential duplicates
    const tracksByName = {};

    ygData.tracks.forEach(track => {
      const normalizedName = track.name.toLowerCase().trim();
      if (!tracksByName[normalizedName]) {
        tracksByName[normalizedName] = [];
      }
      tracksByName[normalizedName].push(track);
    });

    // Find tracks that have duplicates
    const duplicates = Object.entries(tracksByName)
      .filter(([name, tracks]) => tracks.length > 1)
      .sort((a, b) => Math.max(...b[1].map(t => t.playcount)) - Math.max(...a[1].map(t => t.playcount)));

    if (duplicates.length === 0) {
      console.log('No duplicate track names found for YG');
      return;
    }

    console.log(`Found ${duplicates.length} sets of duplicate track names:\n`);

    for (const [name, tracks] of duplicates) {
      console.log(`🎵 "${name}" (${tracks.length} versions):`);

      // Check external IDs for each track
      for (const track of tracks.sort((a, b) => b.playcount - a.playcount)) {
        try {
          const externalResponse = await fetch(`${API_BASE_URL}/api/spotify/entity-url?id=${track.id}&type=track`);
          const hasSpotifyId = externalResponse.ok;

          console.log(`  ID: ${track.id}, Plays: ${track.playcount}, Album: "${track.album}", Spotify: ${hasSpotifyId ? '✅' : '❌'}`);
        } catch (error) {
          console.log(`  ID: ${track.id}, Plays: ${track.playcount}, Album: "${track.album}", Spotify: ❓ (error checking)`);
        }
      }
      console.log();
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

findOrphanDuplicates();