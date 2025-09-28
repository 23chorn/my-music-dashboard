import dotenv from 'dotenv';
import { initializeDatabase, getPool } from '../src/db/connection.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  // Initialize database connection
  await initializeDatabase();
  const pool = getPool();

  try {
    console.log('Reading schema file...');
    const schemaPath = path.join(__dirname, 'create_listening_analysis_schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    console.log('Running listening analysis schema migration...');
    await pool.query(schema);

    console.log('✅ Schema migration completed successfully!');

    // Test the tables were created
    const result = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('listening_analyses', 'weekly_listening_summaries')
    `);

    console.log('Created tables:', result.rows.map(r => r.table_name));

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

runMigration();