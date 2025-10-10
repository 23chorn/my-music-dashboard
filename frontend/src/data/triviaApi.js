import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

// Check trivia system status
export const checkTriviaStatus = async () => {
  const response = await axios.get(`${API_BASE_URL}/trivia/status`);
  return response.data;
};

// Create new trivia session
export const createTriviaSession = async (sessionOptions) => {
  const response = await axios.post(`${API_BASE_URL}/trivia/sessions`, sessionOptions);
  return response.data;
};

// Get trivia session by ID
export const getTriviaSession = async (sessionId) => {
  const response = await axios.get(`${API_BASE_URL}/trivia/sessions/${sessionId}`);
  return response.data;
};

// Submit answer to question
export const submitTriviaAnswer = async (sessionId, answerData) => {
  const response = await axios.post(`${API_BASE_URL}/trivia/sessions/${sessionId}/responses`, answerData);
  return response.data;
};

// Complete trivia session
export const completeTriviaSession = async (sessionId) => {
  const response = await axios.post(`${API_BASE_URL}/trivia/sessions/${sessionId}/complete`);
  return response.data;
};

// Get recent trivia sessions
export const getRecentTriviaSessions = async (limit = 10) => {
  const response = await axios.get(`${API_BASE_URL}/trivia/sessions`, {
    params: { limit }
  });
  return response.data;
};

// Get trivia statistics
export const getTriviaStats = async () => {
  const response = await axios.get(`${API_BASE_URL}/trivia/stats`);
  return response.data;
};

// Generate quick trivia (without saving to session)
export const generateQuickTrivia = async (options = {}) => {
  const response = await axios.post(`${API_BASE_URL}/trivia/quick`, options);
  return response.data;
};

// Get available trivia themes
export const getTriviaThemes = async () => {
  const response = await axios.get(`${API_BASE_URL}/trivia/themes`);
  return response.data;
};