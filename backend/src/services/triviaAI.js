import OpenAI from 'openai';
import logger from '../utils/logger.js';

class TriviaAIService {
  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      logger.warn('OpenAI API key not configured - trivia generation will not be available');
      this.openai = null;
      return;
    }

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    this.model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  }

  isAvailable() {
    return this.openai !== null;
  }

  /**
   * Generate trivia questions based on listening data
   */
  async generateTriviaQuestions(listeningData, options = {}) {
    if (!this.isAvailable()) {
      throw new Error('OpenAI service not available - check API key configuration');
    }

    const {
      questionCount = 10,
      difficulty = 'mixed',
      categories = ['top_tracks', 'top_artists', 'listening_patterns', 'discovery_dates'],
      includeExplanations = true
    } = options;

    const startTime = Date.now();

    try {
      const prompt = this.buildTriviaPrompt(listeningData, {
        questionCount,
        difficulty,
        categories,
        includeExplanations
      });

      logger.info(`Generating ${questionCount} trivia questions using ${this.model}`);

      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'You are a music trivia expert who creates personalized questions based on listening history. Generate engaging, accurate questions that test knowledge of personal music preferences and patterns.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        response_format: { type: 'json_object' }
      });

      const generationTime = Math.round((Date.now() - startTime) / 1000);
      const response = completion.choices[0].message.content;
      const questions = JSON.parse(response);

      const usage = {
        prompt_tokens: completion.usage.prompt_tokens,
        completion_tokens: completion.usage.completion_tokens,
        total_tokens: completion.usage.total_tokens,
        model: this.model,
        generation_time_seconds: generationTime
      };

      logger.info(`Generated ${questions.questions?.length || 0} trivia questions in ${generationTime}s`);

      return {
        questions: questions.questions || [],
        usage,
        success: true
      };

    } catch (error) {
      const generationTime = Math.round((Date.now() - startTime) / 1000);
      logger.error(`Error generating trivia questions: ${error.message}`);

      return {
        questions: [],
        usage: { generation_time_seconds: generationTime },
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Build the prompt for trivia generation
   */
  buildTriviaPrompt(listeningData, options) {
    const { questionCount, difficulty, categories, includeExplanations } = options;

    let prompt = `Based on the following music listening data, generate ${questionCount} personalized trivia questions.

LISTENING DATA:
${this.formatListeningData(listeningData)}

REQUIREMENTS:
- Question count: ${questionCount}
- Difficulty: ${difficulty}
- Categories to include: ${categories.join(', ')}
- Include explanations: ${includeExplanations}

QUESTION TYPES TO USE:
1. multiple_choice: 4 options with one correct answer
2. true_false: True or false statement
3. fill_blank: Fill in the missing word/phrase
4. ranking: Order items by play count or preference

DIFFICULTY LEVELS:
- easy: Recent favorites, obvious patterns (last 1-3 months)
- medium: Deeper catalog knowledge, some analysis needed (3-6 months)
- hard: Obscure tracks, specific dates, complex patterns (6+ months)

CATEGORIES:
- top_tracks: Questions about most played tracks
- top_artists: Questions about favorite artists
- top_albums: Questions about album preferences
- listening_patterns: Questions about when/how much listening
- discovery_dates: When specific music was first discovered
- music_knowledge: Artist facts, album details, genres

RESPONSE FORMAT (JSON):
{
  "questions": [
    {
      "question_text": "What was your most played track in the last 3 months?",
      "question_type": "multiple_choice",
      "difficulty_level": "easy",
      "category": "top_tracks",
      "correct_answer": "Track Name",
      "options": ["Track Name", "Other Track 1", "Other Track 2", "Other Track 3"],
      "explanation": "This track had 45 plays compared to the next highest with 32 plays.",
      "data_source": {
        "track_id": 123,
        "play_count": 45,
        "period": "3month"
      }
    }
  ]
}

Make questions personal and engaging. Use specific data from their listening history. Ensure all multiple choice options are plausible based on their music taste.`;

    return prompt;
  }

  /**
   * Format listening data for the prompt
   */
  formatListeningData(data) {
    let formatted = '';

    if (data.topArtists?.length > 0) {
      formatted += 'TOP ARTISTS:\n';
      data.topArtists.slice(0, 20).forEach((artist, index) => {
        formatted += `${index + 1}. ${artist.name} (${artist.play_count} plays)\n`;
        if (artist.first_play) {
          formatted += `   First discovered: ${new Date(artist.first_play).toDateString()}\n`;
        }
      });
      formatted += '\n';
    }

    if (data.topTracks?.length > 0) {
      formatted += 'TOP TRACKS:\n';
      data.topTracks.slice(0, 20).forEach((track, index) => {
        const artists = Array.isArray(track.artist_names) ? track.artist_names.join(', ') : 'Unknown Artist';
        formatted += `${index + 1}. "${track.name}" by ${artists} (${track.play_count} plays)\n`;
        if (track.first_play) {
          formatted += `   First played: ${new Date(track.first_play).toDateString()}\n`;
        }
      });
      formatted += '\n';
    }

    if (data.topAlbums?.length > 0) {
      formatted += 'TOP ALBUMS:\n';
      data.topAlbums.slice(0, 15).forEach((album, index) => {
        formatted += `${index + 1}. "${album.name}" (${album.play_count} plays)\n`;
      });
      formatted += '\n';
    }

    if (data.listeningPatterns?.length > 0) {
      const recentPatterns = data.listeningPatterns.slice(-30); // Last 30 days
      formatted += 'RECENT LISTENING PATTERNS:\n';
      formatted += `Average daily plays: ${Math.round(recentPatterns.reduce((sum, day) => sum + parseInt(day.plays), 0) / recentPatterns.length)}\n`;
      formatted += `Most active day: ${recentPatterns.reduce((max, day) => parseInt(day.plays) > parseInt(max.plays) ? day : max).date}\n`;
      formatted += `Total unique tracks in period: ${Math.max(...recentPatterns.map(day => parseInt(day.unique_tracks)))}\n`;
      formatted += '\n';
    }

    return formatted || 'No listening data available.';
  }

  /**
   * Generate a quick trivia session with default parameters
   */
  async generateQuickTrivia(listeningData, difficulty = 'mixed') {
    return this.generateTriviaQuestions(listeningData, {
      questionCount: 5,
      difficulty,
      categories: ['top_tracks', 'top_artists', 'listening_patterns'],
      includeExplanations: true
    });
  }

  /**
   * Generate themed trivia (e.g., "Discovery Journey", "Recent Favorites")
   */
  async generateThemedTrivia(listeningData, theme, options = {}) {
    const themes = {
      'discovery_journey': {
        categories: ['discovery_dates', 'top_artists', 'music_knowledge'],
        questionCount: 8,
        difficulty: 'medium'
      },
      'recent_favorites': {
        categories: ['top_tracks', 'top_albums', 'listening_patterns'],
        questionCount: 6,
        difficulty: 'easy'
      },
      'deep_cuts': {
        categories: ['top_tracks', 'music_knowledge', 'discovery_dates'],
        questionCount: 10,
        difficulty: 'hard'
      },
      'artist_expert': {
        categories: ['top_artists', 'music_knowledge', 'top_albums'],
        questionCount: 8,
        difficulty: 'medium'
      }
    };

    const themeConfig = themes[theme] || themes['recent_favorites'];
    const mergedOptions = { ...themeConfig, ...options };

    return this.generateTriviaQuestions(listeningData, mergedOptions);
  }
}

// Export singleton instance
const triviaAI = new TriviaAIService();
export default triviaAI;