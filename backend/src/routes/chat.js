import express from 'express';
import logger from '../utils/logger.js';
import { ChatService } from '../services/ai/index.js';
import {
  createConversation,
  getAllConversations,
  getConversation,
  addMessage,
  updateConversationTitle,
  deleteConversation,
  getRecentMessages
} from '../db/chat/index.js';

const router = express.Router();

// Chat service instance
const chatService = new ChatService();

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

    if (!chatService.isAvailable()) {
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

    // Format messages for AI
    const formattedMessages = recentMessages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    // Process message through chat service
    const aiResponse = await chatService.processMessage(formattedMessages);

    // Save assistant message (support both single functionCall and multiple functionCalls)
    const functionCallData = aiResponse.functionCalls || aiResponse.functionCall || null;
    const assistantMessage = await addMessage(
      conversationId,
      'assistant',
      aiResponse.message,
      functionCallData,
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
