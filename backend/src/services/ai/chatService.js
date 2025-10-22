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
              plays: a.playcount,
              image: a.image
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
                image: artistData.image_url,
                genres: artistData.genres || []
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
          getTopAlbums(args.limit || 10, args.period || 'overall', (err, albums) => {
            if (err) {
              return reject(err);
            }
            resolve(albums.map(a => ({
              name: a.album,
              artist: a.artist,
              plays: a.playcount,
              image: a.image,
              releaseDate: a.releaseDate
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

IMPORTANT: When you receive data from the functions, remember that the data covers the ENTIRE period specified, not just recent days. For example, if asking for "1m" data, the plays/artists/tracks span the full 30-day period.`;

    // Get initial response from AI
    const response = await this.openai.createChatCompletion(
      [{ role: 'system', content: systemPrompt }, ...messages],
      CHAT_FUNCTIONS,
      { toolChoice: 'auto' }
    );

    const responseMessage = response.choices[0].message;

    // Check if the AI wants to call a tool
    if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
      const toolCall = responseMessage.tool_calls[0];
      const functionName = toolCall.function.name;
      const functionArgs = JSON.parse(toolCall.function.arguments);

      logger.info(`AI calling function: ${functionName} with args:`, functionArgs);

      // Execute the function
      const functionResult = await this.executeChatFunction(functionName, functionArgs);

      // Get final response with function result
      const secondResponse = await this.openai.createChatCompletion(
        [
          { role: 'system', content: `You are a helpful AI assistant for analyzing music listening data.

CURRENT DATE CONTEXT:
- Today's date: ${timeContext.current_date}
- Current month: ${timeContext.current_month}

The data you just received covers the time period requested. Provide insights about this specific timeframe when responding to the user.` },
          ...messages,
          responseMessage,
          {
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(functionResult)
          }
        ]
      );

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
