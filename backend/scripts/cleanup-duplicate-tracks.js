#!/usr/bin/env node

import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

import pkg from 'pg';
const { Pool } = pkg;
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

async function cleanupDuplicateTracks() {
  const dbMode = process.env.DB_MODE || 'production';
  console.log(`🧹 Starting track cleanup on ${dbMode.toUpperCase()} database\n`);
  
  const pool = new Pool(getDatabaseConfig());
  
  try {
    // Test connection
    console.log('🔌 Testing database connection...');
    await pool.query('SELECT 1');
    console.log('   ✅ Database connected\n');
    
    // Find tracks with multiple primary artists (this shouldn't happen)
    console.log('🔍 Finding tracks with multiple primary artists...');
    const multiplePrimaryQuery = `
      SELECT 
        t.id as track_id,
        t.name as track_name,
        COUNT(*) as primary_artist_count,
        STRING_AGG(a.name, ', ' ORDER BY a.name) as primary_artists
      FROM tracks t
      JOIN track_artists ta ON t.id = ta.track_id AND ta.is_primary = true
      JOIN artists a ON ta.artist_id = a.id
      GROUP BY t.id, t.name
      HAVING COUNT(*) > 1
      ORDER BY primary_artist_count DESC, t.name
    `;
    
    const multiplePrimary = await pool.query(multiplePrimaryQuery);
    console.log(`   Found ${multiplePrimary.rows.length} tracks with multiple primary artists`);
    
    if (multiplePrimary.rows.length > 0) {
      console.log('\n📋 Tracks with multiple primary artists:');
      multiplePrimary.rows.forEach(row => {
        console.log(`   • "${row.track_name}" - ${row.primary_artist_count} primary artists: ${row.primary_artists}`);
      });
    }
    
    // Find tracks that likely should be separate (same name, different artists)
    console.log('\n🔍 Finding potentially incorrectly merged tracks...');
    const potentialDuplicatesQuery = `
      SELECT 
        t.name as track_name,
        COUNT(DISTINCT a.id) as unique_artists,
        STRING_AGG(DISTINCT a.name, ', ' ORDER BY a.name) as all_artists,
        COUNT(*) as total_plays,
        STRING_AGG(DISTINCT t.id::text, ', ') as track_ids
      FROM tracks t
      JOIN track_artists ta ON t.id = ta.track_id
      JOIN artists a ON ta.artist_id = a.id
      JOIN plays p ON t.id = p.track_id
      GROUP BY t.name
      HAVING COUNT(DISTINCT a.id) > 2  -- More than 2 different artists for same track name
      ORDER BY unique_artists DESC, total_plays DESC
      LIMIT 20
    `;
    
    const potentialDuplicates = await pool.query(potentialDuplicatesQuery);
    console.log(`   Found ${potentialDuplicates.rows.length} tracks with suspicious artist combinations`);
    
    if (potentialDuplicates.rows.length > 0) {
      console.log('\n📋 Potentially incorrectly merged tracks:');
      potentialDuplicates.rows.slice(0, 10).forEach(row => {
        console.log(`   • "${row.track_name}" - ${row.unique_artists} artists: ${row.all_artists} (${row.total_plays} plays)`);
      });
    }
    
    // Look for tracks where Spotify external IDs might help us separate them
    console.log('\n🔍 Checking tracks with Spotify IDs for potential splits...');
    const spotifyTracksQuery = `
      SELECT 
        t.name as track_name,
        COUNT(DISTINCT ei.external_id) as spotify_ids,
        COUNT(DISTINCT ta.artist_id) as unique_artists,
        STRING_AGG(DISTINCT a.name, ', ' ORDER BY a.name) as artists,
        STRING_AGG(DISTINCT ei.external_id, ', ') as spotify_external_ids
      FROM tracks t
      JOIN external_ids ei ON t.id = ei.entity_id AND ei.entity_type = 'track' AND ei.source = 'spotify'
      JOIN track_artists ta ON t.id = ta.track_id
      JOIN artists a ON ta.artist_id = a.id
      GROUP BY t.name
      HAVING COUNT(DISTINCT ei.external_id) > 1 AND COUNT(DISTINCT ta.artist_id) > 1
      ORDER BY spotify_ids DESC, unique_artists DESC
      LIMIT 10
    `;
    
    const spotifyTracks = await pool.query(spotifyTracksQuery);
    console.log(`   Found ${spotifyTracks.rows.length} tracks with multiple Spotify IDs and artists`);
    
    if (spotifyTracks.rows.length > 0) {
      console.log('\n📋 Tracks with multiple Spotify IDs (definite duplicates):');
      spotifyTracks.rows.forEach(row => {
        console.log(`   • "${row.track_name}" - ${row.spotify_ids} Spotify IDs, ${row.unique_artists} artists: ${row.artists}`);
      });
      
      // Ask if user wants to fix these automatically
      console.log('\n🛠️  These tracks should definitely be split since they have different Spotify IDs.');
      console.log('    Would you like to proceed with automatic cleanup? (This will create separate track entries)');
      console.log('    Note: This is a read-only analysis. No changes will be made yet.');
    }
    
    // Show example of how the data looks for one problematic track
    if (potentialDuplicates.rows.length > 0) {
      const exampleTrack = potentialDuplicates.rows[0];
      console.log(`\n📊 Detailed analysis of "${exampleTrack.track_name}":`);
      
      const detailQuery = `
        SELECT 
          t.id as track_id,
          t.name as track_name,
          a.name as artist_name,
          ta.is_primary,
          COUNT(p.id) as play_count,
          MIN(p.played_at) as first_play,
          MAX(p.played_at) as last_play
        FROM tracks t
        JOIN track_artists ta ON t.id = ta.track_id
        JOIN artists a ON ta.artist_id = a.id
        LEFT JOIN plays p ON t.id = p.track_id
        WHERE t.name = $1
        GROUP BY t.id, t.name, a.name, ta.is_primary
        ORDER BY play_count DESC, a.name
      `;
      
      const details = await pool.query(detailQuery, [exampleTrack.track_name]);
      details.rows.forEach(row => {
        const primaryFlag = row.is_primary ? '(PRIMARY)' : '';
        console.log(`   • Track ID ${row.track_id} - Artist: ${row.artist_name} ${primaryFlag} - ${row.play_count} plays - First: ${row.first_play?.toISOString()?.split('T')[0]}`);
      });
    }
    
    console.log('\n📝 Summary:');
    console.log(`   • ${multiplePrimary.rows.length} tracks with multiple primary artists (data integrity issue)`);
    console.log(`   • ${potentialDuplicates.rows.length} tracks with suspicious artist combinations`);
    console.log(`   • ${spotifyTracks.rows.length} tracks with multiple Spotify IDs (definite duplicates)`);
    
    console.log('\n💡 Recommendations:');
    console.log('   1. Fix tracks with multiple primary artists by keeping only one primary');
    console.log('   2. Split tracks with multiple Spotify IDs into separate entries');
    console.log('   3. Review high-artist-count tracks manually for potential splits');
    console.log('   4. Update sync logic to prevent future duplicates (already done)');
    
    console.log('\n⚠️  Note: This was a read-only analysis. No data was modified.');
    console.log('   Run with --fix flag to apply automatic corrections (not implemented yet).');
    
  } catch (error) {
    console.error('\n💥 Cleanup analysis failed:', error.message);
    if (error.code) {
      console.error(`   Error code: ${error.code}`);
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Handle command line arguments
const args = process.argv.slice(2);
const dryRun = !args.includes('--fix');

if (dryRun) {
  console.log('🔍 Running in ANALYSIS mode (no changes will be made)');
  console.log('   Add --fix flag to apply corrections\n');
} else {
  console.log('⚠️  FIX mode not implemented yet. Running analysis only.\n');
}

cleanupDuplicateTracks();