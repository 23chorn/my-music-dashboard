import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  PuzzlePieceIcon,
  PlayIcon,
  TrophyIcon,
  ClockIcon,
  ChartBarIcon,
  SparklesIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import PageLayout from '../components/layout/PageLayout';
import TriviaSession from '../components/trivia/TriviaSession';
import TriviaSessionReview from '../components/trivia/TriviaSessionReview';
import TriviaHistory from '../components/trivia/TriviaHistory';
import TriviaStats from '../components/trivia/TriviaStats';
import CreateTriviaModal from '../components/trivia/CreateTriviaModal';
import {
  checkTriviaStatus,
  getRecentTriviaSessions,
  getTriviaStats,
  getTriviaThemes
} from '../data/triviaApi';

export default function TriviaPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [triviaStatus, setTriviaStatus] = useState(null);
  const [recentSessions, setRecentSessions] = useState([]);
  const [stats, setStats] = useState(null);
  const [themes, setThemes] = useState([]);
  const [currentView, setCurrentView] = useState('overview'); // 'overview', 'session', 'review', 'history', 'stats'
  const [currentSession, setCurrentSession] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadTriviaData();
  }, []);

  // Reload data when returning to overview
  useEffect(() => {
    if (currentView === 'overview') {
      loadTriviaData();
    }
  }, [currentView]);

  const loadTriviaData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [statusResult, sessionsResult, statsResult, themesResult] = await Promise.all([
        checkTriviaStatus(),
        getRecentTriviaSessions(5),
        getTriviaStats(),
        getTriviaThemes()
      ]);

      setTriviaStatus(statusResult);
      setRecentSessions(sessionsResult.sessions);
      setStats(statsResult);
      setThemes(themesResult.themes);

    } catch (err) {
      console.error('Error loading trivia data:', err);
      setError('Failed to load trivia data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSessionCreated = (session) => {
    setCurrentSession(session);
    setCurrentView('session');
    setShowCreateModal(false);
  };

  const handleSessionCompleted = () => {
    setCurrentSession(null);
    setCurrentView('overview');
    loadTriviaData(); // Refresh data
  };

  if (error) {
    return (
      <PageLayout>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center">
            <XCircleIcon className="h-16 w-16 text-danger-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Error Loading Trivia</h2>
            <p className="text-surface-300 mb-4">{error}</p>
            <button
              onClick={loadTriviaData}
              className="bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </PageLayout>
    );
  }

  const renderOverview = () => (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <PuzzlePieceIcon className="h-16 w-16 text-brand-400" />
        </div>
        <h1 className="text-4xl font-bold text-white mb-4">Music Trivia</h1>
        <p className="text-xl text-surface-300 max-w-2xl mx-auto">
          Test your knowledge of your own music taste! AI-generated questions based on your personal listening history.
        </p>
      </div>

      {/* Status Check */}
      {!triviaStatus?.ai_available && (
        <div className="bg-warning-900/20 border border-warning-700 rounded-lg p-4">
          <div className="flex">
            <SparklesIcon className="h-5 w-5 text-warning-400 mr-2 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-warning-200">AI Service Unavailable</h3>
              <p className="text-sm text-warning-300 mt-1">
                OpenAI API is not configured. Questions cannot be generated at this time.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() => setShowCreateModal(true)}
          disabled={!triviaStatus?.ai_available}
          className="bg-brand-600 text-white p-6 rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
        >
          <PlayIcon className="h-8 w-8 mb-3 mx-auto group-hover:scale-110 transition-transform" />
          <h3 className="font-semibold mb-2">Start New Quiz</h3>
          <p className="text-sm opacity-90">Create a personalized trivia session</p>
        </button>

        <button
          onClick={() => setCurrentView('history')}
          className="bg-surface-800 text-white p-6 rounded-lg hover:bg-surface-700 transition-colors group"
        >
          <ClockIcon className="h-8 w-8 mb-3 mx-auto text-surface-300 group-hover:scale-110 transition-transform" />
          <h3 className="font-semibold mb-2">Recent Sessions</h3>
          <p className="text-sm text-surface-300">View your trivia history</p>
        </button>

        <button
          onClick={() => setCurrentView('stats')}
          className="bg-surface-800 text-white p-6 rounded-lg hover:bg-surface-700 transition-colors group"
        >
          <ChartBarIcon className="h-8 w-8 mb-3 mx-auto text-surface-300 group-hover:scale-110 transition-transform" />
          <h3 className="font-semibold mb-2">Statistics</h3>
          <p className="text-sm text-surface-300">Your trivia performance</p>
        </button>

        <Link
          to="/ai-insights"
          className="bg-surface-800 text-white p-6 rounded-lg hover:bg-surface-700 transition-colors group block text-center"
        >
          <SparklesIcon className="h-8 w-8 mb-3 mx-auto text-surface-300 group-hover:scale-110 transition-transform" />
          <h3 className="font-semibold mb-2">AI Insights</h3>
          <p className="text-sm text-surface-300">Your listening analysis</p>
        </Link>
      </div>

      {/* Recent Sessions Preview */}
      {recentSessions.length > 0 && (
        <div className="bg-surface-800 rounded-lg border border-surface-700 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-white">Recent Sessions</h2>
            <button
              onClick={() => setCurrentView('history')}
              className="text-brand-400 hover:text-brand-300 text-sm font-medium flex items-center"
            >
              View All
              <ArrowRightIcon className="h-4 w-4 ml-1" />
            </button>
          </div>
          <div className="space-y-3">
            {recentSessions.slice(0, 3).map((session) => (
              <div key={session.id} className="flex items-center justify-between p-3 bg-surface-900 rounded-lg">
                <div>
                  <h3 className="font-medium text-white">{session.session_name}</h3>
                  <p className="text-sm text-surface-400">
                    {session.difficulty_level} • {session.question_count} questions
                  </p>
                </div>
                <div className="text-right">
                  {session.completed_at ? (
                    <div className="flex items-center text-success-400">
                      <CheckCircleIcon className="h-5 w-5 mr-1" />
                      <span className="font-medium">{session.score}/{session.total_questions}</span>
                    </div>
                  ) : (
                    <span className="text-warning-400 text-sm">In Progress</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-surface-800 rounded-lg border border-surface-700 p-4 text-center">
            <div className="text-2xl font-bold text-brand-400">{stats.sessions.total_sessions || 0}</div>
            <div className="text-sm text-surface-400">Total Sessions</div>
          </div>
          <div className="bg-surface-800 rounded-lg border border-surface-700 p-4 text-center">
            <div className="text-2xl font-bold text-success-400">
              {stats.sessions.avg_score ? Math.round(stats.sessions.avg_score) : 0}
            </div>
            <div className="text-sm text-surface-400">Average Score</div>
          </div>
          <div className="bg-surface-800 rounded-lg border border-surface-700 p-4 text-center">
            <div className="text-2xl font-bold text-highlight-400">{stats.sessions.best_score || 0}</div>
            <div className="text-sm text-surface-400">Best Score</div>
          </div>
          <div className="bg-surface-800 rounded-lg border border-surface-700 p-4 text-center">
            <div className="text-2xl font-bold text-orange-400">{stats.categories?.length || 0}</div>
            <div className="text-sm text-surface-400">Categories Played</div>
          </div>
        </div>
      )}

      {/* Available Themes */}
      {themes.length > 0 && (
        <div className="bg-surface-800 rounded-lg border border-surface-700 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Trivia Themes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {themes.map((theme) => (
              <div key={theme.id} className="border border-surface-700 rounded-lg p-4 hover:border-brand-500 transition-colors bg-surface-900">
                <h3 className="font-medium text-white mb-2">{theme.name}</h3>
                <p className="text-sm text-surface-400 mb-3">{theme.description}</p>
                <div className="flex justify-between items-center">
                  <div className="text-xs text-surface-500">
                    {theme.questionCount} questions • {theme.difficulty}
                  </div>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    disabled={!triviaStatus?.ai_available}
                    className="text-brand-400 hover:text-brand-300 text-sm font-medium disabled:opacity-50"
                  >
                    Start Quiz
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <PageLayout loading={loading}>
      {currentView === 'overview' && renderOverview()}
      {currentView === 'session' && currentSession && (
        <TriviaSession
          session={currentSession}
          onComplete={handleSessionCompleted}
          onBack={() => setCurrentView('overview')}
        />
      )}
      {currentView === 'history' && (
        <TriviaHistory
          onBack={() => setCurrentView('overview')}
          onSessionSelect={(session) => {
            setCurrentSession(session);
            // Check if session is completed, show review instead of session
            if (session.completed_at) {
              setCurrentView('review');
            } else {
              setCurrentView('session');
            }
          }}
        />
      )}
      {currentView === 'review' && currentSession && (
        <TriviaSessionReview
          session={currentSession}
          onBack={() => setCurrentView('history')}
        />
      )}
      {currentView === 'stats' && (
        <TriviaStats
          onBack={() => setCurrentView('overview')}
        />
      )}

      {showCreateModal && (
        <CreateTriviaModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSessionCreated={handleSessionCreated}
          themes={themes}
          aiAvailable={triviaStatus?.ai_available}
        />
      )}
    </PageLayout>
  );
}