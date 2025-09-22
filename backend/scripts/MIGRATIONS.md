# Database Migrations

This project uses a custom migration system to manage database schema changes safely and consistently across different environments.

## Migration System Features

- **Version Tracking**: Each migration has a unique timestamp-based version
- **Atomic Operations**: All migrations run in transactions (rollback on failure)
- **Checksum Validation**: File integrity checking
- **Environment Aware**: Works with both production and test databases
- **Progress Tracking**: Clear feedback during migration execution

## Quick Start

### Run All Pending Migrations
```bash
npm run migrate
```

### Check Migration Status
```bash
npm run migrate:status
```

### Create a New Migration
```bash
npm run create:migration "add user preferences table"
```

## Migration File Structure

Migration files are stored in `migrations/files/` with the naming convention:
```
YYYYMMDDHHMMSS_description.sql
```

Example: `20240315143022_add_user_email_column.sql`

## Migration Commands

### Core Commands
- `npm run migrate` - Apply all pending migrations
- `npm run migrate:status` - Show migration status
- `npm run create:migration "description"` - Generate new migration file

### Database Management
- `./scripts/db-switch.sh test` - Switch to test database
- `./scripts/db-switch.sh prod` - Switch to production database
- `npm run db:compare` - Compare record counts between databases

## Initial Schema Migrations

The project includes 4 initial migrations that create the complete schema:

### 1. `20250101000001_create_custom_types.sql`
Creates custom PostgreSQL types:
- `release_precision_enum` ('year', 'month', 'day')
- `entity_type_enum` ('artist', 'album', 'track')

### 2. `20250101000002_create_core_tables.sql`
Creates primary entity tables:
- `artists` - Artist information
- `albums` - Album information  
- `tracks` - Track information
- `genres` - Music genres
- `metadata` - System metadata
- `external_ids` - External system identifiers

### 3. `20250101000003_create_relationship_tables.sql`
Creates relationship tables with foreign keys:
- `track_artists` - Track-to-artist relationships
- `track_albums` - Track-to-album relationships
- `album_artists` - Album-to-artist relationships
- `artist_genres` - Artist-to-genre relationships
- `plays` - Play history records

### 4. `20250101000004_create_indexes_and_constraints.sql`
Creates performance indexes and business constraints:
- Performance indexes for common queries
- Unique constraints for data integrity
- Composite indexes for complex queries
- Date-based indexes for time-series data

## Writing Migrations

### Migration File Template
```sql
-- Migration: Brief description of the change
-- Description: More detailed explanation if needed

BEGIN;

-- Your SQL changes here
ALTER TABLE users ADD COLUMN email VARCHAR(255);
CREATE INDEX idx_users_email ON users(email);

COMMIT;
```

### Best Practices

1. **Always use transactions** - Wrap changes in `BEGIN;`/`COMMIT;`
2. **Add descriptive comments** - Explain what the migration does
3. **Use IF NOT EXISTS** - For idempotent operations when possible
4. **Test thoroughly** - Run on test database first
5. **Keep migrations small** - One logical change per migration
6. **Never edit applied migrations** - Create a new migration instead

### Common Migration Patterns

#### Adding a Column
```sql
BEGIN;
ALTER TABLE users ADD COLUMN email VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
COMMIT;
```

#### Creating a Table
```sql
BEGIN;
CREATE TABLE user_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    preference_key VARCHAR(255) NOT NULL,
    preference_value TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT fk_user_preferences_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
CREATE UNIQUE INDEX idx_user_preferences_unique ON user_preferences(user_id, preference_key);
COMMIT;
```

#### Adding an Index
```sql
BEGIN;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_plays_date 
ON plays(DATE(played_at));
COMMIT;
```

## Environment Management

### Test Database Workflow
```bash
# Switch to test mode
./scripts/db-switch.sh test

# Run migrations
npm run migrate

# Verify schema
npm run migrate:status
```

### Production Deployment
```bash
# Switch to production mode
./scripts/db-switch.sh prod

# Check what migrations will be applied
npm run migrate:status

# Apply migrations
npm run migrate
```

## Migration States

- **⏳ Pending** - Migration file exists but hasn't been applied
- **✅ Applied** - Migration has been successfully applied
- **❌ Failed** - Migration failed during execution (check logs)

## Troubleshooting

### Migration Failed
If a migration fails:
1. Check the error message in the console
2. Fix the SQL in the migration file
3. The failed migration was rolled back, so you can run it again

### Schema Drift
If databases get out of sync:
1. Use `npm run db:compare` to see differences
2. Check `npm run migrate:status` on both databases
3. Apply missing migrations

### Reset Test Database
To completely reset the test database schema:
1. Drop all tables in Supabase dashboard
2. Run `npm run migrate` to rebuild from scratch

## Safety Features

- **Atomic Transactions** - Each migration runs in a transaction
- **Rollback on Failure** - Failed migrations don't leave partial changes
- **Version Tracking** - Prevents duplicate application
- **Checksum Validation** - Detects file changes after application
- **Environment Isolation** - Test and production databases are separate

## Integration with Development

The migration system integrates with your development workflow:

1. **Local Development** - Use test database for development
2. **Schema Changes** - Create migrations for any schema changes
3. **Testing** - Test migrations on test database first
4. **Deployment** - Apply migrations to production during deployment
5. **Rollback** - Create reverse migrations if needed

This system ensures your database schema is versioned, tracked, and consistently applied across all environments.