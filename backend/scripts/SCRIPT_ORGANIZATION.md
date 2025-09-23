# Backend Scripts Organization

This directory contains essential scripts for the music dashboard backend. One-time fixes and investigation scripts have been moved to .gitignore.

## 📁 Current Structure

### 🏗️ Infrastructure & Setup
- `db-manager.js` - Database management utilities
- `db-switch.sh` - Database switching script
- `create-migration.js` - Migration creation utility

### 🗃️ Database Schema & Views
- `create_tags_schema.sql` - Tags system schema
- `create-materialized-views.sql` - Performance optimization views
- `create-cumulative-discovery-view.sql` - Discovery analytics view
- `create-matviews-simple.js` - Materialized view creation script
- `setup-matviews.js` - Materialized view setup
- `setup-cumulative-discovery.js` - Discovery view setup
- `refresh-matviews.js` - View refresh utility

### 🏷️ Feature Migrations
- `run_tags_migration.js` - Tags system migration

### 💾 Backup & Sync
- `backup/` - Database backup utilities (4 files)
- `sync/scheduledMusicSync.js` - Production sync service

### 📚 Documentation
- `README.md` - General scripts documentation
- `MIGRATIONS.md` - Migration history and procedures

## 🚫 Excluded from Git (.gitignore)

The following types of scripts are excluded from version control:

- **One-time fixes**: `fix-*.js`, `cleanup-*.js`
- **Investigation tools**: `investigate-*.js`, `diagnose-*.js`
- **Data cleanup**: `deduplicate-*.js`, `merge-*.js`
- **Testing scripts**: `test-*.js`, `check-*.js`
- **Utilities folder**: `utilities/` (debugging/analysis tools)
- **Maintenance folder**: `maintenance/` (one-time cleanups)
- **Enrichment folder**: `enrichment/` (data enrichment scripts)
- **Migration folder**: `migration/` (one-time migrations)

## 📋 Usage Guidelines

### Essential Scripts (Keep in Git)
- Infrastructure and schema scripts that might be needed for new deployments
- Backup utilities for data safety
- Production sync services
- Documentation and migration procedures

### Excluded Scripts (Not in Git)
- One-time data fixes and cleanups
- Investigation and debugging tools
- Temporary validation scripts
- Development utilities

This organization keeps the repository clean while preserving essential infrastructure scripts.