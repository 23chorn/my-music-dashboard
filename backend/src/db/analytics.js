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

    // Get session analysis data
    const sessionResult = await pool().query(`
      WITH session_analysis AS (
        SELECT 
          p.played_at,
          t.duration_ms,
          LAG(p.played_at) OVER (ORDER BY p.played_at) AS prev_played_at,
          LAG(t.duration_ms) OVER (ORDER BY p.played_at) AS prev_duration_ms
        FROM plays p
        JOIN tracks t ON p.track_id = t.id
        WHERE t.duration_ms IS NOT NULL
        ORDER BY p.played_at
      ),
      sessions AS (
        SELECT 
          played_at,
          duration_ms,
          CASE 
            WHEN prev_played_at IS NULL OR 
                 EXTRACT(EPOCH FROM (played_at - prev_played_at)) * 1000 > (prev_duration_ms + 300000) -- 5 min gap
            THEN 1 
            ELSE 0 
          END AS is_new_session
        FROM session_analysis
      ),
      session_groups AS (
        SELECT 
          *,
          SUM(is_new_session) OVER (ORDER BY played_at ROWS UNBOUNDED PRECEDING) AS session_id
        FROM sessions
      ),
      session_stats AS (
        SELECT 
          session_id,
          COUNT(*) AS tracks_in_session,
          SUM(duration_ms) AS session_duration_ms,
          DATE(MIN(played_at)) AS session_date
        FROM session_groups
        GROUP BY session_id
      )
      SELECT 
        COUNT(*) AS total_sessions,
        AVG(session_duration_ms) AS avg_session_duration_ms,
        MAX(session_duration_ms) AS longest_session_ms,
        AVG(tracks_in_session) AS avg_tracks_per_session,
        COUNT(*) / NULLIF(COUNT(DISTINCT session_date), 0) AS avg_sessions_per_day
      FROM session_stats
    `);

    // Get peak listening hours and days analysis
    const timeAnalysisResult = await pool().query(`
      WITH hourly_plays AS (
        SELECT 
          EXTRACT(HOUR FROM played_at) AS hour,
          COUNT(*) AS play_count
        FROM plays
        GROUP BY EXTRACT(HOUR FROM played_at)
        ORDER BY play_count DESC
        LIMIT 1
      ),
      daily_plays AS (
        SELECT 
          EXTRACT(DOW FROM played_at) AS dow,
          COUNT(*) AS play_count
        FROM plays
        GROUP BY EXTRACT(DOW FROM played_at)
        ORDER BY play_count DESC
        LIMIT 1
      )
      SELECT 
        (SELECT hour FROM hourly_plays) AS peak_hour,
        (SELECT play_count FROM hourly_plays) AS peak_hour_plays,
        (SELECT dow FROM daily_plays) AS peak_dow,
        (SELECT play_count FROM daily_plays) AS peak_dow_plays
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

    // Extract session metrics
    const sessionData = sessionResult.rows[0] || {};
    const totalSessions = parseInt(sessionData.total_sessions) || 0;
    const avgSessionDuration = parseFloat(sessionData.avg_session_duration_ms) || 0;
    const longestSession = parseFloat(sessionData.longest_session_ms) || 0;
    const avgSessionsPerDay = parseFloat(sessionData.avg_sessions_per_day) || 0;

    // Extract time analysis metrics
    const timeData = timeAnalysisResult.rows[0] || {};
    const peakHour = parseInt(timeData.peak_hour) || 0;
    const peakDow = parseInt(timeData.peak_dow) || 0;

    // Helper functions for formatting
    const formatHour = (hour) => {
      const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      const ampm = hour < 12 ? 'AM' : 'PM';
      return `${hour12}${ampm}`;
    };

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const peakDay = dayNames[peakDow] || 'Unknown';
    
    const behaviorData = {
      repeatFactor: parseFloat(repeatFactor),
      diversityScore: parseFloat(diversityScore),
      totalListeningTimeMs: totalListeningTime,
      tracksWithoutDuration: tracksWithoutDuration,
      averageTrackDurationMs: Math.round(averageTrackDuration),
      
      // Session metrics
      totalSessions: totalSessions,
      averageSessionDurationMs: Math.round(avgSessionDuration),
      longestSessionDurationMs: Math.round(longestSession),
      averageSessionsPerDay: Math.round(avgSessionsPerDay * 10) / 10,
      
      // Time pattern metrics
      peakListeningHour: peakHour,
      peakListeningHourFormatted: formatHour(peakHour),
      mostActiveDay: peakDay,
      mostActiveDayIndex: peakDow
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
         WHERE t.duration_ms IS NOT NULL) AS averageTrackDuration,
        (SELECT COUNT(DISTINCT (DATE(played_at + INTERVAL '1 hour') + INTERVAL '1 day')::date) 
         FROM plays) AS activeDays
    `);
    
    if (result.rows.length === 0) {
      logger.warn('No data found in getCalculatedMetrics');
      callback(null, {
        tracksPerArtist: 0,
        playsPerArtist: 0,
        tracksPerAlbum: 0,
        hoursPerDay: 0,
        discoveryFrequency: 0,
        replayRate: 0
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
    const activeDays = parseInt(row.activedays) || 0;
    
    // Calculate derived statistics
    const totalHours = totalListeningTime / (1000 * 60 * 60);
    
    const calculatedMetrics = {
      tracksPerArtist: uniqueArtists > 0 ? parseFloat((uniqueTracks / uniqueArtists).toFixed(1)) : 0,
      playsPerArtist: uniqueArtists > 0 ? parseFloat((playCount / uniqueArtists).toFixed(1)) : 0,
      tracksPerAlbum: uniqueAlbums > 0 ? parseFloat((uniqueTracks / uniqueAlbums).toFixed(1)) : 0,
      hoursPerDay: activeDays > 0 ? parseFloat((totalHours / activeDays).toFixed(1)) : 0,
      discoveryFrequency: activeDays > 0 ? parseFloat((uniqueTracks / activeDays).toFixed(1)) : 0,
      replayRate: uniqueTracks > 0 ? parseFloat((((playCount - uniqueTracks) / playCount) * 100).toFixed(1)) : 0
    };
    
    logger.info('getCalculatedMetrics returned calculated data');
    callback(null, calculatedMetrics);
    
  } catch (err) {
    logger.error(`getCalculatedMetrics DB error: ${err}`);
    callback(err);
  }
}

// Get discovery freshness metrics (time since last new track/artist/album)
export async function getDiscoveryFreshness(callback) {
  logger.info('getDiscoveryFreshness called');
  
  try {
    // Get time since last new track discovery
    const trackResult = await pool().query(`
      WITH first_track_plays AS (
        SELECT track_id, MIN(played_at) as first_played_at
        FROM plays
        GROUP BY track_id
      )
      SELECT EXTRACT(EPOCH FROM (NOW() - first_played_at)) / 3600 AS hours_since_new_track
      FROM first_track_plays
      ORDER BY first_played_at DESC
      LIMIT 1
    `);
    
    // Get time since last new artist discovery
    const artistResult = await pool().query(`
      WITH first_artist_plays AS (
        SELECT ta.artist_id, MIN(p.played_at) as first_played_at
        FROM plays p
        JOIN track_artists ta ON p.track_id = ta.track_id
        GROUP BY ta.artist_id
      )
      SELECT EXTRACT(EPOCH FROM (NOW() - first_played_at)) / 3600 AS hours_since_new_artist
      FROM first_artist_plays
      ORDER BY first_played_at DESC
      LIMIT 1
    `);
    
    // Get time since last new album discovery
    const albumResult = await pool().query(`
      WITH first_album_plays AS (
        SELECT tal.album_id, MIN(p.played_at) as first_played_at
        FROM plays p
        JOIN track_albums tal ON p.track_id = tal.track_id
        WHERE tal.album_id IS NOT NULL
        GROUP BY tal.album_id
      )
      SELECT EXTRACT(EPOCH FROM (NOW() - first_played_at)) / 3600 AS hours_since_new_album
      FROM first_album_plays
      ORDER BY first_played_at DESC
      LIMIT 1
    `);
    
    const discoveryData = {
      hoursSinceNewTrack: trackResult.rows.length > 0 && trackResult.rows[0].hours_since_new_track 
        ? parseFloat(trackResult.rows[0].hours_since_new_track) : null,
      hoursSinceNewArtist: artistResult.rows.length > 0 && artistResult.rows[0].hours_since_new_artist 
        ? parseFloat(artistResult.rows[0].hours_since_new_artist) : null,
      hoursSinceNewAlbum: albumResult.rows.length > 0 && albumResult.rows[0].hours_since_new_album 
        ? parseFloat(albumResult.rows[0].hours_since_new_album) : null
    };
    
    logger.info('getDiscoveryFreshness returned discovery freshness data');
    callback(null, discoveryData);
    
  } catch (err) {
    logger.error(`getDiscoveryFreshness DB error: ${err}`);
    callback(err);
  }
}