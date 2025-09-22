import dotenv from 'dotenv';
dotenv.config();

async function mergeTracks() {
  const API_BASE_URL = 'http://localhost:3001';

  console.log('=== Merging "Who Shot Me?" duplicates via API ===\n');

  try {
    // First, let's verify the tracks exist and get their current play counts
    console.log('Checking track details...');

    const track1Response = await fetch(`${API_BASE_URL}/api/track/24914`);
    const track2Response = await fetch(`${API_BASE_URL}/api/track/24949`);

    if (!track1Response.ok || !track2Response.ok) {
      console.error('Could not fetch track details');
      return;
    }

    const track1 = await track1Response.json();
    const track2 = await track2Response.json();

    console.log(`Track 24914: "${track1.title}" - Will be kept`);
    console.log(`Track 24949: "${track2.title}" - Will be merged and removed`);

    // Get stats for both tracks
    const stats1Response = await fetch(`${API_BASE_URL}/api/track/24914/stats`);
    const stats2Response = await fetch(`${API_BASE_URL}/api/track/24949/stats`);

    const stats1 = await stats1Response.json();
    const stats2 = await stats2Response.json();

    console.log(`\nBefore merge:`);
    console.log(`  Track 24914 plays: ${stats1.totalPlays}`);
    console.log(`  Track 24949 plays: ${stats2.totalPlays}`);
    console.log(`  Expected total after merge: ${stats1.totalPlays + stats2.totalPlays}`);

    console.log('\n⚠️  This is a simulation. Database merge requires direct database access.');
    console.log('The actual merge needs to be done with proper database tools.');

  } catch (error) {
    console.error('Error:', error.message);
  }
}

mergeTracks();