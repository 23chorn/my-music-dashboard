#!/usr/bin/env node

import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

import pkg from 'pg';
const { Pool } = pkg;
import fs from 'fs';
import path from 'path';

// Database configurations
const prodConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
};

const testConfig = {
  connectionString: process.env.TEST_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
};

// Create connection pools
const prodPool = new Pool(prodConfig);
const testPool = new Pool(testConfig);

// Database schema tables in dependency order
const TABLES = [
  'artists',
  'albums', 
  'tracks',
  'track_artists',
  'track_albums',
  'plays'
];

async function getTableSchema(pool, tableName) {
  const query = `
    SELECT 
      column_name,
      data_type,
      is_nullable,
      column_default,
      character_maximum_length
    FROM information_schema.columns 
    WHERE table_name = $1 
    ORDER BY ordinal_position
  `;
  
  const result = await pool.query(query, [tableName]);
  return result.rows;
}

async function copyTableData(sourcePool, targetPool, tableName, batchSize = 1000) {
  console.log(`\n📋 Copying table: ${tableName}`);
  
  try {
    // Get total record count
    const countResult = await sourcePool.query(`SELECT COUNT(*) FROM ${tableName}`);
    const totalRecords = parseInt(countResult.rows[0].count);
    
    if (totalRecords === 0) {
      console.log(`   ✅ Table ${tableName} is empty - skipping`);
      return;
    }
    
    console.log(`   📊 Total records: ${totalRecords.toLocaleString()}`);
    
    // Clear target table
    await targetPool.query(`TRUNCATE TABLE ${tableName} CASCADE`);
    console.log(`   🗑️  Cleared target table`);
    
    // Temporarily allow inserting into identity columns for the entire operation
    await targetPool.query(`SET session_replication_role = replica`);
    
    // Determine ORDER BY clause based on table structure
    const sampleResult = await sourcePool.query(`SELECT * FROM ${tableName} LIMIT 1`);
    const columns = sampleResult.rows.length > 0 ? Object.keys(sampleResult.rows[0]) : [];
    const hasIdColumn = columns.includes('id');
    const orderByClause = hasIdColumn ? 'id' : columns.slice(0, 2).join(', ');
    
    let offset = 0;
    let copiedCount = 0;
    
    while (offset < totalRecords) {
      const selectResult = await sourcePool.query(
        `SELECT * FROM ${tableName} ORDER BY ${orderByClause} LIMIT $1 OFFSET $2`,
        [batchSize, offset]
      );
      
      if (selectResult.rows.length === 0) break;
      
      // Prepare insert statement 
      const firstRow = selectResult.rows[0];
      const columns = Object.keys(firstRow);
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
      
      // Use OVERRIDING SYSTEM VALUE only for tables with identity columns
      const hasIdColumn = columns.includes('id');
      const insertQuery = hasIdColumn 
        ? `INSERT INTO ${tableName} (${columns.join(', ')}) OVERRIDING SYSTEM VALUE VALUES (${placeholders})`
        : `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
      
      // Insert batch to target
      for (const row of selectResult.rows) {
        const values = columns.map(col => row[col]);
        await targetPool.query(insertQuery, values);
        copiedCount++;
      }
      
      offset += batchSize;
      const progress = ((copiedCount / totalRecords) * 100).toFixed(1);
      console.log(`   ⏳ Progress: ${copiedCount.toLocaleString()}/${totalRecords.toLocaleString()} (${progress}%)`);
    }
    
    // Reset replication role
    await targetPool.query(`SET session_replication_role = DEFAULT`);
    
    console.log(`   ✅ Completed: ${copiedCount.toLocaleString()} records copied`);
    
  } catch (error) {
    // Make sure to reset replication role even on error
    try {
      await targetPool.query(`SET session_replication_role = DEFAULT`);
    } catch (resetError) {
      // Ignore reset errors
    }
    console.error(`   ❌ Error copying ${tableName}:`, error.message);
    throw error;
  }
}

async function copyDatabase() {
  console.log('🚀 Starting database copy from PRODUCTION to TEST');
  console.log('⚠️  WARNING: This will OVERWRITE all data in the test database!\n');
  
  try {
    // Test connections
    console.log('🔌 Testing database connections...');
    await prodPool.query('SELECT 1');
    console.log('   ✅ Production database connected');
    
    await testPool.query('SELECT 1');
    console.log('   ✅ Test database connected\n');
    
    // Copy each table
    for (const tableName of TABLES) {
      await copyTableData(prodPool, testPool, tableName);
    }
    
    // Reset sequences
    console.log('\n🔢 Resetting sequences...');
    for (const tableName of TABLES) {
      try {
        await testPool.query(`SELECT setval(pg_get_serial_sequence('${tableName}', 'id'), COALESCE(MAX(id), 1)) FROM ${tableName}`);
        console.log(`   ✅ Reset sequence for ${tableName}`);
      } catch (error) {
        // Some tables might not have sequences, that's ok
        console.log(`   ⚠️  No sequence found for ${tableName} (this is normal)`);
      }
    }
    
    console.log('\n🎉 Database copy completed successfully!');
    
  } catch (error) {
    console.error('\n💥 Database copy failed:', error.message);
    process.exit(1);
  } finally {
    await prodPool.end();
    await testPool.end();
  }
}

async function compareDatabases() {
  console.log('📊 Comparing PRODUCTION vs TEST databases\n');
  
  try {
    await prodPool.query('SELECT 1');
    await testPool.query('SELECT 1');
    
    console.log('Table                 | Production | Test      | Match');
    console.log('---------------------|------------|-----------|-------');
    
    for (const tableName of TABLES) {
      const prodCount = await prodPool.query(`SELECT COUNT(*) FROM ${tableName}`);
      const testCount = await testPool.query(`SELECT COUNT(*) FROM ${tableName}`);
      
      const prodRows = parseInt(prodCount.rows[0].count);
      const testRows = parseInt(testCount.rows[0].count);
      const match = prodRows === testRows ? '✅' : '❌';
      
      console.log(
        `${tableName.padEnd(20)} | ${prodRows.toLocaleString().padStart(10)} | ${testRows.toLocaleString().padStart(9)} | ${match}`
      );
    }
    
  } catch (error) {
    console.error('\n💥 Database comparison failed:', error.message);
  } finally {
    await prodPool.end();
    await testPool.end();
  }
}

async function showDatabaseInfo() {
  console.log('📋 Database Configuration Info\n');
  
  const prodUrl = process.env.DATABASE_URL ? 'Configured ✅' : 'Missing ❌';
  const testUrl = process.env.TEST_DATABASE_URL ? 'Configured ✅' : 'Missing ❌';
  const dbMode = process.env.DB_MODE || 'production';
  
  console.log(`Production Database: ${prodUrl}`);
  console.log(`Test Database:       ${testUrl}`);
  console.log(`Current DB_MODE:     ${dbMode}\n`);
  
  if (process.env.DATABASE_URL) {
    console.log('Production URL:', process.env.DATABASE_URL.replace(/:([^@]+)@/, ':****@'));
  }
  
  if (process.env.TEST_DATABASE_URL) {
    console.log('Test URL:', process.env.TEST_DATABASE_URL.replace(/:([^@]+)@/, ':****@'));
  } else {
    console.log('\n⚠️  To set up test database:');
    console.log('1. Create a new Supabase project');
    console.log('2. Get the connection string from Settings > Database');
    console.log('3. Add TEST_DATABASE_URL to your .env file');
  }
}

// Command line interface
const command = process.argv[2];

switch (command) {
  case 'copy':
    await copyDatabase();
    break;
  case 'compare':
    await compareDatabases();
    break;
  case 'info':
    await showDatabaseInfo();
    break;
  default:
    console.log('🛠️  Database Manager');
    console.log('\nUsage:');
    console.log('  npm run db:copy     - Copy production data to test database');
    console.log('  npm run db:compare  - Compare record counts between databases');
    console.log('  npm run db:info     - Show database configuration info');
    console.log('\nNote: Make sure to set TEST_DATABASE_URL in .env first!');
}