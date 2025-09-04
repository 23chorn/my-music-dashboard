import { getPool } from './connection.js';
import { formatTimestampForDB } from '../utils/timezone.js';
import logger from '../utils/logger.js';

const pool = () => getPool();

// Get the most recent timestamp from plays table
export async function getLastTimestamp(callback) {
  logger.info('getLastTimestamp called');
  try {
    const result = await pool().query(`SELECT MAX(played_at) AS lastTimestamp FROM plays`);
    const lastTimestamp = result.rows[0]?.lasttimestamp 
      ? Math.floor(new Date(result.rows[0].lasttimestamp).getTime() / 1000) 
      : null;
    logger.info(`getLastTimestamp returned: ${lastTimestamp}`);
    callback(null, lastTimestamp);
  } catch (err) {
    logger.error(`getLastTimestamp DB error: ${err}`);
    callback(err);
  }
}

// Add plays with deduplication
export async function addPlaysDeduped(plays, callback) {
  logger.info(`addPlaysDeduped called with ${plays.length} plays`);
  const client = await pool().connect();
  
  try {
    await client.query('BEGIN');
    let inserted = 0;

    if (plays.length === 0) {
      logger.info('No plays to insert.');
      await client.query('COMMIT');
      return callback(null, 0);
    }

    for (const play of plays) {
      try {
        // Find or create artist
        let artistResult = await client.query(
          `SELECT id FROM artists WHERE name = $1`,
          [play.artist]
        );
        
        let artistId;
        if (artistResult.rows.length === 0) {
          const insertArtist = await client.query(
            `INSERT INTO artists (name) VALUES ($1) RETURNING id`,
            [play.artist]
          );
          artistId = insertArtist.rows[0].id;
        } else {
          artistId = artistResult.rows[0].id;
        }

        let albumId = null;
        if (play.album) {
          // Find or create album
          let albumResult = await client.query(
            `SELECT id FROM albums WHERE name = $1`,
            [play.album]
          );
          
          if (albumResult.rows.length === 0) {
            const insertAlbum = await client.query(
              `INSERT INTO albums (name) VALUES ($1) RETURNING id`,
              [play.album]
            );
            albumId = insertAlbum.rows[0].id;
          } else {
            albumId = albumResult.rows[0].id;
          }
        }

        // Find or create track
        let trackResult = await client.query(
          `SELECT id FROM tracks WHERE name = $1`,
          [play.track]
        );
        
        let trackId;
        if (trackResult.rows.length === 0) {
          const insertTrack = await client.query(
            `INSERT INTO tracks (name, duration_ms) VALUES ($1, $2) RETURNING id`,
            [play.track, play.duration_ms || null]
          );
          trackId = insertTrack.rows[0].id;
        } else {
          trackId = trackResult.rows[0].id;
        }

        // Link track to artist
        await client.query(
          `INSERT INTO track_artists (track_id, artist_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [trackId, artistId]
        );

        // Link track to album if album exists
        if (albumId) {
          await client.query(
            `INSERT INTO track_albums (track_id, album_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [trackId, albumId]
          );
        }

        // Check if play already exists
        const formattedTimestamp = formatTimestampForDB(play.played_at);
        const existingPlay = await client.query(
          `SELECT id FROM plays WHERE track_id = $1 AND played_at = $2`,
          [trackId, formattedTimestamp]
        );

        if (existingPlay.rows.length === 0) {
          await client.query(
            `INSERT INTO plays (track_id, played_at) VALUES ($1, $2)`,
            [trackId, formattedTimestamp]
          );
          inserted++;
        }

      } catch (playErr) {
        logger.error(`Error processing play: ${playErr.message}`);
        continue;
      }
    }

    await client.query('COMMIT');
    logger.info(`addPlaysDeduped successfully inserted ${inserted} new plays out of ${plays.length} total`);
    callback(null, inserted);

  } catch (err) {
    await client.query('ROLLBACK');
    logger.error(`addPlaysDeduped transaction error: ${err.message}`);
    callback(err);
  } finally {
    client.release();
  }
}

// Get recent tracks
export async function getRecentTracks(limit, callback) {
  logger.info(`getRecentTracks called with limit=${limit}`);
  
  const query = `
    WITH ranked_albums AS (
      SELECT 
        t.id as track_id,
        tal.album_id,
        al.name as album_name,
        al.release_date,
        ROW_NUMBER() OVER (
          PARTITION BY t.id 
          ORDER BY 
            al.release_date DESC NULLS LAST,
            al.id DESC  -- Use higher ID as tiebreaker (more recent insert)
        ) as album_rank
      FROM tracks t
      LEFT JOIN track_albums tal ON t.id = tal.track_id
      LEFT JOIN albums al ON tal.album_id = al.id
    )
    SELECT 
      t.id as track_id,
      t.name as track_name,
      (
        SELECT STRING_AGG(name, ', ' ORDER BY is_primary DESC, name)
        FROM (
          SELECT DISTINCT a2.name, ta2.is_primary
          FROM track_artists ta2
          JOIN artists a2 ON ta2.artist_id = a2.id
          WHERE ta2.track_id = t.id
        ) artist_data
      ) as artist_names,
      ra.album_name,
      p.played_at
    FROM tracks t
    JOIN track_artists ta ON t.id = ta.track_id
    JOIN artists a ON ta.artist_id = a.id
    JOIN plays p ON t.id = p.track_id
    LEFT JOIN ranked_albums ra ON t.id = ra.track_id AND ra.album_rank = 1
    GROUP BY t.id, t.name, ra.album_name, p.played_at, p.id
    ORDER BY p.played_at DESC
    LIMIT $1
  `;
  
  try {
    const result = await pool().query(query, [limit]);
    const tracks = result.rows.map(row => ({
      id: parseInt(row.track_id),
      track: row.track_name,
      artist: row.artist_names,
      album: row.album_name,
      timestamp: Math.floor(new Date(row.played_at).getTime() / 1000)
    }));
    
    logger.info(`getRecentTracks returned ${tracks.length} tracks`);
    callback(null, tracks);
  } catch (err) {
    logger.error(`getRecentTracks DB error: ${err}`);
    callback(err);
  }
}