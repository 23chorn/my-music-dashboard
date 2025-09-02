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

async function restoreWithSQL() {
  console.log('🔄 SQL-BASED RESTORE FROM BACKUP: 2025-09-02T03-03-58\n');
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL database');

    // Step 1: Load data
    console.log('\n📁 Loading backup data...');
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

    // Step 2: Disable triggers and constraints temporarily
    console.log('\n🔧 Disabling constraints...');
    await client.query('SET session_replication_role = replica;');

    // Step 3: Clear all data
    console.log('\n🗑️ Clearing existing data...');
    const clearOrder = [
      "album_artists", "track_albums", "track_artists", 
      "artist_genres", "external_ids", "plays", 
      "tracks", "genres", "albums", "artists"
    ];

    for (const table of clearOrder) {
      console.log(`   Clearing ${table}...`);
      await client.query(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE;`);
    }

    // Step 4: Insert data with original IDs
    console.log('\n📦 Restoring data...');
    const insertOrder = [
      "artists", "albums", "genres", "tracks", "plays",
      "external_ids", "artist_genres", "track_artists", 
      "track_albums", "album_artists"
    ];

    for (const table of insertOrder) {
      const data = backupData[table];
      if (!data || data.length === 0) {
        console.log(`   ⏭️  No data to restore for ${table}`);
        continue;
      }

      console.log(`📋 Restoring ${table} (${data.length} records)...`);

      // Get column names from first record
      const columns = Object.keys(data[0]);
      const columnList = columns.join(', ');
      
      // Insert in batches
      const batchSize = 1000;
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        
        // Build VALUES clause
        const valuesClauses = batch.map(row => {
          const values = columns.map(col => {
            const value = row[col];
            if (value === null) return 'NULL';
            if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
            if (typeof value === 'boolean') return value ? 'true' : 'false';
            return value;
          });
          return `(${values.join(', ')})`;
        });

        const query = `INSERT INTO ${table} (${columnList}) VALUES ${valuesClauses.join(', ')};`;
        
        try {
          await client.query(query);
          console.log(`   ✅ Batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(data.length/batchSize)} complete`);
        } catch (error) {
          console.error(`   ❌ Error in batch ${Math.floor(i/batchSize) + 1}:`, error.message);
          throw error;
        }
      }
    }

    // Step 5: Re-enable constraints and update sequences
    console.log('\n🔧 Re-enabling constraints and updating sequences...');
    await client.query('SET session_replication_role = DEFAULT;');

    // Update sequences for tables with auto-incrementing IDs
    const sequenceTables = ['artists', 'albums', 'genres', 'tracks', 'plays', 'external_ids', 'artist_genres'];
    for (const table of sequenceTables) {
      if (backupData[table] && backupData[table].length > 0) {
        try {
          await client.query(`SELECT setval(pg_get_serial_sequence('${table}', 'id'), (SELECT MAX(id) FROM ${table}));`);
          console.log(`   ✅ Updated ${table} sequence`);
        } catch (error) {
          console.log(`   ⚠️  Could not update sequence for ${table}: ${error.message}`);
        }
      }
    }

    console.log('\n🎉 RESTORE COMPLETE!');
    console.log('Your database has been successfully restored to the backup state.');

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
⚠️  SQL RESTORE WILL COMPLETELY REPLACE YOUR DATABASE

This will:
- Delete ALL existing data
- Restore from backup: 2025-09-02T03-03-58
- Cannot be undone

To proceed, run:
node restore_sql.js --confirm
  `);
  process.exit(0);
}

// Run the restore
restoreWithSQL().catch(error => {
  console.error('Fatal error:', error.message);
  process.exit(1);
});