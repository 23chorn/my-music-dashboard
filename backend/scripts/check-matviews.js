#!/usr/bin/env node

import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

import pkg from 'pg';
const { Pool } = pkg;

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

async function checkMaterializedViews() {
  const dbMode = process.env.DB_MODE || 'production';
  console.log(`🔍 Checking materialized views on ${dbMode.toUpperCase()} database\n`);
  
  const pool = new Pool(getDatabaseConfig());
  
  try {
    // Check if materialized views exist
    console.log('📊 Checking for materialized views...');
    const checkQuery = `
      SELECT 
        schemaname,
        matviewname,
        ispopulated,
        hasindexes
      FROM pg_matviews 
      WHERE matviewname LIKE '%weekly%' OR matviewname LIKE '%metric%' OR matviewname LIKE '%diversity%'
      ORDER BY matviewname
    `;
    
    const result = await pool.query(checkQuery);
    
    if (result.rows.length === 0) {
      console.log('   ❌ No materialized views found');
      console.log('   💡 Run "npm run setup:matviews" to create them\n');
      
      // Check if the refresh function exists
      console.log('🔍 Checking for refresh function...');
      const functionCheck = `
        SELECT proname 
        FROM pg_proc 
        WHERE proname = 'refresh_trends_metrics'
      `;
      
      const funcResult = await pool.query(functionCheck);
      if (funcResult.rows.length === 0) {
        console.log('   ❌ Refresh function not found either');
      } else {
        console.log('   ✅ Refresh function exists');
      }
      
    } else {
      console.log(`   ✅ Found ${result.rows.length} materialized view(s):`);
      result.rows.forEach(row => {
        console.log(`      📋 ${row.matviewname}`);
        console.log(`         Schema: ${row.schemaname}`);
        console.log(`         Populated: ${row.ispopulated ? '✅' : '❌'}`);
        console.log(`         Has Indexes: ${row.hasindexes ? '✅' : '❌'}`);
        console.log('');
      });
      
      // Get row counts if views exist and are populated
      for (const view of result.rows) {
        if (view.ispopulated) {
          try {
            const countQuery = `SELECT COUNT(*) FROM ${view.matviewname}`;
            const countResult = await pool.query(countQuery);
            console.log(`   📊 ${view.matviewname}: ${countResult.rows[0].count} rows`);
          } catch (err) {
            console.log(`   ❌ Error counting ${view.matviewname}: ${err.message}`);
          }
        }
      }
    }
    
    // Check for any failed/incomplete operations
    console.log('\n🔍 Checking for any materialized view related objects...');
    const objectsQuery = `
      SELECT 
        schemaname,
        tablename,
        'table' as object_type
      FROM pg_tables 
      WHERE tablename LIKE '%weekly%metric%'
      
      UNION ALL
      
      SELECT 
        schemaname,
        viewname as tablename,
        'view' as object_type  
      FROM pg_views
      WHERE viewname LIKE '%weekly%metric%'
      
      UNION ALL
      
      SELECT
        nspname as schemaname,
        proname as tablename,
        'function' as object_type
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE proname LIKE '%trends%' OR proname LIKE '%metric%'
    `;
    
    const objectsResult = await pool.query(objectsQuery);
    
    if (objectsResult.rows.length > 0) {
      console.log('   Found related objects:');
      objectsResult.rows.forEach(row => {
        console.log(`      ${row.object_type}: ${row.schemaname}.${row.tablename}`);
      });
    } else {
      console.log('   No related objects found');
    }
    
  } catch (error) {
    console.error('\n💥 Check failed:', error.message);
    if (error.code) {
      console.error(`   Error code: ${error.code}`);
    }
  } finally {
    await pool.end();
  }
}

checkMaterializedViews();