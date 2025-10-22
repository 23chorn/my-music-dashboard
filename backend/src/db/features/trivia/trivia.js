import { getPool } from '../../connection.js';
import logger from '../../../utils/logger.js';

const pool = () => getPool();

/**
 * Create a new trivia session
 */
export async function createTriviaSession(sessionData) {
  const { sessionName, difficultyLevel = 'mixed', questionCount = 10, sessionMetadata = {} } = sessionData;

  try {
    const result = await pool().query(`
      INSERT INTO trivia_sessions (session_name, difficulty_level, question_count, session_data)
      VALUES ($1, $2, $3, $4::jsonb)
      RETURNING id, created_at
    `, [sessionName, difficultyLevel, questionCount, JSON.stringify(sessionMetadata)]);

    logger.info(`Created trivia session ${result.rows[0].id} with ${questionCount} questions`);
    return result.rows[0];
  } catch (error) {
    logger.error(`Error creating trivia session: ${error.message}`);
    throw error;
  }
}

/**
 * Save generated trivia questions to database
 */
export async function saveTriviasQuestions(sessionId, questions) {
  const client = await pool().connect();

  try {
    await client.query('BEGIN');

    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];

      // Ensure JSONB fields are properly formatted
      const options = question.options ? JSON.stringify(question.options) : null;
      const dataSource = question.data_source ? JSON.stringify(question.data_source) : '{}';

      await client.query(`
        INSERT INTO trivia_questions (
          session_id, question_text, question_type, difficulty_level,
          category, correct_answer, options, explanation, data_source, order_in_session
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9::jsonb, $10)
      `, [
        sessionId,
        question.question_text,
        question.question_type,
        question.difficulty_level,
        question.category,
        question.correct_answer,
        options,
        question.explanation,
        dataSource,
        i + 1
      ]);
    }

    await client.query('COMMIT');
    logger.info(`Saved ${questions.length} trivia questions for session ${sessionId}`);

  } catch (error) {
    await client.query('ROLLBACK');
    logger.error(`Error saving trivia questions: ${error.message}`);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get trivia session with questions and responses
 */
export async function getTriviaSession(sessionId) {
  try {
    const sessionResult = await pool().query(`
      SELECT * FROM trivia_sessions WHERE id = $1
    `, [sessionId]);

    if (sessionResult.rows.length === 0) {
      return null;
    }

    const questionsResult = await pool().query(`
      SELECT * FROM trivia_questions
      WHERE session_id = $1
      ORDER BY order_in_session
    `, [sessionId]);

    const responsesResult = await pool().query(`
      SELECT * FROM trivia_responses
      WHERE session_id = $1
      ORDER BY answered_at
    `, [sessionId]);

    const session = sessionResult.rows[0];
    session.questions = questionsResult.rows;
    session.responses = responsesResult.rows;

    return session;
  } catch (error) {
    logger.error(`Error getting trivia session: ${error.message}`);
    throw error;
  }
}

/**
 * Save user response to trivia question
 */
export async function saveTriviaResponse(responseData) {
  const { sessionId, questionId, userAnswer, isCorrect, responseTimeSeconds } = responseData;

  try {
    const result = await pool().query(`
      INSERT INTO trivia_responses (session_id, question_id, user_answer, is_correct, response_time_seconds)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, answered_at
    `, [sessionId, questionId, userAnswer, isCorrect, responseTimeSeconds]);

    return result.rows[0];
  } catch (error) {
    logger.error(`Error saving trivia response: ${error.message}`);
    throw error;
  }
}

/**
 * Complete trivia session and calculate final score
 */
export async function completeTriviaSession(sessionId, completionTimeSeconds = null) {
  try {
    const scoreResult = await pool().query(`
      SELECT
        COUNT(*) as total_questions,
        COUNT(*) FILTER (WHERE is_correct = true) as correct_answers
      FROM trivia_responses
      WHERE session_id = $1
    `, [sessionId]);

    const { total_questions, correct_answers } = scoreResult.rows[0];
    const score = parseInt(correct_answers);

    await pool().query(`
      UPDATE trivia_sessions
      SET completed_at = CURRENT_TIMESTAMP, score = $1, total_questions = $2, completion_time_seconds = $3
      WHERE id = $4
    `, [score, parseInt(total_questions), completionTimeSeconds, sessionId]);

    logger.info(`Completed trivia session ${sessionId}: ${score}/${total_questions} in ${completionTimeSeconds}s`);

    return { sessionId, score, totalQuestions: parseInt(total_questions), completionTimeSeconds };
  } catch (error) {
    logger.error(`Error completing trivia session: ${error.message}`);
    throw error;
  }
}

/**
 * Get recent trivia sessions
 */
export async function getRecentTriviaSessions(limit = 10) {
  try {
    const result = await pool().query(`
      SELECT
        ts.id, ts.session_name, ts.difficulty_level, ts.question_count,
        ts.created_at, ts.completed_at, ts.score, ts.total_questions,
        ts.completion_time_seconds,
        CASE
          WHEN ts.completed_at IS NOT NULL AND ts.total_questions > 0
          THEN ROUND((ts.score::numeric / ts.total_questions) * 100, 1)
          ELSE NULL
        END as percentage,
        (SELECT COUNT(*) FROM trivia_responses tr WHERE tr.session_id = ts.id) as answered_questions
      FROM trivia_sessions ts
      ORDER BY ts.created_at DESC
      LIMIT $1
    `, [limit]);

    return result.rows;
  } catch (error) {
    logger.error(`Error getting recent trivia sessions: ${error.message}`);
    throw error;
  }
}

/**
 * Get trivia statistics
 */
export async function getTriviaStats() {
  try {
    const statsResult = await pool().query(`
      SELECT
        COUNT(*) as total_sessions,
        COUNT(*) FILTER (WHERE completed_at IS NOT NULL) as completed_sessions,
        AVG(score) FILTER (WHERE completed_at IS NOT NULL) as avg_score,
        AVG(total_questions) FILTER (WHERE completed_at IS NOT NULL) as avg_questions,
        MAX(score) as best_score,
        COUNT(DISTINCT difficulty_level) as difficulty_levels_played
      FROM trivia_sessions
    `);

    const questionsResult = await pool().query(`
      SELECT
        COUNT(*) as total_questions,
        COUNT(DISTINCT category) as categories_covered,
        AVG(CASE WHEN tr.is_correct THEN 1.0 ELSE 0.0 END) as overall_accuracy
      FROM trivia_questions tq
      LEFT JOIN trivia_responses tr ON tq.id = tr.question_id
    `);

    const categoryStats = await pool().query(`
      SELECT
        tq.category,
        COUNT(*) as questions_count,
        AVG(CASE WHEN tr.is_correct THEN 1.0 ELSE 0.0 END) as accuracy
      FROM trivia_questions tq
      LEFT JOIN trivia_responses tr ON tq.id = tr.question_id
      WHERE tq.category IS NOT NULL
      GROUP BY tq.category
      ORDER BY questions_count DESC
    `);

    return {
      sessions: statsResult.rows[0],
      questions: questionsResult.rows[0],
      categories: categoryStats.rows
    };
  } catch (error) {
    logger.error(`Error getting trivia stats: ${error.message}`);
    throw error;
  }
}

/**
 * Log trivia generation activity
 */
export async function logTriviaGeneration(logData) {
  const {
    generationType,
    questionsRequested,
    questionsGenerated,
    difficultyLevel,
    categoriesRequested,
    openaiModel,
    openaiUsage,
    generationTimeSeconds,
    success,
    errorMessage,
    dataPeriodStart,
    dataPeriodEnd
  } = logData;

  try {
    const result = await pool().query(`
      INSERT INTO trivia_generation_log (
        generation_type, questions_requested, questions_generated, difficulty_level,
        categories_requested, openai_model, openai_usage, generation_time_seconds,
        success, error_message, data_period_start, data_period_end
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10, $11, $12)
      RETURNING id
    `, [
      generationType,
      questionsRequested,
      questionsGenerated,
      difficultyLevel,
      categoriesRequested,
      openaiModel,
      JSON.stringify(openaiUsage || {}),
      generationTimeSeconds,
      success,
      errorMessage,
      dataPeriodStart,
      dataPeriodEnd
    ]);

    return result.rows[0].id;
  } catch (error) {
    logger.error(`Error logging trivia generation: ${error.message}`);
    throw error;
  }
}

/**
 * Replay a trivia session (create new session with same questions)
 */
export async function replayTriviaSession(originalSessionId) {
  const client = await pool().connect();

  try {
    await client.query('BEGIN');

    // Get original session
    const originalSession = await client.query(`
      SELECT session_name, difficulty_level, question_count, session_data
      FROM trivia_sessions
      WHERE id = $1
    `, [originalSessionId]);

    if (originalSession.rows.length === 0) {
      throw new Error('Original session not found');
    }

    const original = originalSession.rows[0];

    // Create new session with "Replay" prefix
    const newSession = await client.query(`
      INSERT INTO trivia_sessions (session_name, difficulty_level, question_count, session_data)
      VALUES ($1, $2, $3, $4::jsonb)
      RETURNING id, created_at
    `, [
      `Replay: ${original.session_name}`,
      original.difficulty_level,
      original.question_count,
      JSON.stringify(original.session_data || {})
    ]);

    const newSessionId = newSession.rows[0].id;

    // Copy all questions from original session
    await client.query(`
      INSERT INTO trivia_questions (
        session_id, question_text, question_type, difficulty_level,
        category, correct_answer, options, explanation, data_source, order_in_session
      )
      SELECT
        $1, question_text, question_type, difficulty_level,
        category, correct_answer, options, explanation, data_source, order_in_session
      FROM trivia_questions
      WHERE session_id = $2
      ORDER BY order_in_session
    `, [newSessionId, originalSessionId]);

    await client.query('COMMIT');

    logger.info(`Created replay session ${newSessionId} from original session ${originalSessionId}`);

    return newSession.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error(`Error replaying trivia session: ${error.message}`);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get listening data for trivia generation
 */
export async function getListeningDataForTrivia(options = {}) {
  const {
    period = '6month',
    includeTopArtists = true,
    includeTopTracks = true,
    includeTopAlbums = true,
    includeDiscoveries = true,
    includeListeningPatterns = true,
    limit = 50
  } = options;

  try {
    const data = {};

    // Get date range for period
    const periodQuery = getPeriodCondition(period);

    if (includeTopArtists) {
      const artistsResult = await pool().query(`
        SELECT
          a.id, a.name, a.image_url,
          COUNT(p.id) as play_count,
          MIN(p.played_at) as first_play,
          MAX(p.played_at) as last_play
        FROM artists a
        JOIN track_artists ta ON a.id = ta.artist_id
        JOIN tracks t ON ta.track_id = t.id
        JOIN plays p ON t.id = p.track_id
        WHERE ${periodQuery}
        GROUP BY a.id, a.name, a.image_url
        ORDER BY play_count DESC
        LIMIT $1
      `, [limit]);

      data.topArtists = artistsResult.rows;
    }

    if (includeTopTracks) {
      const tracksResult = await pool().query(`
        SELECT
          t.id, t.name, t.duration_ms,
          COUNT(p.id) as play_count,
          MIN(p.played_at) as first_play,
          MAX(p.played_at) as last_play,
          ARRAY_AGG(DISTINCT a.name) as artist_names
        FROM tracks t
        JOIN plays p ON t.id = p.track_id
        JOIN track_artists ta ON t.id = ta.track_id
        JOIN artists a ON ta.artist_id = a.id
        WHERE ${periodQuery}
        GROUP BY t.id, t.name, t.duration_ms
        ORDER BY play_count DESC
        LIMIT $1
      `, [limit]);

      data.topTracks = tracksResult.rows;
    }

    if (includeListeningPatterns) {
      const patternsResult = await pool().query(`
        SELECT
          DATE_TRUNC('day', p.played_at) as date,
          COUNT(*) as plays,
          COUNT(DISTINCT p.track_id) as unique_tracks,
          COUNT(DISTINCT ta.artist_id) as unique_artists
        FROM plays p
        JOIN track_artists ta ON p.track_id = ta.track_id
        WHERE ${periodQuery}
        GROUP BY DATE_TRUNC('day', p.played_at)
        ORDER BY date
      `);

      data.listeningPatterns = patternsResult.rows;
    }

    return data;
  } catch (error) {
    logger.error(`Error getting listening data for trivia: ${error.message}`);
    throw error;
  }
}

function getPeriodCondition(period) {
  switch (period) {
    case '7day':
      return "p.played_at >= NOW() - INTERVAL '7 days'";
    case '1month':
      return "p.played_at >= NOW() - INTERVAL '1 month'";
    case '3month':
      return "p.played_at >= NOW() - INTERVAL '3 months'";
    case '6month':
      return "p.played_at >= NOW() - INTERVAL '6 months'";
    case '12month':
      return "p.played_at >= NOW() - INTERVAL '12 months'";
    default:
      return "true"; // all time
  }
}