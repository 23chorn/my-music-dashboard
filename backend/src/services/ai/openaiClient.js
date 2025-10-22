/**
 * OpenAI Client
 * Pure OpenAI API client wrapper
 */

import OpenAI from 'openai';
import logger from '../../utils/logger.js';

class OpenAIClient {
  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      logger.warn('OpenAI API key not provided. AI features will be disabled.');
      this.client = null;
      return;
    }

    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    logger.info('OpenAI client initialized');
  }

  /**
   * Create a chat completion
   * @param {Array} messages - Array of message objects
   * @param {Array|null} tools - Array of tool definitions
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} OpenAI completion response
   */
  async createChatCompletion(messages, tools = null, options = {}) {
    if (!this.client) {
      throw new Error('OpenAI client not initialized. Please check API key.');
    }

    const params = {
      model: options.model || 'gpt-4o-mini',
      messages,
      temperature: options.temperature !== undefined ? options.temperature : 0.7,
      max_tokens: options.maxTokens || 500,
    };

    if (tools) {
      params.tools = tools;
      params.tool_choice = options.toolChoice || 'auto';
    }

    try {
      return await this.client.chat.completions.create(params);
    } catch (error) {
      logger.error('OpenAI API error:', error);
      throw new Error(`OpenAI request failed: ${error.message}`);
    }
  }

  /**
   * Create an embedding
   * @param {string} text - Text to embed
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Embedding response
   */
  async createEmbedding(text, options = {}) {
    if (!this.client) {
      throw new Error('OpenAI client not initialized. Please check API key.');
    }

    try {
      return await this.client.embeddings.create({
        model: options.model || 'text-embedding-3-small',
        input: text,
      });
    } catch (error) {
      logger.error('OpenAI embedding error:', error);
      throw new Error(`OpenAI embedding failed: ${error.message}`);
    }
  }

  /**
   * Check if client is available
   * @returns {boolean} True if client is initialized
   */
  isAvailable() {
    return this.client !== null;
  }
}

export default OpenAIClient;
