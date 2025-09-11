import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Only load dotenv if not in GitHub Actions
if (!process.env.GITHUB_ACTIONS) {
  dotenv.config();
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// Validate environment variables
if (!SUPABASE_URL) {
  console.error('❌ SUPABASE_URL is not set');
  console.error('Available environment variables:', Object.keys(process.env).filter(key => key.includes('SUPABASE')));
  process.exit(1);
}

if (!SUPABASE_ANON_KEY) {
  console.error('❌ SUPABASE_ANON_KEY is not set');
  console.error('Available environment variables:', Object.keys(process.env).filter(key => key.includes('SUPABASE')));
  process.exit(1);
}

console.log('✅ Supabase configuration loaded');
console.log(`📡 Supabase URL: ${SUPABASE_URL.substring(0, 30)}...`);

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

class SupabaseBackup {
  constructor() {
    this.backupDir = './supabase_backups';
    this.timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    this.maxBackups = parseInt(process.env.MAX_BACKUP_RETENTION || '7'); // Keep last 7 backups by default
    
    // Ensure backup directory exists
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  // Clean up old backups, keeping only the most recent ones
  async cleanupOldBackups() {
    try {
      console.log(`🧹 Cleaning up old backups (keeping last ${this.maxBackups})...`);
      
      const backupDirs = fs.readdirSync(this.backupDir)
        .filter(dir => dir.startsWith('backup_'))
        .map(dir => ({
          name: dir,
          path: path.join(this.backupDir, dir),
          created: fs.statSync(path.join(this.backupDir, dir)).mtime
        }))
        .sort((a, b) => b.created - a.created); // Sort by newest first
      
      console.log(`   📁 Found ${backupDirs.length} backup directories`);
      
      // Keep only the most recent backups
      const toDelete = backupDirs.slice(this.maxBackups);
      
      if (toDelete.length > 0) {
        console.log(`   🗑️  Deleting ${toDelete.length} old backup(s):`);
        
        for (const backup of toDelete) {
          console.log(`      • ${backup.name} (${backup.created.toISOString().split('T')[0]})`);
          fs.rmSync(backup.path, { recursive: true, force: true });
        }
        
        console.log(`   ✅ Cleanup complete - kept ${backupDirs.length - toDelete.length} recent backups`);
      } else {
        console.log(`   ✅ No cleanup needed - only ${backupDirs.length} backup(s) found`);
      }
      
    } catch (error) {
      console.warn(`⚠️  Backup cleanup failed: ${error.message}`);
    }
  }

  async backup() {
    console.log('💾 SUPABASE DATABASE BACKUP (FREE TIER)\n');
    
    try {
      const backupPath = path.join(this.backupDir, `backup_${this.timestamp}`);
      fs.mkdirSync(backupPath, { recursive: true });
      
      // List of tables to backup
      const tables = [
        'artists',
        'albums', 
        'tracks',
        'genres',
        'plays',
        'external_ids',
        'artist_genres',
        'track_artists',
        'track_albums',
        'album_artists'
      ];
      
      console.log(`📁 Creating backup in: ${backupPath}`);
      
      // Backup each table
      const results = {};
      for (const table of tables) {
        const result = await this.backupTable(table, backupPath);
        results[table] = result;
      }
      
      // Create backup manifest
      const manifest = {
        timestamp: this.timestamp,
        created: new Date().toISOString(),
        tables: results,
        total_records: Object.values(results).reduce((sum, r) => sum + (r.count || 0), 0)
      };
      
      fs.writeFileSync(
        path.join(backupPath, 'manifest.json'),
        JSON.stringify(manifest, null, 2)
      );
      
      // Create restore script
      await this.createRestoreScript(backupPath, tables);
      
      console.log('\n✅ BACKUP COMPLETE!');
      console.log(`📊 Total records: ${manifest.total_records}`);
      console.log(`📁 Location: ${backupPath}`);
      console.log(`📄 Manifest: ${path.join(backupPath, 'manifest.json')}`);
      
    } catch (error) {
      console.error('❌ Backup failed:', error);
    }
  }

  async backupTable(tableName, backupPath) {
    try {
      console.log(`📋 Backing up table: ${tableName}`);
      
      // Get all data from table
      const { data, error, count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact' });
      
      if (error) {
        console.log(`   ❌ Error: ${error.message}`);
        return { success: false, error: error.message, count: 0 };
      }
      
      // Save as JSON
      const filename = `${tableName}.json`;
      const filepath = path.join(backupPath, filename);
      fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
      
      // Also save as CSV for easy viewing
      if (data && data.length > 0) {
        const csvFilename = `${tableName}.csv`;
        const csvPath = path.join(backupPath, csvFilename);
        this.saveAsCSV(data, csvPath);
      }
      
      console.log(`   ✅ ${data?.length || 0} records → ${filename}`);
      return { success: true, count: data?.length || 0, filename };
      
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
      return { success: false, error: error.message, count: 0 };
    }
  }

  saveAsCSV(data, filepath) {
    if (!data || data.length === 0) return;
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          if (value === null) return '';
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');
    
    fs.writeFileSync(filepath, csvContent);
  }

  async createRestoreScript(backupPath, tables) {
    // Generate restore script with proper string escaping
    const backupTimestamp = this.timestamp;
    const restoreScript = `import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Get the directory where this script is located
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the backend directory  
dotenv.config({ path: path.join(__dirname, '../.env') });

async function restore() {
  // Create Supabase client inside function to avoid issues with --help
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  console.log('🔄 RESTORING FROM BACKUP: ${backupTimestamp}\\n');
  console.log('⚠️  This will restore your data but IDs will be reassigned\\n');

  try {
    // Step 1: Load data
    console.log('📁 Loading backup data...');
    const tables = ${JSON.stringify(tables, null, 2)};

    const backupData = {};
    for (const table of tables) {
      const filePath = path.join(__dirname, \`\${table}.json\`);
      if (fs.existsSync(filePath)) {
        backupData[table] = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        console.log(\`   ✅ Loaded \${backupData[table].length} \${table} records\`);
      }
    }

    // Step 2: Clear all data
    console.log('\\n🗑️ Clearing existing data...');
    const clearOrder = [
      "album_artists", "track_albums", "track_artists", 
      "artist_genres", "external_ids", "plays", 
      "tracks", "genres", "albums", "artists"
    ];

    for (const table of clearOrder) {
      console.log(\`   Clearing \${table}...\`);
      await supabase.from(table).delete().gte('id', 0);
    }

    // Step 3: Create mapping objects to track old ID -> new ID
    const idMappings = {};

    // Step 4: Insert base tables first (artists, albums, genres, tracks)
    console.log('\\n📦 Restoring base tables...');
    const baseTables = ["artists", "albums", "genres", "tracks"];
    
    for (const table of baseTables) {
      const data = backupData[table];
      if (!data || data.length === 0) continue;

      console.log(\`📋 Restoring \${table} (\${data.length} records)...\`);
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

        // Try regular insert first, fallback to individual inserts if duplicates exist
        let { data: inserted, error } = await supabase
          .from(table)
          .insert(batchWithoutIds)
          .select('id, name');

        if (error) {
          console.log(\`   ⚠️ Error inserting batch for \${table}:\`, error.message);
          console.log(\`   🔄 Trying individual inserts to handle duplicates...\`);
          
          // Try inserting one by one to handle duplicates
          const insertedOneByOne = [];
          for (let rowIndex = 0; rowIndex < batchWithoutIds.length; rowIndex++) {
            const row = batchWithoutIds[rowIndex];
            try {
              const { data: singleInsert, error: singleError } = await supabase
                .from(table)
                .insert([row])
                .select('id, name');
              
              if (singleError) {
                // Check if already exists by name
                const { data: existing } = await supabase
                  .from(table)
                  .select('id, name')
                  .eq('name', row.name)
                  .single();
                
                if (existing) {
                  insertedOneByOne.push(existing);
                  console.log(\`   ℹ️  Using existing \${table}: \${row.name}\`);
                } else {
                  console.log(\`   ❌ Could not insert or find \${table}: \${row.name}\`);
                }
              } else if (singleInsert && singleInsert[0]) {
                insertedOneByOne.push(singleInsert[0]);
              }
            } catch (singleError) {
              console.log(\`   ⚠️ Error with \${table}: \${row.name} - \${singleError.message}\`);
            }
          }
          inserted = insertedOneByOne;
        }

        // Create mapping from old ID to new ID using name as key
        batch.forEach((originalRow, idx) => {
          const newRow = inserted[idx];
          if (newRow) {
            idMappings[table][originalRow.id] = newRow.id;
          }
        });

        console.log(\`   ✅ Batch \${Math.floor(i/batchSize) + 1}/\${Math.ceil(data.length/batchSize)} complete\`);
      }
    }

    // Step 5: Insert plays (references tracks)
    console.log('\\n📋 Restoring plays...');
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

        console.log(\`   ✅ Batch \${Math.floor(i/batchSize) + 1}/\${Math.ceil(playsData.length/batchSize)} complete\`);
      }
    }

    // Step 6: Insert external_ids
    console.log('\\n📋 Restoring external_ids...');
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

        console.log(\`   ✅ Batch \${Math.floor(i/batchSize) + 1}/\${Math.ceil(externalIdsData.length/batchSize)} complete\`);
      }
    }

    // Step 7: Insert relationship tables
    console.log('\\n📋 Restoring relationship tables...');
    const relationshipTables = [
      { table: 'artist_genres', mappings: { artist_id: 'artists', genre_id: 'genres' } },
      { table: 'track_artists', mappings: { track_id: 'tracks', artist_id: 'artists' } },
      { table: 'track_albums', mappings: { track_id: 'tracks', album_id: 'albums' } },
      { table: 'album_artists', mappings: { album_id: 'albums', artist_id: 'artists' } }
    ];

    for (const { table, mappings } of relationshipTables) {
      const data = backupData[table] || [];
      if (data.length === 0) continue;

      console.log(\`   Restoring \${table} (\${data.length} records)...\`);

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

        console.log(\`     Batch \${Math.floor(i/batchSize) + 1}/\${Math.ceil(data.length/batchSize)} complete\`);
      }
    }

    console.log('\\n🎉 RESTORE COMPLETE!');
    console.log('Your database has been successfully restored!');
    console.log('Note: IDs have been reassigned, but all relationships are preserved.');

  } catch (error) {
    console.error('\\n💥 RESTORE FAILED:', error.message);
    throw error;
  }
}

// Check command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run') || args.includes('--test');

if (args.includes('--help')) {
  console.log(\`
🔄 Database Restore Script

Usage:
  node restore.js [--dry-run|--test]  # Test mode (show what would be restored)
  node restore.js                     # Actual restore (DESTRUCTIVE)

Options:
  --dry-run, --test    Show what would be restored without making changes
  --help              Show this help
  \`);
  process.exit(0);
}

if (!args.includes('--confirm') && !isDryRun) {
  console.log(\`
⚠️  DATABASE RESTORE WILL REPLACE ALL DATA

This will:
- Delete ALL existing data in your database
- Restore from backup: ${backupTimestamp}
- Reassign new IDs but preserve all relationships
- Cannot be undone

To proceed, run:
  node restore.js --confirm

To test first:
  node restore.js --dry-run
  \`);
  process.exit(0);
}

// Add dry run functionality
if (isDryRun) {
  console.log('🧪 DRY RUN MODE - This would restore your backup but make no actual changes\\n');
  const tables = ${JSON.stringify(tables, null, 2)};
  
  for (const table of tables) {
    try {
      const filePath = path.join(__dirname, \`\${table}.json\`);
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        console.log(\`📋 Would restore \${data.length} \${table} records\`);
      }
    } catch (error) {
      console.log(\`❌ Could not read \${table}.json: \${error.message}\`);
    }
  }
  
  console.log('\\n🧪 DRY RUN COMPLETE - No changes made');
  console.log('Run without --dry-run and with --confirm to perform actual restore');
} else {
  restore();
}
`;

    fs.writeFileSync(path.join(backupPath, 'restore.js'), restoreScript);
    console.log(`📄 Working restore script created: restore.js`);
  }
}

// Usage
const mode = process.argv[2] || 'backup';

if (mode === 'backup') {
  const backup = new SupabaseBackup();
  await backup.backup();
  await backup.cleanupOldBackups();
} else if (mode === 'cleanup') {
  const backup = new SupabaseBackup();
  await backup.cleanupOldBackups();
} else {
  console.log('Usage: node supabase_backup.js [backup|cleanup]');
  console.log('  backup  - Create new backup and cleanup old ones');
  console.log('  cleanup - Just cleanup old backups');
  console.log('To restore: cd to backup folder and run: node restore.js');
}