import { getPool } from './connection.js';
import logger from '../utils/logger.js';

const pool = () => getPool();

// Get daily play counts across all artists for the past N days
export async function getDailyPlaysAll(days) {
  logger.info(`getDailyPlaysAll called with days=${days}`);
  
  const query = `
    SELECT 
      (DATE(played_at + INTERVAL '1 hour') + INTERVAL '1 day')::date as day,
      COUNT(*) as count
    FROM plays 
    WHERE (DATE(played_at + INTERVAL '1 hour') + INTERVAL '1 day')::date >= 
          (DATE(NOW()) + INTERVAL '1 day')::date - INTERVAL '${days - 1} days'
    GROUP BY (DATE(played_at + INTERVAL '1 hour') + INTERVAL '1 day')::date
    ORDER BY day ASC
  `;
  
  try {
    const result = await pool().query(query);
    const plays = result.rows.map(row => ({
      day: row.day.toISOString().split('T')[0],
      count: parseInt(row.count)
    }));
    
    logger.info(`getDailyPlaysAll returned ${plays.length} daily records`);
    return plays;
  } catch (err) {
    logger.error(`getDailyPlaysAll DB error: ${err}`);
    throw err;
  }
}

// Get unique counts and statistics
export async function getUniqueCounts(callback) {
  logger.info('getUniqueCounts called');
  
  try {
    const result = await pool().query(`
      SELECT 
        (SELECT COUNT(*) FROM plays) AS playCount,
        (SELECT COUNT(DISTINCT track_id) FROM plays) AS uniqueTracks,
        (SELECT COUNT(DISTINCT artist_id) FROM plays 
         JOIN track_artists ta ON plays.track_id = ta.track_id) AS uniqueArtists,
        (SELECT COUNT(DISTINCT album_id) FROM plays 
         JOIN track_albums tal ON plays.track_id = tal.track_id 
         WHERE album_id IS NOT NULL) AS uniqueAlbums,
        (SELECT SUM(t.duration_ms) FROM plays p 
         JOIN tracks t ON p.track_id = t.id 
         WHERE t.duration_ms IS NOT NULL) AS totalListeningTime,
        (SELECT COUNT(*) FROM plays p 
         JOIN tracks t ON p.track_id = t.id 
         WHERE t.duration_ms IS NULL) AS playsWithoutDuration
    `);
    
    if (result.rows.length === 0) {
      logger.warn('No data found in getUniqueCounts');
      callback(null, {
        playCount: 0, uniqueTrackCount: 0, uniqueArtistCount: 0, uniqueAlbumCount: 0,
        totalListeningTimeMs: 0, playsWithoutDuration: 0, repeatFactor: 0, diversityScore: 0
      });
      return;
    }
    
    const row = result.rows[0];
    const playCount = parseInt(row.playcount);
    const uniqueTracks = parseInt(row.uniquetracks);
    const uniqueArtists = parseInt(row.uniqueartists);
    const uniqueAlbums = parseInt(row.uniquealbums);
    const totalListeningTime = parseInt(row.totallisteningtime) || 0;
    const playsWithoutDuration = parseInt(row.playswithoutduration) || 0;
    
    // Calculate repeat factor (higher = more repeated listening)
    const repeatFactor = uniqueTracks > 0 ? (playCount / uniqueTracks).toFixed(1) : 0;
    
    // Calculate diversity score (0-100, higher = more diverse)  
    const maxPossibleScore = Math.min(playCount, uniqueTracks * 10); // Assuming max 10 plays per track for "perfect" diversity
    const diversityScore = maxPossibleScore > 0 ? Math.min(100, ((uniqueTracks / playCount) * 100)).toFixed(1) : 0;
    
    const counts = {
      playCount,
      uniqueTrackCount: uniqueTracks,
      uniqueArtistCount: uniqueArtists,
      uniqueAlbumCount: uniqueAlbums,
      totalListeningTimeMs: totalListeningTime,
      playsWithoutDuration,
      repeatFactor: parseFloat(repeatFactor),
      diversityScore: parseFloat(diversityScore)
    };
    
    
    logger.info('getUniqueCounts returned counts with listening time, repeat factor, and diversity score');
    callback(null, counts);
    
  } catch (err) {
    logger.error(`getUniqueCounts DB error: ${err}`);
    callback(err);
  }
}