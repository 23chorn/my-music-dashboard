import { getPool } from '../connection.js';
import logger from '../../utils/logger.js';

const pool = () => getPool();

/**
 * Create a new chat conversation
 * @param {string} title - Conversation title
 * @returns {Promise<Object>} Created conversation
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
 * @param {number} limit - Maximum number of conversations to return
 * @returns {Promise<Array>} List of conversations
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
 * Get a single conversation by ID
 * @param {number} conversationId - Conversation ID
 * @returns {Promise<Object|null>} Conversation object or null if not found
 */
export async function getConversationById(conversationId) {
  try {
    const query = `
      SELECT id, title, created_at, updated_at
      FROM chat_conversations
      WHERE id = $1
    `;

    const result = await pool().query(query, [conversationId]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];

  } catch (error) {
    logger.error('Error getting conversation:', error);
    throw error;
  }
}

/**
 * Update conversation title
 * @param {number} conversationId - Conversation ID
 * @param {string} title - New title
 * @returns {Promise<Object|null>} Updated conversation or null if not found
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
 * Delete a conversation and all its messages (CASCADE)
 * @param {number} conversationId - Conversation ID
 * @returns {Promise<Object|null>} Deleted conversation or null if not found
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
