const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
const API_URL = `${API_BASE_URL}/api/trivia`;

/**
 * Check trivia system status
 */
export async function checkTriviaStatus() {
  const response = await fetch(`${API_URL}/status`);
  if (!response.ok) throw new Error('Failed to check trivia status');
  return await response.json();
}

/**
 * Create new trivia session
 */
export async function createTriviaSession(sessionOptions) {
  const response = await fetch(`${API_URL}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(sessionOptions)
  });
  if (!response.ok) throw new Error('Failed to create trivia session');
  return await response.json();
}

/**
 * Get trivia session by ID
 */
export async function getTriviaSession(sessionId) {
  const response = await fetch(`${API_URL}/sessions/${sessionId}`);
  if (!response.ok) throw new Error('Failed to fetch trivia session');
  return await response.json();
}

/**
 * Submit answer to question
 */
export async function submitTriviaAnswer(sessionId, answerData) {
  const response = await fetch(`${API_URL}/sessions/${sessionId}/responses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(answerData)
  });
  if (!response.ok) throw new Error('Failed to submit trivia answer');
  return await response.json();
}

/**
 * Complete trivia session
 */
export async function completeTriviaSession(sessionId, completionTimeSeconds = null) {
  const response = await fetch(`${API_URL}/sessions/${sessionId}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ completionTimeSeconds })
  });
  if (!response.ok) throw new Error('Failed to complete trivia session');
  return await response.json();
}

/**
 * Get recent trivia sessions
 */
export async function getRecentTriviaSessions(limit = 10) {
  const response = await fetch(`${API_URL}/sessions?limit=${limit}`);
  if (!response.ok) throw new Error('Failed to fetch trivia sessions');
  return await response.json();
}

/**
 * Get trivia statistics
 */
export async function getTriviaStats() {
  const response = await fetch(`${API_URL}/stats`);
  if (!response.ok) throw new Error('Failed to fetch trivia stats');
  return await response.json();
}

/**
 * Generate quick trivia (without saving to session)
 */
export async function generateQuickTrivia(options = {}) {
  const response = await fetch(`${API_URL}/quick`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options)
  });
  if (!response.ok) throw new Error('Failed to generate quick trivia');
  return await response.json();
}

/**
 * Get available trivia themes
 */
export async function getTriviaThemes() {
  const response = await fetch(`${API_URL}/themes`);
  if (!response.ok) throw new Error('Failed to fetch trivia themes');
  return await response.json();
}

/**
 * Replay a trivia session
 */
export async function replayTriviaSession(sessionId) {
  const response = await fetch(`${API_URL}/sessions/${sessionId}/replay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!response.ok) throw new Error('Failed to replay trivia session');
  return await response.json();
}