# Scripts Directory Organization

This directory contains various utility scripts organized into logical categories.

## 📁 Folder Structure

### `backup/`
Scripts for database backup and restoration.

- `supabase_backup.js` - Main backup script for Supabase databases
- `test_backup.js` - Safe testing tool for backup/restore functionality
- `test.env.example` - Template for test environment configuration  
- `README.md` - Complete backup/restore documentation

### `enrichment/`
Scripts for enriching music data with metadata from external sources (mainly Spotify).

- `enrichWithSpotify.js` - Main enrichment script that processes artists, albums, and tracks
- `enrichTracksWithSpotifyArtists.js` - Track-artist relationship enrichment
- `handleSpotifyAuth.js` - Spotify authentication handling
- `addExternalIdsConstraint.js` - Adds database constraints for external ID storage
- `enrichSpotifyMetadata.js` - Specific Spotify metadata enrichment
- `enrichTrackMetadata.js` - Track-specific metadata enrichment
- `addMissingArtistAlbumURIs.js` - Fills missing Spotify URIs for artists and albums
- `addMissingURIs.js` - General URI filling script
- `fill_artist_uris.js` - Artist URI enrichment
- `fill_missing_albums_uris.js` - Album URI enrichment
- `fill_track_uris.js` - Track URI enrichment
- `populateTrackURIs.js` - Track URI population
- `fixDuplicateTracksURIs.js` - Fixes duplicate track URI issues
- `runEnrichment.js` - Wrapper script for running enrichment processes
- `getSpotifyToken.js` - Spotify API token management
- `run-track-enrichment.sh` - Shell script for track enrichment automation
- `README-track-enrichment.md` - Track enrichment specific documentation
- `README.md` - General enrichment documentation
- `SPOTIFY_ENRICHMENT_README.md` - Detailed documentation for Spotify enrichment

### `maintenance/`
Scripts for database maintenance, cleanup, and optimization.

- `cleanup_orphans.js` - Removes orphaned database records
- `comprehensive_dedupe.js` - Comprehensive deduplication process
- `dedupeArtistsAlbums.js` - Artist and album deduplication
- `deduplication.js` - General deduplication utilities
- `canonicalizeSpotifyData.js` - Canonicalizes Spotify data format
- `merge_tracks.js` - Merges duplicate track records
- `reassign_plays.js` - Reassigns play records after deduplication
- `preview_deletions.js` - Preview what records would be deleted
- `cleanup-album-external-ids.js` - Album external ID cleanup
- `cleanup-artist-external-ids.js` - Artist external ID cleanup
- `cleanupDuplicateAlbums.js` - Duplicate album cleanup
- `fix-album-external-ids.js` - Album external ID fixing
- `fix-external-ids.js` - General external ID fixing
- `fix-external-ids-uri-format.js` - URI format fixing
- `fix-incomplete-external-ids.js` - Incomplete external ID fixing
- `fix-track-external-ids.js` - Track external ID fixing
- `link-unlinked-artists.js` - Links unlinked artist records
- `addSpotifyFields.sql` - SQL script for adding Spotify fields (legacy)

### `migration/`
Scripts for migrating data between different database systems or formats.

- `migrateToPostGres.py` - Python script for PostgreSQL migration
- `migrate_to_supabase.js` - Supabase-specific migration
- `migrateToNormalized.js` - Migration to normalized database schema
- `migrateJsonToSQLite.js` - JSON to SQLite migration
- `importSpotifyToSQLite.js` - Import Spotify data to SQLite
- `export-sqlite-to-csv.js` - Export SQLite data to CSV format
- `add_primary_artist_column.sql` - SQL migration for primary artist tracking
- `old_dont_need_nowrunMigration_.js` - Deprecated migration script (kept for reference)

### `sync/`
Scripts for automated data synchronization.

- `scheduledMusicSync.js` - Scheduled music data synchronization
- `simpleSpotifySync.js` - Simple Spotify sync script (demo/test mode)

### `utilities/`
General utility scripts for development and testing.

- `analyzeTracksMultipleAlbums.js` - Analyze tracks with multiple albums
- `checkRecentPlays.js` - Check recent play data
- `checkRecentPlaysExternalIds.js` - Check external IDs in recent plays
- `checkTodaysPlays.js` - Check today's play data  
- `comprehensive-artist-audit.js` - Comprehensive artist data audit
- `diagnose-album-external-ids.js` - Diagnose album external ID issues
- `diagnose-album-external-ids-duplicates.js` - Diagnose duplicate album external IDs
- `diagnose-artist-external-ids-cleanup.js` - Diagnose artist external ID cleanup needs
- `diagnose-external-ids.js` - General external ID diagnosis
- `diagnose-track-external-ids.js` - Diagnose track external ID issues
- `investigate-external-ids.js` - Investigate external ID problems
- `review-missing-album-external-ids.js` - Review missing album external IDs
- `queryDB.js` - Database query utility
- `testScript.js` - Testing and development script
- `testSpotifyDataFormat.js` - Test Spotify data format
- `testExactHeatmapQuery.js` - Test exact heatmap queries
- `testHeatmapQuery.js` - Test heatmap queries
- `testRecentTracksNoDuplicates.js` - Test recent tracks without duplicates
- `testTrackAPI.js` - Test track API functionality
- `testTrackPageComplete.js` - Test complete track page functionality
- `lastfmfetch.js` - Last.fm API fetching utility

## 🚀 Usage

### Running Backup Scripts
```bash
# Create database backup
node scripts/backup/supabase_backup.js backup

# Test backup/restore safely
node scripts/backup/test_backup.js test
```

### Running Enrichment Scripts
```bash
# Run main Spotify enrichment
node scripts/enrichment/enrichWithSpotify.js

# Add database constraints first (one-time setup)
node scripts/enrichment/addExternalIdsConstraint.js

# Handle Spotify authentication
node scripts/enrichment/handleSpotifyAuth.js
```

### Running Maintenance Scripts
```bash
# Clean up orphaned records
node scripts/maintenance/cleanup_orphans.js

# Deduplicate data
node scripts/maintenance/comprehensive_dedupe.js

# Fix external ID issues
node scripts/maintenance/fix-external-ids.js

# Link unlinked artists
node scripts/maintenance/link-unlinked-artists.js
```

### Running Migration Scripts
```bash
# Migrate to Supabase
node scripts/migration/migrate_to_supabase.js

# Export data to CSV
node scripts/migration/export-sqlite-to-csv.js

# Run primary artist column migration
psql -f scripts/migration/add_primary_artist_column.sql
```

### Running Sync Scripts
```bash
# Run scheduled music sync
node scripts/sync/scheduledMusicSync.js

# Run simple Spotify sync (test mode)
node scripts/sync/simpleSpotifySync.js sync
```

### Running Utility Scripts
```bash
# Query database
node scripts/utilities/queryDB.js

# Fetch from Last.fm
node scripts/utilities/lastfmfetch.js

# Test track API
node scripts/utilities/testTrackAPI.js

# Diagnose external ID issues
node scripts/utilities/diagnose-external-ids.js
```

## ⚠️ Important Notes

- All scripts expect to be run from the `backend` directory root
- Environment variables should be configured in `backend/.env`
- Some scripts may require specific database states or external API credentials
- Always backup your database before running maintenance scripts
- Check individual script documentation for specific requirements

## 📝 Adding New Scripts

When adding new scripts, place them in the appropriate category folder:

- **Backup**: Scripts for database backup and restoration
- **Enrichment**: Scripts that add or enhance metadata from external APIs
- **Maintenance**: Scripts that clean, optimize, repair, or fix data issues
- **Migration**: Scripts that move or transform data between systems
- **Sync**: Scripts for automated data synchronization and scheduled tasks
- **Utilities**: General-purpose tools, testing scripts, and development helpers

Update the import paths to use the correct relative paths:
```javascript
// From subfolder to backend src
import logger from '../../src/utils/logger.js';
import { someFunction } from '../../src/services/someService.js';

// Environment config
dotenv.config({ path: path.join(__dirname, '../../.env') });
```