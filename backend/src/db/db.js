import pkg from 'pg';
const { Pool } = pkg;
import { getPeriodTimestamp } from '../utils/period.js';
import { formatTimestampForDB } from '../utils/timezone.js';
import logger from '../utils/logger.js';

// Create PostgreSQL connection pool (will be initialized later)
let pool;

export function initializeDatabase() {
  logger.info(`Initializing PostgreSQL database connection`);
  
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  // Add error handler to prevent crashes
  pool.on('error', (err) => {
    logger.error(`PostgreSQL pool error (handled): ${err.message}`);
  });

  // Test the connection
  pool.connect((err, client, release) => {
    if (err) {
      logger.error(`Database connection error: ${err.message}`);
      console.error('Database connection failed:', err);
    } else {
      logger.info(`Connected to PostgreSQL database`);
      release();
    }
  });
}

// Export the pool for use by other database modules
export function getPool() {
  if (!pool) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return pool;
}

export async function getLastTimestamp(callback) {
  logger.info('getLastTimestamp called');
  try {
    const result = await pool.query(`SELECT MAX(played_at) AS lastTimestamp FROM plays`);
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

export async function addPlaysDeduped(plays, callback) {
  logger.info(`addPlaysDeduped called with ${plays.length} plays`);
  const client = await pool.connect();
  
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
            
            // Link album to artist
            await client.query(
              `INSERT INTO album_artists (album_id, artist_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
              [albumId, artistId]
            );
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
            `INSERT INTO tracks (name) VALUES ($1) RETURNING id`,
            [play.track]
          );
          trackId = insertTrack.rows[0].id;
          
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
        } else {
          trackId = trackResult.rows[0].id;
        }

        // Check if play already exists
        const playedAtDate = formatTimestampForDB(play.timestamp);
        const playExists = await client.query(
          `SELECT id FROM plays WHERE track_id = $1 AND played_at = $2`,
          [trackId, playedAtDate]
        );

        if (playExists.rows.length === 0) {
          await client.query(
            `INSERT INTO plays (track_id, played_at) VALUES ($1, $2)`,
            [trackId, playedAtDate]
          );
          inserted++;
        }
      } catch (playError) {
        logger.error(`Error inserting play: ${playError}`);
      }
    }

    await client.query('COMMIT');
    logger.info(`Successfully inserted ${inserted} plays`);
    callback(null, inserted);
    
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error(`addPlaysDeduped error: ${err}`);
    callback(err);
  } finally {
    client.release();
  }
}

export async function getUniqueCounts(callback) {
  logger.info('getUniqueCounts called');
  try {
    const [artistCount, trackCount, albumCount, playCount, listeningTime, repeatFactor, diversityScore] = await Promise.all([
      pool.query(`SELECT COUNT(*) AS uniqueArtistCount FROM artists`),
      pool.query(`SELECT COUNT(*) AS uniqueTrackCount FROM tracks`),
      pool.query(`SELECT COUNT(*) AS uniqueAlbumCount FROM albums`),
      pool.query(`SELECT COUNT(*) AS playCount FROM plays`),
      pool.query(`
        SELECT 
          COALESCE(SUM(t.duration_ms), 0) AS totalDurationMs,
          COUNT(CASE WHEN t.duration_ms IS NULL THEN 1 END) AS playsWithoutDuration,
          COUNT(*) AS totalPlays
        FROM plays p
        JOIN tracks t ON p.track_id = t.id
      `),
      pool.query(`
        SELECT 
          ROUND(COUNT(*)::numeric / COUNT(DISTINCT p.track_id)::numeric, 2) AS repeatFactor
        FROM plays p
      `),
      pool.query(`
        WITH artist_plays AS (
          SELECT 
            a.id,
            COUNT(*) AS plays,
            COUNT(*)::float / (SELECT COUNT(*) FROM plays)::float AS proportion
          FROM plays p
          JOIN tracks t ON p.track_id = t.id
          JOIN track_artists ta ON t.id = ta.track_id
          JOIN artists a ON ta.artist_id = a.id
          GROUP BY a.id
        ),
        diversity_calc AS (
          SELECT 
            1 - SUM(proportion * proportion) AS diversity_index
          FROM artist_plays
        )
        SELECT ROUND((diversity_index * 100)::numeric, 1) AS diversityScore
        FROM diversity_calc
      `)
    ]);

    logger.info('getUniqueCounts returned counts with listening time, repeat factor, and diversity score');
    callback(null, {
      uniqueArtistCount: parseInt(artistCount.rows[0].uniqueartistcount),
      uniqueTrackCount: parseInt(trackCount.rows[0].uniquetrackcount),
      uniqueAlbumCount: parseInt(albumCount.rows[0].uniquealbumcount),
      playCount: parseInt(playCount.rows[0].playcount),
      totalListeningTimeMs: parseInt(listeningTime.rows[0].totaldurationms) || 0,
      playsWithoutDuration: parseInt(listeningTime.rows[0].playswithoutduration) || 0,
      totalPlays: parseInt(listeningTime.rows[0].totalplays) || 0,
      repeatFactor: parseFloat(repeatFactor.rows[0].repeatfactor) || 0,
      diversityScore: parseFloat(diversityScore.rows[0].diversityscore) || 0
    });
  } catch (err) {
    logger.error(`getUniqueCounts DB error: ${err}`);
    callback(err);
  }
}

export async function getTopArtists(limit, period = "overall", callback) {
  logger.info(`getTopArtists called with limit=${limit}, period=${period}`);
  const fromTimestamp = getPeriodTimestamp(period);
  
  const query = `
    SELECT a.id, a.name, a.image_url, COUNT(*) AS playcount
    FROM plays p
    JOIN tracks t ON p.track_id = t.id
    JOIN track_artists ta ON t.id = ta.track_id
    JOIN artists a ON ta.artist_id = a.id
    WHERE p.played_at >= $1
    GROUP BY a.id, a.name, a.image_url
    ORDER BY playcount DESC
    LIMIT $2
  `;
  
  try {
    const result = await pool.query(query, [new Date(fromTimestamp * 1000), limit]);
    logger.info(`getTopArtists returned ${result.rows.length} artists`);
    callback(null, result.rows.map(row => ({
      artistId: row.id,
      artist: row.name,
      image: row.image_url,
      playcount: parseInt(row.playcount)
    })));
  } catch (err) {
    logger.error(`getTopArtists DB error: ${err}`);
    callback(err);
  }
}

export async function getTopTracks({ limit, period = "overall", artistId = null, albumId = null }, callback) {
  logger.info(`getTopTracks called with limit=${limit}, period=${period}, artistId=${artistId}, albumId=${albumId}`);
  const fromTimestamp = getPeriodTimestamp(period);
  
  let query = `
    SELECT t.id, t.name as track_name, a.name as artist_name, 
           al.id as album_id, al.name as album_name, al.image_url as album_image,
           COUNT(*) AS playcount
    FROM plays p
    JOIN tracks t ON p.track_id = t.id
    JOIN track_artists ta ON t.id = ta.track_id
    JOIN artists a ON ta.artist_id = a.id
    LEFT JOIN track_albums tal ON t.id = tal.track_id
    LEFT JOIN albums al ON tal.album_id = al.id
    WHERE p.played_at >= $1
  `;
  
  const params = [new Date(fromTimestamp * 1000)];
  let paramCount = 1;
  
  if (artistId) {
    paramCount++;
    query += ` AND a.id = $${paramCount}`;
    params.push(artistId);
  }
  
  if (albumId) {
    paramCount++;
    query += ` AND EXISTS (
      SELECT 1 FROM track_albums tal 
      WHERE tal.track_id = t.id AND tal.album_id = $${paramCount}
    )`;
    params.push(albumId);
  }
  
  query += `
    GROUP BY t.id, t.name, a.name, al.id, al.name, al.image_url
    ORDER BY playcount DESC
    LIMIT $${paramCount + 1}
  `;
  params.push(limit);
  
  try {
    const result = await pool.query(query, params);
    logger.info(`getTopTracks returned ${result.rows.length} tracks`);
    callback(null, result.rows.map(row => ({
      id: row.id,
      track: row.track_name,
      artist: row.artist_name,
      albumId: row.album_id,
      album: row.album_name,
      albumImage: row.album_image,
      playcount: parseInt(row.playcount)
    })));
  } catch (err) {
    logger.error(`getTopTracks DB error: ${err}`);
    callback(err);
  }
}

export async function getTopAlbums({ limit, period = "overall", artistId = null }, callback) {
  logger.info(`getTopAlbums called with limit=${limit}, period=${period}, artistId=${artistId}`);
  const fromTimestamp = getPeriodTimestamp(period);
  
  let query = `
    SELECT al.id, al.name as album_name, a.name as artist_name, al.image_url, COUNT(*) AS playcount
    FROM plays p
    JOIN tracks t ON p.track_id = t.id
    JOIN track_albums ta ON t.id = ta.track_id
    JOIN albums al ON ta.album_id = al.id
    JOIN track_artists tar ON t.id = tar.track_id
    JOIN artists a ON tar.artist_id = a.id
    WHERE p.played_at >= $1
  `;
  
  const params = [new Date(fromTimestamp * 1000)];
  let paramCount = 1;
  
  if (artistId) {
    paramCount++;
    query += ` AND a.id = $${paramCount}`;
    params.push(artistId);
  }
  
  query += `
    GROUP BY al.id, al.name, a.name, al.image_url
    ORDER BY playcount DESC
    LIMIT $${paramCount + 1}
  `;
  params.push(limit);
  
  try {
    const result = await pool.query(query, params);
    logger.info(`getTopAlbums returned ${result.rows.length} albums`);
    callback(null, result.rows.map(row => ({
      albumId: row.id,
      album: row.album_name,
      artist: row.artist_name,
      image: row.image_url,
      playcount: parseInt(row.playcount)
    })));
  } catch (err) {
    logger.error(`getTopAlbums DB error: ${err}`);
    callback(err);
  }
}

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
      STRING_AGG(DISTINCT a.name, ', ' ORDER BY a.name) as artist_names,
      ra.album_name,
      p.played_at
    FROM plays p
    JOIN tracks t ON p.track_id = t.id
    JOIN track_artists ta ON t.id = ta.track_id
    JOIN artists a ON ta.artist_id = a.id
    LEFT JOIN ranked_albums ra ON t.id = ra.track_id AND ra.album_rank = 1
    GROUP BY t.id, t.name, ra.album_name, p.played_at, p.id
    ORDER BY p.played_at DESC
    LIMIT $1
  `;
  
  try {
    const result = await pool.query(query, [limit]);
    logger.info(`getRecentTracks returned ${result.rows.length} tracks`);
    callback(null, result.rows.map(row => ({
      id: row.track_id,
      track: row.track_name,
      artist: row.artist_names,
      album: row.album_name,
      timestamp: Math.floor(new Date(row.played_at).getTime() / 1000)
    })));
  } catch (err) {
    logger.error(`getRecentTracks DB error: ${err}`);
    callback(err);
  }
}

export async function getDailyPlaysAll(days) {
  logger.info(`getDailyPlaysAll called with days=${days}`);
  
  const query = `
    SELECT 
      to_char(played_at AT TIME ZONE 'Europe/London', 'YYYY-MM-DD') AS day, 
      COUNT(*) AS count
    FROM plays
    WHERE played_at AT TIME ZONE 'Europe/London' >= (NOW() AT TIME ZONE 'Europe/London') - INTERVAL '${days} days'
    GROUP BY to_char(played_at AT TIME ZONE 'Europe/London', 'YYYY-MM-DD')
    ORDER BY day ASC
  `;
  
  try {
    const result = await pool.query(query);
    logger.info(`getDailyPlaysAll returned ${result.rows.length} daily records`);
    return result.rows.map(row => ({
      day: row.day,
      count: parseInt(row.count)
    }));
  } catch (err) {
    logger.error(`getDailyPlaysAll DB error: ${err}`);
    throw err;
  }
}

// Additional functions for the new schema features

export async function getArtistById(artistId, callback) {
  logger.info(`getArtistById called with artistId=${artistId}`);
  
  try {
    const result = await pool.query(
      `SELECT id, name, image_url FROM artists WHERE id = $1`,
      [artistId]
    );
    
    if (result.rows.length === 0) {
      return callback(null, null);
    }
    
    const artist = result.rows[0];
    callback(null, {
      id: artist.id,
      name: artist.name,
      image_url: artist.image_url
    });
  } catch (err) {
    logger.error(`getArtistById DB error: ${err}`);
    callback(err);
  }
}

export async function getAlbumById(albumId, callback) {
  logger.info(`getAlbumById called with albumId=${albumId}`);
  
  try {
    const result = await pool.query(
      `SELECT al.id, al.name, al.image_url, a.name as artist_name
       FROM albums al
       JOIN album_artists aa ON al.id = aa.album_id
       JOIN artists a ON aa.artist_id = a.id
       WHERE al.id = $1`,
      [albumId]
    );
    
    if (result.rows.length === 0) {
      return callback(null, null);
    }
    
    const album = result.rows[0];
    callback(null, {
      id: album.id,
      name: album.name,
      artist: album.artist_name,
      image_url: album.image_url
    });
  } catch (err) {
    logger.error(`getAlbumById DB error: ${err}`);
    callback(err);
  }
}

export async function searchAll(query, callback) {
  logger.info(`searchAll called with query: ${query}`);
  const likeQuery = `%${query}%`;
  
  try {
    const [artistsResult, tracksResult, albumsResult] = await Promise.all([
      pool.query(
        `SELECT a.id, a.name, a.image_url, COUNT(p.id) as play_count
         FROM artists a
         LEFT JOIN track_artists ta ON a.id = ta.artist_id
         LEFT JOIN plays p ON ta.track_id = p.track_id
         WHERE a.name ILIKE $1
         GROUP BY a.id, a.name, a.image_url
         ORDER BY play_count DESC, a.name
         LIMIT 10`,
        [likeQuery]
      ),
      pool.query(
        `SELECT t.id, t.name as track_name, a.name as artist_name, COUNT(p.id) as play_count
         FROM tracks t
         JOIN track_artists ta ON t.id = ta.track_id
         JOIN artists a ON ta.artist_id = a.id
         LEFT JOIN plays p ON t.id = p.track_id
         WHERE t.name ILIKE $1
         GROUP BY t.id, t.name, a.name
         ORDER BY play_count DESC, t.name
         LIMIT 10`,
        [likeQuery]
      ),
      pool.query(
        `SELECT al.id, al.name as album_name, a.name as artist_name, al.image_url,
                CASE 
                  WHEN a.name ILIKE $1 THEN 1 
                  ELSE 2 
                END as priority,
                COUNT(p.id) as play_count
         FROM albums al
         JOIN album_artists aa ON al.id = aa.album_id
         JOIN artists a ON aa.artist_id = a.id
         LEFT JOIN track_albums ta ON al.id = ta.album_id
         LEFT JOIN plays p ON ta.track_id = p.track_id
         WHERE a.name ILIKE $1 OR al.name ILIKE $1
         GROUP BY al.id, al.name, a.name, al.image_url, priority
         ORDER BY priority, play_count DESC, a.name, al.name
         LIMIT 10`,
        [likeQuery]
      )
    ]);

    const artists = artistsResult.rows.map(row => ({
      id: row.id,
      name: row.name,
      image_url: row.image_url
    }));
    
    const tracks = tracksResult.rows.map(row => ({
      id: row.id,
      name: row.track_name,
      artist_name: row.artist_name
    }));
    
    const albums = albumsResult.rows.map(row => ({
      id: row.id,
      name: row.album_name,
      artist_name: row.artist_name,
      image_url: row.image_url
    }));

    logger.info(`searchAll returned ${artists.length} artists, ${tracks.length} tracks, ${albums.length} albums`);
    callback(null, { artists, tracks, albums });
  } catch (err) {
    logger.error(`searchAll DB error: ${err}`);
    callback(err);
  }
}