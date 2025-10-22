/**
 * Analysis Service
 * Weekly/period listening analysis logic
 * Handles AI-powered insights and mood analysis
 */

import OpenAIClient from './openaiClient.js';
import logger from '../../utils/logger.js';

class AnalysisService {
  constructor() {
    this.openai = new OpenAIClient();
  }

  /**
   * Analyze listening data for any date range and provide mood/behavior insights
   * @param {Object} weeklyData - Listening data for the period
   * @param {Object} historicalContext - Optional historical comparison data
   * @returns {Promise<Object>} Analysis result with insights
   */
  async analyzeListeningPeriod(weeklyData, historicalContext = null) {
    if (!this.openai.isAvailable()) {
      throw new Error('OpenAI service not available');
    }

    try {
      const prompt = this.buildAnalysisPrompt(weeklyData, historicalContext);

      const systemPrompt = `You are a music psychology expert who analyzes listening patterns to provide personalized insights about mood, behavior, and personality traits.

Your analysis should be:
- Written in second person (use "you", "your", "you've" - speak directly to the listener)
- Insightful but not overly clinical
- Focused on patterns and trends in their listening behavior
- Encouraging and positive in tone
- Specific to the music data provided
- Include actionable observations
- IMPORTANT: Do NOT use terms like "this week", "weekly", or "week's" - the data can be for ANY date range (day, week, month, etc.). Use general terms like "during this period", "in this timeframe", "throughout your listening sessions", etc.
- IMPORTANT: Never use third-person terms like "the listener", "they", "them" - always address the person directly as "you"

Return your response as a JSON object with this structure:
{
  "mood_summary": "Brief overall mood assessment speaking directly to the listener (use 'you/your', avoid week-specific language)",
  "key_insights": ["insight1 about your listening", "insight2 about your patterns", "insight3 about your behavior"],
  "listening_patterns": "Analysis of when and how you listen during this period (use 'you/your')",
  "musical_personality": "What your music choices say about you (use 'you/your')",
  "trends_vs_previous": "Comparison to your historical data if available (use 'you/your')",
  "recommendations": "Suggestions for you based on your patterns (use 'you/your')"
}`;

      const response = await this.openai.createChatCompletion(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        null,
        { maxTokens: 1500 }
      );

      let content = response.choices[0].message.content.trim();

      // Remove markdown code block formatting if present
      if (content.startsWith('```json')) {
        content = content.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (content.startsWith('```')) {
        content = content.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      const analysis = JSON.parse(content);

      logger.info('Successfully generated listening analysis');
      return {
        success: true,
        analysis,
        usage: response.usage
      };

    } catch (error) {
      logger.error('Error generating listening analysis:', error);
      throw new Error(`OpenAI analysis failed: ${error.message}`);
    }
  }

  /**
   * Build the prompt for listening analysis (any date range)
   * @param {Object} weeklyData - Data for the period
   * @param {Object} historicalContext - Historical comparison data
   * @returns {string} Formatted prompt
   */
  buildAnalysisPrompt(weeklyData, historicalContext) {
    const {
      week_start,
      week_end,
      total_plays,
      unique_tracks,
      unique_artists,
      top_artists,
      top_tracks,
      top_albums,
      listening_times,
      genres,
      daily_patterns
    } = weeklyData;

    let prompt = `Analyze this user's listening data for the period ${week_start} to ${week_end}.

Remember: Address the user directly using "you/your" in all responses.

YOUR LISTENING OVERVIEW:
- Total plays: ${total_plays}
- Unique tracks you listened to: ${unique_tracks}
- Unique artists you explored: ${unique_artists}
- Your repeat factor: ${(total_plays / unique_tracks).toFixed(1)}x

YOUR TOP ARTISTS DURING THIS PERIOD:
${top_artists.map((artist, i) => `${i + 1}. ${artist.name} (${artist.plays} plays)`).join('\n')}

YOUR TOP TRACKS DURING THIS PERIOD:
${top_tracks.map((track, i) => `${i + 1}. "${track.name}" by ${track.artist} (${track.plays} plays)`).join('\n')}

YOUR TOP ALBUMS DURING THIS PERIOD:
${top_albums.map((album, i) => `${i + 1}. "${album.name}" by ${album.artist} (${album.plays} plays)`).join('\n')}

YOUR LISTENING PATTERNS:
- Your peak listening hours: ${listening_times.peak_hours.join(', ')}
- Your most active days: ${daily_patterns.most_active_days.join(', ')}
- Your total listening time: ${Math.round(listening_times.total_minutes / 60)} hours

YOUR MUSICAL DIVERSITY:
- Your genre distribution: ${genres ? genres.map(g => `${g.name} (${g.percentage}%)`).join(', ') : 'Various'}
- Your discovery rate: ${((unique_tracks / total_plays) * 100).toFixed(1)}% new tracks`;

    if (historicalContext) {
      prompt += `\n\nCOMPARISON TO YOUR PREVIOUS PERIODS:
- Your previous period plays: ${historicalContext.previous_week_plays || 'N/A'}
- Your trend: ${historicalContext.trend || 'First analysis'}
- Notable changes in your behavior: ${historicalContext.notable_changes || 'Establishing baseline'}`;
    } else {
      prompt += '\n\nNOTE: This is your first analysis, so no historical comparison is available yet.';
    }

    return prompt;
  }

  /**
   * Generate a quick mood summary from recent tracks
   * @param {Array} recentTracks - Array of recent track objects
   * @returns {Promise<string|null>} Mood summary or null if unavailable
   */
  async quickMoodAnalysis(recentTracks) {
    if (!this.openai.isAvailable()) {
      return null;
    }

    try {
      const trackList = recentTracks
        .map(track => `"${track.name}" by ${track.artist}`)
        .join('\n');

      const response = await this.openai.createChatCompletion(
        [
          {
            role: 'system',
            content: 'Analyze these recent music tracks and provide a brief 1-2 sentence mood assessment based on the musical choices. Be concise and insightful.'
          },
          {
            role: 'user',
            content: `Recent tracks:\n${trackList}`
          }
        ],
        null,
        { temperature: 0.8, maxTokens: 150 }
      );

      return response.choices[0].message.content.trim();

    } catch (error) {
      logger.error('Error in quick mood analysis:', error);
      return null;
    }
  }

  /**
   * Check if analysis service is available
   * @returns {boolean}
   */
  isAvailable() {
    return this.openai.isAvailable();
  }
}

export default AnalysisService;
