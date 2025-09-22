import dotenv from 'dotenv';
dotenv.config();

async function findAllOrphans() {
  const API_BASE_URL = 'http://localhost:3001';

  console.log('=== Finding all potential orphaned tracks ===\n');

  try {
    // Search for Still Brazy tracks since we found issues there
    const stillBrazyResponse = await fetch(`${API_BASE_URL}/api/search?q=still brazy`);
    const stillBrazyData = await stillBrazyResponse.json();

    console.log(`Found ${stillBrazyData.tracks.length} Still Brazy tracks. Checking for orphans...\n`);

    const orphans = [];
    const validTracks = [];

    // Check each track for external IDs
    for (const track of stillBrazyData.tracks) {
      try {
        const externalResponse = await fetch(`${API_BASE_URL}/api/spotify/entity-url?id=${track.id}&type=track`);
        const hasSpotifyId = externalResponse.ok;

        if (hasSpotifyId) {
          validTracks.push({ ...track, hasSpotifyId: true });
        } else {
          orphans.push({ ...track, hasSpotifyId: false });
        }
      } catch (error) {
        orphans.push({ ...track, hasSpotifyId: false, error: true });
      }
    }

    console.log(`✅ Valid tracks (with Spotify IDs): ${validTracks.length}`);
    console.log(`❌ Orphaned tracks (no Spotify IDs): ${orphans.length}\n`);

    if (orphans.length > 0) {
      console.log('=== Orphaned Tracks (candidates for removal) ===');
      orphans.sort((a, b) => a.playcount - b.playcount);

      for (const track of orphans) {
        console.log(`ID: ${track.id}, "${track.name}" by ${track.artist}, Plays: ${track.playcount}`);
      }

      console.log('\n=== Looking for merge candidates ===');

      // Look for potential matches between orphans and valid tracks
      for (const orphan of orphans) {
        const matches = validTracks.filter(valid =>
          valid.name.toLowerCase().includes(orphan.name.toLowerCase()) ||
          orphan.name.toLowerCase().includes(valid.name.toLowerCase())
        );

        if (matches.length > 0) {
          console.log(`\n🔄 Potential merge for "${orphan.name}" (ID: ${orphan.id}, ${orphan.playcount} plays):`);
          for (const match of matches) {
            console.log(`  → "${match.name}" (ID: ${match.id}, ${match.playcount} plays) ✅`);
          }
        }
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

findAllOrphans();