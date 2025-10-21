import { getPool } from './connection.js';
import logger from '../utils/logger.js';

const pool = () => getPool();

/**
 * Create a new chat conversation
 */
export async function createConversation(title = 'New Conversation') {
  try {
    const query = `
      INSERT INTO chat_conversations (title)
      VALUES ($1)
      RETURNING id, title, created_at, updated_at
    `;

    const result = await pool().query(query, [title]);
    logger.info(`Created new conversation with ID: ${result.rows[0].id}`);
    return result.rows[0];

  } catch (error) {
    logger.error('Error creating conversation:', error);
    throw error;
  }
}

/**
 * Get all conversations ordered by most recent
 */
export async function getAllConversations(limit = 50) {
  try {
    const query = `
      SELECT
        c.id,
        c.title,
        c.created_at,
        c.updated_at,
        COUNT(m.id) as message_count,
        (
          SELECT content
          FROM chat_messages
          WHERE conversation_id = c.id AND role = 'user'
          ORDER BY created_at ASC
          LIMIT 1
        ) as first_message
      FROM chat_conversations c
      LEFT JOIN chat_messages m ON c.id = m.conversation_id
      GROUP BY c.id
      ORDER BY c.updated_at DESC
      LIMIT $1
    `;

    const result = await pool().query(query, [limit]);
    return result.rows;

  } catch (error) {
    logger.error('Error getting conversations:', error);
    throw error;
  }
}

/**
 * Get a conversation with all its messages
 */
export async function getConversation(conversationId) {
  try {
    const conversationQuery = `
      SELECT id, title, created_at, updated_at
      FROM chat_conversations
      WHERE id = $1
    `;

    const messagesQuery = `
      SELECT id, role, content, function_call, metadata, created_at
      FROM chat_messages
      WHERE conversation_id = $1
      ORDER BY created_at ASC
    `;

    const [conversationResult, messagesResult] = await Promise.all([
      pool().query(conversationQuery, [conversationId]),
      pool().query(messagesQuery, [conversationId])
    ]);

    if (conversationResult.rows.length === 0) {
      return null;
    }

    return {
      ...conversationResult.rows[0],
      messages: messagesResult.rows
    };

  } catch (error) {
    logger.error('Error getting conversation:', error);
    throw error;
  }
}

/**
 * Add a message to a conversation
 */
export async function addMessage(conversationId, role, content, functionCall = null, metadata = null) {
  try {
    const query = `
      INSERT INTO chat_messages (conversation_id, role, content, function_call, metadata)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, role, content, function_call, metadata, created_at
    `;

    const result = await pool().query(query, [
      conversationId,
      role,
      content,
      functionCall ? JSON.stringify(functionCall) : null,
      metadata ? JSON.stringify(metadata) : null
    ]);

    return result.rows[0];

  } catch (error) {
    logger.error('Error adding message:', error);
    throw error;
  }
}

/**
 * Update conversation title
 */
export async function updateConversationTitle(conversationId, title) {
  try {
    const query = `
      UPDATE chat_conversations
      SET title = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, title, updated_at
    `;

    const result = await pool().query(query, [title, conversationId]);

    if (result.rows.length === 0) {
      return null;
    }

    logger.info(`Updated conversation ${conversationId} title to: ${title}`);
    return result.rows[0];

  } catch (error) {
    logger.error('Error updating conversation title:', error);
    throw error;
  }
}

/**
 * Delete a conversation and all its messages
 */
export async function deleteConversation(conversationId) {
  try {
    const query = `
      DELETE FROM chat_conversations
      WHERE id = $1
      RETURNING id, title
    `;

    const result = await pool().query(query, [conversationId]);

    if (result.rows.length === 0) {
      return null;
    }

    logger.info(`Deleted conversation ${conversationId}: ${result.rows[0].title}`);
    return result.rows[0];

  } catch (error) {
    logger.error('Error deleting conversation:', error);
    throw error;
  }
}

/**
 * Get recent messages from a conversation for context
 */
export async function getRecentMessages(conversationId, limit = 10) {
  try {
    const query = `
      SELECT role, content, function_call, created_at
      FROM chat_messages
      WHERE conversation_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;

    const result = await pool().query(query, [conversationId, limit]);

    // Return in chronological order (oldest first)
    return result.rows.reverse();

  } catch (error) {
    logger.error('Error getting recent messages:', error);
    throw error;
  }
}
