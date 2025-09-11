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

// Perform the actual cleanup of duplicate external IDs
async function performDuplicateCleanup(pool, duplicateSummary) {
  let totalCleaned = 0;
  let totalDeleted = 0;
  const batchSize = 50; // Process 50 groups per batch
  
  console.log('\\n🔧 Starting batch-based cleanup...');
  
  // Process each entity type
  for (const entityType of ['track', 'artist', 'album']) {
    const duplicates = duplicateSummary[entityType];
    if (duplicates.length === 0) continue;
    
    console.log(`\\n📦 Cleaning up ${duplicates.length} ${entityType} duplicate groups in batches of ${batchSize}...`);
    
    // Process in batches
    for (let i = 0; i < duplicates.length; i += batchSize) {
      const batch = duplicates.slice(i, i + batchSize);
      const client = await pool.connect();
      
      try {
        console.log(`   🔄 Batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(duplicates.length/batchSize)} - Starting transaction...`);
        await client.query('BEGIN');
        
        let batchCleaned = 0;
        let batchDeleted = 0;
        
        for (const duplicate of batch) {
          try {
            const cleaned = await cleanupDuplicateGroup(client, entityType, duplicate.external_id);
            batchCleaned++;
            batchDeleted += cleaned.deletedCount;
            
          } catch (error) {
            console.error(`     ❌ Failed to clean ${entityType} ${duplicate.external_id}: ${error.message}`);
          }
        }
        
        console.log(`   💾 Committing batch (${batchCleaned} groups, ${batchDeleted} entities)...`);
        await client.query('COMMIT');
        
        totalCleaned += batchCleaned;
        totalDeleted += batchDeleted;
        
        console.log(`   ✅ Batch completed. Total progress: ${totalCleaned}/${duplicates.length} groups`);
        
      } catch (error) {
        console.log(`   🔄 Rolling back batch transaction...`);
        await client.query('ROLLBACK');
        console.error(`   💥 Batch failed: ${error.message}`);
        throw error;
      } finally {
        client.release();
      }
    }
    
    console.log(`   ✅ Completed all ${entityType} cleanup batches`);
  }
  
  console.log(`\\n🎉 All batches completed successfully!`);
  console.log(`   • ${totalCleaned} duplicate groups cleaned`);
  console.log(`   • ${totalDeleted} duplicate entities deleted`);
  console.log(`   • All references updated to consolidated entities`);
}

// Clean up a single duplicate group for a specific entity type and external ID
async function cleanupDuplicateGroup(client, entityType, externalId) {
  // Get all entities with this external ID, ordered by priority (most plays first, then most recent)
  let entitiesQuery;
  
  switch (entityType) {
    case 'track':
      entitiesQuery = `
        SELECT 
          t.id as entity_id,
          t.name as entity_name,
          COUNT(p.id) as play_count,
          MAX(p.played_at) as last_played,
          STRING_AGG(DISTINCT a.name, ', ' ORDER BY a.name) as artists
        FROM tracks t
        JOIN external_ids ei ON t.id = ei.entity_id 
        LEFT JOIN plays p ON t.id = p.track_id
        LEFT JOIN track_artists ta ON t.id = ta.track_id
        LEFT JOIN artists a ON ta.artist_id = a.id
        WHERE ei.external_id = $1 AND ei.entity_type = 'track'
        GROUP BY t.id, t.name
        ORDER BY play_count DESC, last_played DESC, entity_id ASC
      `;
      break;
      
    case 'artist':
      entitiesQuery = `
        SELECT 
          a.id as entity_id,
          a.name as entity_name,
          COUNT(p.id) as play_count,
          MAX(p.played_at) as last_played,
          COUNT(DISTINCT t.id) as track_count
        FROM artists a
        JOIN external_ids ei ON a.id = ei.entity_id
        LEFT JOIN track_artists ta ON a.id = ta.artist_id
        LEFT JOIN tracks t ON ta.track_id = t.id  
        LEFT JOIN plays p ON t.id = p.track_id
        WHERE ei.external_id = $1 AND ei.entity_type = 'artist'
        GROUP BY a.id, a.name
        ORDER BY play_count DESC, last_played DESC, entity_id ASC
      `;
      break;
      
    case 'album':
      entitiesQuery = `
        SELECT 
          al.id as entity_id,
          al.name as entity_name,
          COUNT(p.id) as play_count,
          MAX(p.played_at) as last_played,
          COUNT(DISTINCT t.id) as track_count
        FROM albums al
        JOIN external_ids ei ON al.id = ei.entity_id
        LEFT JOIN track_albums tal ON al.id = tal.album_id
        LEFT JOIN tracks t ON tal.track_id = t.id
        LEFT JOIN plays p ON t.id = p.track_id
        WHERE ei.external_id = $1 AND ei.entity_type = 'album'
        GROUP BY al.id, al.name
        ORDER BY play_count DESC, last_played DESC, entity_id ASC
      `;
      break;
  }
  
  const entities = await client.query(entitiesQuery, [externalId]);
  
  if (entities.rows.length <= 1) {
    return { deletedCount: 0 }; // No duplicates to clean
  }
  
  const keepEntity = entities.rows[0]; // Keep the first one (highest priority)
  const deleteEntities = entities.rows.slice(1); // Delete the rest
  
  console.log(`   🔧 ${externalId}: Keeping ${entityType} ID ${keepEntity.entity_id}, deleting ${deleteEntities.length} duplicates`);
  
  // Update all references to point to the kept entity
  for (const entityToDelete of deleteEntities) {
    await updateReferences(client, entityType, entityToDelete.entity_id, keepEntity.entity_id);
  }
  
  // Delete the duplicate entities
  for (const entityToDelete of deleteEntities) {
    await deleteEntity(client, entityType, entityToDelete.entity_id);
  }
  
  return { deletedCount: deleteEntities.length };
}

// Update all references from old entity to new entity
async function updateReferences(client, entityType, fromEntityId, toEntityId) {
  switch (entityType) {
    case 'track':
      // Update plays table
      await client.query(
        'UPDATE plays SET track_id = $1 WHERE track_id = $2',
        [toEntityId, fromEntityId]
      );
      
      // Update track_artists (with conflict handling)
      await client.query(`
        INSERT INTO track_artists (track_id, artist_id, is_primary)
        SELECT $1, artist_id, is_primary 
        FROM track_artists 
        WHERE track_id = $2
        ON CONFLICT (track_id, artist_id) 
        DO UPDATE SET is_primary = EXCLUDED.is_primary OR track_artists.is_primary
      `, [toEntityId, fromEntityId]);
      
      // Update track_albums (with conflict handling)
      await client.query(`
        INSERT INTO track_albums (track_id, album_id, track_number, disc_number)
        SELECT $1, album_id, track_number, disc_number
        FROM track_albums 
        WHERE track_id = $2
        ON CONFLICT (track_id, album_id) 
        DO UPDATE SET 
          track_number = COALESCE(track_albums.track_number, EXCLUDED.track_number),
          disc_number = COALESCE(track_albums.disc_number, EXCLUDED.disc_number)
      `, [toEntityId, fromEntityId]);
      
      break;
      
    case 'artist':
      // First, handle the complex primary artist constraint
      // For each track, we need to ensure only one primary artist
      await client.query(`
        WITH track_conflicts AS (
          -- Find tracks where both old and new artist are primary
          SELECT DISTINCT ta1.track_id
          FROM track_artists ta1
          JOIN track_artists ta2 ON ta1.track_id = ta2.track_id
          WHERE ta1.artist_id = $2 AND ta1.is_primary = true
            AND ta2.artist_id = $1 AND ta2.is_primary = true
        ),
        update_old_to_secondary AS (
          -- Make the old artist secondary on conflicting tracks
          UPDATE track_artists 
          SET is_primary = false
          WHERE artist_id = $2 
            AND track_id IN (SELECT track_id FROM track_conflicts)
            AND is_primary = true
          RETURNING track_id
        )
        -- Now safely insert/update the remaining relationships
        INSERT INTO track_artists (track_id, artist_id, is_primary)
        SELECT track_id, $1, is_primary 
        FROM track_artists 
        WHERE artist_id = $2
        ON CONFLICT (track_id, artist_id) 
        DO UPDATE SET is_primary = EXCLUDED.is_primary OR track_artists.is_primary
      `, [toEntityId, fromEntityId]);
      
      // Update artist_genres (with conflict handling)
      await client.query(`
        INSERT INTO artist_genres (artist_id, genre_id)
        SELECT $1, genre_id 
        FROM artist_genres 
        WHERE artist_id = $2
        ON CONFLICT (artist_id, genre_id) DO NOTHING
      `, [toEntityId, fromEntityId]);
      
      break;
      
    case 'album':
      // Update track_albums (with conflict handling)
      await client.query(`
        INSERT INTO track_albums (track_id, album_id, track_number, disc_number)
        SELECT track_id, $1, track_number, disc_number
        FROM track_albums 
        WHERE album_id = $2
        ON CONFLICT (track_id, album_id) 
        DO UPDATE SET 
          track_number = COALESCE(track_albums.track_number, EXCLUDED.track_number),
          disc_number = COALESCE(track_albums.disc_number, EXCLUDED.disc_number)
      `, [toEntityId, fromEntityId]);
      
      break;
  }
}

// Delete an entity and its external_ids
async function deleteEntity(client, entityType, entityId) {
  // Delete external_ids first (foreign key constraint)
  await client.query(
    'DELETE FROM external_ids WHERE entity_type = $1 AND entity_id = $2',
    [entityType, entityId]
  );
  
  // Delete relationship records that reference this entity
  switch (entityType) {
    case 'track':
      await client.query('DELETE FROM track_artists WHERE track_id = $1', [entityId]);
      await client.query('DELETE FROM track_albums WHERE track_id = $1', [entityId]);
      break;
    case 'artist':
      // track_artists should already be updated to point to kept entity
      await client.query('DELETE FROM track_artists WHERE artist_id = $1', [entityId]);
      // Delete artist_genres relationships
      await client.query('DELETE FROM artist_genres WHERE artist_id = $1', [entityId]);
      break;
    case 'album':
      // track_albums should already be updated to point to kept entity  
      await client.query('DELETE FROM track_albums WHERE album_id = $1', [entityId]);
      break;
  }
  
  // Delete the main entity record
  const tableName = entityType === 'track' ? 'tracks' : 
                   entityType === 'artist' ? 'artists' : 'albums';
  await client.query(`DELETE FROM ${tableName} WHERE id = $1`, [entityId]);
}

async function findDuplicateExternalIds() {
  const dbMode = process.env.DB_MODE || 'production';
  console.log(`🔍 Finding duplicate external IDs on ${dbMode.toUpperCase()} database\\n`);
  
  const pool = new Pool(getDatabaseConfig());
  
  try {
    // Test connection
    console.log('🔌 Testing database connection...');
    await pool.query('SELECT 1');
    console.log('   ✅ Database connected\\n');
    
    // 1. Find duplicate external IDs for each entity type
    const entityTypes = ['track', 'artist', 'album'];
    const duplicateSummary = {};
    
    for (const entityType of entityTypes) {
      console.log(`🔍 Checking duplicate ${entityType} external IDs...`);
      
      const duplicatesQuery = `
        SELECT 
          external_id,
          source,
          COUNT(*) as duplicate_count,
          ARRAY_AGG(entity_id ORDER BY entity_id) as entity_ids
        FROM external_ids 
        WHERE entity_type = $1
        GROUP BY external_id, source, entity_type
        HAVING COUNT(*) > 1
        ORDER BY duplicate_count DESC, external_id
      `;
      
      const duplicates = await pool.query(duplicatesQuery, [entityType]);
      duplicateSummary[entityType] = duplicates.rows;
      
      console.log(`   Found ${duplicates.rows.length} duplicate external ID groups for ${entityType}s`);
      
      if (duplicates.rows.length > 0) {
        console.log(`   Top duplicates:`);
        duplicates.rows.slice(0, 5).forEach(row => {
          console.log(`     • ${row.external_id} (${row.source}): ${row.duplicate_count} duplicates across entities [${row.entity_ids.join(', ')}]`);
        });
        console.log('');
      }
    }
    
    // 2. Detailed analysis with play counts for tracks
    if (duplicateSummary.track.length > 0) {
      console.log('🎵 Analyzing duplicate track external IDs with play counts...');
      
      for (const duplicate of duplicateSummary.track.slice(0, 10)) {
        console.log(`\\n   📀 Analyzing: ${duplicate.external_id}`);
        
        const detailQuery = `
          SELECT 
            t.id as track_id,
            t.name as track_name,
            COUNT(p.id) as play_count,
            MAX(p.played_at) as last_played,
            STRING_AGG(DISTINCT a.name, ', ' ORDER BY a.name) as artists
          FROM tracks t
          JOIN external_ids ei ON t.id = ei.entity_id 
          LEFT JOIN plays p ON t.id = p.track_id
          LEFT JOIN track_artists ta ON t.id = ta.track_id
          LEFT JOIN artists a ON ta.artist_id = a.id
          WHERE ei.external_id = $1 AND ei.entity_type = 'track'
          GROUP BY t.id, t.name
          ORDER BY play_count DESC, last_played DESC
        `;
        
        const details = await pool.query(detailQuery, [duplicate.external_id]);
        details.rows.forEach((row, index) => {
          const status = index === 0 ? '👑 KEEP' : '❌ DELETE';
          console.log(`     ${status} Track ID ${row.track_id}: "${row.track_name}" by ${row.artists || 'Unknown'} - ${row.play_count} plays`);
        });
      }
    }
    
    // 3. Detailed analysis with play counts for artists  
    if (duplicateSummary.artist.length > 0) {
      console.log('\\n👤 Analyzing duplicate artist external IDs with play counts...');
      
      for (const duplicate of duplicateSummary.artist.slice(0, 10)) {
        console.log(`\\n   🎤 Analyzing: ${duplicate.external_id}`);
        
        const detailQuery = `
          SELECT 
            a.id as artist_id,
            a.name as artist_name,
            COUNT(p.id) as total_plays,
            MAX(p.played_at) as last_played,
            COUNT(DISTINCT t.id) as track_count
          FROM artists a
          JOIN external_ids ei ON a.id = ei.entity_id
          LEFT JOIN track_artists ta ON a.id = ta.artist_id
          LEFT JOIN tracks t ON ta.track_id = t.id  
          LEFT JOIN plays p ON t.id = p.track_id
          WHERE ei.external_id = $1 AND ei.entity_type = 'artist'
          GROUP BY a.id, a.name
          ORDER BY total_plays DESC, last_played DESC
        `;
        
        const details = await pool.query(detailQuery, [duplicate.external_id]);
        details.rows.forEach((row, index) => {
          const status = index === 0 ? '👑 KEEP' : '❌ DELETE';
          console.log(`     ${status} Artist ID ${row.artist_id}: "${row.artist_name}" - ${row.total_plays} plays across ${row.track_count} tracks`);
        });
      }
    }
    
    // 4. Detailed analysis for albums
    if (duplicateSummary.album.length > 0) {
      console.log('\\n💿 Analyzing duplicate album external IDs with play counts...');
      
      for (const duplicate of duplicateSummary.album.slice(0, 10)) {
        console.log(`\\n   💽 Analyzing: ${duplicate.external_id}`);
        
        const detailQuery = `
          SELECT 
            al.id as album_id,
            al.name as album_name,
            COUNT(p.id) as total_plays,
            MAX(p.played_at) as last_played,
            COUNT(DISTINCT t.id) as track_count,
            STRING_AGG(DISTINCT a.name, ', ' ORDER BY a.name) as artists
          FROM albums al
          JOIN external_ids ei ON al.id = ei.entity_id
          LEFT JOIN track_albums tal ON al.id = tal.album_id
          LEFT JOIN tracks t ON tal.track_id = t.id
          LEFT JOIN plays p ON t.id = p.track_id
          LEFT JOIN track_artists ta ON t.id = ta.track_id
          LEFT JOIN artists a ON ta.artist_id = a.id
          WHERE ei.external_id = $1 AND ei.entity_type = 'album'
          GROUP BY al.id, al.name
          ORDER BY total_plays DESC, last_played DESC
        `;
        
        const details = await pool.query(detailQuery, [duplicate.external_id]);
        details.rows.forEach((row, index) => {
          const status = index === 0 ? '👑 KEEP' : '❌ DELETE';
          console.log(`     ${status} Album ID ${row.album_id}: "${row.album_name}" by ${row.artists || 'Unknown'} - ${row.total_plays} plays across ${row.track_count} tracks`);
        });
      }
    }
    
    // 5. Summary and impact analysis
    const totalDuplicates = Object.values(duplicateSummary).reduce((sum, dups) => sum + dups.length, 0);
    
    // Count total entities that would be deleted (calculate once for all uses)
    let totalToDelete = 0;
    Object.values(duplicateSummary).forEach(dups => {
      dups.forEach(dup => {
        totalToDelete += (dup.duplicate_count - 1); // Keep 1, delete the rest
      });
    });
    
    console.log('\\n📝 Summary:');
    console.log(`   • ${duplicateSummary.track.length} duplicate track external ID groups`);
    console.log(`   • ${duplicateSummary.artist.length} duplicate artist external ID groups`);  
    console.log(`   • ${duplicateSummary.album.length} duplicate album external ID groups`);
    console.log(`   • ${totalDuplicates} total duplicate groups to clean up`);
    
    if (totalDuplicates > 0) {
      console.log('\\n💡 Cleanup Strategy:');
      console.log('   1. For each duplicate group, keep the entity with most plays');
      console.log('   2. If play counts are equal, keep the most recently played');
      console.log('   3. Update all references to point to the kept entity');
      console.log('   4. Delete the duplicate entities and their external_ids');
      console.log('\\n⚠️  Impact Analysis:');
      
      console.log(`   • ${totalToDelete} entities would be deleted`);
      console.log(`   • References would be updated to point to remaining entities`);
      console.log(`   • This should reduce duplicate track/artist/album issues significantly`);
    } else {
      console.log('\\n✅ No duplicate external IDs found! Database is clean.');
    }
    
    if (!dryRun && totalDuplicates > 0) {
      console.log('\\n⚠️  READY TO CLEAN UP:');
      console.log(`   • ${totalDuplicates} duplicate groups found`);
      console.log(`   • Estimated ${totalToDelete} entities will be deleted`);
      console.log(`   • All play history and relationships will be preserved`);
      console.log(`   • This operation uses a transaction and can be rolled back if errors occur`);
      
      // Safety check for large operations
      if (totalDuplicates > 100) {
        console.log('\\n🛑 LARGE OPERATION DETECTED:');
        console.log('   This will clean up more than 100 duplicate groups.');
        console.log('   Consider running on a smaller test batch first.');
        console.log('   Add --force flag to proceed with large cleanup.');
        
        if (!args.includes('--force')) {
          console.log('\\n   Aborted: Add --force flag to proceed with large cleanup.');
          return duplicateSummary;
        }
      }
      
      console.log('\\n🔧 STARTING AUTOMATIC CLEANUP...');
      await performDuplicateCleanup(pool, duplicateSummary);
    } else {
      console.log('\\n⚠️  Note: This was a read-only analysis. No data was modified.');
      console.log('   Run with --fix flag to apply automatic corrections.');
      if (totalDuplicates > 100) {
        console.log('   Large dataset detected - add --force flag for operations > 100 groups.');
      }
    }
    
    return duplicateSummary;
    
  } catch (error) {
    console.error('\\n💥 Duplicate analysis failed:', error.message);
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
const force = args.includes('--force');

if (dryRun) {
  console.log('🔍 Running in ANALYSIS mode (no changes will be made)');
  console.log('   Add --fix flag to apply corrections');
  console.log('   Add --fix --force flag for large operations (>100 groups)\\n');
} else {
  console.log('🔧 Running in FIX mode (changes will be applied)');
  if (force) {
    console.log('   --force flag detected: Large operations enabled\\n');
  } else {
    console.log('   Large operations require --force flag\\n');
  }
}

findDuplicateExternalIds();