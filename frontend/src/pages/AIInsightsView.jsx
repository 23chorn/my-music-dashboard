import { useState, useEffect } from 'react';
import {
  CpuChipIcon,
  CalendarIcon,
  SparklesIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  LightBulbIcon,
  MusicalNoteIcon
} from '@heroicons/react/24/outline';
import {
  checkAIStatus,
  analyzeLastWeek,
  getListeningAnalyses,
  getWeekDates
} from '../data/aiInsightsApi.js';
import PageLayout from '../components/layout/PageLayout.jsx';
import LoadingPage from '../components/ui/LoadingPage.jsx';

export default function AIInsightsView() {
  const [aiStatus, setAiStatus] = useState(null);
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statusResult, analysesResult] = await Promise.all([
        checkAIStatus(),
        getListeningAnalyses(5)
      ]);

      setAiStatus(statusResult);
      setAnalyses(analysesResult.analyses || []);
    } catch (err) {
      setError('Failed to load AI insights data');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeLastWeek = async () => {
    if (!aiStatus?.available) return;

    try {
      setAnalyzing(true);
      setError(null);

      const result = await analyzeLastWeek();

      // Refresh the analyses list
      await loadData();

      // Show success message or handle the result
      console.log('Analysis completed:', result);

    } catch (err) {
      setError(err.message || 'Failed to analyze last week');
    } finally {
      setAnalyzing(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const { weekStart, weekEnd } = getWeekDates(1);

  if (loading) {
    return (
      <PageLayout title="AI Insights" showBackButton={false}>
        <LoadingPage />
      </PageLayout>
    );
  }

  return (
    <PageLayout title="AI Insights" showBackButton={false}>
      <div className="space-y-6">

        {/* AI Status Section */}
        <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CpuChipIcon className="h-6 w-6 text-blue-400" />
              <div>
                <h2 className="text-lg font-semibold text-blue-400">AI Analysis Status</h2>
                <p className="text-sm text-gray-400">
                  {aiStatus?.message || 'Checking AI availability...'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${
                aiStatus?.available ? 'bg-green-500' : 'bg-red-500'
              }`} />
              <span className="text-sm text-gray-300">
                {aiStatus?.available ? 'Available' : 'Unavailable'}
              </span>
            </div>
          </div>

          {!aiStatus?.available && (
            <div className="mt-4 p-4 bg-yellow-900/20 border border-yellow-700 rounded-lg">
              <div className="flex items-start space-x-3">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-yellow-400">Setup Required</h3>
                  <p className="text-sm text-yellow-300 mt-1">
                    To enable AI insights, add your OpenAI API key to the backend environment variables.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Generate Analysis Section */}
        {aiStatus?.available && (
          <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-blue-400 flex items-center space-x-2">
                  <SparklesIcon className="h-5 w-5" />
                  <span>Generate New Analysis</span>
                </h2>
                <p className="text-sm text-gray-400 mt-1">
                  Analyze your listening patterns from {formatDate(weekStart)} to {formatDate(weekEnd)}
                </p>
              </div>

              <button
                onClick={handleAnalyzeLastWeek}
                disabled={analyzing}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed
                         text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors
                         flex items-center space-x-2"
              >
                {analyzing ? (
                  <>
                    <ClockIcon className="h-4 w-4 animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <CpuChipIcon className="h-4 w-4" />
                    <span>Analyze Last Week</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
              <p className="text-red-300">{error}</p>
            </div>
          </div>
        )}

        {/* Recent Analyses */}
        <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
          <h2 className="text-lg font-semibold text-blue-400 mb-4 flex items-center space-x-2">
            <CalendarIcon className="h-5 w-5" />
            <span>Recent Analyses</span>
          </h2>

          {analyses.length === 0 ? (
            <div className="text-center py-8">
              <MusicalNoteIcon className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400">No analyses yet</p>
              <p className="text-sm text-gray-500 mt-1">
                Generate your first AI analysis to see insights about your listening patterns
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {analyses.map((analysis) => (
                <div key={analysis.id} className="border border-gray-700 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-medium text-white">
                        Week of {formatDate(analysis.week_start)}
                      </h3>
                      <p className="text-sm text-gray-400">
                        {analysis.stats?.total_plays} plays • {analysis.stats?.unique_tracks} tracks • {analysis.stats?.unique_artists} artists
                      </p>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(analysis.analysis_date).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Mood Summary */}
                  {analysis.mood_summary && (
                    <div className="mb-3">
                      <h4 className="text-sm font-medium text-blue-400 mb-1 flex items-center space-x-1">
                        <SparklesIcon className="h-4 w-4" />
                        <span>Mood Summary</span>
                      </h4>
                      <p className="text-sm text-gray-300">{analysis.mood_summary}</p>
                    </div>
                  )}

                  {/* Key Insights */}
                  {analysis.key_insights && analysis.key_insights.length > 0 && (
                    <div className="mb-3">
                      <h4 className="text-sm font-medium text-blue-400 mb-2 flex items-center space-x-1">
                        <LightBulbIcon className="h-4 w-4" />
                        <span>Key Insights</span>
                      </h4>
                      <ul className="space-y-1">
                        {analysis.key_insights.map((insight, index) => (
                          <li key={index} className="text-sm text-gray-300 flex items-start space-x-2">
                            <span className="text-blue-400 mt-1">•</span>
                            <span>{insight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Musical Personality */}
                  {analysis.musical_personality && (
                    <div>
                      <h4 className="text-sm font-medium text-blue-400 mb-1">Musical Personality</h4>
                      <p className="text-sm text-gray-300">{analysis.musical_personality}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}