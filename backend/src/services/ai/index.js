/**
 * AI Services Barrel Export
 * Exports all AI-related services and utilities
 */

import OpenAIClient from './openaiClient.js';
import ChatService from './chatService.js';
import AnalysisService from './analysisService.js';
import TriviaService from './triviaService.js';
import { CHAT_FUNCTIONS } from './functionDefinitions.js';

export {
  OpenAIClient,
  ChatService,
  AnalysisService,
  TriviaService,
  CHAT_FUNCTIONS
};

// Create singleton instances for convenience
export const chatService = new ChatService();
export const analysisService = new AnalysisService();
export const triviaService = TriviaService; // Export the default export from triviaService.js

// For backward compatibility with old OpenAIService import
// This allows gradual migration from old code
import OpenAIService from '../openai.js';
export { OpenAIService };
export default OpenAIService;
