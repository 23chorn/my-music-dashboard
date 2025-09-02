import { getPool } from './db.js';
import logger from '../utils/logger.js';

const pool = () => getPool();

// Get track info with associated artists and albums
export function getTrackInfo(trackId, callback) {
  logger.info(`getTrackInfo called with trackId=${trackId}`);
  
  const query = `
    WITH ranked_albums AS (
      SELECT 
        t.id as track_id,
        tal.album_id as track_album_id,
        al.id as album_id,
        al.name as album_name,
        al.image_url as album_image,
        al.release_date,
        ROW_NUMBER() OVER (
          PARTITION BY t.id 
          ORDER BY 
            al.release_date DESC NULLS LAST,
            al.id DESC
        ) as album_rank
      FROM tracks t
      LEFT JOIN track_albums tal ON t.id = tal.track_id
      LEFT JOIN albums al ON tal.album_id = al.id
      WHERE t.id = $1
    )
    SELECT 
      t.id,
      t.name as track_name,
      t.duration_ms,
      t.popularity,
      
      -- Primary artist info (for track image/header)
      first_artist.id as primary_artist_id,
      first_artist.name as primary_artist_name,
      first_artist.image_url as primary_artist_image,
      
      -- All artists as JSON array
      COALESCE(
        JSON_AGG(
          DISTINCT JSONB_BUILD_OBJECT(
            'id', a.id,
            'name', a.name,
            'image_url', a.image_url
          )
          ORDER BY JSONB_BUILD_OBJECT(
            'id', a.id,
            'name', a.name,
            'image_url', a.image_url
          )
        ) FILTER (WHERE a.id IS NOT NULL), 
        '[]'::json
      ) as artists,
      
      -- All albums as JSON array
      COALESCE(
        JSON_AGG(
          DISTINCT JSONB_BUILD_OBJECT(
            'id', albums_all.id,
            'name', albums_all.name,
            'image_url', albums_all.image_url,
            'release_date', albums_all.release_date
          )
          ORDER BY JSONB_BUILD_OBJECT(
            'id', albums_all.id,
            'name', albums_all.name,
            'image_url', albums_all.image_url,
            'release_date', albums_all.release_date
          )
        ) FILTER (WHERE albums_all.id IS NOT NULL), 
        '[]'::json
      ) as albums,
      
      -- Primary album info (most recent)
      ra.album_id as primary_album_id,
      ra.album_name as primary_album_name,
      ra.album_image as primary_album_image,
      ra.release_date as primary_album_release_date,
      
      -- Play count
      COALESCE(pc.play_count, 0) as play_count
      
    FROM tracks t
    
    -- Join to get all artists
    LEFT JOIN track_artists ta ON t.id = ta.track_id
    LEFT JOIN artists a ON ta.artist_id = a.id
    
    -- Join to get primary artist (first alphabetically for consistency)
    LEFT JOIN LATERAL (
      SELECT a2.id, a2.name, a2.image_url
      FROM track_artists ta2
      JOIN artists a2 ON ta2.artist_id = a2.id
      WHERE ta2.track_id = t.id
      ORDER BY a2.name
      LIMIT 1
    ) first_artist ON true
    
    -- Join to get all albums
    LEFT JOIN track_albums tal_all ON t.id = tal_all.track_id
    LEFT JOIN albums albums_all ON tal_all.album_id = albums_all.id
    
    -- Join to get primary album (most recent)
    LEFT JOIN ranked_albums ra ON t.id = ra.track_id AND ra.album_rank = 1
    
    -- Get play count
    LEFT JOIN (
      SELECT track_id, COUNT(*) as play_count 
      FROM plays 
      WHERE track_id = $1
      GROUP BY track_id
    ) pc ON t.id = pc.track_id
    
    WHERE t.id = $1
    GROUP BY 
      t.id, t.name, t.duration_ms, t.popularity,
      first_artist.id, first_artist.name, first_artist.image_url,
      ra.album_id, ra.album_name, ra.album_image, ra.release_date,
      pc.play_count
  `;
  
  pool().query(query, [trackId])
    .then(result => {
      if (result.rows.length === 0) {
        logger.warn(`Track not found: ${trackId}`);
        callback(null, null);
        return;
      }
      
      const track = result.rows[0];
      logger.info(`getTrackInfo returned track: ${track.track_name} with ${track.play_count} plays`);
      callback(null, track);
    })
    .catch(err => {
      logger.error(`getTrackInfo error: ${err.message}`);
      callback(err);
    });
}

// Get track recent plays
export function getTrackRecentPlays(trackId, limit, callback) {
  logger.info(`getTrackRecentPlays called with trackId=${trackId}, limit=${limit}`);
  
  const query = `
    SELECT 
      p.id,
      EXTRACT(EPOCH FROM p.played_at)::INTEGER as timestamp,
      t.name as track,
      STRING_AGG(DISTINCT a.name, ', ' ORDER BY a.name) as artist
    FROM plays p
    JOIN tracks t ON p.track_id = t.id
    JOIN track_artists ta ON t.id = ta.track_id
    JOIN artists a ON ta.artist_id = a.id
    WHERE p.track_id = $1
    GROUP BY p.id, p.played_at, t.name
    ORDER BY p.played_at DESC
    LIMIT $2
  `;
  
  pool().query(query, [trackId, limit])
    .then(result => {
      logger.info(`getTrackRecentPlays returned ${result.rows.length} plays`);
      callback(null, result.rows);
    })
    .catch(err => {
      logger.error(`getTrackRecentPlays error: ${err.message}`);
      callback(err);
    });
}

// Get track stats (total plays, first play, last play, etc.)
export function getTrackStats(trackId, callback) {
  logger.info(`getTrackStats called with trackId=${trackId}`);
  
  const query = `
    WITH daily_plays AS (
      SELECT 
        DATE(played_at AT TIME ZONE 'Europe/London') as play_date,
        COUNT(*) as daily_count
      FROM plays 
      WHERE track_id = $1
      GROUP BY DATE(played_at AT TIME ZONE 'Europe/London')
    ),
    top_day AS (
      SELECT 
        play_date,
        daily_count
      FROM daily_plays
      ORDER BY daily_count DESC, play_date DESC
      LIMIT 1
    )
    SELECT 
      COUNT(*) as total_streams,
      EXTRACT(EPOCH FROM MIN(played_at))::INTEGER as first_play,
      EXTRACT(EPOCH FROM MAX(played_at))::INTEGER as last_play,
      COUNT(DISTINCT DATE(played_at AT TIME ZONE 'Europe/London')) as days_played,
      td.play_date as top_day_date,
      td.daily_count as top_day_count
    FROM plays p
    LEFT JOIN top_day td ON true
    WHERE p.track_id = $1
    GROUP BY td.play_date, td.daily_count
  `;
  
  pool().query(query, [trackId])
    .then(result => {
      const row = result.rows[0];
      const stats = {
        total_streams: parseInt(row?.total_streams) || 0,
        first_play: row?.first_play || null,
        last_play: row?.last_play || null,
        days_played: parseInt(row?.days_played) || 0,
        top_day: row?.top_day_date ? {
          day: row.top_day_date,
          count: parseInt(row.top_day_count)
        } : null
      };
      
      logger.info(`getTrackStats returned: ${stats.total_streams} plays over ${stats.days_played} days`);
      callback(null, stats);
    })
    .catch(err => {
      logger.error(`getTrackStats error: ${err.message}`);
      callback(err);
    });
}

// Get track daily plays for chart
export function getTrackDailyPlays(trackId, days, callback) {
  logger.info(`getTrackDailyPlays called with trackId=${trackId}, days=${days}`);
  
  const query = `
    SELECT 
      DATE(played_at AT TIME ZONE 'Europe/London') as day,
      COUNT(*) as plays
    FROM plays
    WHERE track_id = $1
      AND played_at AT TIME ZONE 'Europe/London' >= (NOW() AT TIME ZONE 'Europe/London') - INTERVAL '${days} days'
    GROUP BY DATE(played_at AT TIME ZONE 'Europe/London')
    ORDER BY day ASC
  `;
  
  pool().query(query, [trackId])
    .then(result => {
      logger.info(`getTrackDailyPlays returned ${result.rows.length} days of data`);
      callback(null, result.rows);
    })
    .catch(err => {
      logger.error(`getTrackDailyPlays error: ${err.message}`);
      callback(err);
    });
}

export async function getAllTracksWithPlaycount(callback) {
  logger.info(`getAllTracksWithPlaycount called`);
  try {
    const result = await pool().query(
      `SELECT t.id, t.name, COUNT(p.id) AS playcount
       FROM tracks t
       LEFT JOIN plays p ON t.id = p.track_id
       GROUP BY t.id, t.name
       HAVING COUNT(p.id) > 0
       ORDER BY t.name ASC`
    );
    logger.info(`getAllTracksWithPlaycount returned ${result.rows.length} tracks`);
    callback(null, result.rows.map(row => ({
      id: parseInt(row.id),
      name: row.name,
      playcount: parseInt(row.playcount)
    })));
  } catch (err) {
    logger.error(`getAllTracksWithPlaycount DB error: ${err}`);
    callback(err);
  }
}