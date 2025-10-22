/**
 * Chat Service
 * Business logic for AI chat functionality
 * Handles function execution and message processing
 */

import OpenAIClient from './openaiClient.js';
import { CHAT_FUNCTIONS } from './functionDefinitions.js';
import { getUniqueCounts, getBehaviorAnalysis, getCalculatedMetrics, getDiscoveryFreshness } from '../../db/analytics/index.js';
import { getArtistInfo } from '../../db/entities/index.js';
import { searchAll } from '../../db/features/search/index.js';
import {
  getTopArtists,
  getTopTracks,
  getTopAlbums,
  getGenreBreakdown,
  getListeningTimePatterns,
  getDiscoveryStats,
  getRecentDiscoveries,
  compareArtists,
  getAlbumDetailsByName,
  getTrackDetailsByName
} from '../../db/aggregations/index.js';
import logger from '../../utils/logger.js';

class ChatService {
  constructor() {
    this.openai = new OpenAIClient();
  }

  /**
   * Execute a chat function by name
   * @param {string} functionName - Name of the function to execute
   * @param {Object} args - Function arguments
   * @returns {Promise<any>} Function result
   */
  async executeChatFunction(functionName, args) {
    const functions = this.getAvailableFunctions();

    if (!functions[functionName]) {
      throw new Error(`Function ${functionName} not available`);
    }

    return await functions[functionName](args);
  }

  /**
   * Get all available chat functions
   * @returns {Object} Map of function names to implementations
   */
  getAvailableFunctions() {
    return {
      /**
       * Get top artists for a time period
       */
      getTopArtists: async (args) => {
        return new Promise((resolve, reject) => {
          getTopArtists(args.limit || 10, args.period || 'overall', (err, artists) => {
            if (err) {
              return reject(err);
            }
            resolve(artists.map(a => ({
              name: a.artist,
              plays: a.playcount
              // Note: Image URLs excluded from AI responses for cleaner chat formatting
            })));
          });
        });
      },

      /**
       * Get top tracks for a time period
       */
      getTopTracks: async (args) => {
        return new Promise((resolve, reject) => {
          getTopTracks({
            limit: args.limit || 10,
            period: args.period || 'overall'
          }, (err, tracks) => {
            if (err) {
              return reject(err);
            }
            resolve(tracks.map(t => ({
              name: t.track,
              artist: t.artist,
              album: t.album,
              plays: t.playcount
            })));
          });
        });
      },

      /**
       * Get overall listening statistics
       */
      getListeningStats: async () => {
        return new Promise((resolve, reject) => {
          // Get unique counts
          getUniqueCounts((err, counts) => {
            if (err) {
              return reject(err);
            }

            // Get behavior analysis
            getBehaviorAnalysis((err2, behavior) => {
              if (err2) {
                return reject(err2);
              }

              // Get calculated metrics
              getCalculatedMetrics((err3, metrics) => {
                if (err3) {
                  return reject(err3);
                }

                // Get discovery freshness
                getDiscoveryFreshness((err4, discovery) => {
                  if (err4) {
                    return reject(err4);
                  }

                  resolve({
                    total_plays: counts.playCount || 0,
                    unique_tracks: counts.uniqueTrackCount || 0,
                    unique_artists: counts.uniqueArtistCount || 0,
                    unique_albums: counts.uniqueAlbumCount || 0,
                    listening_time_hours: Math.round((behavior.totalListeningTimeMs || 0) / (1000 * 60 * 60)),
                    repeat_factor: behavior.repeatFactor || 0,
                    diversity_score: behavior.diversityScore || 0,
                    tracks_per_artist: metrics.tracksPerArtist || 0,
                    plays_per_artist: metrics.playsPerArtist || 0,
                    hours_per_day: metrics.hoursPerDay || 0,
                    discovery_frequency: metrics.discoveryFrequency || 0,
                    replay_rate: metrics.replayRate || 0,
                    peak_listening_hour: behavior.peakListeningHourFormatted || 'N/A',
                    most_active_day: behavior.mostActiveDay || 'N/A',
                    hours_since_new_track: discovery.hoursSinceNewTrack || null,
                    hours_since_new_artist: discovery.hoursSinceNewArtist || null
                  });
                });
              });
            });
          });
        });
      },

      /**
       * Get detailed information about an artist
       */
      getArtistDetails: async (args) => {
        return new Promise((resolve, reject) => {
          // First search for the artist
          searchAll(args.artistName, (err, results) => {
            if (err) {
              return reject(err);
            }

            if (!results.artists || results.artists.length === 0) {
              return resolve({ error: 'Artist not found in listening history' });
            }

            const artist = results.artists[0];

            // Get detailed artist info
            getArtistInfo(artist.id, (err, artistData) => {
              if (err) {
                return reject(err);
              }

              resolve({
                name: artistData.name,
                plays: artistData.play_count || 0,
                genres: artistData.genres || []
                // Note: Image URLs excluded from AI responses for cleaner chat formatting
              });
            });
          });
        });
      },

      /**
       * Search for music in listening history
       */
      searchMusic: async (args) => {
        return new Promise((resolve, reject) => {
          searchAll(args.query, (err, results) => {
            if (err) {
              return reject(err);
            }

            resolve({
              artists: (results.artists || []).slice(0, 5).map(a => ({
                name: a.name,
                plays: a.play_count
              })),
              albums: (results.albums || []).slice(0, 5).map(a => ({
                name: a.name,
                artist: a.artist_name,
                plays: a.play_count
              })),
              tracks: (results.tracks || []).slice(0, 5).map(t => ({
                name: t.name,
                artist: t.artist_name,
                plays: t.play_count
              }))
            });
          });
        });
      },

      /**
       * Get top albums for a time period
       */
      getTopAlbums: async (args) => {
        return new Promise((resolve, reject) => {
          getTopAlbums({
            limit: args.limit || 10,
            period: args.period || 'overall'
          }, (err, albums) => {
            if (err) {
              return reject(err);
            }
            resolve(albums.map(a => ({
              name: a.album,
              artist: a.artist,
              plays: a.playcount,
              releaseDate: a.releaseDate
              // Note: Image URLs excluded from AI responses for cleaner chat formatting
            })));
          });
        });
      },

      /**
       * Get genre breakdown for a time period
       */
      getGenreBreakdown: async (args) => {
        return new Promise((resolve, reject) => {
          getGenreBreakdown(args.period || 'all', (err, genres) => {
            if (err) {
              return reject(err);
            }
            resolve(genres);
          });
        });
      },

      /**
       * Get listening time patterns
       */
      getListeningTimePatterns: async () => {
        return new Promise((resolve, reject) => {
          getListeningTimePatterns((err, patterns) => {
            if (err) {
              return reject(err);
            }
            resolve(patterns);
          });
        });
      },

      /**
       * Get discovery statistics
       */
      getDiscoveryStats: async (args) => {
        return new Promise((resolve, reject) => {
          getDiscoveryStats(args.period || 'all', (err, stats) => {
            if (err) {
              return reject(err);
            }
            resolve(stats);
          });
        });
      },

      /**
       * Get recent discoveries
       */
      getRecentDiscoveries: async (args) => {
        return new Promise((resolve, reject) => {
          getRecentDiscoveries(args.limit || 10, (err, discoveries) => {
            if (err) {
              return reject(err);
            }
            resolve(discoveries);
          });
        });
      },

      /**
       * Compare two artists
       */
      compareArtists: async (args) => {
        return new Promise((resolve, reject) => {
          compareArtists(args.artist1, args.artist2, (err, comparison) => {
            if (err) {
              return reject(err);
            }
            resolve(comparison);
          });
        });
      },

      /**
       * Get album details by name
       */
      getAlbumDetails: async (args) => {
        return new Promise((resolve, reject) => {
          getAlbumDetailsByName(args.albumName, (err, details) => {
            if (err) {
              return reject(err);
            }
            resolve(details);
          });
        });
      },

      /**
       * Get track details by name
       */
      getTrackDetails: async (args) => {
        return new Promise((resolve, reject) => {
          getTrackDetailsByName(args.trackName, (err, details) => {
            if (err) {
              return reject(err);
            }
            resolve(details);
          });
        });
      },

      /**
       * Get top artists for a custom date range
       */
      getTopArtistsByDateRange: async (args) => {
        return new Promise((resolve, reject) => {
          getTopArtists(
            args.limit || 10,
            {
              startDate: args.startDate,
              endDate: args.endDate
            },
            (err, artists) => {
              if (err) return reject(err);
              resolve(artists.map(a => ({
                name: a.artist,
                plays: a.playcount
                // Note: Image URLs excluded from AI responses for cleaner chat formatting
              })));
            }
          );
        });
      },

      /**
       * Get top tracks for a custom date range
       */
      getTopTracksByDateRange: async (args) => {
        return new Promise((resolve, reject) => {
          getTopTracks({
            limit: args.limit || 10,
            startDate: args.startDate,
            endDate: args.endDate
          }, (err, tracks) => {
            if (err) return reject(err);
            resolve(tracks.map(t => ({
              name: t.track,
              artist: t.artist,
              album: t.album,
              plays: t.playcount
            })));
          });
        });
      },

      /**
       * Get top albums for a custom date range
       */
      getTopAlbumsByDateRange: async (args) => {
        return new Promise((resolve, reject) => {
          getTopAlbums({
            limit: args.limit || 10,
            startDate: args.startDate,
            endDate: args.endDate
          }, (err, albums) => {
            if (err) return reject(err);
            resolve(albums.map(a => ({
              name: a.album,
              artist: a.artist,
              plays: a.playcount,
              releaseDate: a.releaseDate
              // Note: Image URLs excluded from AI responses for cleaner chat formatting
            })));
          });
        });
      }
    };
  }

  /**
   * Process a user message and get AI response
   * @param {Array} messages - Conversation messages
   * @returns {Promise<Object>} AI response with message and metadata
   */
  async processMessage(messages) {
    if (!this.openai.isAvailable()) {
      throw new Error('OpenAI service not available');
    }

    // Calculate time context
    const now = new Date();
    const timeContext = {
      current_date: now.toISOString().split('T')[0],
      day_of_week: now.toLocaleDateString('en-US', { weekday: 'long' }),
      current_month: now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    };

    // System prompt with context
    const systemPrompt = `You are a helpful AI assistant for analyzing music listening data. You can answer questions about the user's listening history, preferences, and patterns.

CURRENT DATE CONTEXT:
- Today's date: ${timeContext.current_date}
- Day of week: ${timeContext.day_of_week}
- Current month: ${timeContext.current_month}

FORMATTING RULES (VERY IMPORTANT):
- ALWAYS format your responses using markdown for better readability
- Use **bold** for artist names, album names, and track names
- Use numbered lists (1., 2., 3.) for rankings and top items
- Use bullet points (•) for insights and patterns
- Use headers (## or ###) to organize different sections
- Format play counts with commas (e.g., 1,234 plays)
- Never include raw URLs or technical IDs in your response
- Present data in a clean, scannable format

RESPONSE STYLE:
- Use the available tools to fetch relevant data
- Provide specific, data-driven insights
- Be conversational and friendly
- Use "you/your" when referring to the user
- Highlight interesting patterns or trends
- Keep responses concise but informative
- When mentioning time periods, be specific about what dates they cover

EXAMPLE GOOD RESPONSE FORMAT:
"Here are your top 5 artists this month:

1. **Drake** - 234 plays
2. **The Weeknd** - 187 plays
3. **Kendrick Lamar** - 156 plays
4. **SZA** - 142 plays
5. **Travis Scott** - 128 plays

### Insights:
• You've been listening to Drake 25% more than last month
• Hip-hop and R&B dominate your top artists"

AVAILABLE TIME PERIODS AND THEIR MEANINGS:
- 7day: Last 7 days (from ${new Date(now - 7*24*60*60*1000).toISOString().split('T')[0]} to ${timeContext.current_date})
- 1month: Last 30 days (from ${new Date(now - 30*24*60*60*1000).toISOString().split('T')[0]} to ${timeContext.current_date})
- 3month: Last 90 days (from ${new Date(now - 90*24*60*60*1000).toISOString().split('T')[0]} to ${timeContext.current_date})
- 6month: Last 180 days (from ${new Date(now - 180*24*60*60*1000).toISOString().split('T')[0]} to ${timeContext.current_date})
- 12month: Last 365 days (from ${new Date(now - 365*24*60*60*1000).toISOString().split('T')[0]} to ${timeContext.current_date})
- overall: All time (complete listening history)

HOW TO INTERPRET USER TIME REQUESTS (VERY IMPORTANT):

**For ROLLING WINDOWS** (relative to today):
When user says:                     → Use function:
- "last week" / "this week"         → getTopArtists with period="7day"
- "last month" / "this month"       → getTopArtists with period="1month"
- "last 30 days"                    → getTopArtists with period="1month"
- "past few months" / "recently"    → getTopArtists with period="3month"
- "this year" / "last year"         → getTopArtists with period="12month"
- "all time" / "ever" / "total"     → getTopArtists with period="overall"

**For SPECIFIC CALENDAR PERIODS** (exact dates):
When user says:                     → Use function:
- "August 2025"                     → getTopArtistsByDateRange with startDate="2025-08-01", endDate="2025-08-31"
- "September 2024"                  → getTopArtistsByDateRange with startDate="2024-09-01", endDate="2024-09-30"
- "January 1-15, 2025"              → getTopArtistsByDateRange with startDate="2025-01-01", endDate="2025-01-15"
- "Q1 2025"                         → getTopArtistsByDateRange with startDate="2025-01-01", endDate="2025-03-31"
- "First week of August"            → getTopArtistsByDateRange with startDate="2025-08-01", endDate="2025-08-07"

CRITICAL RULES:
1. Rolling windows (7day, 1month) = LAST X days from today
2. Calendar periods = SPECIFIC start and end dates
3. "last month" = rolling window (use 1month), "August" = calendar month (use date range)
4. When in doubt, ask user to clarify!

IMPORTANT: When you receive data from the functions, remember that the data covers the ENTIRE period specified, not just recent days. For example, if asking for "1month" data, the plays/artists/tracks span the full 30-day period.`;

    // Get initial response from AI
    const response = await this.openai.createChatCompletion(
      [{ role: 'system', content: systemPrompt }, ...messages],
      CHAT_FUNCTIONS,
      { toolChoice: 'auto' }
    );

    const responseMessage = response.choices[0].message;

    // Check if the AI wants to call tools
    if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
      logger.info(`AI requested ${responseMessage.tool_calls.length} tool call(s)`);

      // Execute ALL tool calls in parallel
      const toolResults = await Promise.all(
        responseMessage.tool_calls.map(async (toolCall) => {
          const functionName = toolCall.function.name;
          const functionArgs = JSON.parse(toolCall.function.arguments);

          logger.info(`AI calling function: ${functionName} with args:`, functionArgs);

          try {
            const functionResult = await this.executeChatFunction(functionName, functionArgs);
            return {
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify(functionResult)
            };
          } catch (error) {
            logger.error(`Error executing ${functionName}:`, error);
            return {
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify({ error: error.message })
            };
          }
        })
      );

      // Get final response with ALL function results
      const secondResponse = await this.openai.createChatCompletion(
        [
          { role: 'system', content: `You are a helpful AI assistant for analyzing music listening data.

CURRENT DATE CONTEXT:
- Today's date: ${timeContext.current_date}
- Current month: ${timeContext.current_month}

FORMATTING RULES (VERY IMPORTANT):
- ALWAYS format your responses using markdown for better readability
- Use **bold** for artist names, album names, and track names
- Use numbered lists (1., 2., 3.) for rankings and top items
- Use bullet points (•) for insights and patterns
- Use headers (## or ###) to organize different sections
- Format play counts with commas (e.g., 1,234 plays)
- NEVER include image URLs, markdown images, or any URLs in your response
- NEVER mention technical fields like "image_url" or show raw data
- Present data in a clean, scannable format that looks good in a chat interface

EXAMPLE GOOD RESPONSE:
"Here are your top 5 artists this month:

1. **Drake** - 234 plays
2. **The Weeknd** - 187 plays
3. **Kendrick Lamar** - 156 plays

### Insights:
• Hip-hop dominates your listening this month
• You've discovered 3 new artists"

The data you just received covers the time period requested. Provide insights about this specific timeframe when responding to the user.` },
          ...messages,
          responseMessage,
          ...toolResults  // Include ALL tool results
        ]
      );

      return {
        success: true,
        message: secondResponse.choices[0].message.content,
        functionCalls: responseMessage.tool_calls.map((toolCall, index) => ({
          name: toolCall.function.name,
          arguments: JSON.parse(toolCall.function.arguments),
          result: JSON.parse(toolResults[index].content)
        })),
        usage: {
          ...response.usage,
          total_tokens: response.usage.total_tokens + secondResponse.usage.total_tokens
        }
      };
    }

    // No tool call needed, return direct response
    return {
      success: true,
      message: responseMessage.content,
      usage: response.usage
    };
  }

  /**
   * Check if chat service is available
   * @returns {boolean}
   */
  isAvailable() {
    return this.openai.isAvailable();
  }
}

export default ChatService;
