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
            content: `You are a music psychology expert who analyzes listening patterns to provide personalized insights about mood, behavior, and personality traits.

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
   * Chat with AI about listening data using function calling
   */
  async chat(messages, availableFunctions = {}) {
    if (!this.client) {
      throw new Error('OpenAI service not initialized. Please check API key.');
    }

    try {
      // Define tools the AI can use to query data
      const tools = [
        {
          type: 'function',
          function: {
            name: 'getTopArtists',
            description: 'Get the user\'s top artists for a specific time period',
            parameters: {
              type: 'object',
              properties: {
                period: {
                  type: 'string',
                  enum: ['7d', '1m', '3m', '6m', '1y', 'all'],
                  description: 'Time period: 7d (week), 1m (month), 3m, 6m, 1y (year), all'
                },
                limit: {
                  type: 'number',
                  description: 'Number of artists to return (default 10)',
                  default: 10
                }
              },
              required: ['period']
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'getTopTracks',
            description: 'Get the user\'s top tracks for a specific time period',
            parameters: {
              type: 'object',
              properties: {
                period: {
                  type: 'string',
                  enum: ['7d', '1m', '3m', '6m', '1y', 'all'],
                  description: 'Time period'
                },
                limit: {
                  type: 'number',
                  description: 'Number of tracks to return',
                  default: 10
                }
              },
              required: ['period']
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'getListeningStats',
            description: 'Get overall listening statistics and behavior analysis',
            parameters: {
              type: 'object',
              properties: {
                period: {
                  type: 'string',
                  enum: ['7d', '1m', '3m', '6m', '1y', 'all'],
                  description: 'Time period for stats'
                }
              }
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'getArtistDetails',
            description: 'Get detailed information about a specific artist including play count and stats',
            parameters: {
              type: 'object',
              properties: {
                artistName: {
                  type: 'string',
                  description: 'Name of the artist to look up'
                }
              },
              required: ['artistName']
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'searchMusic',
            description: 'Search for artists, albums, or tracks in the user\'s listening history',
            parameters: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query'
                }
              },
              required: ['query']
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'getTopAlbums',
            description: 'Get the user\'s top albums for a specific time period',
            parameters: {
              type: 'object',
              properties: {
                period: {
                  type: 'string',
                  enum: ['7d', '1m', '3m', '6m', '1y', 'all'],
                  description: 'Time period'
                },
                limit: {
                  type: 'number',
                  description: 'Number of albums to return',
                  default: 10
                }
              },
              required: ['period']
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'getGenreBreakdown',
            description: 'Get genre distribution and percentages for the user\'s listening in a time period',
            parameters: {
              type: 'object',
              properties: {
                period: {
                  type: 'string',
                  enum: ['7d', '1m', '3m', '6m', '1y', 'all'],
                  description: 'Time period for genre analysis'
                }
              },
              required: ['period']
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'getListeningTimePatterns',
            description: 'Get listening time patterns including peak hours, days of week, and session info',
            parameters: {
              type: 'object',
              properties: {}
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'getDiscoveryStats',
            description: 'Get statistics about new music discovery (new artists, tracks, albums) for a time period',
            parameters: {
              type: 'object',
              properties: {
                period: {
                  type: 'string',
                  enum: ['7d', '1m', '3m', '6m', '1y', 'all'],
                  description: 'Time period for discovery analysis'
                }
              },
              required: ['period']
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'getRecentDiscoveries',
            description: 'Get recently discovered tracks (tracks played for the first time)',
            parameters: {
              type: 'object',
              properties: {
                limit: {
                  type: 'number',
                  description: 'Number of recent discoveries to return',
                  default: 10
                }
              }
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'compareArtists',
            description: 'Compare listening statistics between two artists',
            parameters: {
              type: 'object',
              properties: {
                artist1: {
                  type: 'string',
                  description: 'First artist name'
                },
                artist2: {
                  type: 'string',
                  description: 'Second artist name'
                }
              },
              required: ['artist1', 'artist2']
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'getAlbumDetails',
            description: 'Get detailed information about a specific album including tracks and play counts',
            parameters: {
              type: 'object',
              properties: {
                albumName: {
                  type: 'string',
                  description: 'Name of the album to look up'
                }
              },
              required: ['albumName']
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'getTrackDetails',
            description: 'Get detailed information about a specific track including play history',
            parameters: {
              type: 'object',
              properties: {
                trackName: {
                  type: 'string',
                  description: 'Name of the track to look up'
                }
              },
              required: ['trackName']
            }
          }
        }
      ];

      // Calculate time period context
      const now = new Date();
      const timeContext = {
        current_date: now.toISOString().split('T')[0],
        day_of_week: now.toLocaleDateString('en-US', { weekday: 'long' }),
        current_month: now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      };

      const response = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a helpful AI assistant for analyzing music listening data. You can answer questions about the user's listening history, preferences, and patterns.

CURRENT DATE CONTEXT:
- Today's date: ${timeContext.current_date}
- Day of week: ${timeContext.day_of_week}
- Current month: ${timeContext.current_month}

When the user asks questions:
- Use the available tools to fetch relevant data
- Provide specific, data-driven insights
- Be conversational and friendly
- Use "you/your" when referring to the user
- Highlight interesting patterns or trends
- Keep responses concise but informative
- When mentioning time periods, be specific about what dates they cover

AVAILABLE TIME PERIODS AND THEIR MEANINGS:
- 7d: Last 7 days (from ${new Date(now - 7*24*60*60*1000).toISOString().split('T')[0]} to ${timeContext.current_date})
- 1m: Last 30 days (from ${new Date(now - 30*24*60*60*1000).toISOString().split('T')[0]} to ${timeContext.current_date})
- 3m: Last 90 days (from ${new Date(now - 90*24*60*60*1000).toISOString().split('T')[0]} to ${timeContext.current_date})
- 6m: Last 180 days (from ${new Date(now - 180*24*60*60*1000).toISOString().split('T')[0]} to ${timeContext.current_date})
- 1y: Last 365 days (from ${new Date(now - 365*24*60*60*1000).toISOString().split('T')[0]} to ${timeContext.current_date})
- all: All time (complete listening history)

IMPORTANT: When you receive data from the functions, remember that the data covers the ENTIRE period specified, not just recent days. For example, if asking for "1m" data, the plays/artists/tracks span the full 30-day period.`
          },
          ...messages
        ],
        tools,
        tool_choice: 'auto',
        temperature: 0.7,
        max_tokens: 500
      });

      const responseMessage = response.choices[0].message;

      // Check if the AI wants to call a tool
      if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
        const toolCall = responseMessage.tool_calls[0];
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments);

        logger.info(`AI calling function: ${functionName} with args:`, functionArgs);

        // Call the actual function if it's available
        if (availableFunctions[functionName]) {
          const functionResult = await availableFunctions[functionName](functionArgs);

          // Add function result to messages and get final response
          const secondResponse = await this.client.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: `You are a helpful AI assistant for analyzing music listening data.

CURRENT DATE CONTEXT:
- Today's date: ${timeContext.current_date}
- Current month: ${timeContext.current_month}

The data you just received covers the time period requested. Provide insights about this specific timeframe when responding to the user.`
              },
              ...messages,
              responseMessage,
              {
                role: 'tool',
                tool_call_id: toolCall.id,
                content: JSON.stringify(functionResult)
              }
            ],
            temperature: 0.7,
            max_tokens: 500
          });

          return {
            success: true,
            message: secondResponse.choices[0].message.content,
            functionCall: {
              name: functionName,
              arguments: functionArgs,
              result: functionResult
            },
            usage: {
              ...response.usage,
              total_tokens: response.usage.total_tokens + secondResponse.usage.total_tokens
            }
          };
        }

        // If function not available, return error
        return {
          success: false,
          message: 'I tried to access that data but the function is not available yet.',
          functionCall: {
            name: functionName,
            arguments: functionArgs
          },
          usage: response.usage
        };
      }

      // No tool call needed, return direct response
      return {
        success: true,
        message: responseMessage.content,
        usage: response.usage
      };

    } catch (error) {
      logger.error('Error in chat:', error);
      throw new Error(`Chat failed: ${error.message}`);
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