import { useState, useEffect } from 'react';
import {
  CpuChipIcon,
  CalendarIcon,
  SparklesIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  LightBulbIcon,
  MusicalNoteIcon,
  TrashIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  StarIcon
} from '@heroicons/react/24/outline';
import {
  checkAIStatus,
  analyzeWeek,
  getListeningAnalyses,
  getWeekDates,
  deleteAnalysis
} from '../data/aiInsightsApi.js';
import PageLayout from '../components/layout/PageLayout.jsx';

export default function AIInsightsView() {
  const [aiStatus, setAiStatus] = useState(null);
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Date range state - default to last week
  const defaultDates = getWeekDates(1);
  const [startDate, setStartDate] = useState(defaultDates.weekStart);
  const [endDate, setEndDate] = useState(defaultDates.weekEnd);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const analysesPerPage = 5;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statusResult, analysesResult] = await Promise.all([
        checkAIStatus(),
        getListeningAnalyses(100) // Fetch more to support pagination
      ]);

      setAiStatus(statusResult);
      setAnalyses(analysesResult.analyses || []);
      setCurrentPage(1); // Reset to first page when data refreshes
    } catch (err) {
      setError('Failed to load AI insights data');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Calculate pagination
  const totalPages = Math.ceil(analyses.length / analysesPerPage);
  const indexOfLastAnalysis = currentPage * analysesPerPage;
  const indexOfFirstAnalysis = indexOfLastAnalysis - analysesPerPage;
  const currentAnalyses = analyses.slice(indexOfFirstAnalysis, indexOfLastAnalysis);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    // Scroll to top of analyses section
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteAnalysis = async (analysisId, dateRange) => {
    // Show confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to delete this analysis?\n\n${dateRange}\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setError(null);
      await deleteAnalysis(analysisId);

      // Refresh the analyses list
      await loadData();

      setSuccessMessage('Analysis deleted successfully');
      setTimeout(() => setSuccessMessage(null), 3000);

    } catch (err) {
      setError(err.message || 'Failed to delete analysis');
    }
  };

  const handleAnalyzeWeek = async () => {
    if (!aiStatus?.available) return;

    // Validate dates
    if (!startDate || !endDate) {
      setError('Please select both start and end dates');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      setError('Start date must be before end date');
      return;
    }

    try {
      setAnalyzing(true);
      setError(null);
      setSuccessMessage(null);

      const result = await analyzeWeek(startDate, endDate);

      // Refresh the analyses list
      await loadData();

      // Show success message
      setSuccessMessage('Analysis completed successfully!');

      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000);

      console.log('Analysis completed:', result);

    } catch (err) {
      setError(err.message || 'Failed to analyze week');
    } finally {
      setAnalyzing(false);
    }
  };

  const setLastWeek = () => {
    const today = new Date();
    const lastWeekEnd = new Date(today);
    lastWeekEnd.setDate(today.getDate() - 1); // Yesterday

    const lastWeekStart = new Date(lastWeekEnd);
    lastWeekStart.setDate(lastWeekEnd.getDate() - 6); // 7 days total (including end day)

    setStartDate(lastWeekStart.toISOString().split('T')[0]);
    setEndDate(lastWeekEnd.toISOString().split('T')[0]);
  };

  const setThisWeek = () => {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - 6); // 7 days total (including today)

    setStartDate(weekStart.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
  };

  const setYesterday = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];
    setStartDate(dateStr);
    setEndDate(dateStr);
  };

  const setPreviousMonth = () => {
    const today = new Date();
    // First day of previous month
    const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    // Last day of previous month
    const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);

    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(lastDay.toISOString().split('T')[0]);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const calculateDayCount = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end days
    return diffDays;
  };

  return (
    <PageLayout title="AI Insights" showBackButton={false} loading={loading}>
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
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-blue-400 flex items-center space-x-2 mb-3">
                <SparklesIcon className="h-5 w-5" />
                <span>Generate New Analysis</span>
              </h2>

              {/* Analysis in progress indicator */}
              {analyzing && (
                <div className="mb-4 bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-300">Analyzing your listening patterns...</p>
                      <p className="text-xs text-blue-400/70 mt-0.5">This may take 10-30 seconds</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Date Range Inputs */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white
                               focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white
                               focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Quick Select Buttons */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={setYesterday}
                    className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300
                             rounded-md transition-colors"
                  >
                    Yesterday
                  </button>
                  <button
                    onClick={setLastWeek}
                    className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300
                             rounded-md transition-colors"
                  >
                    Last Week
                  </button>
                  <button
                    onClick={setThisWeek}
                    className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300
                             rounded-md transition-colors"
                  >
                    This Week
                  </button>
                  <button
                    onClick={setPreviousMonth}
                    className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300
                             rounded-md transition-colors"
                  >
                    Previous Month
                  </button>
                </div>

                <p className="text-sm text-gray-400">
                  Selected period: {formatDate(startDate)} to {formatDate(endDate)}
                </p>
              </div>
            </div>

            <button
              onClick={handleAnalyzeWeek}
              disabled={analyzing}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed
                       text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors
                       flex items-center justify-center space-x-2"
            >
              {analyzing ? (
                <>
                  <ClockIcon className="h-4 w-4 animate-spin" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <CpuChipIcon className="h-4 w-4" />
                  <span>Generate Analysis</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Success Display */}
        {successMessage && (
          <div className="bg-green-900/20 border border-green-700 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <SparklesIcon className="h-5 w-5 text-green-400" />
              <p className="text-green-300">{successMessage}</p>
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-blue-400 flex items-center space-x-2">
              <CalendarIcon className="h-5 w-5" />
              <span>Recent Analyses</span>
            </h2>
            {analyses.length > 0 && (
              <span className="text-sm text-gray-400">
                {analyses.length} total {analyses.length === 1 ? 'analysis' : 'analyses'}
              </span>
            )}
          </div>

          {analyses.length === 0 ? (
            <div className="text-center py-8">
              <MusicalNoteIcon className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400">No analyses yet</p>
              <p className="text-sm text-gray-500 mt-1">
                Generate your first AI analysis to see insights about your listening patterns
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {currentAnalyses.map((analysis) => (
                <div key={analysis.id} className="border border-gray-700 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-medium text-white flex items-center space-x-2">
                        <CalendarIcon className="h-4 w-4 text-blue-400" />
                        <span>
                          {formatDate(analysis.week_start)} - {formatDate(analysis.week_end)}
                          <span className="text-gray-400 ml-2">
                            ({calculateDayCount(analysis.week_start, analysis.week_end)} {calculateDayCount(analysis.week_start, analysis.week_end) === 1 ? 'day' : 'days'})
                          </span>
                        </span>
                      </h3>
                      <p className="text-sm text-gray-400 mt-1">
                        {analysis.stats?.total_plays} plays • {analysis.stats?.unique_tracks} tracks • {analysis.stats?.unique_artists} artists
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500">
                        Analyzed: {new Date(analysis.analysis_date).toLocaleDateString()}
                      </span>
                      <button
                        onClick={() => handleDeleteAnalysis(
                          analysis.id,
                          `${formatDate(analysis.week_start)} - ${formatDate(analysis.week_end)}`
                        )}
                        className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-900/20
                                 rounded transition-colors"
                        title="Delete analysis"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
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

                  {/* Listening Patterns */}
                  {analysis.listening_patterns && (
                    <div className="mb-3">
                      <h4 className="text-sm font-medium text-blue-400 mb-1 flex items-center space-x-1">
                        <ChartBarIcon className="h-4 w-4" />
                        <span>Listening Patterns</span>
                      </h4>
                      <p className="text-sm text-gray-300">{analysis.listening_patterns}</p>
                    </div>
                  )}

                  {/* Musical Personality */}
                  {analysis.musical_personality && (
                    <div className="mb-3">
                      <h4 className="text-sm font-medium text-blue-400 mb-1 flex items-center space-x-1">
                        <MusicalNoteIcon className="h-4 w-4" />
                        <span>Musical Personality</span>
                      </h4>
                      <p className="text-sm text-gray-300">{analysis.musical_personality}</p>
                    </div>
                  )}

                  {/* Trends vs Previous */}
                  {analysis.trends_vs_previous && (
                    <div className="mb-3">
                      <h4 className="text-sm font-medium text-blue-400 mb-1 flex items-center space-x-1">
                        <ArrowTrendingUpIcon className="h-4 w-4" />
                        <span>Trends & Changes</span>
                      </h4>
                      <p className="text-sm text-gray-300">{analysis.trends_vs_previous}</p>
                    </div>
                  )}

                  {/* Recommendations */}
                  {analysis.recommendations && (
                    <div>
                      <h4 className="text-sm font-medium text-blue-400 mb-1 flex items-center space-x-1">
                        <StarIcon className="h-4 w-4" />
                        <span>Recommendations</span>
                      </h4>
                      <p className="text-sm text-gray-300">{analysis.recommendations}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between border-t border-gray-700 pt-4">
                <div className="text-sm text-gray-400">
                  Page {currentPage} of {totalPages}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800
                             disabled:text-gray-500 disabled:cursor-not-allowed text-gray-300
                             rounded-md transition-colors"
                  >
                    Previous
                  </button>

                  <div className="flex gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                      // Show first page, last page, current page, and pages around current
                      const showPage =
                        pageNum === 1 ||
                        pageNum === totalPages ||
                        (pageNum >= currentPage - 1 && pageNum <= currentPage + 1);

                      const showEllipsis =
                        (pageNum === currentPage - 2 && currentPage > 3) ||
                        (pageNum === currentPage + 2 && currentPage < totalPages - 2);

                      if (showEllipsis) {
                        return (
                          <span key={pageNum} className="px-3 py-1.5 text-gray-500">
                            ...
                          </span>
                        );
                      }

                      if (!showPage) return null;

                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                            currentPage === pageNum
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800
                             disabled:text-gray-500 disabled:cursor-not-allowed text-gray-300
                             rounded-md transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
          )}
        </div>
      </div>
    </PageLayout>
  );
}