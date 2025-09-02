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

async function fullRestore() {
  console.log('🔄 FULL DATABASE RESTORE FROM BACKUP: 2025-09-02T03-03-58\n');
  console.log('⚠️  This will completely replace all data in your database!\n');

  try {
    // Step 1: Load all data
    console.log('📁 Loading backup data...');
    const backupData = {};
    const tables = [
      "artists", "albums", "genres", "tracks", "plays", 
      "external_ids", "artist_genres", "track_artists", 
      "track_albums", "album_artists"
    ];

    for (const table of tables) {
      const filePath = path.join(__dirname, `${table}.json`);
      if (fs.existsSync(filePath)) {
        backupData[table] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        console.log(`   ✅ Loaded ${backupData[table].length} ${table} records`);
      } else {
        console.log(`   ⚠️  ${table}.json not found, skipping`);
        backupData[table] = [];
      }
    }

    // Step 2: Clear all tables (in reverse dependency order)
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

    // Step 3: Disable foreign key checks (if possible via RLS policies)
    console.log('\n🔧 Preparing for data insertion...');

    // Step 4: Insert data (in dependency order)
    console.log('\n📦 Restoring data...');
    const insertOrder = [
      "artists", "albums", "genres", "tracks", "plays",
      "external_ids", "artist_genres", "track_artists", 
      "track_albums", "album_artists"
    ];

    for (const table of insertOrder) {
      if (backupData[table] && backupData[table].length > 0) {
        console.log(`📋 Restoring ${table} (${backupData[table].length} records)...`);
        
        // Insert in smaller batches to avoid timeouts
        const batchSize = 500;
        const data = backupData[table];
        
        for (let i = 0; i < data.length; i += batchSize) {
          const batch = data.slice(i, i + batchSize);
          
          // Use upsert to handle any conflicts
          const { error } = await supabase
            .from(table)
            .upsert(batch, { onConflict: 'id' });

          if (error) {
            console.error(`   ❌ Error in batch ${Math.floor(i/batchSize) + 1}:`, error.message);
            throw error;
          }
          
          console.log(`   ✅ Batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(data.length/batchSize)} complete`);
        }
        
        console.log(`   ✅ ${table} restored successfully`);
      } else {
        console.log(`   ⏭️  No data to restore for ${table}`);
      }
    }

    console.log('\n🎉 RESTORE COMPLETE!');
    console.log('Your database has been restored to the backup state.');

  } catch (error) {
    console.error('\n💥 RESTORE FAILED:', error.message);
    console.error('Your database may be in an inconsistent state.');
    console.error('You may need to restore manually or from another backup.');
    throw error;
  }
}

// Run the restore
fullRestore().catch(error => {
  console.error('Fatal error:', error.message);
  process.exit(1);
});