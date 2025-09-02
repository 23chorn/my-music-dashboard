import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Get the directory where this script is located
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the backend directory
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function simpleRestore() {
  console.log('🔄 SIMPLE RESTORE FROM BACKUP: 2025-09-02T03-03-58\n');
  console.log('⚠️  This will restore your data but IDs will be reassigned\n');

  try {
    // Step 1: Load data
    console.log('📁 Loading backup data...');
    const tables = [
      "artists", "albums", "genres", "tracks", "plays", 
      "external_ids", "artist_genres", "track_artists", 
      "track_albums", "album_artists"
    ];

    const backupData = {};
    for (const table of tables) {
      const filePath = path.join(__dirname, `${table}.json`);
      if (fs.existsSync(filePath)) {
        backupData[table] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        console.log(`   ✅ Loaded ${backupData[table].length} ${table} records`);
      }
    }

    // Step 2: Clear all data
    console.log('\n🗑️ Clearing existing data...');
    const clearOrder = [
      "album_artists", "track_albums", "track_artists", 
      "artist_genres", "external_ids", "plays", 
      "tracks", "genres", "albums", "artists"
    ];

    for (const table of clearOrder) {
      console.log(`   Clearing ${table}...`);
      await supabase.from(table).delete().gte('id', 0);
    }

    // Step 3: Create mapping objects to track old ID -> new ID
    const idMappings = {};

    // Step 4: Insert base tables first (artists, albums, genres, tracks)
    console.log('\n📦 Restoring base tables...');
    const baseTables = ["artists", "albums", "genres", "tracks"];
    
    for (const table of baseTables) {
      const data = backupData[table];
      if (!data || data.length === 0) continue;

      console.log(`📋 Restoring ${table} (${data.length} records)...`);
      idMappings[table] = {};

      // Insert in batches without IDs
      const batchSize = 500;
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        
        // Remove IDs and prepare batch
        const batchWithoutIds = batch.map(row => {
          const { id, ...rest } = row;
          return rest;
        });

        const { data: inserted, error } = await supabase
          .from(table)
          .insert(batchWithoutIds)
          .select('id, name');  // Get back the new IDs and names for mapping

        if (error) throw error;

        // Create mapping from old ID to new ID using name as key
        batch.forEach((originalRow, idx) => {
          const newRow = inserted[idx];
          if (newRow) {
            idMappings[table][originalRow.id] = newRow.id;
          }
        });

        console.log(`   ✅ Batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(data.length/batchSize)} complete`);
      }
    }

    // Step 5: Insert plays (references tracks)
    console.log('\n📋 Restoring plays...');
    const playsData = backupData.plays || [];
    if (playsData.length > 0) {
      const batchSize = 1000;
      for (let i = 0; i < playsData.length; i += batchSize) {
        const batch = playsData.slice(i, i + batchSize);
        
        const mappedBatch = batch
          .filter(row => idMappings.tracks[row.track_id]) // Only include if track exists
          .map(row => ({
            track_id: idMappings.tracks[row.track_id],
            played_at: row.played_at
          }));

        if (mappedBatch.length > 0) {
          const { error } = await supabase.from('plays').insert(mappedBatch);
          if (error) throw error;
        }

        console.log(`   ✅ Batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(playsData.length/batchSize)} complete`);
      }
    }

    // Step 6: Insert external_ids
    console.log('\n📋 Restoring external_ids...');
    const externalIdsData = backupData.external_ids || [];
    if (externalIdsData.length > 0) {
      const batchSize = 500;
      for (let i = 0; i < externalIdsData.length; i += batchSize) {
        const batch = externalIdsData.slice(i, i + batchSize);
        
        const mappedBatch = batch
          .map(row => {
            let entityId = row.entity_id;
            
            // Map entity_id based on entity_type
            if (row.entity_type === 'artist' && idMappings.artists[row.entity_id]) {
              entityId = idMappings.artists[row.entity_id];
            } else if (row.entity_type === 'album' && idMappings.albums[row.entity_id]) {
              entityId = idMappings.albums[row.entity_id];
            } else if (row.entity_type === 'track' && idMappings.tracks[row.entity_id]) {
              entityId = idMappings.tracks[row.entity_id];
            } else if (row.entity_type === 'genre' && idMappings.genres[row.entity_id]) {
              entityId = idMappings.genres[row.entity_id];
            } else {
              return null; // Skip if mapping not found
            }

            return {
              entity_type: row.entity_type,
              entity_id: entityId,
              source: row.source,
              external_id: row.external_id
            };
          })
          .filter(row => row !== null);

        if (mappedBatch.length > 0) {
          const { error } = await supabase.from('external_ids').insert(mappedBatch);
          if (error) throw error;
        }

        console.log(`   ✅ Batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(externalIdsData.length/batchSize)} complete`);
      }
    }

    // Step 7: Insert relationship tables
    console.log('\n📋 Restoring relationship tables...');
    const relationshipTables = [
      { table: 'artist_genres', mappings: { artist_id: 'artists', genre_id: 'genres' } },
      { table: 'track_artists', mappings: { track_id: 'tracks', artist_id: 'artists' } },
      { table: 'track_albums', mappings: { track_id: 'tracks', album_id: 'albums' } },
      { table: 'album_artists', mappings: { album_id: 'albums', artist_id: 'artists' } }
    ];

    for (const { table, mappings } of relationshipTables) {
      const data = backupData[table] || [];
      if (data.length === 0) continue;

      console.log(`   Restoring ${table} (${data.length} records)...`);

      const batchSize = 500;
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        
        const mappedBatch = batch
          .map(row => {
            const mappedRow = {};
            let allMappingsFound = true;

            for (const [column, sourceTable] of Object.entries(mappings)) {
              const oldId = row[column];
              const newId = idMappings[sourceTable][oldId];
              if (!newId) {
                allMappingsFound = false;
                break;
              }
              mappedRow[column] = newId;
            }

            // Include any other columns (like track_number, disc_number)
            for (const [key, value] of Object.entries(row)) {
              if (!mappings[key] && key !== 'id') {
                mappedRow[key] = value;
              }
            }

            return allMappingsFound ? mappedRow : null;
          })
          .filter(row => row !== null);

        if (mappedBatch.length > 0) {
          const { error } = await supabase.from(table).insert(mappedBatch);
          if (error) throw error;
        }

        console.log(`     Batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(data.length/batchSize)} complete`);
      }
    }

    console.log('\n🎉 RESTORE COMPLETE!');
    console.log('Your database has been successfully restored!');
    console.log('Note: IDs have been reassigned, but all relationships are preserved.');

  } catch (error) {
    console.error('\n💥 RESTORE FAILED:', error.message);
    throw error;
  }
}

// Check for confirmation
const args = process.argv.slice(2);
if (!args.includes('--confirm')) {
  console.log(`
⚠️  SIMPLE RESTORE WILL REPLACE YOUR DATABASE

This will:
- Delete ALL existing data
- Restore from backup: 2025-09-02T03-03-58
- Reassign new IDs but preserve all relationships
- Cannot be undone

To proceed, run:
node restore_simple.js --confirm
  `);
  process.exit(0);
}

// Run the restore
simpleRestore().catch(error => {
  console.error('Fatal error:', error.message);
  process.exit(1);
});