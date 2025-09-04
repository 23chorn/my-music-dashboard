# Backup & Restore Scripts

## 🔧 Scripts Overview

### `supabase_backup.js` 
Main backup script that creates complete database backups with restore functionality.

### `test_backup.js` 
Safe testing tool for backup/restore functionality using a separate test database.

## 🧪 Safe Testing Process

### Step 1: Create Test Environment

1. **Create a separate Supabase project** for testing (don't use production!)
2. **Copy your database schema** to the test project:
   - Go to your production Supabase project → Database → Schema
   - Export/copy all table structures and relationships
   - Apply the same schema to your test project

3. **Configure test credentials**:
   ```bash
   cp test.env.example .env
   # Edit .env and add your test database credentials
   ```

### Step 2: Test Backup/Restore

```bash
# Run full backup/restore test
node test_backup.js test

# Or run individual steps:
node test_backup.js create-data  # Create test data
node test_backup.js verify       # Check database state
node test_backup.js clear        # Clear database
```

### Step 3: Manual Restore Testing

The test script will create a backup and show you the restore command:

```bash
cd supabase_backups/backup_TIMESTAMP/
node restore.js --confirm
```

## 🔄 Production Backup

**Only run production backups when you're confident the restore works!**

```bash
# Create production backup
node supabase_backup.js backup

# The backup will be in: supabase_backups/backup_TIMESTAMP/
```

## 🛡️ Safety Features

### Test Script Safety:
- Uses separate `TEST_SUPABASE_URL` to avoid production
- Creates minimal test data
- Shows database state before/after operations
- Provides clear restore instructions

### Restore Script Safety:
- Includes `--dry-run` mode to preview changes
- Requires `--confirm` flag for actual restore
- Shows warning about data replacement
- Maps old IDs to new IDs while preserving relationships

## 🔍 Backup Contents

Each backup includes:
- `manifest.json` - Backup metadata and record counts
- `*.json` - Table data in JSON format
- `*.csv` - Table data in CSV format (for viewing)
- `restore.js` - Automated restore script

## 📋 Troubleshooting

### Common Issues:

1. **"Template literal not working"** in restore.js
   - Fixed: Template strings now properly interpolate backup timestamp

2. **"Cannot clear database"** 
   - Check table dependencies and clear in correct order
   - Ensure proper permissions on test database

3. **"IDs don't match after restore"**
   - This is expected! Restore assigns new IDs but preserves relationships
   - Use entity names/content to verify data integrity

### Verification Commands:

```bash
# Check table counts
node test_backup.js verify

# Test restore without changes
cd backup_folder/
node restore.js --dry-run

# See restore help
node restore.js --help
```

## ⚠️ Important Warnings

1. **Never test on production database** - Always use separate test instance
2. **Restore is destructive** - It replaces ALL data in target database  
3. **GitHub Actions backup** - The daily backup runs on production data
4. **ID reassignment** - Restored data gets new IDs but relationships are preserved

## 🎯 Recommended Testing Flow

1. Set up test database with same schema
2. Run `node test_backup.js test` 
3. Manually complete the restore as instructed
4. Verify all data was restored correctly
5. Only then trust the backup system with production data

This ensures your backup/restore process works correctly before relying on it for production data recovery.