#!/usr/bin/env node

import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

import pkg from 'pg';
const { Pool } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database configuration
function getDatabaseConfig() {
  const dbMode = process.env.DB_MODE || 'production';
  const databaseUrl = dbMode === 'test' ? process.env.TEST_DATABASE_URL : process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    throw new Error(`Database URL not configured for mode: ${dbMode}`);
  }
  
  return {
    connectionString: databaseUrl,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  };
}

const pool = new Pool(getDatabaseConfig());

// Migration tracking table
const MIGRATION_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS schema_migrations (
    id SERIAL PRIMARY KEY,
    version VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    checksum VARCHAR(64)
  );
  
  CREATE INDEX IF NOT EXISTS idx_schema_migrations_version 
  ON schema_migrations(version);
`;

// Initialize migration tracking
async function initializeMigrationTable() {
  const client = await pool.connect();
  try {
    await client.query(MIGRATION_TABLE_SQL);
    console.log('✅ Migration tracking table ready');
  } catch (error) {
    console.error('❌ Failed to initialize migration table:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

// Get applied migrations
async function getAppliedMigrations() {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT version, name, applied_at FROM schema_migrations ORDER BY version'
    );
    return result.rows;
  } finally {
    client.release();
  }
}

// Get available migration files
function getAvailableMigrations() {
  const migrationsDir = path.join(__dirname, 'files');
  
  if (!fs.existsSync(migrationsDir)) {
    console.log('📁 Creating migrations directory...');
    fs.mkdirSync(migrationsDir, { recursive: true });
    return [];
  }
  
  const files = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();
  
  return files.map(file => {
    const parts = file.replace('.sql', '').split('_');
    const version = parts[0];
    const name = parts.slice(1).join('_');
    
    return {
      version,
      name,
      filename: file,
      filepath: path.join(migrationsDir, file)
    };
  });
}

// Calculate file checksum
import crypto from 'crypto';

function calculateChecksum(filepath) {
  const content = fs.readFileSync(filepath, 'utf8');
  return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
}

// Run a single migration
async function runMigration(migration) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Read and execute migration file
    const sql = fs.readFileSync(migration.filepath, 'utf8');
    console.log(`⏳ Running migration: ${migration.version}_${migration.name}`);
    
    await client.query(sql);
    
    // Record migration as applied
    const checksum = calculateChecksum(migration.filepath);
    await client.query(
      `INSERT INTO schema_migrations (version, name, checksum) 
       VALUES ($1, $2, $3)`,
      [migration.version, migration.name, checksum]
    );
    
    await client.query('COMMIT');
    console.log(`✅ Migration completed: ${migration.version}_${migration.name}`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`❌ Migration failed: ${migration.version}_${migration.name}`);
    console.error(`   Error: ${error.message}`);
    throw error;
  } finally {
    client.release();
  }
}

// Run pending migrations
async function runMigrations() {
  const dbMode = process.env.DB_MODE || 'production';
  console.log(`🚀 Running migrations on ${dbMode.toUpperCase()} database\n`);
  
  try {
    await initializeMigrationTable();
    
    const applied = await getAppliedMigrations();
    const available = getAvailableMigrations();
    
    const appliedVersions = new Set(applied.map(m => m.version));
    const pending = available.filter(m => !appliedVersions.has(m.version));
    
    if (pending.length === 0) {
      console.log('✅ No pending migrations');
      return;
    }
    
    console.log(`📋 Found ${pending.length} pending migrations:`);
    pending.forEach(m => {
      console.log(`   - ${m.version}_${m.name}`);
    });
    console.log('');
    
    for (const migration of pending) {
      await runMigration(migration);
    }
    
    console.log(`\n🎉 All migrations completed successfully!`);
    
  } catch (error) {
    console.error('\n💥 Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Show migration status
async function showStatus() {
  const dbMode = process.env.DB_MODE || 'production';
  console.log(`📊 Migration Status (${dbMode.toUpperCase()} database)\n`);
  
  try {
    await initializeMigrationTable();
    
    const applied = await getAppliedMigrations();
    const available = getAvailableMigrations();
    
    console.log('Applied Migrations:');
    if (applied.length === 0) {
      console.log('   (none)');
    } else {
      applied.forEach(m => {
        console.log(`   ✅ ${m.version} - ${m.name} (${m.applied_at.toISOString()})`);
      });
    }
    
    console.log('\nAvailable Migrations:');
    if (available.length === 0) {
      console.log('   (none)');
    } else {
      const appliedVersions = new Set(applied.map(m => m.version));
      available.forEach(m => {
        const status = appliedVersions.has(m.version) ? '✅' : '⏳';
        console.log(`   ${status} ${m.version} - ${m.name}`);
      });
    }
    
    const pendingCount = available.filter(m => 
      !applied.some(a => a.version === m.version)
    ).length;
    
    console.log(`\nSummary: ${applied.length} applied, ${pendingCount} pending`);
    
  } catch (error) {
    console.error('❌ Failed to show status:', error.message);
  } finally {
    await pool.end();
  }
}

// Command line interface
const command = process.argv[2];

switch (command) {
  case 'migrate':
  case 'up':
    await runMigrations();
    break;
  case 'status':
    await showStatus();
    break;
  default:
    console.log('🛠️  Migration Runner');
    console.log('\nUsage:');
    console.log('  npm run migrate        - Run pending migrations');
    console.log('  npm run migrate:status - Show migration status');
    console.log('\nMigration files should be placed in migrations/files/');
    console.log('Format: YYYYMMDDHHMMSS_description.sql');
}