-- Standalone script to create materialized views for trends metrics
-- This can be run directly on production database that already has the schema

BEGIN;

-- Create materialized view for weekly metrics aggregation
-- This pre-calculates all weekly metrics for fast querying over multiple years
CREATE MATERIALIZED VIEW weekly_listening_metrics AS
WITH weekly_periods AS (
  SELECT 
    DATE_TRUNC('week', played_at) AS week_start,
    DATE_TRUNC('week', played_at) + INTERVAL '6 days' AS week_end
  FROM plays 
  WHERE played_at IS NOT NULL
  GROUP BY DATE_TRUNC('week', played_at)
),
weekly_aggregates AS (
  SELECT 
    wp.week_start,
    wp.week_end,
    
    -- Weekly raw activity metrics
    COUNT(p.id) AS plays_this_week,
    COUNT(DISTINCT p.track_id) AS tracks_this_week,
    COUNT(DISTINCT ta.artist_id) AS artists_this_week,
    COUNT(DISTINCT tal.album_id) AS albums_this_week,
    COUNT(DISTINCT DATE(p.played_at + INTERVAL '1 hour')) AS active_days_this_week,
    COALESCE(SUM(t.duration_ms), 0) AS listening_time_this_week,
    
    -- Rolling 2-week window for smoother trends
    COUNT(p2.id) AS rolling_plays,
    COUNT(DISTINCT p2.track_id) AS rolling_unique_tracks,
    COUNT(DISTINCT ta2.artist_id) AS rolling_unique_artists,
    COUNT(DISTINCT tal2.album_id) AS rolling_unique_albums,
    COUNT(DISTINCT DATE(p2.played_at + INTERVAL '1 hour')) AS rolling_active_days,
    COALESCE(SUM(t2.duration_ms), 0) AS rolling_listening_time
    
  FROM weekly_periods wp
  
  -- Current week data
  LEFT JOIN plays p ON p.played_at >= wp.week_start AND p.played_at <= wp.week_end
  LEFT JOIN tracks t ON p.track_id = t.id
  LEFT JOIN track_artists ta ON p.track_id = ta.track_id
  LEFT JOIN track_albums tal ON p.track_id = tal.track_id
  
  -- Rolling 2-week window data
  LEFT JOIN plays p2 ON p2.played_at >= wp.week_start - INTERVAL '7 days' 
                    AND p2.played_at <= wp.week_end
  LEFT JOIN tracks t2 ON p2.track_id = t2.id
  LEFT JOIN track_artists ta2 ON p2.track_id = ta2.track_id
  LEFT JOIN track_albums tal2 ON p2.track_id = tal2.track_id
  
  GROUP BY wp.week_start, wp.week_end
)
SELECT 
  week_start,
  week_end,
  
  -- Weekly raw metrics
  plays_this_week,
  tracks_this_week,
  artists_this_week,
  albums_this_week,
  active_days_this_week,
  listening_time_this_week,
  
  -- Calculated metrics using rolling window for smoother trends
  CASE 
    WHEN rolling_unique_artists > 0 
    THEN ROUND(rolling_unique_tracks::DECIMAL / rolling_unique_artists::DECIMAL, 1)
    ELSE 0 
  END AS tracks_per_artist,
  
  CASE 
    WHEN rolling_unique_artists > 0 
    THEN ROUND(rolling_plays::DECIMAL / rolling_unique_artists::DECIMAL, 1)
    ELSE 0 
  END AS plays_per_artist,
  
  CASE 
    WHEN rolling_unique_albums > 0 
    THEN ROUND(rolling_unique_tracks::DECIMAL / rolling_unique_albums::DECIMAL, 1)
    ELSE 0 
  END AS tracks_per_album,
  
  CASE 
    WHEN rolling_active_days > 0 
    THEN ROUND(rolling_listening_time::DECIMAL / (rolling_active_days * 1000 * 60 * 60)::DECIMAL, 1)
    ELSE 0 
  END AS hours_per_day,
  
  CASE 
    WHEN rolling_active_days > 0 
    THEN ROUND(rolling_unique_tracks::DECIMAL / rolling_active_days::DECIMAL, 1)
    ELSE 0 
  END AS discovery_frequency,
  
  CASE 
    WHEN rolling_unique_tracks > 0 AND rolling_plays > rolling_unique_tracks
    THEN ROUND(((rolling_plays - rolling_unique_tracks)::DECIMAL / rolling_plays::DECIMAL) * 100, 1)
    ELSE 0 
  END AS replay_rate,
  
  CASE 
    WHEN rolling_unique_tracks > 0 
    THEN ROUND(rolling_plays::DECIMAL / rolling_unique_tracks::DECIMAL, 1)
    ELSE 0 
  END AS repeat_factor

FROM weekly_aggregates
WHERE rolling_plays > 0  -- Only include weeks with activity
ORDER BY week_start;

-- Create materialized view for diversity scores (Shannon Entropy)
-- Separate view because it requires more complex calculations
CREATE MATERIALIZED VIEW weekly_diversity_metrics AS
WITH weekly_periods AS (
  SELECT DISTINCT DATE_TRUNC('week', played_at) AS week_start
  FROM plays 
  WHERE played_at IS NOT NULL
),
weekly_diversity AS (
  SELECT 
    wp.week_start,
    wp.week_start + INTERVAL '6 days' AS week_end,
    
    -- Shannon Entropy diversity score (2-week rolling window)
    CASE 
      WHEN COUNT(DISTINCT p.track_id) > 1 THEN
        ROUND((
          -SUM((track_count::DECIMAL / total_count::DECIMAL) * LOG(2, track_count::DECIMAL / total_count::DECIMAL)) / 
          LOG(2, COUNT(DISTINCT p.track_id)) * 100
        ), 1)
      ELSE 0 
    END AS diversity_score
    
  FROM weekly_periods wp
  LEFT JOIN LATERAL (
    SELECT 
      p2.track_id,
      COUNT(*) as track_count,
      SUM(COUNT(*)) OVER () as total_count
    FROM plays p2 
    WHERE p2.played_at >= wp.week_start - INTERVAL '7 days'
    AND p2.played_at <= wp.week_start + INTERVAL '6 days'
    GROUP BY p2.track_id
  ) p ON true
  GROUP BY wp.week_start
  HAVING COUNT(p.track_id) > 0
  ORDER BY wp.week_start
)
SELECT 
  week_start,
  week_end,
  COALESCE(diversity_score, 0) AS diversity_score
FROM weekly_diversity;

-- Create indexes for fast querying
CREATE INDEX idx_weekly_metrics_week_start ON weekly_listening_metrics(week_start);
CREATE INDEX idx_weekly_metrics_date_range ON weekly_listening_metrics(week_start, week_end);
CREATE INDEX idx_weekly_diversity_week_start ON weekly_diversity_metrics(week_start);

-- Create function to refresh both materialized views
CREATE OR REPLACE FUNCTION refresh_trends_metrics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW weekly_listening_metrics;
  REFRESH MATERIALIZED VIEW weekly_diversity_metrics;
  
  -- Log the refresh
  INSERT INTO metadata (key, value, updated_at) 
  VALUES ('last_trends_refresh', EXTRACT(EPOCH FROM NOW())::TEXT, NOW())
  ON CONFLICT (key) DO UPDATE SET 
    value = EXCLUDED.value,
    updated_at = EXCLUDED.updated_at;
END;
$$ LANGUAGE plpgsql;

-- Initial refresh of materialized views with your existing data
SELECT refresh_trends_metrics();

COMMIT;