# Scripts Directory Organization

This directory contains various utility scripts organized into logical categories.

## 📁 Folder Structure

### `enrichment/`
Scripts for enriching music data with metadata from external sources (mainly Spotify).

- `enrichWithSpotify.js` - Main enrichment script that processes artists, albums, and tracks
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
- `SPOTIFY_ENRICHMENT_README.md` - Detailed documentation for Spotify enrichment

### `migration/`
Scripts for migrating data between different database systems or formats.

- `migrateToPostGres.py` - Python script for PostgreSQL migration
- `migrate_to_supabase.js` - Supabase-specific migration
- `migrateToNormalized.js` - Migration to normalized database schema
- `migrateJsonToSQLite.js` - JSON to SQLite migration
- `importSpotifyToSQLite.js` - Import Spotify data to SQLite
- `export-sqlite-to-csv.js` - Export SQLite data to CSV format
- `old_dont_need_nowrunMigration_.js` - Deprecated migration script (kept for reference)

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
- `addSpotifyFields.sql` - SQL script for adding Spotify fields (legacy)

### `utilities/`
General utility scripts for development and testing.

- `queryDB.js` - Database query utility
- `testScript.js` - Testing and development script
- `lastfmfetch.js` - Last.fm API fetching utility

## 🚀 Usage

### Running Enrichment Scripts
```bash
# Run main Spotify enrichment
node scripts/enrichment/enrichWithSpotify.js

# Add database constraints first (one-time setup)
node scripts/enrichment/addExternalIdsConstraint.js
```

### Running Migration Scripts
```bash
# Migrate to Supabase
node scripts/migration/migrate_to_supabase.js

# Export data to CSV
node scripts/migration/export-sqlite-to-csv.js
```

### Running Maintenance Scripts
```bash
# Clean up orphaned records
node scripts/maintenance/cleanup_orphans.js

# Deduplicate data
node scripts/maintenance/comprehensive_dedupe.js
```

### Running Utility Scripts
```bash
# Query database
node scripts/utilities/queryDB.js

# Fetch from Last.fm
node scripts/utilities/lastfmfetch.js
```

## ⚠️ Important Notes

- All scripts expect to be run from the `backend` directory root
- Environment variables should be configured in `backend/.env`
- Some scripts may require specific database states or external API credentials
- Always backup your database before running maintenance scripts
- Check individual script documentation for specific requirements

## 📝 Adding New Scripts

When adding new scripts, place them in the appropriate category folder:

- **Enrichment**: Scripts that add or enhance metadata
- **Migration**: Scripts that move or transform data between systems
- **Maintenance**: Scripts that clean, optimize, or repair data
- **Utilities**: General-purpose tools and development helpers

Update the import paths to use the correct relative paths:
```javascript
// From subfolder to backend src
import logger from '../../src/utils/logger.js';
import { someFunction } from '../../src/services/someService.js';

// Environment config
dotenv.config({ path: path.join(__dirname, '../../.env') });
```