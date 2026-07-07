import { useState, useEffect } from 'react';
import {
  ChevronLeftIcon,
  TrophyIcon,
  ChartBarIcon,
  ClockIcon,
  AcademicCapIcon,
  FlagIcon,
  CheckBadgeIcon,
  MapIcon,
  PuzzlePieceIcon
} from '@heroicons/react/24/outline';
import { getTriviaStats } from '../../data/triviaApi';
import Panel from '../ui/Panel';

export default function TriviaStats({ onBack }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const result = await getTriviaStats();
      setStats(result);
    } catch (err) {
      console.error('Error loading stats:', err);
      setError('Failed to load trivia statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto"></div>
          <p className="mt-4 text-surface-400">Loading statistics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-danger-900/20 border border-danger-700 rounded-lg p-4">
          <p className="text-danger-300">{error}</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-surface-400">No statistics available</p>
        </div>
      </div>
    );
  }

  const formatPercentage = (value) => {
    return value ? Math.round(value * 100) : 0;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={onBack}
          className="flex items-center text-surface-400 hover:text-white mb-4"
        >
          <ChevronLeftIcon className="h-5 w-5 mr-1" />
          Back to Trivia
        </button>
        <div className="flex items-center mb-4">
          <ChartBarIcon className="h-8 w-8 text-brand-600 mr-3" />
          <h1 className="text-3xl font-bold text-white">Trivia Statistics</h1>
        </div>
        <p className="text-surface-400">Your trivia performance and achievements</p>
      </div>

      <div className="space-y-8">
        {/* Session Overview */}
        <Panel rounded="rounded-lg" className="p-6">
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
            <TrophyIcon className="h-6 w-6 text-warning-500 mr-2" />
            Session Overview
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-brand-400 mb-2">
                {stats.sessions.total_sessions || 0}
              </div>
              <div className="text-sm text-surface-400">Total Sessions</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-success-400 mb-2">
                {stats.sessions.completed_sessions || 0}
              </div>
              <div className="text-sm text-surface-400">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-highlight-400 mb-2">
                {Math.round(stats.sessions.avg_score || 0)}
              </div>
              <div className="text-sm text-surface-400">Average Score</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-400 mb-2">
                {stats.sessions.best_score || 0}
              </div>
              <div className="text-sm text-surface-400">Best Score</div>
            </div>
          </div>
        </Panel>

        {/* Question Performance */}
        <Panel rounded="rounded-lg" className="p-6">
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center">
            <AcademicCapIcon className="h-6 w-6 text-brand-500 mr-2" />
            Question Performance
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-brand-400 mb-2">
                {stats.questions.total_questions || 0}
              </div>
              <div className="text-sm text-surface-400">Total Questions</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-success-400 mb-2">
                {formatPercentage(stats.questions.overall_accuracy)}%
              </div>
              <div className="text-sm text-surface-400">Overall Accuracy</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-highlight-400 mb-2">
                {stats.questions.categories_covered || 0}
              </div>
              <div className="text-sm text-surface-400">Categories Covered</div>
            </div>
          </div>
        </Panel>

        {/* Category Performance */}
        {stats.categories && stats.categories.length > 0 && (
          <Panel rounded="rounded-lg" className="p-6">
            <h2 className="text-xl font-semibold text-white mb-6">
              Performance by Category
            </h2>
            <div className="space-y-4">
              {stats.categories.map((category) => (
                <div key={category.category} className="flex items-center justify-between p-4 bg-surface-900 rounded-lg border border-surface-700">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-brand-500 rounded-full mr-3"></div>
                    <div>
                      <h3 className="font-medium text-white capitalize">
                        {category.category.replace('_', ' ')}
                      </h3>
                      <p className="text-sm text-surface-400">
                        {category.questions_count} questions
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-white">
                      {formatPercentage(category.accuracy)}%
                    </div>
                    <div className="text-sm text-surface-500">accuracy</div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        )}

        {/* Achievement Badges */}
        <Panel rounded="rounded-lg" className="p-6">
          <h2 className="text-xl font-semibold text-white mb-6">
            Achievements
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {/* First Session */}
            {stats.sessions.total_sessions > 0 && (
              <div className="text-center p-4 bg-brand-900/30 border border-brand-700 rounded-lg">
                <FlagIcon className="w-8 h-8 mb-2 mx-auto text-brand-400" />
                <div className="text-sm font-medium text-white">First Quiz</div>
                <div className="text-xs text-surface-400">Started your trivia journey</div>
              </div>
            )}

            {/* Perfect Score */}
            {stats.sessions.best_score >= (stats.sessions.avg_questions || 10) && (
              <div className="text-center p-4 bg-warning-900/30 border border-warning-700 rounded-lg">
                <CheckBadgeIcon className="w-8 h-8 mb-2 mx-auto text-warning-400" />
                <div className="text-sm font-medium text-white">Perfect Score</div>
                <div className="text-xs text-surface-400">Got 100% on a quiz</div>
              </div>
            )}

            {/* High Achiever */}
            {formatPercentage(stats.questions.overall_accuracy) >= 80 && (
              <div className="text-center p-4 bg-success-900/30 border border-success-700 rounded-lg">
                <TrophyIcon className="w-8 h-8 mb-2 mx-auto text-success-400" />
                <div className="text-sm font-medium text-white">High Achiever</div>
                <div className="text-xs text-surface-400">80%+ overall accuracy</div>
              </div>
            )}

            {/* Quiz Master */}
            {stats.sessions.completed_sessions >= 10 && (
              <div className="text-center p-4 bg-highlight-900/30 border border-highlight-700 rounded-lg">
                <AcademicCapIcon className="w-8 h-8 mb-2 mx-auto text-highlight-400" />
                <div className="text-sm font-medium text-white">Quiz Master</div>
                <div className="text-xs text-surface-400">Completed 10+ quizzes</div>
              </div>
            )}

            {/* Category Explorer */}
            {stats.questions.categories_covered >= 5 && (
              <div className="text-center p-4 bg-indigo-900/30 border border-indigo-700 rounded-lg">
                <MapIcon className="w-8 h-8 mb-2 mx-auto text-indigo-400" />
                <div className="text-sm font-medium text-white">Explorer</div>
                <div className="text-xs text-surface-400">Tried 5+ categories</div>
              </div>
            )}

            {/* Question Solver */}
            {stats.questions.total_questions >= 100 && (
              <div className="text-center p-4 bg-orange-900/30 border border-orange-700 rounded-lg">
                <PuzzlePieceIcon className="w-8 h-8 mb-2 mx-auto text-orange-400" />
                <div className="text-sm font-medium text-white">Question Solver</div>
                <div className="text-xs text-surface-400">Answered 100+ questions</div>
              </div>
            )}
          </div>
        </Panel>

        {/* Progress Goals */}
        <Panel rounded="rounded-lg" className="p-6">
          <h2 className="text-xl font-semibold text-white mb-6">
            Progress Goals
          </h2>
          <div className="space-y-4">
            {/* Sessions Goal */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-surface-300">Complete 20 Sessions</span>
                <span className="text-sm text-surface-400">
                  {Math.min(stats.sessions.completed_sessions || 0, 20)}/20
                </span>
              </div>
              <div className="w-full bg-surface-700 rounded-full h-2">
                <div
                  className="bg-brand-600 h-2 rounded-full"
                  style={{ width: `${Math.min((stats.sessions.completed_sessions || 0) / 20 * 100, 100)}%` }}
                ></div>
              </div>
            </div>

            {/* Accuracy Goal */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-surface-300">Achieve 90% Accuracy</span>
                <span className="text-sm text-surface-400">
                  {formatPercentage(stats.questions.overall_accuracy)}%/90%
                </span>
              </div>
              <div className="w-full bg-surface-700 rounded-full h-2">
                <div
                  className="bg-success-600 h-2 rounded-full"
                  style={{ width: `${Math.min(formatPercentage(stats.questions.overall_accuracy) / 90 * 100, 100)}%` }}
                ></div>
              </div>
            </div>

            {/* Categories Goal */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-surface-300">Try All 6 Categories</span>
                <span className="text-sm text-surface-400">
                  {Math.min(stats.questions.categories_covered || 0, 6)}/6
                </span>
              </div>
              <div className="w-full bg-surface-700 rounded-full h-2">
                <div
                  className="bg-highlight-600 h-2 rounded-full"
                  style={{ width: `${Math.min((stats.questions.categories_covered || 0) / 6 * 100, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}