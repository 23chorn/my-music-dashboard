import logger from '../../utils/logger.js';
import { getPool } from '../connection.js';

const pool = () => getPool();

// Get track info with associated artists and albums
export function getTrackInfo(trackId, callback) {
  logger.info(`getTrackInfo called with trackId=${trackId}`);
  
  const query = `
    WITH album_track_counts AS (
      SELECT album_id, COUNT(*) AS track_count
      FROM track_albums
      GROUP BY album_id
    ),
    ranked_albums AS (
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
            COALESCE(atc.track_count, 0) DESC,  -- prefer the album over a single/EP
            al.release_date DESC NULLS LAST,
            al.id DESC
        ) as album_rank
      FROM tracks t
      LEFT JOIN track_albums tal ON t.id = tal.track_id
      LEFT JOIN albums al ON tal.album_id = al.id
      LEFT JOIN album_track_counts atc ON tal.album_id = atc.album_id
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
      
      -- All artists as JSON array (ordered by primary first, then name)
      (
        SELECT COALESCE(JSON_AGG(
          JSONB_BUILD_OBJECT(
            'id', artist_data.id,
            'name', artist_data.name,
            'image_url', artist_data.image_url
          )
          ORDER BY artist_data.is_primary DESC, artist_data.name
        ), '[]'::json)
        FROM (
          SELECT DISTINCT a2.id, a2.name, a2.image_url, ta2.is_primary
          FROM track_artists ta2
          JOIN artists a2 ON ta2.artist_id = a2.id
          WHERE ta2.track_id = t.id
        ) artist_data
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
      ra.release_date as primary_album_release_date
      
    FROM tracks t
    
    -- Join to get all artists
    LEFT JOIN track_artists ta ON t.id = ta.track_id
    LEFT JOIN artists a ON ta.artist_id = a.id
    
    -- Join to get primary artist (by is_primary flag, then alphabetically)
    LEFT JOIN LATERAL (
      SELECT a2.id, a2.name, a2.image_url
      FROM track_artists ta2
      JOIN artists a2 ON ta2.artist_id = a2.id
      WHERE ta2.track_id = t.id
      ORDER BY ta2.is_primary DESC, a2.name
      LIMIT 1
    ) first_artist ON true
    
    -- Join to get all albums
    LEFT JOIN track_albums tal_all ON t.id = tal_all.track_id
    LEFT JOIN albums albums_all ON tal_all.album_id = albums_all.id
    
    -- Join to get primary album (most recent)
    LEFT JOIN ranked_albums ra ON t.id = ra.track_id AND ra.album_rank = 1
    
    WHERE t.id = $1
    GROUP BY 
      t.id, t.name, t.duration_ms, t.popularity,
      first_artist.id, first_artist.name, first_artist.image_url,
      ra.album_id, ra.album_name, ra.album_image, ra.release_date
  `;
  
  pool().query(query, [trackId])
    .then(result => {
      if (result.rows.length === 0) {
        logger.warn(`Track not found: ${trackId}`);
        callback(null, null);
        return;
      }
      
      const track = result.rows[0];
      logger.info(`getTrackInfo returned track: ${track.track_name}`);
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
      (
        SELECT STRING_AGG(name, ', ' ORDER BY is_primary DESC, name)
        FROM (
          SELECT DISTINCT a2.name, ta2.is_primary
          FROM track_artists ta2
          JOIN artists a2 ON ta2.artist_id = a2.id
          WHERE ta2.track_id = t.id
        ) artist_data
      ) as artist
    FROM plays p
    JOIN tracks t ON p.track_id = t.id
    WHERE p.track_id = $1
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
        (DATE(played_at + INTERVAL '1 hour') + INTERVAL '1 day')::date as play_date,
        COUNT(*) as daily_count
      FROM plays 
      WHERE track_id = $1
      GROUP BY (DATE(played_at + INTERVAL '1 hour') + INTERVAL '1 day')::date
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
      COUNT(DISTINCT (DATE(played_at + INTERVAL '1 hour') + INTERVAL '1 day')::date) as days_played,
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
      (DATE(played_at + INTERVAL '1 hour') + INTERVAL '1 day')::date as day,
      COUNT(*) as plays
    FROM plays
    WHERE track_id = $1
      AND (DATE(played_at + INTERVAL '1 hour') + INTERVAL '1 day')::date >= 
          (DATE(NOW()) + INTERVAL '1 day')::date - INTERVAL '${days - 1} days'
    GROUP BY (DATE(played_at + INTERVAL '1 hour') + INTERVAL '1 day')::date
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

export async function getAllTracksWithPlaycount(options = {}, callback) {
  // Handle backward compatibility - if first param is callback
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  const {
    page = 1,
    limit = 50,
    sortBy = 'alpha',
    alphaCategory = null,
    minPlays = null,
    maxPlays = null,
    releaseYearStart = null,
    releaseYearEnd = null
  } = options;
  logger.info(`getAllTracksWithPlaycount called with page=${page}, limit=${limit}, sortBy=${sortBy}, alphaCategory=${alphaCategory}, minPlays=${minPlays}, maxPlays=${maxPlays}, releaseYearStart=${releaseYearStart}, releaseYearEnd=${releaseYearEnd}`);

  try {
    let query;
    let queryParams = [];
    let paramCount = 0;

    // Build WHERE clause for release date filtering (applied to tracks table)
    let whereClause = '';
    if (releaseYearStart !== null || releaseYearEnd !== null) {
      const conditions = [];
      if (releaseYearStart !== null) {
        conditions.push(`EXTRACT(YEAR FROM t.release_date) >= $${++paramCount}`);
        queryParams.push(releaseYearStart);
      }
      if (releaseYearEnd !== null) {
        conditions.push(`EXTRACT(YEAR FROM t.release_date) <= $${++paramCount}`);
        queryParams.push(releaseYearEnd);
      }
      whereClause = `WHERE ${conditions.join(' AND ')}`;
    }

    if (sortBy === 'plays') {
      // Sort by playcount descending with pagination
      let havingClause = 'HAVING COUNT(p.id) > 0';

      if (minPlays !== null || maxPlays !== null) {
        const conditions = [];
        if (minPlays !== null) {
          conditions.push(`COUNT(p.id) >= $${++paramCount}`);
          queryParams.push(minPlays);
        }
        if (maxPlays !== null) {
          conditions.push(`COUNT(p.id) <= $${++paramCount}`);
          queryParams.push(maxPlays);
        }
        havingClause = `HAVING ${conditions.join(' AND ')}`;
      }

      query = `
        WITH album_track_counts AS (
          SELECT album_id, COUNT(*) AS track_count
          FROM track_albums
          GROUP BY album_id
        ),
        track_primary_album AS (
          SELECT
            t.id as track_id,
            al.image_url as primary_album_image,
            ROW_NUMBER() OVER (
              PARTITION BY t.id
              ORDER BY
                COALESCE(atc.track_count, 0) DESC,  -- prefer the album over a single/EP
                al.release_date DESC NULLS LAST,
                al.id DESC
            ) as album_rank
          FROM tracks t
          LEFT JOIN track_albums tal ON t.id = tal.track_id
          LEFT JOIN albums al ON tal.album_id = al.id
          LEFT JOIN album_track_counts atc ON tal.album_id = atc.album_id
        )
        SELECT
          t.id,
          t.name,
          COUNT(p.id) AS playcount,
          tpa.primary_album_image as image_url
        FROM tracks t
        LEFT JOIN plays p ON t.id = p.track_id
        LEFT JOIN track_primary_album tpa ON t.id = tpa.track_id AND tpa.album_rank = 1
        ${whereClause}
        GROUP BY t.id, t.name, tpa.primary_album_image
        ${havingClause}
        ORDER BY playcount DESC, t.name ASC
        LIMIT $${++paramCount} OFFSET $${++paramCount}
      `;
      queryParams.push(limit, (page - 1) * limit);
    } else {
      // Alphabetical sorting with category filtering
      let havingClause = 'HAVING COUNT(p.id) > 0';

      if (minPlays !== null || maxPlays !== null) {
        const conditions = [];
        if (minPlays !== null) {
          conditions.push(`COUNT(p.id) >= $${++paramCount}`);
          queryParams.push(minPlays);
        }
        if (maxPlays !== null) {
          conditions.push(`COUNT(p.id) <= $${++paramCount}`);
          queryParams.push(maxPlays);
        }
        havingClause = `HAVING ${conditions.join(' AND ')}`;
      }

      const baseQuery = `
        WITH album_track_counts AS (
          SELECT album_id, COUNT(*) AS track_count
          FROM track_albums
          GROUP BY album_id
        ),
        track_primary_album AS (
          SELECT
            t.id as track_id,
            al.image_url as primary_album_image,
            ROW_NUMBER() OVER (
              PARTITION BY t.id
              ORDER BY
                COALESCE(atc.track_count, 0) DESC,  -- prefer the album over a single/EP
                al.release_date DESC NULLS LAST,
                al.id DESC
            ) as album_rank
          FROM tracks t
          LEFT JOIN track_albums tal ON t.id = tal.track_id
          LEFT JOIN albums al ON tal.album_id = al.id
          LEFT JOIN album_track_counts atc ON tal.album_id = atc.album_id
        )
        SELECT
          t.id,
          t.name,
          COUNT(p.id) AS playcount,
          tpa.primary_album_image as image_url
        FROM tracks t
        LEFT JOIN plays p ON t.id = p.track_id
        LEFT JOIN track_primary_album tpa ON t.id = tpa.track_id AND tpa.album_rank = 1
      `;

      if (alphaCategory && alphaCategory !== '#') {
        // Combine WHERE clauses
        let combinedWhere = whereClause;
        if (combinedWhere) {
          combinedWhere += ` AND UPPER(t.name) LIKE $${++paramCount}`;
        } else {
          combinedWhere = `WHERE UPPER(t.name) LIKE $${++paramCount}`;
        }
        queryParams.push(`${alphaCategory}%`);

        query = `
          ${baseQuery}
          ${combinedWhere}
          GROUP BY t.id, t.name, tpa.primary_album_image
          ${havingClause}
          ORDER BY t.name ASC
          LIMIT $${++paramCount} OFFSET $${++paramCount}
        `;
        queryParams.push(limit, (page - 1) * limit);
      } else if (alphaCategory === '#') {
        // Combine WHERE clauses
        let combinedWhere = whereClause;
        if (combinedWhere) {
          combinedWhere += ` AND NOT (UPPER(t.name) ~ '^[A-Z]')`;
        } else {
          combinedWhere = `WHERE NOT (UPPER(t.name) ~ '^[A-Z]')`;
        }

        query = `
          ${baseQuery}
          ${combinedWhere}
          GROUP BY t.id, t.name, tpa.primary_album_image
          ${havingClause}
          ORDER BY t.name ASC
          LIMIT $${++paramCount} OFFSET $${++paramCount}
        `;
        queryParams.push(limit, (page - 1) * limit);
      } else {
        // Default alphabetical sort
        query = `
          ${baseQuery}
          ${whereClause}
          GROUP BY t.id, t.name, tpa.primary_album_image
          ${havingClause}
          ORDER BY t.name ASC
          LIMIT $${++paramCount} OFFSET $${++paramCount}
        `;
        queryParams.push(limit, (page - 1) * limit);
      }
    }

    const result = await pool().query(query, queryParams);
    logger.info(`getAllTracksWithPlaycount returned ${result.rows.length} tracks`);
    callback(null, result.rows.map(row => ({
      id: parseInt(row.id),
      name: row.name,
      playcount: parseInt(row.playcount),
      image_url: row.image_url || null
    })));
  } catch (err) {
    logger.error(`getAllTracksWithPlaycount DB error: ${err}`);
    callback(err);
  }
}