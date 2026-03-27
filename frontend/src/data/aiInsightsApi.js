const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
const API_URL = `${API_BASE_URL}/api/insights`;

/**
 * Check if AI analysis is available
 */
export async function checkAIStatus() {
  try {
    const response = await fetch(`${API_URL}/ai-status`);
    if (!response.ok) {
      throw new Error('Failed to check AI status');
    }
    return await response.json();
  } catch (error) {
    console.error('Error checking AI status:', error);
    return { available: false, message: 'Unable to check AI status' };
  }
}

/**
 * Generate AI analysis for a specific week
 */
export async function analyzeWeek(weekStart, weekEnd) {
  try {
    const response = await fetch(`${API_URL}/analyze-week`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ weekStart, weekEnd }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Analysis failed');
    }

    return await response.json();
  } catch (error) {
    console.error('Error analyzing week:', error);
    throw error;
  }
}

/**
 * Get all historical listening analyses
 */
export async function getListeningAnalyses(limit = 10) {
  try {
    const response = await fetch(`${API_URL}/listening-analyses?limit=${limit}`);
    if (!response.ok) {
      throw new Error('Failed to fetch analyses');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching analyses:', error);
    throw error;
  }
}

/**
 * Delete a listening analysis by ID
 */
export async function deleteAnalysis(analysisId) {
  try {
    const response = await fetch(`${API_URL}/listening-analyses/${analysisId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to delete analysis');
    }

    return await response.json();
  } catch (error) {
    console.error('Error deleting analysis:', error);
    throw error;
  }
}

/**
 * Calculate week dates for analysis
 */
export function getWeekDates(weeksAgo = 1) {
  const today = new Date();
  const lastWeekEnd = new Date(today.getTime() - (weeksAgo * 7 * 24 * 60 * 60 * 1000));
  const lastWeekStart = new Date(lastWeekEnd.getTime() - (6 * 24 * 60 * 60 * 1000));

  return {
    weekStart: lastWeekStart.toISOString().split('T')[0],
    weekEnd: lastWeekEnd.toISOString().split('T')[0],
  };
}