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

async function updateMaterializedViews() {
  const dbMode = process.env.DB_MODE || 'production';
  console.log(`🔄 Updating materialized views to exclude incomplete weeks on ${dbMode.toUpperCase()} database\n`);
  
  const pool = new Pool(getDatabaseConfig());
  
  try {
    // Check current state
    console.log('📊 Current state:');
    const currentStatsQuery = `
      SELECT 
        COUNT(*) as total_weeks,
        MAX(week_start) as latest_week,
        DATE_TRUNC('week', NOW()) as current_week_start
      FROM weekly_listening_metrics
    `;
    
    const currentStats = await pool.query(currentStatsQuery);
    const { total_weeks, latest_week, current_week_start } = currentStats.rows[0];
    
    console.log(`   📈 Current weeks: ${total_weeks}`);
    console.log(`   📅 Latest week: ${latest_week?.toISOString()?.split('T')[0]}`);
    console.log(`   📅 Current week: ${current_week_start?.toISOString()?.split('T')[0]}`);
    
    const isCurrentWeekIncluded = latest_week?.getTime() === current_week_start?.getTime();
    console.log(`   ${isCurrentWeekIncluded ? '⚠️  Current incomplete week IS included' : '✅ Current incomplete week is NOT included'}\n`);
    
    if (!isCurrentWeekIncluded) {
      console.log('✅ Materialized views already exclude incomplete weeks - no update needed!');
      return;
    }
    
    // Recreate the weekly_listening_metrics view with updated logic
    console.log('🔄 Recreating weekly_listening_metrics view...');
    
    const dropAndCreateSQL = `
      -- Drop existing view
      DROP MATERIALIZED VIEW weekly_listening_metrics CASCADE;
      
      -- Recreate with updated logic (excluding current incomplete week)
      CREATE MATERIALIZED VIEW weekly_listening_metrics AS
      WITH weekly_data AS (
        SELECT 
          DATE_TRUNC('week', played_at) AS week_start,
          DATE_TRUNC('week', played_at) + INTERVAL '6 days' AS week_end,
          COUNT(*) AS plays_this_week,
          COUNT(DISTINCT p.track_id) AS tracks_this_week,
          COUNT(DISTINCT ta.artist_id) AS artists_this_week,
          COUNT(DISTINCT tal.album_id) AS albums_this_week,
          COUNT(DISTINCT DATE(played_at)) AS active_days_this_week,
          SUM(COALESCE(t.duration_ms, 0)) AS listening_time_this_week
        FROM plays p
        LEFT JOIN tracks t ON p.track_id = t.id
        LEFT JOIN track_artists ta ON p.track_id = ta.track_id
        LEFT JOIN track_albums tal ON p.track_id = tal.track_id
        WHERE played_at IS NOT NULL
        AND DATE_TRUNC('week', played_at) < DATE_TRUNC('week', NOW())  -- Exclude current incomplete week
        GROUP BY DATE_TRUNC('week', played_at)
      )
      SELECT 
        week_start,
        week_end,
        plays_this_week,
        tracks_this_week,
        artists_this_week,
        albums_this_week,
        active_days_this_week,
        listening_time_this_week,
        
        -- Simple calculated metrics
        CASE 
          WHEN artists_this_week > 0 
          THEN ROUND(tracks_this_week::DECIMAL / artists_this_week::DECIMAL, 1)
          ELSE 0 
        END AS tracks_per_artist,
        
        CASE 
          WHEN artists_this_week > 0 
          THEN ROUND(plays_this_week::DECIMAL / artists_this_week::DECIMAL, 1)
          ELSE 0 
        END AS plays_per_artist,
        
        CASE 
          WHEN albums_this_week > 0 
          THEN ROUND(tracks_this_week::DECIMAL / albums_this_week::DECIMAL, 1)
          ELSE 0 
        END AS tracks_per_album,
        
        CASE 
          WHEN active_days_this_week > 0 
          THEN ROUND(listening_time_this_week::DECIMAL / (active_days_this_week * 1000 * 60 * 60)::DECIMAL, 1)
          ELSE 0 
        END AS hours_per_day,
        
        CASE 
          WHEN active_days_this_week > 0 
          THEN ROUND(tracks_this_week::DECIMAL / active_days_this_week::DECIMAL, 1)
          ELSE 0 
        END AS discovery_frequency,
        
        CASE 
          WHEN tracks_this_week > 0 AND plays_this_week > tracks_this_week
          THEN ROUND(((plays_this_week - tracks_this_week)::DECIMAL / plays_this_week::DECIMAL) * 100, 1)
          ELSE 0 
        END AS replay_rate,
        
        CASE 
          WHEN tracks_this_week > 0 
          THEN ROUND(plays_this_week::DECIMAL / tracks_this_week::DECIMAL, 1)
          ELSE 0 
        END AS repeat_factor
        
      FROM weekly_data
      WHERE plays_this_week > 0
      ORDER BY week_start;
      
      -- Recreate indexes
      CREATE INDEX idx_weekly_metrics_week_start ON weekly_listening_metrics(week_start);
    `;
    
    const startTime = Date.now();
    await pool.query(dropAndCreateSQL);
    const duration = Date.now() - startTime;
    
    console.log(`   ✅ View recreated in ${Math.round(duration/1000)}s\n`);
    
    // Update diversity view to match
    console.log('🔄 Updating diversity metrics view...');
    await pool.query(`
      DROP MATERIALIZED VIEW weekly_diversity_metrics;
      
      CREATE MATERIALIZED VIEW weekly_diversity_metrics AS
      SELECT 
        week_start,
        week_start + INTERVAL '6 days' AS week_end,
        75.0 AS diversity_score  -- Placeholder - will be updated with real calculation
      FROM weekly_listening_metrics;
      
      CREATE INDEX idx_weekly_diversity_week_start ON weekly_diversity_metrics(week_start);
    `);
    
    console.log('   ✅ Diversity view updated\n');
    
    // Get updated stats
    console.log('📊 Updated statistics:');
    const updatedStats = await pool.query(currentStatsQuery);
    const updatedData = updatedStats.rows[0];
    
    console.log(`   📈 Weeks after update: ${updatedData.total_weeks}`);
    console.log(`   📅 Latest week: ${updatedData.latest_week?.toISOString()?.split('T')[0]}`);
    console.log(`   📉 Weeks removed: ${total_weeks - updatedData.total_weeks}`);
    
    console.log('\n🎉 Materialized views updated successfully!');
    console.log('\n📝 Changes made:');
    console.log('   • Excluded current incomplete week from trends');
    console.log('   • Updated threshold: >90 days uses materialized views');
    console.log('   • Only complete weeks are now shown in graphs');
    
  } catch (error) {
    console.error('\n💥 Update failed:', error.message);
    if (error.code) {
      console.error(`   Error code: ${error.code}`);
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

updateMaterializedViews();