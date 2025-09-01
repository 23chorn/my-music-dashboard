
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function restore() {
  console.log('🔄 RESTORING FROM BACKUP: 2025-09-01T00-35-05\n');
  
  const tables = [
  "artists",
  "albums",
  "tracks",
  "genres",
  "plays",
  "external_ids",
  "artist_genres",
  "track_artists",
  "track_albums",
  "album_artists"
];
  
  // Restore tables in dependency order
  for (const table of tables) {
    try {
      console.log(`📋 Restoring ${table}...`);
      
      const data = JSON.parse(fs.readFileSync(`${table}.json`, 'utf8'));
      
      if (data.length === 0) {
        console.log(`   ⏭️  No data to restore`);
        continue;
      }
      
      // Clear existing data (optional - comment out to append)
      await supabase.from(table).delete().neq('id', 0);
      
      // Insert in batches to avoid size limits
      const batchSize = 1000;
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        const { error } = await supabase.from(table).insert(batch);
        
        if (error) throw error;
        
        console.log(`   ✅ Restored batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(data.length/batchSize)}`);
      }
      
      console.log(`   ✅ Restored ${data.length} records`);
      
    } catch (error) {
      console.error(`   ❌ Failed to restore ${table}:`, error.message);
    }
  }
  
  console.log('\n✅ RESTORE COMPLETE!');
}

restore();
