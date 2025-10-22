/**
 * Chat Database Module
 *
 * Handles all database operations for chat conversations and messages
 */

import {
  createConversation,
  getAllConversations,
  getConversationById,
  updateConversationTitle,
  deleteConversation
} from './conversations.js';

import {
  addMessage,
  getMessagesByConversationId,
  getRecentMessages,
  getMessageCount,
  deleteMessagesByConversationId
} from './messages.js';

// Re-export all functions
export {
  // Conversation operations
  createConversation,
  getAllConversations,
  getConversationById,
  updateConversationTitle,
  deleteConversation,

  // Message operations
  addMessage,
  getMessagesByConversationId,
  getRecentMessages,
  getMessageCount,
  deleteMessagesByConversationId
};

/**
 * Get a conversation with all its messages
 * Composite operation combining conversation and message queries
 * @param {number} conversationId - Conversation ID
 * @returns {Promise<Object|null>} Conversation with messages or null if not found
 */
export async function getConversation(conversationId) {
  const conversation = await getConversationById(conversationId);

  if (!conversation) {
    return null;
  }

  const messages = await getMessagesByConversationId(conversationId);

  return {
    ...conversation,
    messages
  };
}
