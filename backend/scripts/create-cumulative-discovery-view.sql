-- Create materialized view for cumulative discovery metrics
-- This pre-calculates the running totals of unique artists, albums, and tracks discovered over time

BEGIN;

-- Drop existing view if it exists
DROP MATERIALIZED VIEW IF EXISTS cumulative_discovery_metrics CASCADE;

-- Create materialized view for cumulative discovery progression
CREATE MATERIALIZED VIEW cumulative_discovery_metrics AS
WITH first_discoveries AS (
  -- Find the first time each track/artist/album was played
  SELECT 
    p.track_id,
    ta.artist_id,
    tal.album_id,
    MIN(p.played_at) as first_played_at,
    DATE_TRUNC('week', MIN(p.played_at)) as discovery_week
  FROM plays p
  JOIN track_artists ta ON p.track_id = ta.track_id
  LEFT JOIN track_albums tal ON p.track_id = tal.track_id
  WHERE p.played_at IS NOT NULL
  GROUP BY p.track_id, ta.artist_id, tal.album_id
),
weekly_discoveries AS (
  -- Count new discoveries per week
  SELECT 
    discovery_week as week_start,
    discovery_week + INTERVAL '6 days' as week_end,
    COUNT(DISTINCT track_id) as new_tracks_this_week,
    COUNT(DISTINCT artist_id) as new_artists_this_week,
    COUNT(DISTINCT album_id) FILTER (WHERE album_id IS NOT NULL) as new_albums_this_week
  FROM first_discoveries
  GROUP BY discovery_week
  ORDER BY discovery_week
),
all_weeks AS (
  -- Generate all weeks from first discovery to now
  SELECT 
    generate_series(
      (SELECT MIN(week_start) FROM weekly_discoveries),
      DATE_TRUNC('week', NOW()),
      INTERVAL '1 week'
    ) as week_start
),
weekly_with_zeros AS (
  -- Include weeks with zero discoveries
  SELECT 
    aw.week_start,
    aw.week_start + INTERVAL '6 days' as week_end,
    COALESCE(wd.new_tracks_this_week, 0) as new_tracks_this_week,
    COALESCE(wd.new_artists_this_week, 0) as new_artists_this_week,
    COALESCE(wd.new_albums_this_week, 0) as new_albums_this_week
  FROM all_weeks aw
  LEFT JOIN weekly_discoveries wd ON aw.week_start = wd.week_start
)
-- Calculate cumulative sums
SELECT 
  week_start,
  week_end,
  
  -- Weekly discoveries
  new_tracks_this_week,
  new_artists_this_week,
  new_albums_this_week,
  
  -- Cumulative totals (running sums)
  SUM(new_tracks_this_week) OVER (ORDER BY week_start ROWS UNBOUNDED PRECEDING) as cumulative_tracks,
  SUM(new_artists_this_week) OVER (ORDER BY week_start ROWS UNBOUNDED PRECEDING) as cumulative_artists,
  SUM(new_albums_this_week) OVER (ORDER BY week_start ROWS UNBOUNDED PRECEDING) as cumulative_albums,
  
  -- Discovery velocity (tracks discovered per week, 4-week moving average for smoothing)
  ROUND(
    AVG(new_tracks_this_week) OVER (
      ORDER BY week_start 
      ROWS BETWEEN 3 PRECEDING AND CURRENT ROW
    ), 1
  ) as track_discovery_velocity,
  
  -- Discovery acceleration (change in velocity)
  ROUND(
    AVG(new_artists_this_week) OVER (
      ORDER BY week_start 
      ROWS BETWEEN 3 PRECEDING AND CURRENT ROW
    ), 1
  ) as artist_discovery_velocity,
  
  ROUND(
    AVG(new_albums_this_week) OVER (
      ORDER BY week_start 
      ROWS BETWEEN 3 PRECEDING AND CURRENT ROW
    ), 1
  ) as album_discovery_velocity

FROM weekly_with_zeros
ORDER BY week_start;

-- Create indexes for fast querying
CREATE INDEX idx_cumulative_discovery_week_start ON cumulative_discovery_metrics(week_start);
CREATE INDEX idx_cumulative_discovery_date_range ON cumulative_discovery_metrics(week_start, week_end);

-- Add refresh function for cumulative discovery view
CREATE OR REPLACE FUNCTION refresh_cumulative_discovery()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW cumulative_discovery_metrics;
  
  -- Log the refresh
  INSERT INTO metadata (key, value, updated_at) 
  VALUES ('last_cumulative_discovery_refresh', EXTRACT(EPOCH FROM NOW())::TEXT, NOW())
  ON CONFLICT (key) DO UPDATE SET 
    value = EXCLUDED.value,
    updated_at = EXCLUDED.updated_at;
END;
$$ LANGUAGE plpgsql;

-- Update the main refresh function to include cumulative discovery
CREATE OR REPLACE FUNCTION refresh_all_trends_metrics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW weekly_listening_metrics;
  REFRESH MATERIALIZED VIEW weekly_diversity_metrics;
  REFRESH MATERIALIZED VIEW cumulative_discovery_metrics;
  
  -- Log the refresh
  INSERT INTO metadata (key, value, updated_at) 
  VALUES ('last_all_trends_refresh', EXTRACT(EPOCH FROM NOW())::TEXT, NOW())
  ON CONFLICT (key) DO UPDATE SET 
    value = EXCLUDED.value,
    updated_at = EXCLUDED.updated_at;
END;
$$ LANGUAGE plpgsql;

-- Initial refresh of the new materialized view
SELECT refresh_cumulative_discovery();

COMMIT;