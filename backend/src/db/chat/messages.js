import { getPool } from '../connection.js';
import logger from '../../utils/logger.js';

const pool = () => getPool();

/**
 * Add a message to a conversation
 * @param {number} conversationId - Conversation ID
 * @param {string} role - Message role (user, assistant, system)
 * @param {string} content - Message content
 * @param {Object|null} functionCall - Function call data
 * @param {Object|null} metadata - Additional metadata
 * @returns {Promise<Object>} Created message
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
 * Get all messages for a conversation
 * @param {number} conversationId - Conversation ID
 * @returns {Promise<Array>} List of messages in chronological order
 */
export async function getMessagesByConversationId(conversationId) {
  try {
    const query = `
      SELECT id, role, content, function_call, metadata, created_at
      FROM chat_messages
      WHERE conversation_id = $1
      ORDER BY created_at ASC
    `;

    const result = await pool().query(query, [conversationId]);
    return result.rows;

  } catch (error) {
    logger.error('Error getting messages:', error);
    throw error;
  }
}

/**
 * Get recent messages from a conversation for context
 * @param {number} conversationId - Conversation ID
 * @param {number} limit - Maximum number of messages to return
 * @returns {Promise<Array>} Recent messages in chronological order (oldest first)
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

/**
 * Get message count for a conversation
 * @param {number} conversationId - Conversation ID
 * @returns {Promise<number>} Number of messages
 */
export async function getMessageCount(conversationId) {
  try {
    const query = `
      SELECT COUNT(*) as count
      FROM chat_messages
      WHERE conversation_id = $1
    `;

    const result = await pool().query(query, [conversationId]);
    return parseInt(result.rows[0].count);

  } catch (error) {
    logger.error('Error getting message count:', error);
    throw error;
  }
}

/**
 * Delete all messages for a conversation
 * @param {number} conversationId - Conversation ID
 * @returns {Promise<number>} Number of messages deleted
 */
export async function deleteMessagesByConversationId(conversationId) {
  try {
    const query = `
      DELETE FROM chat_messages
      WHERE conversation_id = $1
      RETURNING id
    `;

    const result = await pool().query(query, [conversationId]);
    const count = result.rows.length;

    logger.info(`Deleted ${count} messages from conversation ${conversationId}`);
    return count;

  } catch (error) {
    logger.error('Error deleting messages:', error);
    throw error;
  }
}
