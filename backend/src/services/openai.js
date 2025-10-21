import OpenAI from 'openai';
import logger from '../utils/logger.js';

class OpenAIService {
  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      logger.warn('OpenAI API key not provided. AI insights will be disabled.');
      this.client = null;
      return;
    }

    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    logger.info('OpenAI service initialized');
  }

  /**
   * Analyze listening data for any date range and provide mood/behavior insights
   */
  async analyzeWeeklyListening(weeklyData, historicalContext = null) {
    if (!this.client) {
      throw new Error('OpenAI service not initialized. Please check API key.');
    }

    try {
      const prompt = this.buildAnalysisPrompt(weeklyData, historicalContext);

      const response = await this.client.chat.completions.create({
        model: 'gpt-4o-mini', // Cost-effective model for analysis
        messages: [
          {
            role: 'system',
            content: `You are a music psychology expert who analyzes listening patterns to provide insights about mood, behavior, and personality traits.

Your analysis should be:
- Insightful but not overly clinical
- Focused on patterns and trends
- Encouraging and positive in tone
- Specific to the music data provided
- Include actionable observations
- IMPORTANT: Do NOT use terms like "this week", "weekly", or "week's" - the data can be for ANY date range (day, week, month, etc.). Use general terms like "during this period", "in this timeframe", "throughout these listening sessions", etc.

Return your response as a JSON object with this structure:
{
  "mood_summary": "Brief overall mood assessment for the period (avoid week-specific language)",
  "key_insights": ["insight1", "insight2", "insight3"],
  "listening_patterns": "Analysis of when and how they listen during this period",
  "musical_personality": "What their music choices say about them",
  "trends_vs_previous": "Comparison to historical data if available",
  "recommendations": "Suggestions based on patterns"
}`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1500
      });

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

    let prompt = `Analyze the listening data for this period (${week_start} to ${week_end}):

LISTENING OVERVIEW:
- Total plays: ${total_plays}
- Unique tracks: ${unique_tracks}
- Unique artists: ${unique_artists}
- Repeat factor: ${(total_plays / unique_tracks).toFixed(1)}x

TOP ARTISTS DURING THIS PERIOD:
${top_artists.map((artist, i) => `${i + 1}. ${artist.name} (${artist.plays} plays)`).join('\n')}

TOP TRACKS DURING THIS PERIOD:
${top_tracks.map((track, i) => `${i + 1}. "${track.name}" by ${track.artist} (${track.plays} plays)`).join('\n')}

TOP ALBUMS DURING THIS PERIOD:
${top_albums.map((album, i) => `${i + 1}. "${album.name}" by ${album.artist} (${album.plays} plays)`).join('\n')}

LISTENING PATTERNS:
- Peak listening hours: ${listening_times.peak_hours.join(', ')}
- Most active days: ${daily_patterns.most_active_days.join(', ')}
- Total listening time: ${Math.round(listening_times.total_minutes / 60)} hours

MUSICAL DIVERSITY:
- Genre distribution: ${genres ? genres.map(g => `${g.name} (${g.percentage}%)`).join(', ') : 'Various'}
- Discovery rate: ${((unique_tracks / total_plays) * 100).toFixed(1)}% new tracks`;

    if (historicalContext) {
      prompt += `\n\nCOMPARISON TO PREVIOUS PERIODS:
- Previous period plays: ${historicalContext.previous_week_plays || 'N/A'}
- Trend: ${historicalContext.trend || 'First analysis'}
- Notable changes: ${historicalContext.notable_changes || 'Establishing baseline'}`;
    } else {
      prompt += '\n\nNOTE: This is the first analysis, so no historical comparison available.';
    }

    return prompt;
  }

  /**
   * Generate a quick mood summary from recent tracks
   */
  async quickMoodAnalysis(recentTracks) {
    if (!this.client) {
      return null;
    }

    try {
      const trackList = recentTracks
        .map(track => `"${track.name}" by ${track.artist}`)
        .join('\n');

      const response = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Analyze these recent music tracks and provide a brief 1-2 sentence mood assessment based on the musical choices. Be concise and insightful.'
          },
          {
            role: 'user',
            content: `Recent tracks:\n${trackList}`
          }
        ],
        temperature: 0.8,
        max_tokens: 150
      });

      return response.choices[0].message.content.trim();

    } catch (error) {
      logger.error('Error in quick mood analysis:', error);
      return null;
    }
  }

  /**
   * Check if OpenAI service is available
   */
  isAvailable() {
    return this.client !== null;
  }
}

export default OpenAIService;