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

async function checkZeroTimestamps() {
  const dbMode = process.env.DB_MODE || 'production';
  console.log(`🔍 Checking for zero/invalid timestamps in ${dbMode.toUpperCase()} database\n`);
  
  const pool = new Pool(getDatabaseConfig());
  
  try {
    // Test connection
    console.log('🔌 Testing database connection...');
    await pool.query('SELECT 1');
    console.log('   ✅ Database connected\n');
    
    // Check for zero timestamps (epoch time)
    console.log('🕐 Checking for zero/epoch timestamps...');
    const zeroTimestampQuery = `
      SELECT 
        COUNT(*) as zero_count,
        MIN(played_at) as earliest_timestamp,
        MAX(played_at) as latest_timestamp
      FROM plays 
      WHERE played_at <= '1970-01-02 00:00:00'::timestamp
    `;
    
    const zeroResult = await pool.query(zeroTimestampQuery);
    const { zero_count, earliest_timestamp, latest_timestamp } = zeroResult.rows[0];
    
    if (zero_count > 0) {
      console.log(`   ⚠️  Found ${zero_count} plays with zero/epoch timestamps`);
      console.log(`   📅 Range: ${earliest_timestamp} to ${latest_timestamp}`);
      
      // Show some examples
      const examplesQuery = `
        SELECT p.played_at, t.name as track_name, a.name as artist_name
        FROM plays p
        JOIN tracks t ON p.track_id = t.id
        JOIN track_artists ta ON t.id = ta.track_id AND ta.is_primary = true
        JOIN artists a ON ta.artist_id = a.id
        WHERE p.played_at <= '1970-01-02 00:00:00'::timestamp
        ORDER BY p.played_at
        LIMIT 5
      `;
      
      const examples = await pool.query(examplesQuery);
      console.log('\n   📋 Examples of zero timestamp plays:');
      examples.rows.forEach(row => {
        console.log(`      • ${row.played_at} - "${row.track_name}" by ${row.artist_name}`);
      });
    } else {
      console.log('   ✅ No zero/epoch timestamps found');
    }
    
    // Check for NULL timestamps
    console.log('\n🕐 Checking for NULL timestamps...');
    const nullTimestampQuery = `SELECT COUNT(*) as null_count FROM plays WHERE played_at IS NULL`;
    const nullResult = await pool.query(nullTimestampQuery);
    const { null_count } = nullResult.rows[0];
    
    if (null_count > 0) {
      console.log(`   ⚠️  Found ${null_count} plays with NULL timestamps`);
    } else {
      console.log('   ✅ No NULL timestamps found');
    }
    
    // Check for future timestamps (more than 1 day ahead)
    console.log('\n🔮 Checking for future timestamps...');
    const futureTimestampQuery = `
      SELECT COUNT(*) as future_count
      FROM plays 
      WHERE played_at > (NOW() + INTERVAL '1 day')
    `;
    
    const futureResult = await pool.query(futureTimestampQuery);
    const { future_count } = futureResult.rows[0];
    
    if (future_count > 0) {
      console.log(`   ⚠️  Found ${future_count} plays with future timestamps`);
    } else {
      console.log('   ✅ No unreasonable future timestamps found');
    }
    
    // General stats
    console.log('\n📊 General timestamp statistics...');
    const statsQuery = `
      SELECT 
        COUNT(*) as total_plays,
        MIN(played_at) as earliest_play,
        MAX(played_at) as latest_play,
        COUNT(DISTINCT DATE(played_at)) as unique_days
      FROM plays
    `;
    
    const stats = await pool.query(statsQuery);
    const { total_plays, earliest_play, latest_play, unique_days } = stats.rows[0];
    
    console.log(`   • Total plays: ${total_plays.toLocaleString()}`);
    console.log(`   • Date range: ${earliest_play?.toISOString()?.split('T')[0]} to ${latest_play?.toISOString()?.split('T')[0]}`);
    console.log(`   • Unique days: ${unique_days}`);
    
    const totalProblems = parseInt(zero_count) + parseInt(null_count) + parseInt(future_count);
    
    if (totalProblems === 0) {
      console.log('\n✅ All timestamps look healthy!');
    } else {
      console.log(`\n⚠️  Found ${totalProblems} total problematic timestamps`);
      console.log('   Consider running a cleanup to fix these issues');
    }
    
  } catch (error) {
    console.error('\n💥 Timestamp check failed:', error.message);
    if (error.code) {
      console.error(`   Error code: ${error.code}`);
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

checkZeroTimestamps();