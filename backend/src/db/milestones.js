import { getPool } from './connection.js';
import logger from '../utils/logger.js';

/**
 * Global milestone achievements - extends existing per-artist milestone system
 * These show who achieved milestones fastest across ALL entities
 */

// Track milestones: 10, 100, 200, 300 plays
export async function getQuickestTrackMilestones() {
  const pool = getPool();
  const milestones = [10, 100, 200, 300];

  try {
    const results = {};

    for (const milestone of milestones) {
      logger.info(`Getting quickest to ${milestone} plays for tracks`);

      const result = await pool.query(`
        WITH track_counts AS (
          SELECT
            t.id as track_id,
            t.name as track_name,
            COUNT(p.id) as total_plays
          FROM tracks t
          JOIN plays p ON t.id = p.track_id
          WHERE p.played_at IS NOT NULL
          GROUP BY t.id, t.name
          HAVING COUNT(p.id) >= $1
        ),
        track_plays AS (
          SELECT
            tc.track_id,
            tc.track_name,
            t.duration_ms,
            p.played_at,
            MIN(p.played_at) OVER (PARTITION BY tc.track_id) as first_play,
            ROW_NUMBER() OVER (
              PARTITION BY tc.track_id
              ORDER BY p.played_at
            ) as play_number
          FROM track_counts tc
          JOIN tracks t ON tc.track_id = t.id
          JOIN plays p ON tc.track_id = p.track_id
          WHERE p.played_at IS NOT NULL
        ),
        milestone_tracks AS (
          SELECT
            tp.track_id,
            tp.track_name,
            tp.duration_ms,
            tp.first_play,
            tp.played_at as milestone_reached,
            (EXTRACT(EPOCH FROM (tp.played_at - tp.first_play)) / 86400)::NUMERIC(10,2) as days_to_milestone,
            tc.total_plays,

            -- Primary artist info
            primary_artist.id as primary_artist_id,
            primary_artist.name as primary_artist_name,
            primary_artist.image_url as primary_artist_image,

            -- All artists as JSON array
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
                WHERE ta2.track_id = tp.track_id
              ) artist_data
            ) as artists,

            -- Primary album info
            primary_album.id as primary_album_id,
            primary_album.name as primary_album_name,
            primary_album.image_url as primary_album_image

          FROM track_plays tp
          JOIN track_counts tc ON tp.track_id = tc.track_id

          -- Join to get primary artist
          LEFT JOIN LATERAL (
            SELECT a.id, a.name, a.image_url
            FROM track_artists ta
            JOIN artists a ON ta.artist_id = a.id
            WHERE ta.track_id = tp.track_id
            ORDER BY ta.is_primary DESC, a.name
            LIMIT 1
          ) primary_artist ON true

          -- Join to get primary album
          LEFT JOIN LATERAL (
            SELECT al.id, al.name, al.image_url
            FROM track_albums tal
            JOIN albums al ON tal.album_id = al.id
            WHERE tal.track_id = tp.track_id
            ORDER BY al.release_date DESC
            LIMIT 1
          ) primary_album ON true

          WHERE tp.play_number = $2
        )
        SELECT *
        FROM milestone_tracks
        ORDER BY days_to_milestone ASC, duration_ms DESC
        LIMIT 1;
      `, [milestone, milestone]);

      results[milestone] = result.rows[0] || null;
    }

    logger.info(`Retrieved track milestones for ${milestones.length} thresholds`);
    return results;

  } catch (error) {
    logger.error(`Error getting track milestones: ${error.message}`);
    throw error;
  }
}

// Album milestones: 100, 500, 1000, 2000 plays
export async function getQuickestAlbumMilestones() {
  const pool = getPool();
  const milestones = [100, 500, 1000, 2000];

  try {
    const results = {};

    for (const milestone of milestones) {
      logger.info(`Getting quickest to ${milestone} plays for albums`);

      const result = await pool.query(`
        WITH album_counts AS (
          SELECT
            al.id as album_id,
            al.name as album_name,
            COUNT(p.id) as total_plays
          FROM albums al
          JOIN track_albums tal ON al.id = tal.album_id
          JOIN tracks t ON tal.track_id = t.id
          JOIN plays p ON t.id = p.track_id
          WHERE p.played_at IS NOT NULL
          GROUP BY al.id, al.name
          HAVING COUNT(p.id) >= $1
        ),
        album_plays AS (
          SELECT
            ac.album_id,
            ac.album_name,
            al.image_url as album_image,
            al.release_date,
            p.played_at,
            MIN(p.played_at) OVER (PARTITION BY ac.album_id) as first_play,
            ROW_NUMBER() OVER (
              PARTITION BY ac.album_id
              ORDER BY p.played_at
            ) as play_number
          FROM album_counts ac
          JOIN albums al ON ac.album_id = al.id
          JOIN track_albums tal ON ac.album_id = tal.album_id
          JOIN tracks t ON tal.track_id = t.id
          JOIN plays p ON t.id = p.track_id
          WHERE p.played_at IS NOT NULL
        ),
        milestone_albums AS (
          SELECT
            ap.album_id,
            ap.album_name,
            ap.album_image,
            ap.release_date,
            ap.first_play,
            ap.played_at as milestone_reached,
            (EXTRACT(EPOCH FROM (ap.played_at - ap.first_play)) / 86400)::NUMERIC(10,2) as days_to_milestone,
            ac.total_plays,

            -- Primary artist info
            primary_artist.id as primary_artist_id,
            primary_artist.name as primary_artist_name,
            primary_artist.image_url as primary_artist_image,

            -- All artists as JSON array
            (
              SELECT COALESCE(JSON_AGG(
                JSONB_BUILD_OBJECT(
                  'id', artist_data.id,
                  'name', artist_data.name,
                  'image_url', artist_data.image_url
                )
                ORDER BY artist_data.name
              ), '[]'::json)
              FROM (
                SELECT DISTINCT a2.id, a2.name, a2.image_url
                FROM album_artists aa2
                JOIN artists a2 ON aa2.artist_id = a2.id
                WHERE aa2.album_id = ap.album_id
              ) artist_data
            ) as artists

          FROM album_plays ap
          JOIN album_counts ac ON ap.album_id = ac.album_id

          -- Join to get primary artist (first alphabetically)
          LEFT JOIN LATERAL (
            SELECT a.id, a.name, a.image_url
            FROM album_artists aa
            JOIN artists a ON aa.artist_id = a.id
            WHERE aa.album_id = ap.album_id
            ORDER BY a.name
            LIMIT 1
          ) primary_artist ON true

          WHERE ap.play_number = $2
        )
        SELECT *
        FROM milestone_albums
        ORDER BY days_to_milestone ASC
        LIMIT 1;
      `, [milestone, milestone]);

      results[milestone] = result.rows[0] || null;
    }

    logger.info(`Retrieved album milestones for ${milestones.length} thresholds`);
    return results;

  } catch (error) {
    logger.error(`Error getting album milestones: ${error.message}`);
    throw error;
  }
}

// Artist milestones: 100, 500, 1000, 2000, 5000 plays
export async function getQuickestArtistMilestones() {
  const pool = getPool();
  const milestones = [100, 500, 1000, 2000, 5000];

  try {
    const results = {};

    for (const milestone of milestones) {
      logger.info(`Getting quickest to ${milestone} plays for artists`);

      const result = await pool.query(`
        WITH artist_counts AS (
          SELECT
            ar.id as artist_id,
            ar.name as artist,
            COUNT(p.id) as total_plays
          FROM artists ar
          JOIN track_artists ta ON ar.id = ta.artist_id
          JOIN tracks t ON ta.track_id = t.id
          JOIN plays p ON t.id = p.track_id
          WHERE p.played_at IS NOT NULL
          GROUP BY ar.id, ar.name
          HAVING COUNT(p.id) >= $1
        ),
        artist_plays AS (
          SELECT
            ac.artist_id,
            ac.artist,
            ar.image_url as artist_image,
            p.played_at,
            MIN(p.played_at) OVER (PARTITION BY ac.artist_id) as first_play,
            ROW_NUMBER() OVER (
              PARTITION BY ac.artist_id
              ORDER BY p.played_at
            ) as play_number
          FROM artist_counts ac
          JOIN artists ar ON ac.artist_id = ar.id
          JOIN track_artists ta ON ac.artist_id = ta.artist_id
          JOIN tracks t ON ta.track_id = t.id
          JOIN plays p ON t.id = p.track_id
          WHERE p.played_at IS NOT NULL
        ),
        milestone_artists AS (
          SELECT
            ap.artist_id,
            ap.artist,
            ap.artist_image,
            ap.first_play,
            ap.played_at as milestone_reached,
            (EXTRACT(EPOCH FROM (ap.played_at - ap.first_play)) / 86400)::NUMERIC(10,2) as days_to_milestone,
            ac.total_plays
          FROM artist_plays ap
          JOIN artist_counts ac ON ap.artist_id = ac.artist_id
          WHERE ap.play_number = $1
        )
        SELECT *
        FROM milestone_artists
        ORDER BY days_to_milestone ASC
        LIMIT 1;
      `, [milestone]);

      results[milestone] = result.rows[0] || null;
    }

    logger.info(`Retrieved artist milestones for ${milestones.length} thresholds`);
    return results;

  } catch (error) {
    logger.error(`Error getting artist milestones: ${error.message}`);
    throw error;
  }
}

// Get all milestones in one call
export async function getAllMilestones() {
  try {
    logger.info('Getting all milestone achievements');

    const [trackMilestones, albumMilestones, artistMilestones] = await Promise.all([
      getQuickestTrackMilestones(),
      getQuickestAlbumMilestones(),
      getQuickestArtistMilestones()
    ]);

    return {
      tracks: trackMilestones,
      albums: albumMilestones,
      artists: artistMilestones
    };

  } catch (error) {
    logger.error(`Error getting all milestones: ${error.message}`);
    throw error;
  }
}