import { getPool } from './connection.js';
import logger from '../utils/logger.js';

const pool = () => getPool();

// Get trends data for specified period (weekly intervals)
export async function getTrendsData(days = 90, callback) {
  logger.info(`getTrendsData called with days=${days}`);
  
  try {
    // Calculate weekly intervals for the specified period
    const weeksCount = Math.ceil(days / 7);
    
    const query = `
      WITH weekly_periods AS (
        SELECT 
          generate_series(
            DATE_TRUNC('week', NOW() - INTERVAL '${days} days'),
            DATE_TRUNC('week', NOW()),
            INTERVAL '1 week'
          ) AS week_start
      ),
      weekly_data AS (
        SELECT 
          wp.week_start,
          wp.week_start + INTERVAL '6 days' AS week_end,
          
          -- Basic counts for this week
          COUNT(p.id) AS plays_in_period,
          COUNT(DISTINCT p.track_id) AS unique_tracks_in_period,
          COUNT(DISTINCT ta.artist_id) AS unique_artists_in_period,
          COUNT(DISTINCT tal.album_id) AS unique_albums_in_period,
          COUNT(DISTINCT DATE(p.played_at + INTERVAL '1 hour')) AS active_days_in_period,
          
          -- Listening time for this week
          COALESCE(SUM(t.duration_ms), 0) AS listening_time_in_period,
          
          -- Rolling 2-week window counts (more sensitive to recent changes)
          (SELECT COUNT(*) FROM plays p2 
           WHERE p2.played_at >= wp.week_start - INTERVAL '7 days'
           AND p2.played_at <= wp.week_start + INTERVAL '6 days') AS rolling_plays,
          (SELECT COUNT(DISTINCT track_id) FROM plays p2 
           WHERE p2.played_at >= wp.week_start - INTERVAL '7 days'
           AND p2.played_at <= wp.week_start + INTERVAL '6 days') AS rolling_unique_tracks,
          (SELECT COUNT(DISTINCT ta2.artist_id) FROM plays p2 
           JOIN track_artists ta2 ON p2.track_id = ta2.track_id 
           WHERE p2.played_at >= wp.week_start - INTERVAL '7 days'
           AND p2.played_at <= wp.week_start + INTERVAL '6 days') AS rolling_unique_artists,
          (SELECT COUNT(DISTINCT tal2.album_id) FROM plays p2 
           JOIN track_albums tal2 ON p2.track_id = tal2.track_id 
           WHERE p2.played_at >= wp.week_start - INTERVAL '7 days'
           AND p2.played_at <= wp.week_start + INTERVAL '6 days' AND tal2.album_id IS NOT NULL) AS rolling_unique_albums,
          (SELECT COUNT(DISTINCT DATE(p2.played_at + INTERVAL '1 hour')) FROM plays p2 
           WHERE p2.played_at >= wp.week_start - INTERVAL '7 days'
           AND p2.played_at <= wp.week_start + INTERVAL '6 days') AS rolling_active_days
           
        FROM weekly_periods wp
        LEFT JOIN plays p ON p.played_at >= wp.week_start AND p.played_at <= wp.week_start + INTERVAL '6 days'
        LEFT JOIN tracks t ON p.track_id = t.id
        LEFT JOIN track_artists ta ON p.track_id = ta.track_id
        LEFT JOIN track_albums tal ON p.track_id = tal.track_id
        GROUP BY wp.week_start
        ORDER BY wp.week_start
      )
      SELECT 
        week_start,
        week_end,
        
        -- Weekly metrics
        plays_in_period,
        unique_tracks_in_period,
        unique_artists_in_period,
        unique_albums_in_period,
        active_days_in_period,
        listening_time_in_period,
        
        -- Calculated metrics (2-week rolling window)
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
          THEN ROUND((SELECT SUM(t.duration_ms) FROM plays p 
                      JOIN tracks t ON p.track_id = t.id 
                      WHERE p.played_at >= week_start - INTERVAL '7 days'
                      AND p.played_at <= week_start + INTERVAL '6 days' AND t.duration_ms IS NOT NULL)::DECIMAL 
                     / (rolling_active_days * 1000 * 60 * 60)::DECIMAL, 1)
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
        END AS repeat_factor,
        
        -- Shannon Entropy diversity score (2-week rolling window)
        CASE 
          WHEN rolling_unique_tracks > 1 THEN
            ROUND((
              SELECT 
                -SUM((track_count::DECIMAL / total_count::DECIMAL) * LOG(2, track_count::DECIMAL / total_count::DECIMAL)) / LOG(2, COUNT(*)) * 100
              FROM (
                SELECT 
                  p3.track_id,
                  COUNT(*) as track_count,
                  SUM(COUNT(*)) OVER () as total_count
                FROM plays p3 
                WHERE p3.played_at >= week_start - INTERVAL '7 days'
                AND p3.played_at <= week_start + INTERVAL '6 days'
                GROUP BY p3.track_id
              ) track_stats
            ), 1)
          ELSE 0 
        END AS diversity_score
        
      FROM weekly_data
      WHERE rolling_plays > 0
      ORDER BY week_start
    `;
    
    const result = await pool().query(query);
    const trendsData = result.rows.map(row => ({
      date: row.week_start,
      week_end: row.week_end,
      
      // Weekly activity
      playsThisWeek: parseInt(row.plays_in_period) || 0,
      tracksThisWeek: parseInt(row.unique_tracks_in_period) || 0,
      artistsThisWeek: parseInt(row.unique_artists_in_period) || 0,
      albumsThisWeek: parseInt(row.unique_albums_in_period) || 0,
      activeDaysThisWeek: parseInt(row.active_days_in_period) || 0,
      listeningTimeThisWeek: parseInt(row.listening_time_in_period) || 0,
      
      // Cumulative calculated metrics
      tracksPerArtist: parseFloat(row.tracks_per_artist) || 0,
      playsPerArtist: parseFloat(row.plays_per_artist) || 0,
      tracksPerAlbum: parseFloat(row.tracks_per_album) || 0,
      hoursPerDay: parseFloat(row.hours_per_day) || 0,
      discoveryFrequency: parseFloat(row.discovery_frequency) || 0,
      replayRate: parseFloat(row.replay_rate) || 0,
      repeatFactor: parseFloat(row.repeat_factor) || 0,
      diversityScore: parseFloat(row.diversity_score) || 0
    }));
    
    logger.info(`getTrendsData returned ${trendsData.length} weekly data points`);
    callback(null, trendsData);
    
  } catch (err) {
    logger.error(`getTrendsData DB error: ${err}`);
    callback(err);
  }
}

