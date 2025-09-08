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

async function setupMaterializedViews() {
  const dbMode = process.env.DB_MODE || 'production';
  console.log(`🚀 Setting up materialized views on ${dbMode.toUpperCase()} database\n`);
  
  const pool = new Pool(getDatabaseConfig());
  
  try {
    // Test connection
    console.log('🔌 Testing database connection...');
    await pool.query('SELECT 1');
    console.log('   ✅ Database connected\n');
    
    // Check if materialized views already exist
    console.log('🔍 Checking existing materialized views...');
    const checkQuery = `
      SELECT matviewname 
      FROM pg_matviews 
      WHERE matviewname IN ('weekly_listening_metrics', 'weekly_diversity_metrics')
    `;
    
    const existingViews = await pool.query(checkQuery);
    
    if (existingViews.rows.length > 0) {
      console.log(`   ⚠️  Found ${existingViews.rows.length} existing materialized views:`);
      existingViews.rows.forEach(row => {
        console.log(`      - ${row.matviewname}`);
      });
      console.log('\n   This script will recreate them with fresh data.\n');
    }
    
    // Read and execute SQL file
    console.log('📋 Reading materialized views SQL...');
    const sqlFilePath = path.join(__dirname, 'create-materialized-views.sql');
    const sql = fs.readFileSync(sqlFilePath, 'utf8');
    
    console.log('⏳ Creating materialized views (this may take a few minutes)...');
    const startTime = Date.now();
    
    await pool.query(sql);
    
    const duration = Date.now() - startTime;
    console.log(`   ✅ Materialized views created successfully in ${duration}ms\n`);
    
    // Get statistics
    console.log('📊 Materialized view statistics:');
    const statsQuery = `
      SELECT 
        schemaname,
        matviewname as name,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||matviewname)) as size
      FROM pg_matviews 
      WHERE matviewname IN ('weekly_listening_metrics', 'weekly_diversity_metrics')
      
      UNION ALL
      
      SELECT 
        'data' as schemaname,
        'weekly_listening_metrics' as name,
        CONCAT(COUNT(*), ' weeks') as size
      FROM weekly_listening_metrics
      
      UNION ALL
      
      SELECT 
        'data' as schemaname, 
        'weekly_diversity_metrics' as name,
        CONCAT(COUNT(*), ' weeks') as size
      FROM weekly_diversity_metrics
    `;
    
    const stats = await pool.query(statsQuery);
    stats.rows.forEach(row => {
      if (row.schemaname === 'public') {
        console.log(`   📏 ${row.name}: ${row.size}`);
      } else if (row.schemaname === 'data') {
        console.log(`   📊 ${row.name}: ${row.size}`);
      }
    });
    
    // Test a quick query
    console.log('\n🧪 Testing materialized view query...');
    const testQuery = `
      SELECT 
        COUNT(*) as total_weeks,
        MIN(week_start) as earliest_week,
        MAX(week_start) as latest_week
      FROM weekly_listening_metrics
    `;
    
    const testResult = await pool.query(testQuery);
    const { total_weeks, earliest_week, latest_week } = testResult.rows[0];
    
    console.log(`   ✅ Query successful!`);
    console.log(`   📊 Data range: ${total_weeks} weeks from ${earliest_week?.toISOString()?.split('T')[0]} to ${latest_week?.toISOString()?.split('T')[0]}`);
    
    console.log('\n🎉 Materialized views setup completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   • Test the trends API with longer time periods');
    console.log('   • Set up periodic refresh (weekly recommended)');
    console.log('   • Monitor query performance improvements');
    
  } catch (error) {
    console.error('\n💥 Setup failed:', error.message);
    if (error.code) {
      console.error(`   Error code: ${error.code}`);
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

setupMaterializedViews();