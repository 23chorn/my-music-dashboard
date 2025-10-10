import { useState, useEffect } from 'react';
import {
  ChevronLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  TrophyIcon
} from '@heroicons/react/24/outline';
import { getTriviaSession } from '../../data/triviaApi';

export default function TriviaSessionReview({ session: initialSession, onBack }) {
  const [session, setSession] = useState(initialSession);
  const [responses, setResponses] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSessionDetails();
  }, [initialSession.id]);

  const loadSessionDetails = async () => {
    try {
      setLoading(true);
      // Fetch full session with questions
      const fullSession = await getTriviaSession(initialSession.id);
      setSession(fullSession);

      // Create a map of responses by question_id for easy lookup
      if (fullSession.responses) {
        const responseMap = {};
        fullSession.responses.forEach(response => {
          responseMap[response.question_id] = response;
        });
        setResponses(responseMap);
      }
    } catch (error) {
      console.error('Error loading session details:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    if (!seconds) return 'N/A';
    return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading session details...</p>
        </div>
      </div>
    );
  }

  if (!session.questions || session.questions.length === 0) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-gray-400">No questions found for this session</p>
          <button onClick={onBack} className="mt-4 text-blue-400 hover:text-blue-300">
            Back to History
          </button>
        </div>
      </div>
    );
  }

  const score = initialSession.score || 0;
  const totalQuestions = initialSession.total_questions || session.questions.length;
  const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={onBack}
          className="flex items-center text-gray-400 hover:text-white mb-4"
        >
          <ChevronLeftIcon className="h-5 w-5 mr-1" />
          Back to History
        </button>

        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">{session.session_name}</h1>
              <p className="text-gray-400">{session.difficulty_level} • {session.question_count} questions</p>
            </div>
            <TrophyIcon className="h-12 w-12 text-yellow-500" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-blue-400 mb-1">{score}/{totalQuestions}</div>
              <div className="text-sm text-gray-400">Correct Answers</div>
            </div>
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 text-center">
              <div className={`text-3xl font-bold mb-1 ${percentage >= 80 ? 'text-green-400' : percentage >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                {percentage}%
              </div>
              <div className="text-sm text-gray-400">Accuracy</div>
            </div>
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-purple-400 mb-1">
                {formatTime(initialSession.completion_time_seconds)}
              </div>
              <div className="text-sm text-gray-400">Completion Time</div>
            </div>
          </div>
        </div>
      </div>

      {/* Questions Review */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white mb-4">Question Review</h2>
        {session.questions.map((question, index) => {
          const response = responses[question.id];
          const isCorrect = response?.is_correct;

          return (
            <div key={question.id} className={`bg-gray-800 border rounded-lg p-6 ${isCorrect ? 'border-green-700' : 'border-red-700'}`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <span className="text-sm font-medium text-blue-400 mr-2">Question {index + 1}</span>
                    <span className="text-xs text-gray-500 capitalize">{question.category?.replace('_', ' ')} • {question.difficulty_level}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-3">{question.question_text}</h3>
                </div>
                <div className="ml-4">
                  {isCorrect ? (
                    <CheckCircleIcon className="h-8 w-8 text-green-400" />
                  ) : (
                    <XCircleIcon className="h-8 w-8 text-red-400" />
                  )}
                </div>
              </div>

              <div className="space-y-2 mb-4">
                {response && (
                  <>
                    <div className="flex items-start">
                      <span className="text-sm font-medium text-gray-400 min-w-[120px]">Your answer:</span>
                      <span className={`text-sm font-medium ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                        {response.user_answer}
                      </span>
                    </div>
                    {!isCorrect && (
                      <div className="flex items-start">
                        <span className="text-sm font-medium text-gray-400 min-w-[120px]">Correct answer:</span>
                        <span className="text-sm font-medium text-green-400">
                          {question.correct_answer}
                        </span>
                      </div>
                    )}
                    {response.response_time_seconds && (
                      <div className="flex items-start">
                        <span className="text-sm font-medium text-gray-400 min-w-[120px]">Response time:</span>
                        <span className="text-sm text-gray-400">
                          {response.response_time_seconds}s
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {question.explanation && (
                <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
                  <p className="text-sm text-blue-300">{question.explanation}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
