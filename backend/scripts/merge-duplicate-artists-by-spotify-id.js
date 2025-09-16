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

async function mergeDuplicateArtistsBySpotifyId() {
  const dbMode = process.env.DB_MODE || 'production';
  const dryRun = !process.argv.includes('--fix');
  
  console.log(`🔧 ${dryRun ? 'ANALYZING' : 'FIXING'} duplicate artists with same Spotify ID on ${dbMode.toUpperCase()} database\n`);
  
  const pool = new Pool(getDatabaseConfig());
  
  try {
    console.log('🔌 Testing database connection...');
    await pool.query('SELECT 1');
    console.log('   ✅ Database connected\n');
    
    // Find artists with duplicate Spotify external IDs AND similar names
    console.log('🔍 Finding duplicate artists with same Spotify ID and matching names...');
    const duplicateQuery = `
      WITH spotify_artist_duplicates AS (
        SELECT 
          ei.external_id as spotify_id,
          -- Normalize names for comparison
          LOWER(TRIM(REGEXP_REPLACE(a.name, '\\s+', ' ', 'g'))) as normalized_name,
          array_agg(ei.entity_id ORDER BY 
            -- Prioritize artists with more data quality indicators
            CASE WHEN a.image_url IS NOT NULL THEN 1 ELSE 2 END,
            CASE WHEN a.last_fetched IS NOT NULL THEN 1 ELSE 2 END,
            play_counts.play_count DESC NULLS LAST,
            a.id DESC
          ) as artist_ids,
          count(*) as duplicate_count
        FROM external_ids ei
        JOIN artists a ON ei.entity_id = a.id
        LEFT JOIN (
          SELECT ta.artist_id, COUNT(p.id) as play_count
          FROM track_artists ta
          LEFT JOIN plays p ON p.track_id = ta.track_id
          GROUP BY ta.artist_id
        ) play_counts ON play_counts.artist_id = a.id
        WHERE ei.entity_type = 'artist' 
        AND ei.source = 'spotify'
        AND ei.external_id LIKE 'spotify:artist:%'
        GROUP BY ei.external_id, LOWER(TRIM(REGEXP_REPLACE(a.name, '\\s+', ' ', 'g')))
        HAVING count(*) > 1
      )
      SELECT 
        sad.spotify_id,
        sad.normalized_name,
        sad.artist_ids,
        sad.duplicate_count,
        string_agg(DISTINCT a.name, ' | ' ORDER BY a.name) as all_names,
        array_agg(DISTINCT COALESCE(play_counts.play_count, 0) ORDER BY COALESCE(play_counts.play_count, 0) DESC) as play_counts,
        SUM(COALESCE(play_counts.play_count, 0)) as total_plays
      FROM spotify_artist_duplicates sad
      JOIN artists a ON a.id = ANY(sad.artist_ids)
      LEFT JOIN (
        SELECT ta.artist_id, COUNT(p.id) as play_count
        FROM track_artists ta
        LEFT JOIN plays p ON p.track_id = ta.track_id
        GROUP BY ta.artist_id
      ) play_counts ON play_counts.artist_id = a.id
      GROUP BY sad.spotify_id, sad.normalized_name, sad.artist_ids, sad.duplicate_count
      ORDER BY SUM(COALESCE(play_counts.play_count, 0)) DESC, sad.duplicate_count DESC
    `;
    
    const duplicates = await pool.query(duplicateQuery);
    console.log(`   Found ${duplicates.rows.length} groups of duplicate artists\n`);
    
    if (duplicates.rows.length === 0) {
      console.log('✅ No duplicate artists with same Spotify ID found!');
      return;
    }
    
    console.log('📋 Duplicate artist groups:');
    let totalArtistsToMerge = 0;
    const mergeOperations = [];
    
    for (const duplicate of duplicates.rows) {
      const artistIds = duplicate.artist_ids;
      const keepId = artistIds[0]; // First ID (best quality based on ORDER BY)
      const mergeIds = artistIds.slice(1);
      
      console.log(`\n🎤 Spotify ID: ${duplicate.spotify_id}`);
      console.log(`   Normalized Name: "${duplicate.normalized_name}"`);
      console.log(`   Actual Names: ${duplicate.all_names}`);
      console.log(`   ${duplicate.duplicate_count} duplicates, ${duplicate.total_plays} total plays`);
      console.log(`   Play counts per artist: [${duplicate.play_counts.join(', ')}]`);
      console.log(`   Keep Artist ID: ${keepId} (${duplicate.play_counts[0]} plays)`);
      console.log(`   Merge Artist IDs: [${mergeIds.join(', ')}]`);
      
      mergeOperations.push({
        spotifyId: duplicate.spotify_id,
        names: duplicate.all_names,
        keepId: keepId,
        mergeIds: mergeIds,
        totalPlays: duplicate.total_plays
      });
      
      totalArtistsToMerge += mergeIds.length;
    }
    
    console.log(`\n📊 Summary: ${totalArtistsToMerge} duplicate artists to merge into ${mergeOperations.length} consolidated artists`);
    
    if (dryRun) {
      console.log('\n⚠️  This was a read-only analysis. No data was modified.');
      console.log('   Run with --fix flag to perform the merge operations.');
      console.log(`   This will merge ${totalArtistsToMerge} duplicate artists and preserve all play history.`);
    } else {
      console.log('\n🔧 Performing artist merges...');
      await performArtistMerges(pool, mergeOperations);
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

async function performArtistMerges(pool, mergeOperations) {
  let mergedCount = 0;
  let errorCount = 0;
  
  for (const operation of mergeOperations) {
    console.log(`\n🔄 Merging artists for: ${operation.names}`);
    console.log(`   Spotify ID: ${operation.spotifyId}`);
    console.log(`   Keep: ${operation.keepId}, Merge: [${operation.mergeIds.join(', ')}]`);
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 1. Merge track_artists relationships (handle duplicates with upsert)
      console.log('   📊 Merging track-artist relationships...');
      const trackArtistsToMove = await client.query(
        'SELECT track_id, is_primary FROM track_artists WHERE artist_id = ANY($1)',
        [operation.mergeIds]
      );
      
      let trackArtistUpdates = 0;
      for (const ta of trackArtistsToMove.rows) {
        // If trying to insert a primary artist, check if the kept artist is already primary for this track
        if (ta.is_primary) {
          const existingPrimary = await client.query(
            'SELECT 1 FROM track_artists WHERE track_id = $1 AND artist_id = $2 AND is_primary = true',
            [ta.track_id, operation.keepId]
          );
          
          if (existingPrimary.rows.length > 0) {
            // Keep artist is already primary for this track, skip inserting duplicate primary
            console.log(`      ⚠️  Skipping duplicate primary relationship for track ${ta.track_id}`);
            continue;
          }
          
          // Remove primary flag from other artists on this track before adding new primary
          await client.query(
            'UPDATE track_artists SET is_primary = false WHERE track_id = $1 AND artist_id != $2',
            [ta.track_id, operation.keepId]
          );
        }
        
        await client.query(`
          INSERT INTO track_artists (track_id, artist_id, is_primary)
          VALUES ($1, $2, $3)
          ON CONFLICT (track_id, artist_id) DO UPDATE SET
          is_primary = CASE 
            WHEN EXCLUDED.is_primary = true THEN true 
            ELSE track_artists.is_primary 
          END
        `, [ta.track_id, operation.keepId, ta.is_primary]);
        trackArtistUpdates++;
      }
      
      // Delete old track_artists relationships
      await client.query(
        'DELETE FROM track_artists WHERE artist_id = ANY($1)',
        [operation.mergeIds]
      );
      console.log(`      Merged ${trackArtistUpdates} track-artist relationships`);
      
      // 2. Merge album_artists relationships (handle duplicates with upsert)
      console.log('   💿 Merging album-artist relationships...');
      const albumArtistsToMove = await client.query(
        'SELECT album_id FROM album_artists WHERE artist_id = ANY($1)',
        [operation.mergeIds]
      );
      
      let albumArtistUpdates = 0;
      for (const aa of albumArtistsToMove.rows) {
        await client.query(`
          INSERT INTO album_artists (album_id, artist_id)
          VALUES ($1, $2)
          ON CONFLICT (album_id, artist_id) DO NOTHING
        `, [aa.album_id, operation.keepId]);
        albumArtistUpdates++;
      }
      
      // Delete old album_artists relationships
      await client.query(
        'DELETE FROM album_artists WHERE artist_id = ANY($1)',
        [operation.mergeIds]
      );
      console.log(`      Merged ${albumArtistUpdates} album-artist relationships`);
      
      // 3. Merge artist_genres relationships (handle duplicates with upsert)
      console.log('   🏷️  Merging artist-genre relationships...');
      const artistGenresToMove = await client.query(
        'SELECT genre_id FROM artist_genres WHERE artist_id = ANY($1)',
        [operation.mergeIds]
      );
      
      let artistGenreUpdates = 0;
      for (const ag of artistGenresToMove.rows) {
        await client.query(`
          INSERT INTO artist_genres (artist_id, genre_id)
          VALUES ($1, $2)
          ON CONFLICT (artist_id, genre_id) DO NOTHING
        `, [operation.keepId, ag.genre_id]);
        artistGenreUpdates++;
      }
      
      // Delete old artist_genres relationships
      await client.query(
        'DELETE FROM artist_genres WHERE artist_id = ANY($1)',
        [operation.mergeIds]
      );
      console.log(`      Merged ${artistGenreUpdates} artist-genre relationships`);
      
      // 4. Merge external_ids (handle duplicates by deleting the merge ones)
      console.log('   🔗 Merging external IDs...');
      const externalIdResult = await client.query(
        'DELETE FROM external_ids WHERE entity_type = $1 AND entity_id = ANY($2)',
        ['artist', operation.mergeIds]
      );
      console.log(`      Removed ${externalIdResult.rowCount} duplicate external ID mappings`);
      
      // 5. Delete the duplicate artists
      console.log('   🗑️  Deleting duplicate artist entries...');
      const deleteResult = await client.query(
        'DELETE FROM artists WHERE id = ANY($1)',
        [operation.mergeIds]
      );
      console.log(`      Deleted ${deleteResult.rowCount} duplicate artists`);
      
      await client.query('COMMIT');
      
      console.log(`   ✅ Successfully merged ${operation.mergeIds.length} duplicates into artist ${operation.keepId}`);
      mergedCount += operation.mergeIds.length;
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`   ❌ Failed to merge artists for ${operation.names}: ${error.message}`);
      errorCount++;
    } finally {
      client.release();
    }
  }
  
  console.log(`\n📊 Artist Merge Summary:`);
  console.log(`   ✅ Successfully merged: ${mergedCount} duplicate artists`);
  console.log(`   ❌ Failed operations: ${errorCount} artist groups`);
  console.log(`   🎯 Total operations: ${mergeOperations.length} artist groups`);
  
  if (mergedCount > 0) {
    console.log('\n🎉 Artist deduplication complete!');
    console.log('   All play history and relationships have been preserved.');
    console.log('   Future syncs should no longer create these duplicates.');
  }
}

// Check command line arguments
const args = process.argv.slice(2);

if (args.includes('--help')) {
  console.log(`
🔧 Merge Duplicate Artists by Spotify ID

This script finds artists with the same Spotify external ID and merges them into a single entity,
preserving all play history and relationships.

Usage:
  node merge-duplicate-artists-by-spotify-id.js [--fix]

Options:
  --fix              Actually perform the merge operations (default: dry-run)
  --help             Show this help

Examples:
  node merge-duplicate-artists-by-spotify-id.js         # Analyze duplicates (dry-run)
  node merge-duplicate-artists-by-spotify-id.js --fix   # Actually fix the duplicates

How it works:
1. Finds artists with identical Spotify external IDs
2. Keeps the artist with the most plays and best data quality
3. Moves all relationships (tracks, albums, genres, plays) to the kept artist
4. Deletes the duplicate artist entries
5. Cleans up any resulting relationship duplicates

Safety:
- All play history is preserved
- All track/album relationships are maintained
- Uses database transactions with rollback on errors
- Dry-run mode shows what would be changed
  `);
  process.exit(0);
}

mergeDuplicateArtistsBySpotifyId();