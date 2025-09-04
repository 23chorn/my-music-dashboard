import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Test environment configuration
const TEST_SUPABASE_URL = process.env.TEST_SUPABASE_URL || process.env.SUPABASE_URL;
const TEST_SUPABASE_ANON_KEY = process.env.TEST_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

// Validate test environment
if (!TEST_SUPABASE_URL || !TEST_SUPABASE_ANON_KEY) {
  console.error('❌ Test Supabase credentials not configured');
  console.error('Please set TEST_SUPABASE_URL and TEST_SUPABASE_ANON_KEY in your .env file');
  console.error('Or the script will fall back to your production credentials (use with caution!)');
  process.exit(1);
}

console.log('🧪 TEST BACKUP/RESTORE ENVIRONMENT');
console.log(`📡 Test Supabase URL: ${TEST_SUPABASE_URL.substring(0, 30)}...`);

const supabase = createClient(TEST_SUPABASE_URL, TEST_SUPABASE_ANON_KEY);

class TestBackupRestore {
  constructor() {
    this.testDir = './test_backup_data';
    this.timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    
    // Ensure test directory exists
    if (!fs.existsSync(this.testDir)) {
      fs.mkdirSync(this.testDir, { recursive: true });
    }
  }

  async createTestData() {
    console.log('🔧 Creating minimal test data in test database...\n');

    try {
      // Insert test artists
      const { data: artists, error: artistError } = await supabase
        .from('artists')
        .insert([
          { name: 'Test Artist 1', image_url: null },
          { name: 'Test Artist 2', image_url: null }
        ])
        .select();

      if (artistError) throw artistError;
      console.log(`✅ Created ${artists.length} test artists`);

      // Insert test albums
      const { data: albums, error: albumError } = await supabase
        .from('albums')
        .insert([
          { name: 'Test Album 1', image_url: null },
          { name: 'Test Album 2', image_url: null }
        ])
        .select();

      if (albumError) throw albumError;
      console.log(`✅ Created ${albums.length} test albums`);

      // Insert test tracks
      const { data: tracks, error: trackError } = await supabase
        .from('tracks')
        .insert([
          { name: 'Test Track 1', duration_ms: 180000 },
          { name: 'Test Track 2', duration_ms: 210000 },
          { name: 'Test Track 3', duration_ms: 195000 }
        ])
        .select();

      if (trackError) throw trackError;
      console.log(`✅ Created ${tracks.length} test tracks`);

      // Create track-artist relationships
      const { error: taError } = await supabase
        .from('track_artists')
        .insert([
          { track_id: tracks[0].id, artist_id: artists[0].id, is_primary: true },
          { track_id: tracks[1].id, artist_id: artists[1].id, is_primary: true },
          { track_id: tracks[2].id, artist_id: artists[0].id, is_primary: true }
        ]);

      if (taError) throw taError;
      console.log('✅ Created track-artist relationships');

      // Create track-album relationships
      const { error: talError } = await supabase
        .from('track_albums')
        .insert([
          { track_id: tracks[0].id, album_id: albums[0].id },
          { track_id: tracks[1].id, album_id: albums[1].id },
          { track_id: tracks[2].id, album_id: albums[0].id }
        ]);

      if (talError) throw talError;
      console.log('✅ Created track-album relationships');

      // Create test plays
      const now = new Date();
      const { error: playsError } = await supabase
        .from('plays')
        .insert([
          { track_id: tracks[0].id, played_at: new Date(now.getTime() - 3600000).toISOString() },
          { track_id: tracks[1].id, played_at: new Date(now.getTime() - 1800000).toISOString() },
          { track_id: tracks[0].id, played_at: new Date(now.getTime() - 900000).toISOString() },
          { track_id: tracks[2].id, played_at: now.toISOString() }
        ]);

      if (playsError) throw playsError;
      console.log('✅ Created test plays');

      console.log('\n🎉 Test data creation complete!');
      return { artists, albums, tracks };

    } catch (error) {
      console.error('❌ Failed to create test data:', error);
      throw error;
    }
  }

  async verifyData() {
    console.log('🔍 Verifying current database state...\n');

    try {
      const tables = ['artists', 'albums', 'tracks', 'plays', 'track_artists', 'track_albums'];
      const counts = {};

      for (const table of tables) {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (error) throw error;
        counts[table] = count || 0;
        console.log(`📊 ${table}: ${counts[table]} records`);
      }

      return counts;
    } catch (error) {
      console.error('❌ Failed to verify data:', error);
      throw error;
    }
  }

  async clearDatabase() {
    console.log('🗑️ Clearing test database...\n');

    try {
      // Clear in dependency order
      const clearOrder = [
        'track_albums',
        'track_artists', 
        'plays',
        'tracks',
        'albums',
        'artists'
      ];

      for (const table of clearOrder) {
        const { error } = await supabase
          .from(table)
          .delete()
          .gte('id', 0); // Delete all records
        
        if (error) throw error;
        console.log(`✅ Cleared ${table}`);
      }

      console.log('\n🗑️ Database cleared!');
    } catch (error) {
      console.error('❌ Failed to clear database:', error);
      throw error;
    }
  }

  async testBackupRestore() {
    console.log('🧪 STARTING BACKUP/RESTORE TEST\n');

    try {
      // Step 1: Clear and create test data
      await this.clearDatabase();
      const originalData = await this.createTestData();
      
      // Step 2: Verify initial state
      console.log('\n📊 INITIAL DATABASE STATE:');
      const initialCounts = await this.verifyData();
      
      // Step 3: Run backup using existing script
      console.log('\n💾 RUNNING BACKUP...');
      const { SupabaseBackup } = await import('./supabase_backup.js');
      const backup = new SupabaseBackup();
      backup.supabase = supabase; // Override with test client
      await backup.backup();
      
      // Step 4: Clear database
      console.log('\n🗑️ CLEARING DATABASE FOR RESTORE TEST...');
      await this.clearDatabase();
      
      // Step 5: Verify empty state
      console.log('\n📊 DATABASE STATE AFTER CLEAR:');
      const emptyCounts = await this.verifyData();
      
      // Step 6: Find and run restore script
      console.log('\n🔄 RUNNING RESTORE...');
      const backupDirs = fs.readdirSync('./supabase_backups')
        .filter(dir => dir.startsWith('backup_'))
        .sort()
        .reverse();
      
      if (backupDirs.length === 0) {
        throw new Error('No backup directories found');
      }
      
      const latestBackup = path.join('./supabase_backups', backupDirs[0]);
      console.log(`Using backup: ${latestBackup}`);
      
      // TODO: Run restore script programmatically
      console.log('⚠️  To complete the test, run:');
      console.log(`   cd ${latestBackup}`);
      console.log('   node restore.js --confirm');
      
      // Step 7: Verify restored state
      console.log('\n📊 FINAL DATABASE STATE (after manual restore):');
      await this.verifyData();
      
      console.log('\n🎉 BACKUP/RESTORE TEST SETUP COMPLETE!');
      console.log('\nNext steps:');
      console.log('1. Run the restore command shown above');
      console.log('2. Verify the data was restored correctly');
      console.log('3. Compare initial and final counts');

    } catch (error) {
      console.error('❌ Test failed:', error);
      throw error;
    }
  }
}

// Command line interface
const mode = process.argv[2] || 'test';

const testTool = new TestBackupRestore();

switch (mode) {
  case 'test':
    testTool.testBackupRestore();
    break;
  case 'create-data':
    testTool.createTestData();
    break;
  case 'verify':
    testTool.verifyData();
    break;
  case 'clear':
    testTool.clearDatabase();
    break;
  default:
    console.log(`
🧪 Test Backup/Restore Tool

Usage:
  node test_backup.js [command]

Commands:
  test         Full backup/restore test (default)
  create-data  Create minimal test data
  verify       Check current database state  
  clear        Clear all data from test database

Environment Variables (add to .env):
  TEST_SUPABASE_URL=your_test_database_url
  TEST_SUPABASE_ANON_KEY=your_test_database_key

⚠️  Warning: This tool will modify your database!
   Use a separate test database, not production.
`);
}