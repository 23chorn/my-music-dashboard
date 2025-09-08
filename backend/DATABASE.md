# Database Management System

This system supports running with both production and test databases, allowing safe development and testing without affecting production data.

## Setup

### 1. Create Test Database

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Create a new project for testing
3. Go to Settings > Database
4. Copy the connection string (starts with `postgresql://`)
5. Add it to your `.env` file as `TEST_DATABASE_URL`

### 2. Environment Variables

Add these variables to your `.env` file:

```env
# Production Database
DATABASE_URL=postgresql://postgres.your-prod-ref:password@aws-0-region.pooler.supabase.com:6543/postgres

# Test Database  
TEST_DATABASE_URL=postgresql://postgres.your-test-ref:password@aws-0-region.pooler.supabase.com:6543/postgres

# Database Mode (production or test)
DB_MODE=production
```

## Database Mode Switching

### Using the Switch Script
```bash
# Switch to test database
./scripts/db-switch.sh test

# Switch to production database  
./scripts/db-switch.sh prod

# Check current status
./scripts/db-switch.sh status
```

### Manual Mode Switching
Set `DB_MODE` in your `.env` file:
- `DB_MODE=production` - Uses production database
- `DB_MODE=test` - Uses test database

## Database Management Commands

### Copy Production Data to Test
```bash
npm run db:copy
```
⚠️ **Warning**: This will completely overwrite the test database with production data.

### Compare Databases
```bash
npm run db:compare
```
Shows record counts for each table in both databases.

### Check Configuration
```bash
npm run db:info
```
Shows current database configuration and connection status.

## Usage Workflow

### For Development/Testing
```bash
# 1. Switch to test mode
./scripts/db-switch.sh test

# 2. Copy fresh production data to test (optional)
npm run db:copy

# 3. Start your application
npm start
```

### For Production
```bash
# Switch back to production mode
./scripts/db-switch.sh prod

# Start application
npm start
```

## Safety Features

- **Connection Logging**: Logs which database (prod/test) is being connected to
- **URL Validation**: Validates database URL exists before connecting
- **Batch Processing**: Database copying uses batches to handle large datasets
- **Progress Tracking**: Shows copy progress for large tables

## Troubleshooting

### Test Database Not Configured
If you see "Database URL not configured for mode: test":
1. Make sure `TEST_DATABASE_URL` is set in `.env`
2. Verify the connection string is correct
3. Test connection with `npm run db:info`

### Permission Errors
If database copying fails with permission errors:
1. Ensure the test database user has full access
2. Check that both databases have the same schema
3. Try copying individual tables to isolate the issue

### Connection Issues
- Verify both database URLs are accessible
- Check that SSL settings match your Supabase configuration
- Ensure firewall/network allows connections

## Schema Management

The system assumes both databases have identical schemas. If you need to update the schema:

1. Apply changes to production database first
2. Apply the same changes to test database
3. Run `npm run db:compare` to verify consistency

## Performance Notes

- Database copying can take several minutes for large datasets
- The system uses batched inserts (1000 records at a time) for efficiency
- Progress is shown during long operations
- Connection pooling is optimized for both databases