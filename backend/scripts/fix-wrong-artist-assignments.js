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

// Find or create an artist in the database
async function findOrCreateArtist(client, artistName) {
  // First try to find existing artist
  const findQuery = 'SELECT id, name FROM artists WHERE LOWER(name) = LOWER($1)';
  const findResult = await client.query(findQuery, [artistName]);
  
  if (findResult.rows.length > 0) {
    return findResult.rows[0];
  }
  
  // Create new artist if not found
  const createQuery = 'INSERT INTO artists (name) VALUES ($1) RETURNING id, name';
  const createResult = await client.query(createQuery, [artistName]);
  return createResult.rows[0];
}

// Apply fixes to correct wrong artist assignments
async function applyArtistFixes(pool, fixOperations) {
  let fixedCount = 0;
  let errorCount = 0;
  
  console.log(`\n🔧 Processing ${fixOperations.length} tracks...`);
  
  for (const operation of fixOperations) {
    const client = await pool.connect();
    
    try {
      console.log(`\n🎵 Fixing "${operation.trackName}"...`);
      console.log(`   Removing: ${operation.currentArtists}`);
      console.log(`   Adding: ${operation.correctArtists.join(', ')}`);
      
      await client.query('BEGIN');
      
      // 1. Remove current artist relationships for this track
      const deleteQuery = 'DELETE FROM track_artists WHERE track_id = $1';
      const deleteResult = await client.query(deleteQuery, [operation.trackId]);
      console.log(`   🗑️  Removed ${deleteResult.rowCount} incorrect artist relationships`);
      
      // 2. Find or create correct artists and add relationships
      for (let i = 0; i < operation.correctArtists.length; i++) {
        const artistName = operation.correctArtists[i];
        const isPrimary = i === 0; // First artist is primary
        
        // Find or create artist
        const artist = await findOrCreateArtist(client, artistName);
        console.log(`   ${isPrimary ? '👑' : '🤝'} ${isPrimary ? 'Primary' : 'Secondary'}: ${artist.name} (ID: ${artist.id})`);
        
        // Create track-artist relationship
        const insertQuery = `
          INSERT INTO track_artists (track_id, artist_id, is_primary) 
          VALUES ($1, $2, $3)
        `;
        await client.query(insertQuery, [operation.trackId, artist.id, isPrimary]);
      }
      
      await client.query('COMMIT');
      console.log(`   ✅ Successfully updated "${operation.trackName}"`);
      fixedCount++;
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`   ❌ Failed to fix "${operation.trackName}": ${error.message}`);
      errorCount++;
    } finally {
      client.release();
    }
  }
  
  console.log(`\n📊 Fix Summary:`);
  console.log(`   ✅ Successfully fixed: ${fixedCount} tracks`);
  console.log(`   ❌ Failed to fix: ${errorCount} tracks`);
  console.log(`   🎯 Total processed: ${fixOperations.length} tracks`);
  
  if (fixedCount > 0) {
    console.log('\n🎉 Artist assignments have been corrected!');
    console.log('   All play history has been preserved.');
    console.log('   Tracks now have correct artist relationships.');
  }
}

async function fixWrongArtistAssignments() {
  const dbMode = process.env.DB_MODE || 'production';
  const dryRun = !process.argv.includes('--fix');
  
  console.log(`🔧 ${dryRun ? 'ANALYZING' : 'FIXING'} wrong artist assignments on ${dbMode.toUpperCase()} database\n`);
  
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
    
    // Find tracks with obvious wrong artist assignments
    console.log('🔍 Finding tracks with suspicious artist assignments...');
    const suspiciousQuery = `
      SELECT 
        t.id as track_id,
        t.name as track_name,
        ei.external_id as spotify_id,
        STRING_AGG(a.name, ', ' ORDER BY ta.is_primary DESC, a.name) as current_artists,
        COUNT(p.id) as play_count
      FROM tracks t
      JOIN external_ids ei ON t.id = ei.entity_id AND ei.entity_type = 'track' AND ei.source = 'spotify'
      JOIN track_artists ta ON t.id = ta.track_id
      JOIN artists a ON ta.artist_id = a.id
      LEFT JOIN plays p ON t.id = p.track_id
      WHERE (
        -- Classical artists on clearly non-classical tracks
        (a.name ILIKE '%Johann Sebastian Bach%' OR a.name ILIKE '%Mozart%' OR a.name ILIKE '%Beethoven%') 
        AND (
          t.name ILIKE '%think twice%' OR
          t.name ILIKE '%square one%' OR 
          t.name ILIKE '%step up%' OR
          t.name ILIKE '%krossroads%' OR
          t.name ILIKE '%fakin jax%' OR
          t.name ILIKE '%life i live%' OR
          t.name ILIKE '%praise the lord%' OR
          t.name ILIKE '%babushka%' OR
          t.name NOT ILIKE '%bach%' AND 
          t.name NOT ILIKE '%classical%' AND 
          t.name NOT ILIKE '%symphony%' AND
          t.name NOT ILIKE '%concerto%' AND
          t.name NOT ILIKE '%prelude%' AND
          t.name NOT ILIKE '%invention%'
        )
      ) OR (
        -- Orchestra on rap/hip-hop tracks  
        (a.name ILIKE '%Orchestra%' OR a.name ILIKE '%Strings%')
        AND (
          t.name ILIKE '%feat%' OR
          t.name ILIKE '%intro%' OR
          t.name ILIKE '%boi%'
        )
      )
      GROUP BY t.id, t.name, ei.external_id
      HAVING COUNT(p.id) > 0  -- Only tracks with plays
      ORDER BY COUNT(p.id) DESC
      LIMIT 20;
    `;
    
    const suspiciousResults = await pool.query(suspiciousQuery);
    console.log(`   Found ${suspiciousResults.rows.length} tracks with suspicious assignments\n`);
    
    if (suspiciousResults.rows.length === 0) {
      console.log('✅ No obvious wrong artist assignments found!');
      return;
    }
    
    console.log('📋 Suspicious tracks to validate:');
    const fixOperations = [];
    
    for (const track of suspiciousResults.rows) {
      console.log(`\n🎵 Checking: "${track.track_name}"`);
      console.log(`   Current: ${track.current_artists} (${track.play_count} plays)`);
      console.log(`   Spotify ID: ${track.spotify_id}`);
      
      try {
        const spotifyTrack = await spotify.getTrack(track.spotify_id);
        
        if (spotifyTrack && spotifyTrack.artists && spotifyTrack.artists.length > 0) {
          const spotifyArtists = spotifyTrack.artists.map(a => a.name);
          console.log(`   ✅ Spotify: ${spotifyArtists.join(', ')}`);
          
          // Check if current assignment is completely wrong
          const currentArtistNames = track.current_artists.split(', ');
          const hasCorrectArtist = spotifyArtists.some(sa => 
            currentArtistNames.some(ca => 
              ca.toLowerCase().includes(sa.toLowerCase()) || 
              sa.toLowerCase().includes(ca.toLowerCase())
            )
          );
          
          if (!hasCorrectArtist) {
            console.log(`   ❌ WRONG ASSIGNMENT DETECTED!`);
            fixOperations.push({
              trackId: track.track_id,
              trackName: track.track_name,
              currentArtists: track.current_artists,
              correctArtists: spotifyArtists,
              spotifyId: track.spotify_id,
              playCount: track.play_count
            });
          } else {
            console.log(`   ℹ️  Assignment appears correct`);
          }
        } else {
          console.log(`   ⚠️  Could not fetch from Spotify`);
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.log(`   ❌ Error checking Spotify: ${error.message}`);
      }
    }
    
    if (fixOperations.length === 0) {
      console.log('\n✅ No definitive wrong assignments found after Spotify validation');
      return;
    }
    
    console.log(`\n📊 Summary of wrong assignments found: ${fixOperations.length}`);
    console.log('\n🎯 Tracks that need fixing:');
    fixOperations.forEach((op, index) => {
      console.log(`\n${index + 1}. "${op.trackName}" (${op.playCount} plays)`);
      console.log(`   Current: ${op.currentArtists}`);
      console.log(`   Should be: ${op.correctArtists.join(', ')}`);
    });
    
    if (dryRun) {
      console.log('\n⚠️  This was a read-only analysis. No data was modified.');
      console.log('   Run with --fix flag to apply corrections.');
      console.log(`   Found ${fixOperations.length} tracks that need artist reassignment.`);
    } else {
      console.log('\n🔧 Applying fixes...');
      await applyArtistFixes(pool, fixOperations);
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

fixWrongArtistAssignments();