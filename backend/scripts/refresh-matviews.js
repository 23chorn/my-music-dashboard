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

async function refreshMaterializedViews() {
  const dbMode = process.env.DB_MODE || 'production';
  console.log(`🔄 Refreshing materialized views on ${dbMode.toUpperCase()} database`);
  
  const pool = new Pool(getDatabaseConfig());
  
  try {
    const startTime = Date.now();
    
    // Call the refresh function that was created during setup
    console.log('📊 Calling refresh function...');
    await pool.query('SELECT refresh_trends_metrics()');
    
    const duration = Date.now() - startTime;
    console.log(`✅ Materialized views refreshed successfully in ${Math.round(duration)}ms`);
    
    // Get updated stats
    console.log('\n📈 Updated statistics:');
    const statsQuery = `
      SELECT 
        COUNT(*) as total_weeks,
        MIN(week_start) as earliest_week,
        MAX(week_start) as latest_week,
        SUM(plays_this_week) as total_plays
      FROM weekly_listening_metrics
    `;
    
    const stats = await pool.query(statsQuery);
    const { total_weeks, earliest_week, latest_week, total_plays } = stats.rows[0];
    
    console.log(`   📊 Total weeks: ${total_weeks}`);
    console.log(`   📅 Date range: ${earliest_week?.toISOString()?.split('T')[0]} to ${latest_week?.toISOString()?.split('T')[0]}`);
    console.log(`   🎵 Total plays: ${parseInt(total_plays).toLocaleString()}`);
    
    console.log('\n🎉 Weekly refresh completed successfully!');
    
  } catch (error) {
    console.error('\n💥 Refresh failed:', error.message);
    if (error.code) {
      console.error(`   Error code: ${error.code}`);
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

refreshMaterializedViews();