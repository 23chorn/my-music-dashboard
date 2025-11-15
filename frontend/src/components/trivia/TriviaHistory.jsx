import { useState, useEffect } from 'react';
import {
  ChevronLeftIcon,
  CheckCircleIcon,
  ClockIcon,
  TrophyIcon,
  PlayIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { getRecentTriviaSessions, replayTriviaSession, getTriviaSession } from '../../data/triviaApi';

export default function TriviaHistory({ onBack, onSessionSelect }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [replayingId, setReplayingId] = useState(null);
  const [loadingSessionId, setLoadingSessionId] = useState(null);

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

  const handleReplay = async (sessionId) => {
    try {
      setReplayingId(sessionId);
      const result = await replayTriviaSession(sessionId);
      onSessionSelect(result.session);
    } catch (err) {
      console.error('Error replaying session:', err);
      setError('Failed to replay trivia session');
    } finally {
      setReplayingId(null);
    }
  };

  const handleContinueSession = async (session) => {
    try {
      setLoadingSessionId(session.id);
      // Fetch full session with questions
      const fullSession = await getTriviaSession(session.id);
      onSessionSelect(fullSession);
    } catch (err) {
      console.error('Error loading session:', err);
      setError('Failed to load trivia session');
    } finally {
      setLoadingSessionId(null);
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
    if (percentage >= 80) return 'text-green-400';
    if (percentage >= 60) return 'text-yellow-400';
    return 'text-red-400';
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
          <p className="mt-4 text-gray-400">Loading trivia history...</p>
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
          className="flex items-center text-gray-400 hover:text-white mb-4"
        >
          <ChevronLeftIcon className="h-5 w-5 mr-1" />
          Back to Trivia
        </button>
        <h1 className="text-3xl font-bold text-white">Trivia History</h1>
        <p className="text-gray-400 mt-2">Your past trivia sessions and performance</p>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 mb-6">
          <p className="text-red-300">{error}</p>
        </div>
      )}

      {/* Sessions List */}
      {sessions.length === 0 ? (
        <div className="text-center py-12">
          <TrophyIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No Trivia Sessions Yet</h3>
          <p className="text-gray-400 mb-6">Start your first trivia session to see your history here</p>
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
              className="bg-gray-800 border border-gray-700 rounded-lg p-6 hover:border-blue-500 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <h3 className="text-lg font-semibold text-white mr-3">
                      {session.session_name}
                    </h3>
                    {session.completed_at && session.percentage && (
                      <span className="text-2xl mr-2">
                        {getScoreBadge(session.percentage)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-4 text-sm text-gray-400 mb-3">
                    <span className="capitalize">{session.difficulty_level}</span>
                    <span>•</span>
                    <span>{session.question_count} questions</span>
                    <span>•</span>
                    <span>{formatDate(session.created_at)}</span>
                  </div>

                  {session.completed_at ? (
                    <div className="flex items-center space-x-6">
                      <div className="flex items-center">
                        <CheckCircleIcon className="h-5 w-5 text-green-400 mr-2" />
                        <span className="text-sm font-medium text-white">
                          {session.score}/{session.total_questions} correct
                        </span>
                      </div>
                      <div className={`text-sm font-semibold ${getScoreColor(session.percentage)}`}>
                        {session.percentage}%
                      </div>
                      {session.completion_time_seconds && (
                        <div className="flex items-center text-gray-400">
                          <ClockIcon className="h-4 w-4 mr-1" />
                          <span className="text-sm">
                            {Math.floor(session.completion_time_seconds / 60)}:{(session.completion_time_seconds % 60).toString().padStart(2, '0')}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center text-yellow-400">
                      <ClockIcon className="h-5 w-5 mr-2" />
                      <span className="text-sm font-medium">In Progress</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  {!session.completed_at && (
                    <button
                      onClick={() => handleContinueSession(session)}
                      disabled={loadingSessionId === session.id}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loadingSessionId === session.id ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1"></div>
                          Loading...
                        </>
                      ) : (
                        <>
                          <PlayIcon className="h-4 w-4 mr-1" />
                          Continue
                        </>
                      )}
                    </button>
                  )}

                  {session.completed_at && (
                    <>
                      <button
                        onClick={() => handleReplay(session.id)}
                        disabled={replayingId === session.id}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {replayingId === session.id ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1"></div>
                            Replaying...
                          </>
                        ) : (
                          <>
                            <ArrowPathIcon className="h-4 w-4 mr-1" />
                            Replay
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => onSessionSelect(session)}
                        className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors text-sm"
                      >
                        View Details
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Progress Bar for Incomplete Sessions */}
              {!session.completed_at && (
                <div className="mt-4">
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-yellow-500 h-2 rounded-full"
                      style={{
                        width: `${session.question_count > 0
                          ? Math.round((session.answered_questions || 0) / session.question_count * 100)
                          : 0}%`
                      }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {session.answered_questions || 0}/{session.question_count} questions answered
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      {sessions.length > 0 && (
        <div className="mt-8 bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Summary Stats</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">
                {sessions.length}
              </div>
              <div className="text-sm text-gray-400">Total Sessions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">
                {sessions.filter(s => s.completed_at).length}
              </div>
              <div className="text-sm text-gray-400">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400">
                {sessions.filter(s => s.percentage >= 80).length}
              </div>
              <div className="text-sm text-gray-400">High Scores (80%+)</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-400">
                {sessions.reduce((max, s) => Math.max(max, s.percentage || 0), 0)}%
              </div>
              <div className="text-sm text-gray-400">Best Score</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}