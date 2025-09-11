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
      if (response.status === 429) {
        // Rate limited - wait and retry
        const retryAfter = response.headers.get('Retry-After') || 1;
        console.log(`   Rate limited, waiting ${retryAfter} seconds...`);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        return this.getTrack(spotifyId);
      }
      throw new Error(`Spotify API error: ${response.status}`);
    }

    return await response.json();
  }
}

// Compare artists arrays to see if they match
function compareArtists(dbArtists, spotifyArtists) {
  const dbNames = dbArtists.map(a => a.toLowerCase().trim()).sort();
  const spotifyNames = spotifyArtists.map(a => a.toLowerCase().trim()).sort();
  
  // Check if arrays are identical
  if (dbNames.length === spotifyNames.length && 
      dbNames.every((name, index) => name === spotifyNames[index])) {
    return { match: true, missing: [], extra: [] };
  }
  
  // Find missing and extra artists
  const missing = spotifyNames.filter(sa => !dbNames.some(da => 
    da.includes(sa) || sa.includes(da) || 
    // Handle common variations
    (da.replace(/[^a-z0-9]/g, '') === sa.replace(/[^a-z0-9]/g, ''))
  ));
  
  const extra = dbNames.filter(da => !spotifyNames.some(sa => 
    da.includes(sa) || sa.includes(da) ||
    // Handle common variations  
    (da.replace(/[^a-z0-9]/g, '') === sa.replace(/[^a-z0-9]/g, ''))
  ));
  
  return { match: false, missing, extra };
}

// Compare album names to see if they match
function compareAlbums(dbAlbum, spotifyAlbum) {
  if (!dbAlbum && !spotifyAlbum) return { match: true };
  if (!dbAlbum || !spotifyAlbum) return { match: false };
  
  const dbName = dbAlbum.toLowerCase().trim();
  const spotifyName = spotifyAlbum.toLowerCase().trim();
  
  // Exact match
  if (dbName === spotifyName) return { match: true };
  
  // Partial match (handles different editions, etc.)
  if (dbName.includes(spotifyName) || spotifyName.includes(dbName)) return { match: true };
  
  // Clean up common differences
  const cleanDb = dbName.replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
  const cleanSpotify = spotifyName.replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
  
  if (cleanDb === cleanSpotify) return { match: true };
  
  return { match: false };
}

// Find or create an artist
async function findOrCreateArtist(client, artistName) {
  const findQuery = 'SELECT id, name FROM artists WHERE LOWER(name) = LOWER($1)';
  const findResult = await client.query(findQuery, [artistName]);
  
  if (findResult.rows.length > 0) {
    return findResult.rows[0];
  }
  
  const createQuery = 'INSERT INTO artists (name) VALUES ($1) RETURNING id, name';
  const createResult = await client.query(createQuery, [artistName]);
  return createResult.rows[0];
}

// Find or create an album
async function findOrCreateAlbum(client, albumName, primaryArtist) {
  // Try exact match first
  const exactQuery = 'SELECT id, name FROM albums WHERE LOWER(name) = LOWER($1)';
  const exactResult = await client.query(exactQuery, [albumName]);
  
  if (exactResult.rows.length === 1) {
    return exactResult.rows[0];
  }
  
  // If multiple matches, try with artist context
  if (exactResult.rows.length > 1 && primaryArtist) {
    const contextQuery = `
      SELECT DISTINCT al.id, al.name 
      FROM albums al
      JOIN album_artists aa ON al.id = aa.album_id
      JOIN artists ar ON aa.artist_id = ar.id
      WHERE LOWER(al.name) = LOWER($1) AND LOWER(ar.name) = LOWER($2)
    `;
    const contextResult = await client.query(contextQuery, [albumName, primaryArtist]);
    
    if (contextResult.rows.length > 0) {
      return contextResult.rows[0];
    }
  }
  
  // Create new album
  const createQuery = 'INSERT INTO albums (name) VALUES ($1) RETURNING id, name';
  const createResult = await client.query(createQuery, [albumName]);
  return createResult.rows[0];
}

async function comprehensiveMetadataCleanup() {
  const dbMode = process.env.DB_MODE || 'production';
  const dryRun = !process.argv.includes('--fix');
  const batchSize = parseInt(process.argv.find(arg => arg.startsWith('--batch='))?.split('=')[1]) || 50;
  const startOffset = parseInt(process.argv.find(arg => arg.startsWith('--offset='))?.split('=')[1]) || 0;
  
  console.log(`🔧 ${dryRun ? 'ANALYZING' : 'FIXING'} all track metadata on ${dbMode.toUpperCase()} database`);
  console.log(`📊 Batch size: ${batchSize}, Starting offset: ${startOffset}\n`);
  
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
    
    // Get total count of tracks with Spotify IDs
    const countQuery = `
      SELECT COUNT(*) as total
      FROM tracks t
      JOIN external_ids ei ON t.id = ei.entity_id 
      WHERE ei.entity_type = 'track' AND ei.source = 'spotify'
      AND EXISTS (SELECT 1 FROM plays p WHERE p.track_id = t.id)
    `;
    const countResult = await pool.query(countQuery);
    const totalTracks = parseInt(countResult.rows[0].total);
    
    console.log(`📊 Found ${totalTracks} tracks with Spotify IDs and play history`);
    console.log(`🔍 Processing batch: ${startOffset} to ${startOffset + batchSize} of ${totalTracks}\n`);
    
    // Get batch of tracks to validate
    const tracksQuery = `
      SELECT 
        t.id as track_id,
        t.name as track_name,
        ei.external_id as spotify_id,
        STRING_AGG(DISTINCT ar.name, '|' ORDER BY ar.name) as current_artists,
        al.name as current_album,
        COUNT(p.id) as play_count
      FROM tracks t
      JOIN external_ids ei ON t.id = ei.entity_id 
      LEFT JOIN track_artists ta ON t.id = ta.track_id
      LEFT JOIN artists ar ON ta.artist_id = ar.id
      LEFT JOIN track_albums tal ON t.id = tal.track_id
      LEFT JOIN albums al ON tal.album_id = al.id
      LEFT JOIN plays p ON t.id = p.track_id
      WHERE ei.entity_type = 'track' AND ei.source = 'spotify'
      AND EXISTS (SELECT 1 FROM plays WHERE track_id = t.id)
      GROUP BY t.id, t.name, ei.external_id, al.name
      ORDER BY COUNT(p.id) DESC, t.name
      LIMIT $1 OFFSET $2
    `;
    
    const tracksResult = await pool.query(tracksQuery, [batchSize, startOffset]);
    console.log(`🎵 Processing ${tracksResult.rows.length} tracks...\n`);
    
    const issues = {
      artistMismatches: [],
      albumMismatches: [],
      processed: 0,
      errors: 0
    };
    
    for (const track of tracksResult.rows) {
      try {
        console.log(`🎵 Checking "${track.track_name}" (${track.play_count} plays)`);
        console.log(`   Spotify ID: ${track.spotify_id}`);
        
        const spotifyTrack = await spotify.getTrack(track.spotify_id);
        
        if (!spotifyTrack) {
          console.log(`   ⚠️  Track not found on Spotify`);
          issues.errors++;
          continue;
        }
        
        // Check artists
        const currentArtists = track.current_artists ? track.current_artists.split('|') : [];
        const spotifyArtists = spotifyTrack.artists ? spotifyTrack.artists.map(a => a.name) : [];
        
        const artistComparison = compareArtists(currentArtists, spotifyArtists);
        
        if (!artistComparison.match) {
          console.log(`   ❌ ARTIST MISMATCH:`);
          console.log(`      Current: ${currentArtists.join(', ')}`);
          console.log(`      Spotify: ${spotifyArtists.join(', ')}`);
          if (artistComparison.missing.length > 0) {
            console.log(`      Missing: ${artistComparison.missing.join(', ')}`);
          }
          if (artistComparison.extra.length > 0) {
            console.log(`      Extra: ${artistComparison.extra.join(', ')}`);
          }
          
          issues.artistMismatches.push({
            trackId: track.track_id,
            trackName: track.track_name,
            currentArtists: currentArtists,
            correctArtists: spotifyArtists,
            playCount: track.play_count
          });
        } else {
          console.log(`   ✅ Artists correct: ${spotifyArtists.join(', ')}`);
        }
        
        // Check album
        const spotifyAlbum = spotifyTrack.album ? spotifyTrack.album.name : null;
        const albumComparison = compareAlbums(track.current_album, spotifyAlbum);
        
        if (!albumComparison.match) {
          console.log(`   ❌ ALBUM MISMATCH:`);
          console.log(`      Current: ${track.current_album || 'None'}`);
          console.log(`      Spotify: ${spotifyAlbum || 'None'}`);
          
          issues.albumMismatches.push({
            trackId: track.track_id,
            trackName: track.track_name,
            currentAlbum: track.current_album,
            correctAlbum: spotifyAlbum,
            correctArtists: spotifyArtists,
            playCount: track.play_count
          });
        } else {
          console.log(`   ✅ Album correct: ${spotifyAlbum || 'None'}`);
        }
        
        issues.processed++;
        console.log('');
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 150));
        
      } catch (error) {
        console.log(`   ❌ Error processing "${track.track_name}": ${error.message}`);
        issues.errors++;
      }
    }
    
    // Summary
    console.log(`\n📊 Batch Summary:`);
    console.log(`   📝 Processed: ${issues.processed} tracks`);
    console.log(`   ❌ Errors: ${issues.errors} tracks`);
    console.log(`   🎤 Artist mismatches: ${issues.artistMismatches.length}`);
    console.log(`   💿 Album mismatches: ${issues.albumMismatches.length}`);
    
    if (issues.artistMismatches.length > 0 || issues.albumMismatches.length > 0) {
      console.log(`\n🎯 Top 10 issues found:`);
      
      const allIssues = [
        ...issues.artistMismatches.map(i => ({...i, type: 'artist'})),
        ...issues.albumMismatches.map(i => ({...i, type: 'album'}))
      ].sort((a, b) => b.playCount - a.playCount);
      
      allIssues.slice(0, 10).forEach((issue, index) => {
        console.log(`\n${index + 1}. "${issue.trackName}" (${issue.playCount} plays) - ${issue.type.toUpperCase()}`);
        if (issue.type === 'artist') {
          console.log(`   Current: ${issue.currentArtists.join(', ')}`);
          console.log(`   Should be: ${issue.correctArtists.join(', ')}`);
        } else {
          console.log(`   Current Album: ${issue.currentAlbum || 'None'}`);
          console.log(`   Should be: ${issue.correctAlbum || 'None'}`);
        }
      });
      
      if (dryRun) {
        console.log(`\n⚠️  This was a read-only analysis. No data was modified.`);
        console.log(`   Run with --fix flag to apply corrections.`);
        console.log(`   Use --batch=N to process N tracks at a time (default: 50).`);
        console.log(`   Use --offset=N to start from track N (for processing in chunks).`);
        console.log(`\n💡 Suggested next steps:`);
        console.log(`   1. Review the issues found above`);
        console.log(`   2. Run with --fix --batch=25 for smaller, safer batches`);
        console.log(`   3. Use --offset to process the full dataset in chunks`);
      } else {
        console.log(`\n🔧 Applying fixes...`);
        await applyMetadataFixes(pool, issues);
      }
    } else {
      console.log(`\n✅ No metadata issues found in this batch!`);
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

// Apply the metadata fixes
async function applyMetadataFixes(pool, issues) {
  let fixedCount = 0;
  let errorCount = 0;
  
  console.log(`\n🔧 Processing ${issues.artistMismatches.length + issues.albumMismatches.length} fixes...`);
  
  // Fix artist mismatches
  for (const issue of issues.artistMismatches) {
    const client = await pool.connect();
    try {
      console.log(`\n🎤 Fixing artists for "${issue.trackName}"...`);
      
      await client.query('BEGIN');
      
      // Remove current artist relationships
      await client.query('DELETE FROM track_artists WHERE track_id = $1', [issue.trackId]);
      
      // Add correct artists
      for (let i = 0; i < issue.correctArtists.length; i++) {
        const artistName = issue.correctArtists[i];
        const isPrimary = i === 0;
        
        const artist = await findOrCreateArtist(client, artistName);
        await client.query(
          'INSERT INTO track_artists (track_id, artist_id, is_primary) VALUES ($1, $2, $3)',
          [issue.trackId, artist.id, isPrimary]
        );
      }
      
      await client.query('COMMIT');
      console.log(`   ✅ Updated artists: ${issue.correctArtists.join(', ')}`);
      fixedCount++;
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`   ❌ Failed: ${error.message}`);
      errorCount++;
    } finally {
      client.release();
    }
  }
  
  // Fix album mismatches
  for (const issue of issues.albumMismatches) {
    const client = await pool.connect();
    try {
      console.log(`\n💿 Fixing album for "${issue.trackName}"...`);
      
      await client.query('BEGIN');
      
      // Remove current album relationship
      await client.query('DELETE FROM track_albums WHERE track_id = $1', [issue.trackId]);
      
      // Add correct album if exists
      if (issue.correctAlbum) {
        const primaryArtist = issue.correctArtists[0];
        const album = await findOrCreateAlbum(client, issue.correctAlbum, primaryArtist);
        await client.query(
          'INSERT INTO track_albums (track_id, album_id) VALUES ($1, $2)',
          [issue.trackId, album.id]
        );
        console.log(`   ✅ Updated album: "${album.name}"`);
      } else {
        console.log(`   ✅ Removed incorrect album (track has no album)`);
      }
      
      await client.query('COMMIT');
      fixedCount++;
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`   ❌ Failed: ${error.message}`);
      errorCount++;
    } finally {
      client.release();
    }
  }
  
  console.log(`\n📊 Fix Summary:`);
  console.log(`   ✅ Successfully fixed: ${fixedCount}`);
  console.log(`   ❌ Failed to fix: ${errorCount}`);
  
  if (fixedCount > 0) {
    console.log('\n🎉 Metadata fixes applied successfully!');
    console.log('   All play history has been preserved.');
  }
}

comprehensiveMetadataCleanup();