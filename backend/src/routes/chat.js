import express from 'express';
import logger from '../utils/logger.js';
import OpenAIService from '../services/openai.js';
import {
  createConversation,
  getAllConversations,
  getConversation,
  addMessage,
  updateConversationTitle,
  deleteConversation,
  getRecentMessages
} from '../db/chat.js';
import { getTopArtists, getTopTracks } from '../db/topQueries.js';
import { getUniqueCounts, getBehaviorAnalysis, getCalculatedMetrics, getDiscoveryFreshness } from '../db/analytics.js';
import { getArtistInfo } from '../db/artistDb.js';
import { searchAll } from '../db/search.js';

const router = express.Router();

// OpenAI service will be initialized on first use
let openaiService = null;

function getOpenAIService() {
  if (!openaiService) {
    openaiService = new OpenAIService();
  }
  return openaiService;
}

// GET /api/chat/conversations - Get all conversations
router.get('/conversations', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const conversations = await getAllConversations(limit);

    res.json({
      success: true,
      conversations
    });

  } catch (error) {
    logger.error(`Error fetching conversations: ${error.message}`);
    res.status(500).json({
      error: 'Failed to fetch conversations',
      details: error.message
    });
  }
});

// GET /api/chat/conversations/:id - Get a specific conversation with messages
router.get('/conversations/:id', async (req, res) => {
  try {
    const conversationId = parseInt(req.params.id);

    if (isNaN(conversationId)) {
      return res.status(400).json({ error: 'Invalid conversation ID' });
    }

    const conversation = await getConversation(conversationId);

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json({
      success: true,
      conversation
    });

  } catch (error) {
    logger.error(`Error fetching conversation: ${error.message}`);
    res.status(500).json({
      error: 'Failed to fetch conversation',
      details: error.message
    });
  }
});

// POST /api/chat/conversations - Create a new conversation
router.post('/conversations', async (req, res) => {
  try {
    const { title } = req.body;
    const conversation = await createConversation(title || 'New Conversation');

    res.json({
      success: true,
      conversation
    });

  } catch (error) {
    logger.error(`Error creating conversation: ${error.message}`);
    res.status(500).json({
      error: 'Failed to create conversation',
      details: error.message
    });
  }
});

// PUT /api/chat/conversations/:id - Update conversation title
router.put('/conversations/:id', async (req, res) => {
  try {
    const conversationId = parseInt(req.params.id);
    const { title } = req.body;

    if (isNaN(conversationId)) {
      return res.status(400).json({ error: 'Invalid conversation ID' });
    }

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const conversation = await updateConversationTitle(conversationId, title);

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json({
      success: true,
      conversation
    });

  } catch (error) {
    logger.error(`Error updating conversation: ${error.message}`);
    res.status(500).json({
      error: 'Failed to update conversation',
      details: error.message
    });
  }
});

// DELETE /api/chat/conversations/:id - Delete a conversation
router.delete('/conversations/:id', async (req, res) => {
  try {
    const conversationId = parseInt(req.params.id);

    if (isNaN(conversationId)) {
      return res.status(400).json({ error: 'Invalid conversation ID' });
    }

    const deleted = await deleteConversation(conversationId);

    if (!deleted) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json({
      success: true,
      message: 'Conversation deleted successfully',
      deleted
    });

  } catch (error) {
    logger.error(`Error deleting conversation: ${error.message}`);
    res.status(500).json({
      error: 'Failed to delete conversation',
      details: error.message
    });
  }
});

// POST /api/chat/message - Send a message and get AI response
router.post('/message', async (req, res) => {
  try {
    const { conversationId, message } = req.body;

    if (!conversationId || !message) {
      return res.status(400).json({
        error: 'conversationId and message are required'
      });
    }

    if (!getOpenAIService().isAvailable()) {
      return res.status(503).json({
        error: 'AI chat unavailable',
        message: 'OpenAI service not configured. Please add OPENAI_API_KEY to environment variables.'
      });
    }

    // Verify conversation exists
    const conversation = await getConversation(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Save user message
    await addMessage(conversationId, 'user', message);

    // Get recent messages for context
    const recentMessages = await getRecentMessages(conversationId, 10);

    // Format messages for OpenAI
    const formattedMessages = recentMessages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    // Define available functions for the AI to call
    const availableFunctions = {
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
      }
    };

    // Get AI response
    const aiResponse = await getOpenAIService().chat(formattedMessages, availableFunctions);

    // Save assistant message
    const assistantMessage = await addMessage(
      conversationId,
      'assistant',
      aiResponse.message,
      aiResponse.functionCall || null,
      { usage: aiResponse.usage }
    );

    logger.info(`Chat response generated for conversation ${conversationId}`);

    res.json({
      success: true,
      message: assistantMessage,
      usage: aiResponse.usage
    });

  } catch (error) {
    logger.error(`Error processing chat message: ${error.message}`);
    res.status(500).json({
      error: 'Failed to process message',
      details: error.message
    });
  }
});

export default router;
