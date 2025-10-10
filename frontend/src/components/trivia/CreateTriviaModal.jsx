import { useState } from 'react';
import {
  XMarkIcon,
  SparklesIcon,
  PuzzlePieceIcon,
  ClockIcon,
  AcademicCapIcon
} from '@heroicons/react/24/outline';
import { createTriviaSession } from '../../data/triviaApi';

export default function CreateTriviaModal({ isOpen, onClose, onSessionCreated, themes, aiAvailable }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    sessionName: '',
    questionCount: 10,
    difficulty: 'mixed',
    period: '6month',
    theme: '',
    categories: ['top_tracks', 'top_artists', 'listening_patterns']
  });

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!aiAvailable) {
      setError('AI service is not available. Cannot generate questions.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const sessionOptions = {
        sessionName: formData.sessionName || `Trivia ${new Date().toLocaleDateString()}`,
        questionCount: parseInt(formData.questionCount),
        difficulty: formData.difficulty,
        period: formData.period,
        categories: formData.categories,
        theme: formData.theme || null
      };

      const result = await createTriviaSession(sessionOptions);
      onSessionCreated(result.session);
    } catch (err) {
      console.error('Error creating trivia session:', err);
      setError(err.response?.data?.message || 'Failed to create trivia session. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (category, checked) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        categories: [...prev.categories, category]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        categories: prev.categories.filter(c => c !== category)
      }));
    }
  };

  const categoryOptions = [
    { id: 'top_tracks', label: 'Top Tracks', icon: '🎵' },
    { id: 'top_artists', label: 'Top Artists', icon: '🎤' },
    { id: 'top_albums', label: 'Top Albums', icon: '💿' },
    { id: 'listening_patterns', label: 'Listening Patterns', icon: '📊' },
    { id: 'discovery_dates', label: 'Discovery Dates', icon: '📅' },
    { id: 'music_knowledge', label: 'Music Knowledge', icon: '🧠' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-700">
          <div className="flex items-center">
            <PuzzlePieceIcon className="h-6 w-6 text-blue-400 mr-2" />
            <h2 className="text-xl font-bold text-white">Create New Trivia</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-300"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* AI Status Warning */}
          {!aiAvailable && (
            <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4">
              <div className="flex">
                <SparklesIcon className="h-5 w-5 text-yellow-400 mr-2 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-yellow-200">AI Service Unavailable</h3>
                  <p className="text-sm text-yellow-300 mt-1">
                    OpenAI API is not configured. Questions cannot be generated at this time.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Session Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Session Name (Optional)
            </label>
            <input
              type="text"
              value={formData.sessionName}
              onChange={(e) => setFormData(prev => ({ ...prev, sessionName: e.target.value }))}
              placeholder="My Music Trivia Session"
              className="w-full p-3 border border-gray-600 rounded-lg bg-gray-900 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Theme Selection */}
          {themes.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Theme (Optional)
              </label>
              <select
                value={formData.theme}
                onChange={(e) => setFormData(prev => ({ ...prev, theme: e.target.value }))}
                className="w-full p-3 border border-gray-600 rounded-lg bg-gray-900 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Custom (Choose your own settings)</option>
                {themes.map((theme) => (
                  <option key={theme.id} value={theme.id}>
                    {theme.name} - {theme.description}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Question Count and Difficulty */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Number of Questions
              </label>
              <select
                value={formData.questionCount}
                onChange={(e) => setFormData(prev => ({ ...prev, questionCount: e.target.value }))}
                className="w-full p-3 border border-gray-600 rounded-lg bg-gray-900 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="5">5 Questions (Quick)</option>
                <option value="10">10 Questions (Standard)</option>
                <option value="15">15 Questions (Extended)</option>
                <option value="20">20 Questions (Challenge)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Difficulty
              </label>
              <select
                value={formData.difficulty}
                onChange={(e) => setFormData(prev => ({ ...prev, difficulty: e.target.value }))}
                className="w-full p-3 border border-gray-600 rounded-lg bg-gray-900 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="easy">Easy (Recent favorites)</option>
                <option value="medium">Medium (Deeper knowledge)</option>
                <option value="hard">Hard (Obscure tracks)</option>
                <option value="mixed">Mixed (All levels)</option>
              </select>
            </div>
          </div>

          {/* Data Period */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Data Period
            </label>
            <select
              value={formData.period}
              onChange={(e) => setFormData(prev => ({ ...prev, period: e.target.value }))}
              className="w-full p-3 border border-gray-600 rounded-lg bg-gray-900 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="1month">Last Month</option>
              <option value="3month">Last 3 Months</option>
              <option value="6month">Last 6 Months</option>
              <option value="12month">Last Year</option>
              <option value="overall">All Time</option>
            </select>
          </div>

          {/* Categories */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Question Categories
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {categoryOptions.map((category) => (
                <label key={category.id} className="flex items-center p-3 bg-gray-900 rounded-lg hover:bg-gray-700 cursor-pointer border border-gray-700">
                  <input
                    type="checkbox"
                    checked={formData.categories.includes(category.id)}
                    onChange={(e) => handleCategoryChange(category.id, e.target.checked)}
                    className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded"
                  />
                  <span className="mr-2">{category.icon}</span>
                  <span className="text-sm font-medium text-gray-300">{category.label}</span>
                </label>
              ))}
            </div>
            {formData.categories.length === 0 && (
              <p className="text-sm text-red-400 mt-2">Please select at least one category.</p>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !aiAvailable || formData.categories.length === 0}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Generating...
                </>
              ) : (
                <>
                  <SparklesIcon className="h-4 w-4 mr-2" />
                  Generate Trivia
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}