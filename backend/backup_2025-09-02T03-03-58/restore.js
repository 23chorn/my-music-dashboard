
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

async function restore(dryRun = false) {
  console.log(`🔄 ${dryRun ? 'DRY RUN - ' : ''}RESTORING FROM BACKUP: 2025-09-02T03-03-58\n`);
  
  if (dryRun) {
    console.log('🧪 DRY RUN MODE - No changes will be made to the database\n');
  }
  
  // Tables in dependency order (parent tables first)
  const tables = [
    "artists",     // Independent
    "albums",      // Independent  
    "genres",      // Independent
    "tracks",      // Independent
    "plays",       // Depends on tracks
    "external_ids", // Independent (references any entity)
    "artist_genres",    // Depends on artists, genres
    "track_artists",    // Depends on tracks, artists
    "track_albums",     // Depends on tracks, albums
    "album_artists"     // Depends on albums, artists
  ];
  
  // Restore tables in dependency order
  for (const table of tables) {
    try {
      console.log(`📋 Restoring ${table}...`);
      
      const data = JSON.parse(fs.readFileSync(path.join(__dirname, `${table}.json`), 'utf8'));
      
      if (data.length === 0) {
        console.log(`   ⏭️  No data to restore`);
        continue;
      }
      
      if (dryRun) {
        console.log(`   🧪 Would clear existing data and restore ${data.length} records`);
        if (data.length > 0) {
          console.log(`   📋 Sample record:`, JSON.stringify(data[0], null, 2).substring(0, 200) + '...');
        }
      } else {
        console.log(`   🗑️ Clearing existing data...`);
        await supabase.from(table).delete().neq('id', 0);
        
        console.log(`   📦 Inserting ${data.length} records...`);
        
        // For tables with auto-incrementing IDs, remove the ID and let PostgreSQL assign new ones
        // This avoids sequence conflicts
        const hasAutoId = ['artists', 'albums', 'tracks', 'genres', 'plays', 'external_ids', 'artist_genres'].includes(table);
        
        // Insert in batches
        const batchSize = 1000;
        for (let i = 0; i < data.length; i += batchSize) {
          let batch = data.slice(i, i + batchSize);
          
          // Remove IDs for tables that auto-generate them
          if (hasAutoId) {
            batch = batch.map(row => {
              const { id, ...rest } = row;
              return rest;
            });
          }
          
          const { error } = await supabase.from(table).insert(batch);
          if (error) throw error;
          
          console.log(`   ✅ Batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(data.length/batchSize)} complete`);
        }
        
        console.log(`   ✅ Restored ${data.length} records`);
      }
      
    } catch (error) {
      console.error(`   ❌ Failed to restore ${table}:`, error.message);
    }
  }
  
  if (dryRun) {
    console.log('\n🧪 DRY RUN COMPLETE! No changes were made to the database.');
    console.log('Run without --dry-run to perform the actual restore.');
  } else {
    console.log('\n✅ RESTORE COMPLETE!');
  }
}

// Check command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run') || args.includes('--test');

if (args.includes('--help')) {
  console.log(`
🔄 Database Restore Script

Usage:
  node restore.js [--dry-run|--test]  # Test mode (no changes)
  node restore.js                     # Actual restore (DESTRUCTIVE)

Options:
  --dry-run, --test    Show what would be restored without making changes
  --help              Show this help
  `);
  process.exit(0);
}

restore(isDryRun);
