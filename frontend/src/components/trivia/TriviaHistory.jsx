import { useState, useEffect } from 'react';
import {
  ChevronLeftIcon,
  CheckCircleIcon,
  ClockIcon,
  TrophyIcon,
  PlayIcon
} from '@heroicons/react/24/outline';
import { getRecentTriviaSessions } from '../../data/triviaApi';

export default function TriviaHistory({ onBack, onSessionSelect }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const result = await getRecentTriviaSessions(20);
      setSessions(result.sessions);
    } catch (err) {
      console.error('Error loading sessions:', err);
      setError('Failed to load trivia history');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getScoreColor = (percentage) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadge = (percentage) => {
    if (percentage >= 90) return '🏆';
    if (percentage >= 80) return '🥇';
    if (percentage >= 70) return '🥈';
    if (percentage >= 60) return '🥉';
    return '📖';
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading trivia history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={onBack}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ChevronLeftIcon className="h-5 w-5 mr-1" />
          Back to Trivia
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Trivia History</h1>
        <p className="text-gray-600 mt-2">Your past trivia sessions and performance</p>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Sessions List */}
      {sessions.length === 0 ? (
        <div className="text-center py-12">
          <TrophyIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Trivia Sessions Yet</h3>
          <p className="text-gray-600 mb-6">Start your first trivia session to see your history here</p>
          <button
            onClick={onBack}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Your First Quiz
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:border-blue-300 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 mr-3">
                      {session.session_name}
                    </h3>
                    {session.completed_at && session.percentage && (
                      <span className="text-2xl mr-2">
                        {getScoreBadge(session.percentage)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                    <span className="capitalize">{session.difficulty_level}</span>
                    <span>•</span>
                    <span>{session.question_count} questions</span>
                    <span>•</span>
                    <span>{formatDate(session.created_at)}</span>
                  </div>

                  {session.completed_at ? (
                    <div className="flex items-center space-x-6">
                      <div className="flex items-center">
                        <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                        <span className="text-sm font-medium text-gray-900">
                          {session.score}/{session.total_questions} correct
                        </span>
                      </div>
                      <div className={`text-sm font-semibold ${getScoreColor(session.percentage)}`}>
                        {session.percentage}%
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center text-yellow-600">
                      <ClockIcon className="h-5 w-5 mr-2" />
                      <span className="text-sm font-medium">In Progress</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  {!session.completed_at && (
                    <button
                      onClick={() => onSessionSelect(session)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center text-sm"
                    >
                      <PlayIcon className="h-4 w-4 mr-1" />
                      Continue
                    </button>
                  )}

                  {session.completed_at && (
                    <button
                      onClick={() => onSessionSelect(session)}
                      className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                    >
                      View Details
                    </button>
                  )}
                </div>
              </div>

              {/* Progress Bar for Incomplete Sessions */}
              {!session.completed_at && (
                <div className="mt-4">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-yellow-500 h-2 rounded-full"
                      style={{ width: '30%' }} // This would need to be calculated based on answered questions
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Session started but not completed</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      {sessions.length > 0 && (
        <div className="mt-8 bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Summary Stats</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {sessions.length}
              </div>
              <div className="text-sm text-gray-600">Total Sessions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {sessions.filter(s => s.completed_at).length}
              </div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {sessions.filter(s => s.percentage >= 80).length}
              </div>
              <div className="text-sm text-gray-600">High Scores (80%+)</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {sessions.reduce((max, s) => Math.max(max, s.percentage || 0), 0)}%
              </div>
              <div className="text-sm text-gray-600">Best Score</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}