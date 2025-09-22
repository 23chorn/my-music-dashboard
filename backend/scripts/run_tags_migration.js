import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { initializeDatabase, getPool, closeDatabase } from '../src/db/connection.js';
import logger from '../src/utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runTagsMigration() {
  try {
    // Initialize database connection
    logger.info('Initializing database connection...');
    initializeDatabase();

    const pool = getPool();

    // Read the SQL migration file
    const sqlPath = join(__dirname, 'create_tags_schema.sql');
    const sql = readFileSync(sqlPath, 'utf8');

    logger.info('Running tags schema migration...');

    // Execute the migration
    await pool.query(sql);

    logger.info('Tags schema migration completed successfully!');

    // Verify tables were created
    const result = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('tags', 'entity_tags')
      ORDER BY table_name
    `);

    logger.info('Created tables:', result.rows.map(row => row.table_name));

  } catch (error) {
    logger.error('Migration failed:', error);
    throw error;
  } finally {
    await closeDatabase();
    process.exit(0);
  }
}

// Run the migration
runTagsMigration().catch(error => {
  console.error('Migration failed:', error);
  process.exit(1);
});