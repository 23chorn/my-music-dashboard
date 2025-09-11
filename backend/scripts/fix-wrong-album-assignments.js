#!/usr/bin/env node

import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

import pkg from 'pg';
const { Pool } = pkg;

// Database configuration
function getDatabaseConfig() {
  const dbMode = process.env.DB_MODE || 'production';
  const databaseUrl = dbMode === 'test' ? process.env.TEST_DATABASE_URL : process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    throw new Error(`Database URL not configured for mode: ${dbMode}`);
  }
  
  return {
    connectionString: databaseUrl,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  };
}

// Spotify API client
class SpotifyAPI {
  constructor() {
    this.accessToken = null;
    this.baseURL = 'https://api.spotify.com/v1';
  }

  async authenticate() {
    if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
      throw new Error('Spotify credentials not configured');
    }

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64')}`
      },
      body: 'grant_type=client_credentials'
    });

    if (!response.ok) {
      throw new Error(`Spotify auth failed: ${response.status}`);
    }

    const data = await response.json();
    this.accessToken = data.access_token;
  }

  async getTrack(spotifyId) {
    if (!this.accessToken) {
      await this.authenticate();
    }

    const trackId = spotifyId.replace('spotify:track:', '');
    const response = await fetch(`${this.baseURL}/tracks/${trackId}`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Spotify API error: ${response.status}`);
    }

    return await response.json();
  }
}

// Find or create an album in the database
async function findOrCreateAlbum(client, albumName, artistName) {
  // First try exact album name match
  const exactQuery = 'SELECT id, name FROM albums WHERE LOWER(name) = LOWER($1)';
  const exactResult = await client.query(exactQuery, [albumName]);
  
  if (exactResult.rows.length === 1) {
    return exactResult.rows[0];
  }
  
  // If multiple matches or no matches, try to find by artist context
  if (artistName) {
    const artistContextQuery = `
      SELECT DISTINCT al.id, al.name 
      FROM albums al
      JOIN album_artists aa ON al.id = aa.album_id
      JOIN artists ar ON aa.artist_id = ar.id
      WHERE LOWER(al.name) = LOWER($1) AND LOWER(ar.name) = LOWER($2)
    `;
    const contextResult = await client.query(artistContextQuery, [albumName, artistName]);
    
    if (contextResult.rows.length > 0) {
      return contextResult.rows[0];
    }
  }
  
  // Create new album if not found
  const createQuery = 'INSERT INTO albums (name) VALUES ($1) RETURNING id, name';
  const createResult = await client.query(createQuery, [albumName]);
  return createResult.rows[0];
}

async function fixWrongAlbumAssignments() {
  const dbMode = process.env.DB_MODE || 'production';
  const dryRun = !process.argv.includes('--fix');
  
  console.log(`🔧 ${dryRun ? 'ANALYZING' : 'FIXING'} wrong album assignments on ${dbMode.toUpperCase()} database\n`);
  
  const pool = new Pool(getDatabaseConfig());
  const spotify = new SpotifyAPI();
  
  try {
    // Test connections
    console.log('🔌 Testing database connection...');
    await pool.query('SELECT 1');
    console.log('   ✅ Database connected');
    
    console.log('🎵 Testing Spotify API...');
    await spotify.authenticate();
    console.log('   ✅ Spotify API authenticated\n');
    
    // Find tracks with suspicious album assignments
    console.log('🔍 Finding tracks with potential wrong album assignments...');
    const suspiciousQuery = `
      SELECT 
        t.id as track_id,
        t.name as track_name,
        ei.external_id as spotify_id,
        al.name as current_album,
        STRING_AGG(DISTINCT ar.name, ', ') as track_artists,
        COUNT(p.id) as play_count
      FROM tracks t
      JOIN external_ids ei ON t.id = ei.entity_id AND ei.entity_type = 'track' AND ei.source = 'spotify'
      LEFT JOIN track_albums tal ON t.id = tal.track_id
      LEFT JOIN albums al ON tal.album_id = al.id
      LEFT JOIN track_artists ta ON t.id = ta.track_id
      LEFT JOIN artists ar ON ta.artist_id = ar.id
      LEFT JOIN plays p ON t.id = p.track_id
      WHERE (
        -- Cases where album seems wrong based on context
        (al.name ILIKE '%bach%' OR al.name ILIKE '%classical%' OR al.name ILIKE '%well-tempered%') 
        AND (ar.name ILIKE '%pete rock%' OR ar.name ILIKE '%asap%' OR ar.name ILIKE '%westside%' OR ar.name ILIKE '%savage%')
      ) OR (
        -- Cases where hip-hop tracks are on classical albums
        (ar.name NOT ILIKE '%bach%' AND ar.name NOT ILIKE '%beethoven%' AND ar.name NOT ILIKE '%mozart%')
        AND (al.name ILIKE '%bach%' OR al.name ILIKE '%beethoven%' OR al.name ILIKE '%classical%' OR al.name ILIKE '%symphony%')
      ) OR (
        -- Look for specific cases we know are wrong
        (t.name ILIKE '%think twice%' AND al.name ILIKE '%bach%') OR
        (t.name ILIKE '%square one%' AND al.name ILIKE '%bach%') OR
        (t.name ILIKE '%praise the lord%' AND al.name ILIKE '%bach%') OR
        (t.name ILIKE '%trophies%' AND al.name ILIKE '%beethoven%')
      )
      GROUP BY t.id, t.name, ei.external_id, al.name
      HAVING COUNT(p.id) > 0  -- Only tracks with plays
      ORDER BY COUNT(p.id) DESC
      LIMIT 25;
    `;
    
    const suspiciousResults = await pool.query(suspiciousQuery);
    console.log(`   Found ${suspiciousResults.rows.length} tracks with potentially wrong album assignments\n`);
    
    if (suspiciousResults.rows.length === 0) {
      console.log('✅ No obvious wrong album assignments found!');
      return;
    }
    
    console.log('📋 Suspicious album assignments to validate:');
    const fixOperations = [];
    
    for (const track of suspiciousResults.rows) {
      console.log(`\n🎵 Checking: "${track.track_name}"`);
      console.log(`   Artists: ${track.track_artists} (${track.play_count} plays)`);
      console.log(`   Current Album: ${track.current_album || 'No album'}`);
      console.log(`   Spotify ID: ${track.spotify_id}`);
      
      try {
        const spotifyTrack = await spotify.getTrack(track.spotify_id);
        
        if (spotifyTrack && spotifyTrack.album) {
          const spotifyAlbumName = spotifyTrack.album.name;
          const spotifyArtists = spotifyTrack.artists ? spotifyTrack.artists.map(a => a.name) : [];
          
          console.log(`   ✅ Spotify Album: "${spotifyAlbumName}"`);
          console.log(`   ✅ Spotify Artists: ${spotifyArtists.join(', ')}`);
          
          // Check if current album assignment is wrong
          const isWrongAlbum = track.current_album && 
            !track.current_album.toLowerCase().includes(spotifyAlbumName.toLowerCase()) &&
            !spotifyAlbumName.toLowerCase().includes(track.current_album.toLowerCase());
          
          if (isWrongAlbum) {
            console.log(`   ❌ WRONG ALBUM ASSIGNMENT DETECTED!`);
            fixOperations.push({
              trackId: track.track_id,
              trackName: track.track_name,
              currentAlbum: track.current_album,
              correctAlbum: spotifyAlbumName,
              spotifyArtists: spotifyArtists,
              spotifyId: track.spotify_id,
              playCount: track.play_count
            });
          } else if (!track.current_album) {
            console.log(`   ℹ️  Missing album - could be added`);
            fixOperations.push({
              trackId: track.track_id,
              trackName: track.track_name,
              currentAlbum: null,
              correctAlbum: spotifyAlbumName,
              spotifyArtists: spotifyArtists,
              spotifyId: track.spotify_id,
              playCount: track.play_count
            });
          } else {
            console.log(`   ℹ️  Album assignment appears reasonable`);
          }
        } else {
          console.log(`   ⚠️  Could not fetch album from Spotify`);
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.log(`   ❌ Error checking Spotify: ${error.message}`);
      }
    }
    
    if (fixOperations.length === 0) {
      console.log('\n✅ No definitive wrong album assignments found after Spotify validation');
      return;
    }
    
    console.log(`\n📊 Summary of album assignment issues found: ${fixOperations.length}`);
    console.log('\n🎯 Tracks that need album fixes:');
    fixOperations.forEach((op, index) => {
      console.log(`\n${index + 1}. "${op.trackName}" (${op.playCount} plays)`);
      console.log(`   Current Album: ${op.currentAlbum || 'None'}`);
      console.log(`   Should be: "${op.correctAlbum}"`);
      console.log(`   Artists: ${op.spotifyArtists.join(', ')}`);
    });
    
    if (dryRun) {
      console.log('\n⚠️  This was a read-only analysis. No data was modified.');
      console.log('   Run with --fix flag to apply corrections.');
      console.log(`   Found ${fixOperations.length} tracks that need album reassignment.`);
    } else {
      console.log('\n🔧 Applying album fixes...');
      await applyAlbumFixes(pool, fixOperations);
    }
    
  } catch (error) {
    console.error('\n💥 Error:', error.message);
    if (error.code) {
      console.error(`   Error code: ${error.code}`);
    }
  } finally {
    await pool.end();
  }
}

// Apply fixes to correct wrong album assignments
async function applyAlbumFixes(pool, fixOperations) {
  let fixedCount = 0;
  let errorCount = 0;
  
  console.log(`\n🔧 Processing ${fixOperations.length} tracks...`);
  
  for (const operation of fixOperations) {
    const client = await pool.connect();
    
    try {
      console.log(`\n🎵 Fixing "${operation.trackName}"...`);
      console.log(`   Current Album: ${operation.currentAlbum || 'None'}`);
      console.log(`   Correct Album: "${operation.correctAlbum}"`);
      
      await client.query('BEGIN');
      
      // 1. Remove current album relationship if exists
      if (operation.currentAlbum) {
        const deleteQuery = 'DELETE FROM track_albums WHERE track_id = $1';
        const deleteResult = await client.query(deleteQuery, [operation.trackId]);
        console.log(`   🗑️  Removed existing album relationship`);
      }
      
      // 2. Find or create correct album
      const primaryArtist = operation.spotifyArtists[0]; // Use primary artist for context
      const album = await findOrCreateAlbum(client, operation.correctAlbum, primaryArtist);
      console.log(`   💿 Album: "${album.name}" (ID: ${album.id})`);
      
      // 3. Create new track-album relationship
      const insertQuery = 'INSERT INTO track_albums (track_id, album_id) VALUES ($1, $2)';
      await client.query(insertQuery, [operation.trackId, album.id]);
      
      await client.query('COMMIT');
      console.log(`   ✅ Successfully updated "${operation.trackName}" album`);
      fixedCount++;
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`   ❌ Failed to fix "${operation.trackName}": ${error.message}`);
      errorCount++;
    } finally {
      client.release();
    }
  }
  
  console.log(`\n📊 Album Fix Summary:`);
  console.log(`   ✅ Successfully fixed: ${fixedCount} tracks`);
  console.log(`   ❌ Failed to fix: ${errorCount} tracks`);
  console.log(`   🎯 Total processed: ${fixOperations.length} tracks`);
  
  if (fixedCount > 0) {
    console.log('\n🎉 Album assignments have been corrected!');
    console.log('   All play history has been preserved.');
    console.log('   Tracks now have correct album relationships.');
  }
}

fixWrongAlbumAssignments();