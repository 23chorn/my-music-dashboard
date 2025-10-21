import { getPool } from './connection.js';
import logger from '../utils/logger.js';

const pool = () => getPool();

/**
 * Generate a weekly listening summary from plays data
 */
export async function generateWeeklyListeningSummary(weekStart, weekEnd) {
  logger.info(`Generating weekly summary for ${weekStart} to ${weekEnd}`);

  try {
    // Get basic stats for the week
    const statsQuery = `
      SELECT
        COUNT(*) as total_plays,
        COUNT(DISTINCT p.track_id) as unique_tracks,
        COUNT(DISTINCT ta.artist_id) as unique_artists,
        COUNT(DISTINCT tal.album_id) as unique_albums,
        SUM(t.duration_ms) / 1000 / 60 as total_listening_minutes
      FROM plays p
      JOIN tracks t ON p.track_id = t.id
      LEFT JOIN track_artists ta ON p.track_id = ta.track_id
      LEFT JOIN track_albums tal ON p.track_id = tal.track_id
      WHERE DATE(p.played_at) >= $1 AND DATE(p.played_at) <= $2
    `;

    const statsResult = await pool().query(statsQuery, [weekStart, weekEnd]);
    const stats = statsResult.rows[0];

    // Get top artists for the week
    const topArtistsQuery = `
      SELECT
        a.name,
        a.image_url as image,
        COUNT(*) as plays
      FROM plays p
      JOIN track_artists ta ON p.track_id = ta.track_id
      JOIN artists a ON ta.artist_id = a.id
      WHERE DATE(p.played_at) >= $1 AND DATE(p.played_at) <= $2
      GROUP BY a.id, a.name, a.image_url
      ORDER BY plays DESC
      LIMIT 10
    `;

    const topArtistsResult = await pool().query(topArtistsQuery, [weekStart, weekEnd]);

    // Get top tracks for the week
    const topTracksQuery = `
      SELECT
        t.name,
        a.name as artist,
        al.name as album,
        COUNT(*) as plays
      FROM plays p
      JOIN tracks t ON p.track_id = t.id
      LEFT JOIN track_artists ta ON t.id = ta.track_id
      LEFT JOIN artists a ON ta.artist_id = a.id
      LEFT JOIN track_albums tal ON t.id = tal.track_id
      LEFT JOIN albums al ON tal.album_id = al.id
      WHERE DATE(p.played_at) >= $1 AND DATE(p.played_at) <= $2
      GROUP BY t.id, t.name, a.name, al.name
      ORDER BY plays DESC
      LIMIT 10
    `;

    const topTracksResult = await pool().query(topTracksQuery, [weekStart, weekEnd]);

    // Get top albums for the week
    const topAlbumsQuery = `
      SELECT
        al.name,
        a.name as artist,
        al.image_url as image,
        COUNT(*) as plays
      FROM plays p
      JOIN track_albums tal ON p.track_id = tal.track_id
      JOIN albums al ON tal.album_id = al.id
      LEFT JOIN album_artists aa ON al.id = aa.album_id
      LEFT JOIN artists a ON aa.artist_id = a.id
      WHERE DATE(p.played_at) >= $1 AND DATE(p.played_at) <= $2
      GROUP BY al.id, al.name, al.image_url, a.name
      ORDER BY plays DESC
      LIMIT 10
    `;

    const topAlbumsResult = await pool().query(topAlbumsQuery, [weekStart, weekEnd]);

    // Get daily listening patterns
    const dailyPatternsQuery = `
      SELECT
        EXTRACT(DOW FROM played_at) as day_of_week,
        COUNT(*) as plays
      FROM plays
      WHERE DATE(played_at) >= $1 AND DATE(played_at) <= $2
      GROUP BY EXTRACT(DOW FROM played_at)
      ORDER BY plays DESC
    `;

    const dailyPatternsResult = await pool().query(dailyPatternsQuery, [weekStart, weekEnd]);

    // Get hourly listening patterns
    const hourlyPatternsQuery = `
      SELECT
        EXTRACT(HOUR FROM played_at) as hour,
        COUNT(*) as plays
      FROM plays
      WHERE DATE(played_at) >= $1 AND DATE(played_at) <= $2
      GROUP BY EXTRACT(HOUR FROM played_at)
      ORDER BY plays DESC
    `;

    const hourlyPatternsResult = await pool().query(hourlyPatternsQuery, [weekStart, weekEnd]);

    // Process the data
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dailyPatterns = {
      most_active_days: dailyPatternsResult.rows.slice(0, 3).map(row => dayNames[row.day_of_week]),
      plays_by_day: Object.fromEntries(
        dailyPatternsResult.rows.map(row => [dayNames[row.day_of_week], parseInt(row.plays)])
      )
    };

    const hourlyPatterns = {
      peak_hours: hourlyPatternsResult.rows.slice(0, 3).map(row => `${row.hour}:00`),
      plays_by_hour: Object.fromEntries(
        hourlyPatternsResult.rows.map(row => [row.hour, parseInt(row.plays)])
      )
    };

    const summary = {
      week_start: weekStart,
      week_end: weekEnd,
      total_plays: parseInt(stats.total_plays),
      unique_tracks: parseInt(stats.unique_tracks),
      unique_artists: parseInt(stats.unique_artists),
      unique_albums: parseInt(stats.unique_albums),
      total_listening_minutes: Math.round(parseFloat(stats.total_listening_minutes) || 0),
      top_artists: topArtistsResult.rows.map(row => ({
        name: row.name,
        plays: parseInt(row.plays),
        image: row.image
      })),
      top_tracks: topTracksResult.rows.map(row => ({
        name: row.name,
        artist: row.artist,
        album: row.album,
        plays: parseInt(row.plays)
      })),
      top_albums: topAlbumsResult.rows.map(row => ({
        name: row.name,
        artist: row.artist,
        image: row.image,
        plays: parseInt(row.plays)
      })),
      daily_patterns: dailyPatterns,
      listening_times: {
        peak_hours: hourlyPatterns.peak_hours,
        total_minutes: Math.round(parseFloat(stats.total_listening_minutes) || 0)
      },
      repeat_factor: stats.unique_tracks > 0 ? parseFloat((stats.total_plays / stats.unique_tracks).toFixed(2)) : 0,
      discovery_rate: stats.total_plays > 0 ? parseFloat(((stats.unique_tracks / stats.total_plays) * 100).toFixed(2)) : 0
    };

    logger.info(`Generated weekly summary: ${summary.total_plays} plays, ${summary.unique_tracks} unique tracks`);
    return summary;

  } catch (error) {
    logger.error('Error generating weekly listening summary:', error);
    throw error;
  }
}

/**
 * Save weekly listening summary to database
 */
export async function saveWeeklyListeningSummary(summary) {
  try {
    const query = `
      INSERT INTO weekly_listening_summaries (
        week_start, week_end, total_plays, unique_tracks, unique_artists, unique_albums,
        total_listening_minutes, top_artists, top_tracks, top_albums, daily_patterns,
        hourly_patterns, repeat_factor, discovery_rate
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (week_start, week_end) DO UPDATE SET
        total_plays = EXCLUDED.total_plays,
        unique_tracks = EXCLUDED.unique_tracks,
        unique_artists = EXCLUDED.unique_artists,
        unique_albums = EXCLUDED.unique_albums,
        total_listening_minutes = EXCLUDED.total_listening_minutes,
        top_artists = EXCLUDED.top_artists,
        top_tracks = EXCLUDED.top_tracks,
        top_albums = EXCLUDED.top_albums,
        daily_patterns = EXCLUDED.daily_patterns,
        hourly_patterns = EXCLUDED.hourly_patterns,
        repeat_factor = EXCLUDED.repeat_factor,
        discovery_rate = EXCLUDED.discovery_rate,
        created_at = NOW()
      RETURNING id
    `;

    const result = await pool().query(query, [
      summary.week_start,
      summary.week_end,
      summary.total_plays,
      summary.unique_tracks,
      summary.unique_artists,
      summary.unique_albums,
      summary.total_listening_minutes,
      JSON.stringify(summary.top_artists),
      JSON.stringify(summary.top_tracks),
      JSON.stringify(summary.top_albums),
      JSON.stringify(summary.daily_patterns),
      JSON.stringify({
        peak_hours: summary.listening_times.peak_hours,
        plays_by_hour: summary.daily_patterns.plays_by_hour || {}
      }),
      summary.repeat_factor,
      summary.discovery_rate
    ]);

    logger.info(`Saved weekly summary with ID: ${result.rows[0].id}`);
    return result.rows[0].id;

  } catch (error) {
    logger.error('Error saving weekly listening summary:', error);
    throw error;
  }
}

/**
 * Save AI analysis results to database
 */
export async function saveListeningAnalysis(weekStart, weekEnd, analysis, model, usage, weeklyStats) {
  try {
    const query = `
      INSERT INTO listening_analyses (
        week_start, week_end, total_plays, unique_tracks, unique_artists, unique_albums,
        total_listening_minutes, mood_summary, key_insights, listening_patterns,
        musical_personality, trends_vs_previous, recommendations, openai_model, openai_usage
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      ON CONFLICT (week_start, week_end) DO UPDATE SET
        total_plays = EXCLUDED.total_plays,
        unique_tracks = EXCLUDED.unique_tracks,
        unique_artists = EXCLUDED.unique_artists,
        unique_albums = EXCLUDED.unique_albums,
        total_listening_minutes = EXCLUDED.total_listening_minutes,
        mood_summary = EXCLUDED.mood_summary,
        key_insights = EXCLUDED.key_insights,
        listening_patterns = EXCLUDED.listening_patterns,
        musical_personality = EXCLUDED.musical_personality,
        trends_vs_previous = EXCLUDED.trends_vs_previous,
        recommendations = EXCLUDED.recommendations,
        openai_model = EXCLUDED.openai_model,
        openai_usage = EXCLUDED.openai_usage,
        analysis_date = NOW()
      RETURNING id
    `;

    const result = await pool().query(query, [
      weekStart,
      weekEnd,
      weeklyStats.total_plays,
      weeklyStats.unique_tracks,
      weeklyStats.unique_artists,
      weeklyStats.unique_albums,
      weeklyStats.listening_times?.total_minutes || null,
      analysis.mood_summary,
      JSON.stringify(analysis.key_insights),
      analysis.listening_patterns,
      analysis.musical_personality,
      analysis.trends_vs_previous,
      analysis.recommendations,
      model,
      JSON.stringify(usage)
    ]);

    logger.info(`Saved AI analysis with ID: ${result.rows[0].id}`);
    return result.rows[0].id;

  } catch (error) {
    logger.error('Error saving listening analysis:', error);
    throw error;
  }
}

/**
 * Get historical context for analysis comparison
 */
export async function getHistoricalContext(weekStart) {
  try {
    const query = `
      SELECT
        wls.total_plays as previous_week_plays,
        la.mood_summary as previous_mood,
        la.key_insights as previous_insights
      FROM weekly_listening_summaries wls
      LEFT JOIN listening_analyses la ON wls.week_start = la.week_start
      WHERE wls.week_start < $1
      ORDER BY wls.week_start DESC
      LIMIT 3
    `;

    const result = await pool().query(query, [weekStart]);

    if (result.rows.length === 0) {
      return null;
    }

    const recentWeeks = result.rows;
    const context = {
      previous_week_plays: recentWeeks[0]?.previous_week_plays,
      trend: recentWeeks.length > 1 ? 'Analyzing trends...' : 'Building baseline',
      notable_changes: 'Comparing patterns...'
    };

    return context;

  } catch (error) {
    logger.error('Error getting historical context:', error);
    return null;
  }
}

/**
 * Get all listening analyses
 */
export async function getListeningAnalyses(limit = 10) {
  try {
    const query = `
      SELECT
        la.*,
        wls.total_plays,
        wls.unique_tracks,
        wls.unique_artists,
        wls.repeat_factor
      FROM listening_analyses la
      LEFT JOIN weekly_listening_summaries wls ON la.week_start = wls.week_start
      ORDER BY la.analysis_date DESC
      LIMIT $1
    `;

    const result = await pool().query(query, [limit]);

    return result.rows.map(row => ({
      id: row.id,
      week_start: row.week_start,
      week_end: row.week_end,
      mood_summary: row.mood_summary,
      key_insights: row.key_insights,
      listening_patterns: row.listening_patterns,
      musical_personality: row.musical_personality,
      trends_vs_previous: row.trends_vs_previous,
      recommendations: row.recommendations,
      analysis_date: row.analysis_date,
      stats: {
        total_plays: row.total_plays,
        unique_tracks: row.unique_tracks,
        unique_artists: row.unique_artists,
        repeat_factor: row.repeat_factor
      }
    }));

  } catch (error) {
    logger.error('Error getting listening analyses:', error);
    throw error;
  }
}

/**
 * Delete a listening analysis by ID
 */
export async function deleteListeningAnalysis(analysisId) {
  try {
    const query = `
      DELETE FROM listening_analyses
      WHERE id = $1
      RETURNING id, week_start, week_end
    `;

    const result = await pool().query(query, [analysisId]);

    if (result.rows.length === 0) {
      return null;
    }

    logger.info(`Deleted listening analysis with ID: ${analysisId}`);
    return result.rows[0];

  } catch (error) {
    logger.error('Error deleting listening analysis:', error);
    throw error;
  }
}