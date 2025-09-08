#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function generateTimestamp() {
  const now = new Date();
  return now.getFullYear().toString() +
         (now.getMonth() + 1).toString().padStart(2, '0') +
         now.getDate().toString().padStart(2, '0') +
         now.getHours().toString().padStart(2, '0') +
         now.getMinutes().toString().padStart(2, '0') +
         now.getSeconds().toString().padStart(2, '0');
}

function sanitizeName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

function createMigrationTemplate(name) {
  return `-- Migration: ${name.replace(/_/g, ' ')}
-- Description: Add a brief description of what this migration does

BEGIN;

-- Add your SQL changes here
-- Example:
-- ALTER TABLE users ADD COLUMN email VARCHAR(255);
-- CREATE INDEX idx_users_email ON users(email);

COMMIT;
`;
}

// Get migration name from command line
const migrationName = process.argv[2];

if (!migrationName) {
  console.log('🛠️  Migration Generator');
  console.log('\nUsage:');
  console.log('  npm run create:migration "migration name"');
  console.log('\nExamples:');
  console.log('  npm run create:migration "add user email column"');
  console.log('  npm run create:migration "create posts table"');
  process.exit(1);
}

// Generate migration file
const timestamp = generateTimestamp();
const sanitizedName = sanitizeName(migrationName);
const filename = `${timestamp}_${sanitizedName}.sql`;
const migrationsDir = path.join(__dirname, '..', 'migrations', 'files');
const filepath = path.join(migrationsDir, filename);

// Create migrations directory if it doesn't exist
if (!fs.existsSync(migrationsDir)) {
  fs.mkdirSync(migrationsDir, { recursive: true });
}

// Create migration file
const template = createMigrationTemplate(migrationName);
fs.writeFileSync(filepath, template);

console.log(`✅ Created migration: ${filename}`);
console.log(`📁 Location: ${filepath}`);
console.log('\n📝 Next steps:');
console.log('1. Edit the migration file to add your SQL changes');
console.log('2. Run "npm run migrate" to apply the migration');
console.log('3. Check status with "npm run migrate:status"');