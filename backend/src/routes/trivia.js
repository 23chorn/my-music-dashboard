import express from 'express';
import logger from '../utils/logger.js';
import { triviaService as triviaAI } from '../services/ai/index.js';
import {
  createTriviaSession,
  saveTriviasQuestions,
  getTriviaSession,
  saveTriviaResponse,
  completeTriviaSession,
  getRecentTriviaSessions,
  getTriviaStats,
  logTriviaGeneration,
  getListeningDataForTrivia,
  replayTriviaSession
} from '../db/features/trivia/index.js';

const router = express.Router();

// GET /api/trivia/status - Check trivia system status
router.get('/status', async (req, res) => {
  try {
    const status = {
      ai_available: triviaAI.isAvailable(),
      database_connected: true,
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini'
    };

    res.json(status);
  } catch (error) {
    logger.error(`Error checking trivia status: ${error.message}`);
    res.status(500).json({ error: 'Failed to check trivia status' });
  }
});

// POST /api/trivia/sessions - Create and generate new trivia session
router.post('/sessions', async (req, res) => {
  try {
    const {
      sessionName,
      questionCount = 10,
      difficulty = 'mixed',
      categories = ['top_tracks', 'top_artists', 'listening_patterns', 'music_knowledge'],
      period = '6month',
      theme = null
    } = req.body;

    if (!triviaAI.isAvailable()) {
      return res.status(503).json({
        error: 'AI service not available',
        message: 'OpenAI API key not configured'
      });
    }

    // Create session
    const session = await createTriviaSession({
      sessionName: sessionName || `Trivia ${new Date().toLocaleDateString()}`,
      difficultyLevel: difficulty,
      questionCount,
      sessionMetadata: { categories, period, theme }
    });

    // Get listening data
    logger.info(`Fetching listening data for period: ${period}`);
    const listeningData = await getListeningDataForTrivia({
      period,
      includeTopArtists: categories.includes('top_artists'),
      includeTopTracks: categories.includes('top_tracks'),
      includeTopAlbums: categories.includes('top_albums'),
      includeDiscoveries: categories.includes('discovery_dates'),
      includeListeningPatterns: categories.includes('listening_patterns'),
      limit: 50
    });

    // Generate questions using AI
    logger.info(`Generating trivia questions for session ${session.id}`);
    const generationStart = Date.now();

    let aiResult;
    if (theme) {
      aiResult = await triviaAI.generateThemedTrivia(listeningData, theme, {
        questionCount,
        difficulty,
        categories
      });
    } else {
      aiResult = await triviaAI.generateTriviaQuestions(listeningData, {
        questionCount,
        difficulty,
        categories,
        includeExplanations: true
      });
    }

    const generationTime = Math.round((Date.now() - generationStart) / 1000);

    // Log generation activity
    await logTriviaGeneration({
      generationType: 'session_generation',
      questionsRequested: questionCount,
      questionsGenerated: aiResult.questions.length,
      difficultyLevel: difficulty,
      categoriesRequested: categories,
      openaiModel: aiResult.usage?.model,
      openaiUsage: aiResult.usage,
      generationTimeSeconds: generationTime,
      success: aiResult.success,
      errorMessage: aiResult.error || null,
      dataPeriodStart: null, // Could be calculated from period
      dataPeriodEnd: null
    });

    if (!aiResult.success || aiResult.questions.length === 0) {
      return res.status(500).json({
        error: 'Failed to generate trivia questions',
        message: aiResult.error || 'No questions generated'
      });
    }

    // Save questions to database
    await saveTriviasQuestions(session.id, aiResult.questions);

    // Return session with questions
    const fullSession = await getTriviaSession(session.id);

    res.json({
      session: fullSession,
      generation: {
        questionsGenerated: aiResult.questions.length,
        generationTime,
        usage: aiResult.usage
      }
    });

  } catch (error) {
    logger.error(`Error creating trivia session: ${error.message}`);
    res.status(500).json({ error: 'Failed to create trivia session', details: error.message });
  }
});

// GET /api/trivia/sessions/:id - Get trivia session with questions
router.get('/sessions/:id', async (req, res) => {
  try {
    const sessionId = parseInt(req.params.id);

    if (isNaN(sessionId)) {
      return res.status(400).json({ error: 'Invalid session ID' });
    }

    const session = await getTriviaSession(sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Trivia session not found' });
    }

    res.json(session);

  } catch (error) {
    logger.error(`Error getting trivia session: ${error.message}`);
    res.status(500).json({ error: 'Failed to get trivia session' });
  }
});

// POST /api/trivia/sessions/:id/responses - Submit answer to question
router.post('/sessions/:id/responses', async (req, res) => {
  try {
    const sessionId = parseInt(req.params.id);
    const { questionId, userAnswer, responseTimeSeconds } = req.body;

    if (isNaN(sessionId) || !questionId || userAnswer === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get the question to check correct answer
    const session = await getTriviaSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const question = session.questions.find(q => q.id === questionId);
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    // Check if answer is correct
    const isCorrect = userAnswer.toLowerCase().trim() === question.correct_answer.toLowerCase().trim();

    // Save response
    const response = await saveTriviaResponse({
      sessionId,
      questionId,
      userAnswer,
      isCorrect,
      responseTimeSeconds
    });

    res.json({
      response,
      isCorrect,
      correctAnswer: question.correct_answer,
      explanation: question.explanation
    });

  } catch (error) {
    logger.error(`Error saving trivia response: ${error.message}`);
    res.status(500).json({ error: 'Failed to save response' });
  }
});

// POST /api/trivia/sessions/:id/complete - Complete trivia session
router.post('/sessions/:id/complete', async (req, res) => {
  try {
    const sessionId = parseInt(req.params.id);
    const { completionTimeSeconds } = req.body;

    if (isNaN(sessionId)) {
      return res.status(400).json({ error: 'Invalid session ID' });
    }

    const result = await completeTriviaSession(sessionId, completionTimeSeconds);
    res.json(result);

  } catch (error) {
    logger.error(`Error completing trivia session: ${error.message}`);
    res.status(500).json({ error: 'Failed to complete session' });
  }
});

// GET /api/trivia/sessions - Get recent trivia sessions
router.get('/sessions', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const sessions = await getRecentTriviaSessions(limit);

    res.json({ sessions });

  } catch (error) {
    logger.error(`Error getting trivia sessions: ${error.message}`);
    res.status(500).json({ error: 'Failed to get trivia sessions' });
  }
});

// GET /api/trivia/stats - Get trivia statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await getTriviaStats();
    res.json(stats);

  } catch (error) {
    logger.error(`Error getting trivia stats: ${error.message}`);
    res.status(500).json({ error: 'Failed to get trivia stats' });
  }
});

// POST /api/trivia/quick - Generate quick trivia (5 questions)
router.post('/quick', async (req, res) => {
  try {
    const { difficulty = 'mixed', period = '3month' } = req.body;

    if (!triviaAI.isAvailable()) {
      return res.status(503).json({
        error: 'AI service not available',
        message: 'OpenAI API key not configured'
      });
    }

    // Get listening data
    const listeningData = await getListeningDataForTrivia({
      period,
      includeTopArtists: true,
      includeTopTracks: true,
      includeListeningPatterns: true,
      limit: 30
    });

    // Generate quick trivia
    const aiResult = await triviaAI.generateQuickTrivia(listeningData, difficulty);

    if (!aiResult.success) {
      return res.status(500).json({
        error: 'Failed to generate quick trivia',
        message: aiResult.error
      });
    }

    res.json({
      questions: aiResult.questions,
      usage: aiResult.usage
    });

  } catch (error) {
    logger.error(`Error generating quick trivia: ${error.message}`);
    res.status(500).json({ error: 'Failed to generate quick trivia' });
  }
});

// POST /api/trivia/sessions/:id/replay - Replay a completed trivia session
router.post('/sessions/:id/replay', async (req, res) => {
  try {
    const originalSessionId = parseInt(req.params.id);

    if (isNaN(originalSessionId)) {
      return res.status(400).json({ error: 'Invalid session ID' });
    }

    // Create new session with same questions
    const newSession = await replayTriviaSession(originalSessionId);

    // Get full session with questions
    const fullSession = await getTriviaSession(newSession.id);

    res.json({
      session: fullSession,
      message: 'Session replayed successfully'
    });

  } catch (error) {
    logger.error(`Error replaying trivia session: ${error.message}`);
    res.status(500).json({ error: 'Failed to replay trivia session', details: error.message });
  }
});

// GET /api/trivia/themes - Get available trivia themes
router.get('/themes', (req, res) => {
  const themes = [
    {
      id: 'discovery_journey',
      name: 'Discovery Journey',
      description: 'Questions about your favorite artists and listening journey',
      categories: ['top_artists', 'music_knowledge', 'listening_patterns'],
      difficulty: 'medium',
      questionCount: 8
    },
    {
      id: 'recent_favorites',
      name: 'Recent Favorites',
      description: 'Focus on your most recent listening habits and discoveries',
      categories: ['top_tracks', 'top_albums', 'listening_patterns'],
      difficulty: 'easy',
      questionCount: 6
    },
    {
      id: 'deep_cuts',
      name: 'Deep Cuts',
      description: 'Test your knowledge of your music collection\'s hidden gems',
      categories: ['top_tracks', 'music_knowledge', 'top_albums'],
      difficulty: 'hard',
      questionCount: 10
    },
    {
      id: 'artist_expert',
      name: 'Artist Expert',
      description: 'All about your favorite artists and their discographies',
      categories: ['top_artists', 'music_knowledge', 'top_albums'],
      difficulty: 'medium',
      questionCount: 8
    }
  ];

  res.json({ themes });
});

export default router;