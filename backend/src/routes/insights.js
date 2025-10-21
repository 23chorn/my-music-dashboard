import express from 'express';
import logger from '../utils/logger.js';
import { getAllInsights } from '../db/insights.js';
import OpenAIService from '../services/openai.js';
import {
  generateWeeklyListeningSummary,
  saveWeeklyListeningSummary,
  saveListeningAnalysis,
  getHistoricalContext,
  getListeningAnalyses,
  deleteListeningAnalysis
} from '../db/listeningAnalysis.js';

const router = express.Router();

// GET /api/insights - Get comprehensive data quality and system insights
router.get('/', async (req, res) => {
  try {
    const insights = await getAllInsights();

    logger.info('Successfully fetched insights data');
    res.json(insights);

  } catch (error) {
    logger.error(`Error fetching insights data: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch insights data', details: error.message });
  }
});

// OpenAI service will be initialized on first use
let openaiService = null;

function getOpenAIService() {
  if (!openaiService) {
    openaiService = new OpenAIService();
  }
  return openaiService;
}

// POST /api/insights/analyze-week - Generate AI analysis for a specific week
router.post('/analyze-week', async (req, res) => {
  try {
    const { weekStart, weekEnd } = req.body;

    if (!weekStart || !weekEnd) {
      return res.status(400).json({ error: 'weekStart and weekEnd are required' });
    }

    if (!getOpenAIService().isAvailable()) {
      return res.status(503).json({
        error: 'AI analysis unavailable',
        message: 'OpenAI service not configured. Please add OPENAI_API_KEY to environment variables.'
      });
    }

    logger.info(`Generating AI analysis for week ${weekStart} to ${weekEnd}`);

    // Generate weekly listening summary
    const weeklyData = await generateWeeklyListeningSummary(weekStart, weekEnd);

    if (weeklyData.total_plays === 0) {
      return res.status(400).json({
        error: 'No listening data',
        message: 'No plays found for the specified week'
      });
    }

    // Save the weekly summary
    await saveWeeklyListeningSummary(weeklyData);

    // Get historical context for comparison
    const historicalContext = await getHistoricalContext(weekStart);

    // Generate AI analysis
    const analysisResult = await getOpenAIService().analyzeWeeklyListening(weeklyData, historicalContext);

    if (!analysisResult.success) {
      throw new Error('AI analysis failed');
    }

    // Save the analysis
    await saveListeningAnalysis(
      weekStart,
      weekEnd,
      analysisResult.analysis,
      'gpt-4o-mini',
      analysisResult.usage,
      weeklyData
    );

    res.json({
      success: true,
      weekData: {
        week_start: weekStart,
        week_end: weekEnd,
        total_plays: weeklyData.total_plays,
        unique_tracks: weeklyData.unique_tracks,
        unique_artists: weeklyData.unique_artists,
        repeat_factor: weeklyData.repeat_factor
      },
      analysis: analysisResult.analysis,
      usage: {
        tokens_used: analysisResult.usage?.total_tokens,
        cost_estimate: analysisResult.usage?.total_tokens ? (analysisResult.usage.total_tokens * 0.00015 / 1000).toFixed(4) : null
      }
    });

  } catch (error) {
    logger.error(`Error generating weekly analysis: ${error.message}`);
    res.status(500).json({
      error: 'Failed to generate analysis',
      details: error.message
    });
  }
});

// GET /api/insights/listening-analyses - Get all historical analyses
router.get('/listening-analyses', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const analyses = await getListeningAnalyses(limit);

    logger.info(`Retrieved ${analyses.length} listening analyses`);
    res.json({
      success: true,
      analyses,
      count: analyses.length
    });

  } catch (error) {
    logger.error(`Error fetching listening analyses: ${error.message}`);
    res.status(500).json({
      error: 'Failed to fetch analyses',
      details: error.message
    });
  }
});

// POST /api/insights/analyze-last-week - Analyze the previous week automatically
router.post('/analyze-last-week', async (req, res) => {
  try {
    if (!getOpenAIService().isAvailable()) {
      return res.status(503).json({
        error: 'AI analysis unavailable',
        message: 'OpenAI service not configured'
      });
    }

    // Calculate last week's dates
    const today = new Date();
    const lastWeekEnd = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastWeekStart = new Date(lastWeekEnd.getTime() - 6 * 24 * 60 * 60 * 1000);

    const weekStart = lastWeekStart.toISOString().split('T')[0];
    const weekEnd = lastWeekEnd.toISOString().split('T')[0];

    logger.info(`Auto-analyzing last week: ${weekStart} to ${weekEnd}`);

    // Generate weekly summary
    const weeklyData = await generateWeeklyListeningSummary(weekStart, weekEnd);

    if (weeklyData.total_plays === 0) {
      return res.status(400).json({
        error: 'No listening data',
        message: 'No plays found for last week'
      });
    }

    // Save summary and generate analysis
    await saveWeeklyListeningSummary(weeklyData);
    const historicalContext = await getHistoricalContext(weekStart);
    const analysisResult = await getOpenAIService().analyzeWeeklyListening(weeklyData, historicalContext);

    // Save analysis
    await saveListeningAnalysis(
      weekStart,
      weekEnd,
      analysisResult.analysis,
      'gpt-4o-mini',
      analysisResult.usage,
      weeklyData
    );

    res.json({
      success: true,
      message: 'Last week analysis completed',
      week_analyzed: `${weekStart} to ${weekEnd}`,
      analysis: analysisResult.analysis,
      stats: {
        total_plays: weeklyData.total_plays,
        unique_tracks: weeklyData.unique_tracks,
        unique_artists: weeklyData.unique_artists
      }
    });

  } catch (error) {
    logger.error(`Error analyzing last week: ${error.message}`);
    res.status(500).json({
      error: 'Failed to analyze last week',
      details: error.message
    });
  }
});

// GET /api/insights/ai-status - Check if AI analysis is available
router.get('/ai-status', async (req, res) => {
  try {
    const isAvailable = getOpenAIService().isAvailable();

    res.json({
      available: isAvailable,
      service: 'OpenAI',
      model: 'gpt-4o-mini',
      message: isAvailable
        ? 'AI analysis is available'
        : 'AI analysis unavailable - OpenAI API key not configured'
    });

  } catch (error) {
    logger.error(`Error checking AI status: ${error.message}`);
    res.status(500).json({
      error: 'Failed to check AI status',
      details: error.message
    });
  }
});

// DELETE /api/insights/listening-analyses/:id - Delete a listening analysis
router.delete('/listening-analyses/:id', async (req, res) => {
  try {
    const analysisId = parseInt(req.params.id);

    if (isNaN(analysisId)) {
      return res.status(400).json({ error: 'Invalid analysis ID' });
    }

    const deleted = await deleteListeningAnalysis(analysisId);

    if (!deleted) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    logger.info(`Deleted analysis ID ${analysisId}: ${deleted.week_start} to ${deleted.week_end}`);
    res.json({
      success: true,
      message: 'Analysis deleted successfully',
      deleted
    });

  } catch (error) {
    logger.error(`Error deleting analysis: ${error.message}`);
    res.status(500).json({
      error: 'Failed to delete analysis',
      details: error.message
    });
  }
});

export default router;