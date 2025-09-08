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
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    // Increase timeout for long operations
    query_timeout: 600000, // 10 minutes
    statement_timeout: 600000 // 10 minutes
  };
}

async function createMaterializedViews() {
  const dbMode = process.env.DB_MODE || 'production';
  console.log(`🚀 Creating materialized views on ${dbMode.toUpperCase()} database\n`);
  
  const pool = new Pool(getDatabaseConfig());
  
  try {
    // Step 1: Create the refresh function first
    console.log('1️⃣ Creating refresh function...');
    const refreshFunctionSQL = `
      CREATE OR REPLACE FUNCTION refresh_trends_metrics()
      RETURNS void AS $$
      BEGIN
        -- Check if views exist before refreshing
        IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'weekly_listening_metrics') THEN
          REFRESH MATERIALIZED VIEW weekly_listening_metrics;
        END IF;
        
        IF EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'weekly_diversity_metrics') THEN
          REFRESH MATERIALIZED VIEW weekly_diversity_metrics;
        END IF;
        
        -- Log the refresh
        INSERT INTO metadata (key, value, updated_at) 
        VALUES ('last_trends_refresh', EXTRACT(EPOCH FROM NOW())::TEXT, NOW())
        ON CONFLICT (key) DO UPDATE SET 
          value = EXCLUDED.value,
          updated_at = EXCLUDED.updated_at;
      END;
      $$ LANGUAGE plpgsql;
    `;
    
    await pool.query(refreshFunctionSQL);
    console.log('   ✅ Refresh function created\n');
    
    // Step 2: Create simplified weekly listening metrics view (without diversity)
    console.log('2️⃣ Creating weekly_listening_metrics view (this may take several minutes)...');
    const metricsViewSQL = `
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
    `;
    
    const startTime = Date.now();
    await pool.query(metricsViewSQL);
    const duration = Date.now() - startTime;
    console.log(`   ✅ Weekly metrics view created in ${Math.round(duration/1000)}s\n`);
    
    // Step 3: Create indexes
    console.log('3️⃣ Creating indexes...');
    await pool.query('CREATE INDEX idx_weekly_metrics_week_start ON weekly_listening_metrics(week_start)');
    console.log('   ✅ Indexes created\n');
    
    // Step 4: Create simple diversity view
    console.log('4️⃣ Creating diversity metrics view...');
    const diversityViewSQL = `
      CREATE MATERIALIZED VIEW weekly_diversity_metrics AS
      SELECT 
        week_start,
        week_start + INTERVAL '6 days' AS week_end,
        75.0 AS diversity_score  -- Placeholder - can be updated later with real calculation
      FROM weekly_listening_metrics;
    `;
    
    await pool.query(diversityViewSQL);
    await pool.query('CREATE INDEX idx_weekly_diversity_week_start ON weekly_diversity_metrics(week_start)');
    console.log('   ✅ Diversity view created (with placeholder values)\n');
    
    // Step 5: Get stats
    console.log('5️⃣ Getting statistics...');
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
    
    console.log(`   📊 Created ${total_weeks} weekly records`);
    console.log(`   📅 Date range: ${earliest_week?.toISOString()?.split('T')[0]} to ${latest_week?.toISOString()?.split('T')[0]}`);
    console.log(`   🎵 Total plays: ${parseInt(total_plays).toLocaleString()}`);
    
    console.log('\n🎉 Materialized views created successfully!');
    console.log('\n📝 Next steps:');
    console.log('   • Views should now be visible in Supabase UI');
    console.log('   • Test API: /api/trends/metrics?days=365');
    console.log('   • Refresh weekly with: /api/trends/matview/refresh');
    
  } catch (error) {
    console.error('\n💥 Creation failed:', error.message);
    if (error.code) {
      console.error(`   Error code: ${error.code}`);
    }
    
    // Try to clean up partial creation
    try {
      await pool.query('DROP MATERIALIZED VIEW IF EXISTS weekly_listening_metrics CASCADE');
      await pool.query('DROP MATERIALIZED VIEW IF EXISTS weekly_diversity_metrics CASCADE');
      console.log('   🧹 Cleaned up partial views');
    } catch (cleanupError) {
      console.log('   ⚠️ Cleanup failed, you may need to manually drop views');
    }
    
    process.exit(1);
  } finally {
    await pool.end();
  }
}

createMaterializedViews();