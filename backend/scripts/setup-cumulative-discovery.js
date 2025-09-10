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

async function setupCumulativeDiscovery() {
  const dbMode = process.env.DB_MODE || 'production';
  console.log(`🚀 Setting up cumulative discovery view on ${dbMode.toUpperCase()} database\n`);
  
  const pool = new Pool(getDatabaseConfig());
  
  try {
    // Test connection
    console.log('🔌 Testing database connection...');
    await pool.query('SELECT 1');
    console.log('   ✅ Database connected\n');
    
    // Read and execute the SQL file
    console.log('📄 Reading cumulative discovery SQL file...');
    const sqlFile = path.join(__dirname, 'create-cumulative-discovery-view.sql');
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');
    
    console.log('🔧 Executing cumulative discovery view creation...');
    await pool.query(sqlContent);
    console.log('   ✅ Cumulative discovery view created successfully\n');
    
    // Test the new view
    console.log('🧪 Testing cumulative discovery view...');
    const testQuery = `
      SELECT 
        COUNT(*) as total_weeks,
        MIN(week_start) as earliest_week,
        MAX(week_start) as latest_week,
        SUM(new_tracks_this_week) as total_unique_tracks,
        MAX(cumulative_tracks) as final_cumulative_tracks
      FROM cumulative_discovery_metrics
    `;
    
    const testResult = await pool.query(testQuery);
    const { 
      total_weeks, 
      earliest_week, 
      latest_week, 
      total_unique_tracks, 
      final_cumulative_tracks 
    } = testResult.rows[0];
    
    console.log(`   ✅ Query successful!`);
    console.log(`   📊 Data range: ${total_weeks} weeks from ${earliest_week?.toISOString()?.split('T')[0]} to ${latest_week?.toISOString()?.split('T')[0]}`);
    console.log(`   🎵 Total unique tracks discovered: ${total_unique_tracks}`);
    console.log(`   📈 Final cumulative count: ${final_cumulative_tracks}`);
    
    // Sample the data
    console.log('\n🔍 Sample data:');
    const sampleQuery = `
      SELECT 
        week_start,
        new_tracks_this_week,
        new_artists_this_week,
        cumulative_tracks,
        cumulative_artists
      FROM cumulative_discovery_metrics 
      ORDER BY week_start DESC 
      LIMIT 5
    `;
    
    const sampleResult = await pool.query(sampleQuery);
    sampleResult.rows.forEach(row => {
      console.log(`   📅 ${row.week_start.toISOString().split('T')[0]}: +${row.new_tracks_this_week} tracks, +${row.new_artists_this_week} artists → Total: ${row.cumulative_tracks} tracks, ${row.cumulative_artists} artists`);
    });
    
    console.log('\n🎉 Cumulative discovery setup completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   • Test the new /api/trends/cumulative-discovery endpoint');
    console.log('   • Add to weekly refresh schedule');
    console.log('   • Monitor query performance');
    
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

setupCumulativeDiscovery();