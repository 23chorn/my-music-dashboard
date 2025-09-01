import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

class SupabaseBackup {
  constructor() {
    this.backupDir = './supabase_backups';
    this.timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    
    // Ensure backup directory exists
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
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
    const restoreScript = `
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function restore() {
  console.log('🔄 RESTORING FROM BACKUP: ${this.timestamp}\\n');
  
  const tables = ${JSON.stringify(tables, null, 2)};
  
  // Restore tables in dependency order
  for (const table of tables) {
    try {
      console.log(\`📋 Restoring \${table}...\`);
      
      const data = JSON.parse(fs.readFileSync(\`\${table}.json\`, 'utf8'));
      
      if (data.length === 0) {
        console.log(\`   ⏭️  No data to restore\`);
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
        
        console.log(\`   ✅ Restored batch \${Math.floor(i/batchSize) + 1}/\${Math.ceil(data.length/batchSize)}\`);
      }
      
      console.log(\`   ✅ Restored \${data.length} records\`);
      
    } catch (error) {
      console.error(\`   ❌ Failed to restore \${table}:\`, error.message);
    }
  }
  
  console.log('\\n✅ RESTORE COMPLETE!');
}

restore();
`;

    fs.writeFileSync(path.join(backupPath, 'restore.js'), restoreScript);
    console.log(`📄 Restore script created: restore.js`);
  }
}

// Usage
const mode = process.argv[2] || 'backup';

if (mode === 'backup') {
  const backup = new SupabaseBackup();
  backup.backup();
} else {
  console.log('Usage: node supabase_backup.js [backup]');
  console.log('To restore: cd to backup folder and run: node restore.js');
}