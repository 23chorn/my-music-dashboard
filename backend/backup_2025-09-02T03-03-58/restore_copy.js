import pkg from 'pg';
const { Client } = pkg;
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Get the directory where this script is located
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the backend directory
dotenv.config({ path: path.join(__dirname, '../.env') });

async function restoreWithCopy() {
  console.log('🔄 COPY-BASED RESTORE FROM BACKUP: 2025-09-02T03-03-58\n');
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL database');

    // Step 1: Load and convert data to CSV format
    console.log('\n📁 Loading and preparing backup data...');
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

    // Step 2: Clear all data and reset sequences
    console.log('\n🗑️ Clearing existing data...');
    const clearOrder = [
      "album_artists", "track_albums", "track_artists", 
      "artist_genres", "external_ids", "plays", 
      "tracks", "genres", "albums", "artists"
    ];

    for (const table of clearOrder) {
      console.log(`   Clearing ${table}...`);
      await client.query(`DELETE FROM ${table};`);
    }

    // Step 3: Temporarily disable triggers and reset sequences
    console.log('\n🔧 Preparing for bulk insert...');
    
    const insertOrder = [
      "artists", "albums", "genres", "tracks", "plays",
      "external_ids", "artist_genres", "track_artists", 
      "track_albums", "album_artists"
    ];

    // Reset sequences to start from 1
    for (const table of insertOrder) {
      try {
        const result = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = '${table}' AND column_default LIKE 'nextval%';`);
        if (result.rows.length > 0) {
          await client.query(`ALTER SEQUENCE ${table}_id_seq RESTART WITH 1;`);
          console.log(`   ✅ Reset ${table} sequence`);
        }
      } catch (error) {
        // Sequence might not exist, ignore
      }
    }

    // Step 4: Insert data using the fastest method
    console.log('\n📦 Restoring data...');

    for (const table of insertOrder) {
      const data = backupData[table];
      if (!data || data.length === 0) {
        console.log(`   ⏭️  No data to restore for ${table}`);
        continue;
      }

      console.log(`📋 Restoring ${table} (${data.length} records)...`);

      // Method: Create CSV data and use COPY FROM STDIN
      const columns = Object.keys(data[0]);
      const csvData = data.map(row => {
        return columns.map(col => {
          const value = row[col];
          if (value === null) return '\\N';  // PostgreSQL NULL
          if (typeof value === 'string') {
            // Escape quotes and newlines for CSV
            return `"${value.replace(/"/g, '""').replace(/\n/g, '\\n').replace(/\r/g, '\\r')}"`;
          }
          if (typeof value === 'boolean') return value ? 't' : 'f';
          return String(value);
        }).join(',');
      }).join('\n');

      try {
        // Use COPY with CSV format
        const copyQuery = `COPY ${table} (${columns.join(', ')}) FROM STDIN WITH (FORMAT CSV, NULL '\\N');`;
        
        // Start the COPY operation
        const copyStream = client.query(copyQuery);
        
        // Split data into chunks to avoid memory issues
        const chunkSize = 10000;  // 10k records at a time
        const lines = csvData.split('\n');
        
        for (let i = 0; i < lines.length; i += chunkSize) {
          const chunk = lines.slice(i, i + chunkSize).join('\n');
          if (chunk) {
            await client.query(`COPY ${table} (${columns.join(', ')}) FROM STDIN WITH (FORMAT CSV, NULL '\\N');`, [chunk]);
          }
          console.log(`   ✅ Processed ${Math.min(i + chunkSize, lines.length)}/${lines.length} records`);
        }
        
        console.log(`   ✅ ${table} restored successfully`);
        
      } catch (error) {
        console.error(`   ❌ Error restoring ${table}:`, error.message);
        
        // Fallback: Insert records one by one without IDs, let PostgreSQL auto-assign
        console.log(`   🔄 Trying fallback method for ${table}...`);
        
        const columnsWithoutId = columns.filter(col => col !== 'id');
        for (let i = 0; i < data.length; i += 100) {
          const batch = data.slice(i, i + 100);
          
          for (const row of batch) {
            const values = columnsWithoutId.map(col => {
              const value = row[col];
              if (value === null) return null;
              return value;
            });
            
            const placeholders = values.map((_, idx) => `$${idx + 1}`).join(', ');
            const query = `INSERT INTO ${table} (${columnsWithoutId.join(', ')}) VALUES (${placeholders});`;
            
            try {
              await client.query(query, values);
            } catch (insertError) {
              console.error(`     ❌ Failed to insert record ${i}:`, insertError.message);
            }
          }
          
          console.log(`   ✅ Fallback batch ${Math.floor(i/100) + 1} complete`);
        }
      }
    }

    console.log('\n🎉 RESTORE COMPLETE!');
    console.log('Your database has been restored. Note: IDs may have been reassigned for some tables.');

  } catch (error) {
    console.error('\n💥 RESTORE FAILED:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

// Check for confirmation
const args = process.argv.slice(2);
if (!args.includes('--confirm')) {
  console.log(`
⚠️  COPY-BASED RESTORE WILL REPLACE YOUR DATABASE

This will:
- Delete ALL existing data
- Restore from backup: 2025-09-02T03-03-58
- IDs may be reassigned to avoid conflicts
- Cannot be undone

To proceed, run:
node restore_copy.js --confirm
  `);
  process.exit(0);
}

// Run the restore
restoreWithCopy().catch(error => {
  console.error('Fatal error:', error.message);
  process.exit(1);
});