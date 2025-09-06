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
         WHERE album_id IS NOT NULL) AS uniqueAlbums
    `);
    
    if (result.rows.length === 0) {
      logger.warn('No data found in getUniqueCounts');
      callback(null, {
        playCount: 0, uniqueTrackCount: 0, uniqueArtistCount: 0, uniqueAlbumCount: 0
      });
      return;
    }
    
    const row = result.rows[0];
    const playCount = parseInt(row.playcount);
    const uniqueTracks = parseInt(row.uniquetracks);
    const uniqueArtists = parseInt(row.uniqueartists);
    const uniqueAlbums = parseInt(row.uniquealbums);
    
    const counts = {
      playCount,
      uniqueTrackCount: uniqueTracks,
      uniqueArtistCount: uniqueArtists,
      uniqueAlbumCount: uniqueAlbums
    };
    
    
    logger.info('getUniqueCounts returned basic counts');
    callback(null, counts);
    
  } catch (err) {
    logger.error(`getUniqueCounts DB error: ${err}`);
    callback(err);
  }
}

// Get behavior analysis data
export async function getBehaviorAnalysis(callback) {
  logger.info('getBehaviorAnalysis called');
  
  try {
    // First get basic counts
    const basicResult = await pool().query(`
      SELECT 
        (SELECT COUNT(*) FROM plays) AS playCount,
        (SELECT COUNT(DISTINCT track_id) FROM plays) AS uniqueTracks,
        (SELECT SUM(t.duration_ms) FROM plays p 
         JOIN tracks t ON p.track_id = t.id 
         WHERE t.duration_ms IS NOT NULL) AS totalListeningTime,
        (SELECT AVG(t.duration_ms) FROM tracks t 
         WHERE t.duration_ms IS NOT NULL) AS averageTrackDuration,
        (SELECT COUNT(DISTINCT t.id) FROM plays p 
         JOIN tracks t ON p.track_id = t.id 
         WHERE t.duration_ms IS NULL) AS tracksWithoutDuration
    `);
    
    // Get play distribution for Shannon Entropy calculation
    const entropyResult = await pool().query(`
      SELECT track_id, COUNT(*) as play_count
      FROM plays
      GROUP BY track_id
    `);
    
    if (basicResult.rows.length === 0) {
      logger.warn('No data found in getBehaviorAnalysis');
      callback(null, {
        repeatFactor: 0,
        diversityScore: 0,
        totalListeningTimeMs: 0,
        tracksWithoutDuration: 0,
        averageTrackDurationMs: 0
      });
      return;
    }
    
    const row = basicResult.rows[0];
    const playCount = parseInt(row.playcount);
    const uniqueTracks = parseInt(row.uniquetracks);
    const totalListeningTime = parseInt(row.totallisteningtime) || 0;
    const tracksWithoutDuration = parseInt(row.trackswithoutduration) || 0;
    const averageTrackDuration = parseFloat(row.averagetrackduration) || 0;
    
    // Calculate repeat factor (higher = more repeated listening)
    const repeatFactor = uniqueTracks > 0 ? (playCount / uniqueTracks).toFixed(1) : 0;
    
    // Calculate Shannon Entropy for diversity score
    // Shannon Entropy measures the unpredictability/diversity of music listening
    // Higher entropy = more diverse listening (plays spread evenly across tracks)
    // Lower entropy = less diverse listening (concentrated on fewer tracks)
    let shannonEntropy = 0;
    if (entropyResult.rows.length > 0 && playCount > 0) {
      for (const trackData of entropyResult.rows) {
        const trackPlays = parseInt(trackData.play_count);
        const probability = trackPlays / playCount;
        if (probability > 0) {
          shannonEntropy -= probability * Math.log2(probability);
        }
      }
    }
    
    // Normalize Shannon Entropy to 0-100 scale
    // Maximum entropy for N tracks is log2(N) (all tracks played equally)
    // Score: 0 = all plays on one track, 100 = perfectly distributed plays
    const maxEntropy = uniqueTracks > 1 ? Math.log2(uniqueTracks) : 1;
    const diversityScore = maxEntropy > 0 ? ((shannonEntropy / maxEntropy) * 100).toFixed(1) : 0;
    
    const behaviorData = {
      repeatFactor: parseFloat(repeatFactor),
      diversityScore: parseFloat(diversityScore),
      totalListeningTimeMs: totalListeningTime,
      tracksWithoutDuration: tracksWithoutDuration,
      averageTrackDurationMs: Math.round(averageTrackDuration)
    };
    
    logger.info(`getBehaviorAnalysis returned behavior data: diversity=${diversityScore}% (Shannon entropy=${shannonEntropy.toFixed(3)})`);
    callback(null, behaviorData);
    
  } catch (err) {
    logger.error(`getBehaviorAnalysis DB error: ${err}`);
    callback(err);
  }
}

// Get calculated metrics
export async function getCalculatedMetrics(callback) {
  logger.info('getCalculatedMetrics called');
  
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
        (SELECT AVG(t.duration_ms) FROM tracks t 
         WHERE t.duration_ms IS NOT NULL) AS averageTrackDuration
    `);
    
    if (result.rows.length === 0) {
      logger.warn('No data found in getCalculatedMetrics');
      callback(null, {
        tracksPerArtist: 0,
        playsPerArtist: 0,
        tracksPerAlbum: 0,
        hoursPerDay: 0,
        minutesPerPlay: 0,
        libraryCoverage: 0
      });
      return;
    }
    
    const row = result.rows[0];
    const playCount = parseInt(row.playcount);
    const uniqueTracks = parseInt(row.uniquetracks);
    const uniqueArtists = parseInt(row.uniqueartists);
    const uniqueAlbums = parseInt(row.uniquealbums);
    const totalListeningTime = parseInt(row.totallisteningtime) || 0;
    const averageTrackDuration = parseFloat(row.averagetrackduration) || 0;
    
    // Calculate derived statistics
    const totalHours = Math.round(totalListeningTime / (1000 * 60 * 60));
    const totalDays = Math.round(totalHours / 24 * 10) / 10;
    
    const calculatedMetrics = {
      tracksPerArtist: uniqueArtists > 0 ? parseFloat((uniqueTracks / uniqueArtists).toFixed(1)) : 0,
      playsPerArtist: uniqueArtists > 0 ? parseFloat((playCount / uniqueArtists).toFixed(1)) : 0,
      tracksPerAlbum: uniqueAlbums > 0 ? parseFloat((uniqueTracks / uniqueAlbums).toFixed(1)) : 0,
      hoursPerDay: totalDays > 0 ? parseFloat((totalHours / totalDays).toFixed(1)) : 0,
      minutesPerPlay: averageTrackDuration > 0 ? parseFloat((averageTrackDuration / 60000).toFixed(1)) : 0,
      libraryCoverage: uniqueTracks > 0 ? parseInt(((playCount / uniqueTracks) * 100).toFixed(0)) : 0
    };
    
    logger.info('getCalculatedMetrics returned calculated data');
    callback(null, calculatedMetrics);
    
  } catch (err) {
    logger.error(`getCalculatedMetrics DB error: ${err}`);
    callback(err);
  }
}