import { useState, useEffect } from 'react';
import {
  ChevronLeftIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  TrophyIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import { submitTriviaAnswer, completeTriviaSession } from '../../data/triviaApi';

export default function TriviaSession({ session, onComplete, onBack }) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showResult, setShowResult] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [finalResults, setFinalResults] = useState(null);
  const [startTime] = useState(Date.now());
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    setQuestionStartTime(Date.now());
  }, [currentQuestionIndex]);

  // Update timer every second (stop when session is completed)
  useEffect(() => {
    if (sessionCompleted) return; // Don't run timer if session is completed

    const timerInterval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [startTime, sessionCompleted]);

  // Handle case where questions might not be loaded yet
  if (!session.questions || session.questions.length === 0) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto"></div>
          <p className="mt-4 text-surface-400">Loading session...</p>
        </div>
      </div>
    );
  }

  const currentQuestion = session.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / session.questions.length) * 100;

  const handleAnswer = async (answer) => {
    const responseTime = Math.round((Date.now() - questionStartTime) / 1000);

    try {
      // Submit answer to backend
      const result = await submitTriviaAnswer(session.id, {
        questionId: currentQuestion.id,
        userAnswer: answer,
        responseTimeSeconds: responseTime
      });

      // Store answer locally
      setAnswers(prev => ({
        ...prev,
        [currentQuestion.id]: {
          answer,
          isCorrect: result.isCorrect,
          correctAnswer: result.correctAnswer,
          explanation: result.explanation,
          responseTime
        }
      }));

      setLastResult(result);
      setShowResult(true);

    } catch (error) {
      console.error('Error submitting answer:', error);
      // Continue anyway for better UX
      setAnswers(prev => ({
        ...prev,
        [currentQuestion.id]: { answer, isCorrect: false, responseTime }
      }));

      if (currentQuestionIndex < session.questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
      } else {
        completeSession();
      }
    }
  };

  const completeSession = async () => {
    try {
      const results = await completeTriviaSession(session.id, elapsedTime);
      setFinalResults(results);
      setSessionCompleted(true);
    } catch (error) {
      console.error('Error completing session:', error);
      // Calculate results locally as fallback
      const correctAnswers = Object.values(answers).filter(a => a.isCorrect).length;
      setFinalResults({
        sessionId: session.id,
        score: correctAnswers,
        totalQuestions: session.questions.length,
        completionTimeSeconds: elapsedTime
      });
      setSessionCompleted(true);
    }
  };

  const nextQuestion = () => {
    setShowResult(false);
    if (currentQuestionIndex < session.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      completeSession();
    }
  };

  const renderQuestion = () => {
    if (!currentQuestion) return null;

    const renderQuestionContent = () => {
      switch (currentQuestion.question_type) {
        case 'multiple_choice': {
          // Handle both JSONB (already parsed) and string options
          let options = currentQuestion.options;
          if (typeof options === 'string') {
            try {
              options = JSON.parse(options);
            } catch (e) {
              console.error('Failed to parse options:', e);
              options = [];
            }
          }
          options = options || [];

          return (
            <div className="space-y-3">
              {options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswer(option)}
                  className="w-full text-left p-4 bg-surface-900 hover:bg-brand-900 border border-surface-700 hover:border-brand-500 rounded-lg transition-colors text-white"
                >
                  <span className="font-medium text-brand-400 mr-2">{String.fromCharCode(65 + index)}.</span>
                  {option}
                </button>
              ))}
            </div>
          );
        }

        case 'true_false':
          return (
            <div className="space-y-3">
              <button
                onClick={() => handleAnswer('true')}
                className="w-full text-left p-4 bg-surface-900 hover:bg-success-900 border border-surface-700 hover:border-success-500 rounded-lg transition-colors text-white"
              >
                <span className="font-medium text-success-400 mr-2">A.</span>
                True
              </button>
              <button
                onClick={() => handleAnswer('false')}
                className="w-full text-left p-4 bg-surface-900 hover:bg-danger-900 border border-surface-700 hover:border-danger-500 rounded-lg transition-colors text-white"
              >
                <span className="font-medium text-danger-400 mr-2">B.</span>
                False
              </button>
            </div>
          );

        case 'fill_blank':
          return (
            <div>
              <input
                type="text"
                placeholder="Type your answer here..."
                className="w-full p-4 border border-surface-600 rounded-lg bg-surface-900 text-white placeholder-surface-500 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.target.value.trim()) {
                    handleAnswer(e.target.value.trim());
                  }
                }}
              />
              <p className="text-sm text-surface-400 mt-2">Press Enter to submit your answer</p>
            </div>
          );

        case 'ranking': {
          // Handle both JSONB (already parsed) and string options
          let rankingOptions = currentQuestion.options;
          if (typeof rankingOptions === 'string') {
            try {
              rankingOptions = JSON.parse(rankingOptions);
            } catch (e) {
              console.error('Failed to parse options:', e);
              rankingOptions = [];
            }
          }

          // Ensure we have an array and filter out any duplicates
          if (!Array.isArray(rankingOptions)) {
            console.error('Options is not an array:', rankingOptions);
            rankingOptions = [];
          }

          // Remove duplicates if any
          rankingOptions = [...new Set(rankingOptions)];

          // If no options, show error with skip option
          if (rankingOptions.length === 0) {
            return (
              <div className="text-center py-8">
                <div className="text-danger-400 mb-4">
                  <p className="font-semibold mb-2">Error: No ranking options available for this question</p>
                  <p className="text-sm text-surface-400">This question has incomplete data and cannot be answered.</p>
                </div>
                <button
                  onClick={() => {
                    // Skip this question by marking it as answered with empty string
                    handleAnswer('');
                  }}
                  className="bg-warning-600 text-white px-6 py-3 rounded-lg hover:bg-warning-700 transition-colors"
                >
                  Skip This Question
                </button>
              </div>
            );
          }

          return (
            <div>
              <p className="text-sm text-surface-400 mb-4">
                Drag and drop to reorder, or enter numbers (1-{rankingOptions.length}) to rank from most to least
              </p>
              <div className="space-y-3">
                {rankingOptions.map((option, index) => (
                  <div key={`${option}-${index}`} className="flex items-center space-x-3">
                    <div className="flex flex-col items-center">
                      <input
                        type="number"
                        min="1"
                        max={rankingOptions.length}
                        defaultValue={index + 1}
                        className="w-16 p-2 border border-surface-600 rounded-lg bg-surface-900 text-white text-center focus:ring-2 focus:ring-brand-500 focus:border-brand-500 font-semibold"
                        id={`rank-${currentQuestion.id}-${index}`}
                      />
                      <span className="text-xs text-surface-500 mt-1">Rank</span>
                    </div>
                    <div className="flex-1 p-4 bg-surface-800 border-2 border-surface-700 rounded-lg text-white hover:border-brand-500 transition-colors">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{option}</span>
                        <span className="text-sm text-surface-500">#{index + 1}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => {
                  const rankings = rankingOptions.map((option, idx) => {
                    const input = document.getElementById(`rank-${currentQuestion.id}-${idx}`);
                    return { item: option, rank: parseInt(input.value) || idx + 1 };
                  });
                  const sorted = rankings.sort((a, b) => a.rank - b.rank);
                  const answer = sorted.map(r => r.item).join(',');
                  handleAnswer(answer);
                }}
                className="mt-6 w-full bg-brand-600 text-white px-6 py-3 rounded-lg hover:bg-brand-700 transition-colors font-semibold"
              >
                Submit Ranking
              </button>
            </div>
          );
        }

        default:
          return (
            <div className="text-center py-8 text-surface-400">
              Question type not supported yet
            </div>
          );
      }
    };

    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-surface-800 rounded-lg border border-surface-700 p-8">
          {/* Question Header */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm font-medium text-brand-400 uppercase tracking-wide">
                {currentQuestion.category?.replace('_', ' ')} • {currentQuestion.difficulty_level}
              </span>
              <span className="text-sm text-surface-400">
                Question {currentQuestionIndex + 1} of {session.questions.length}
              </span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">
              {currentQuestion.question_text}
            </h2>
          </div>

          {/* Question Content */}
          {renderQuestionContent()}
        </div>
      </div>
    );
  };

  const renderResult = () => {
    if (!lastResult) return null;

    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-surface-800 rounded-lg border border-surface-700 p-8 text-center">
          <div className="mb-6">
            {lastResult.isCorrect ? (
              <CheckCircleIcon className="h-16 w-16 text-success-400 mx-auto" />
            ) : (
              <XCircleIcon className="h-16 w-16 text-danger-400 mx-auto" />
            )}
          </div>

          <h2 className={`text-2xl font-bold mb-4 ${lastResult.isCorrect ? 'text-success-400' : 'text-danger-400'}`}>
            {lastResult.isCorrect ? 'Correct!' : 'Incorrect'}
          </h2>

          {!lastResult.isCorrect && (
            <p className="text-surface-300 mb-4">
              The correct answer was: <span className="font-semibold text-white">{lastResult.correctAnswer}</span>
            </p>
          )}

          {lastResult.explanation && (
            <div className="bg-brand-900/20 border border-brand-700 rounded-lg p-4 mb-6">
              <p className="text-brand-300">{lastResult.explanation}</p>
            </div>
          )}

          <button
            onClick={nextQuestion}
            className="bg-brand-600 text-white px-6 py-3 rounded-lg hover:bg-brand-700 transition-colors flex items-center mx-auto"
          >
            {currentQuestionIndex < session.questions.length - 1 ? (
              <>
                Next Question
                <ArrowRightIcon className="h-5 w-5 ml-2" />
              </>
            ) : (
              'Complete Quiz'
            )}
          </button>
        </div>
      </div>
    );
  };

  const renderFinalResults = () => {
    if (!finalResults) return null;

    const percentage = Math.round((finalResults.score / finalResults.totalQuestions) * 100);
    const totalTime = Math.round((Date.now() - startTime) / 1000);

    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-surface-800 rounded-lg border border-surface-700 p-8 text-center">
          <TrophyIcon className="h-16 w-16 text-warning-400 mx-auto mb-6" />

          <h2 className="text-3xl font-bold text-white mb-2">Quiz Complete!</h2>
          <p className="text-surface-300 mb-8">Here's how you did on your music trivia</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-brand-900/30 border border-brand-700 rounded-lg p-6">
              <div className="text-3xl font-bold text-brand-400 mb-2">{finalResults.score}</div>
              <div className="text-sm text-brand-300">Correct Answers</div>
            </div>
            <div className="bg-success-900/30 border border-success-700 rounded-lg p-6">
              <div className="text-3xl font-bold text-success-400 mb-2">{percentage}%</div>
              <div className="text-sm text-success-300">Accuracy</div>
            </div>
            <div className="bg-highlight-900/30 border border-highlight-700 rounded-lg p-6">
              <div className="text-3xl font-bold text-highlight-400 mb-2">{Math.floor(totalTime / 60)}:{(totalTime % 60).toString().padStart(2, '0')}</div>
              <div className="text-sm text-highlight-300">Total Time</div>
            </div>
          </div>

          <div className="flex justify-center space-x-4">
            <button
              onClick={onBack}
              className="bg-surface-700 text-white px-6 py-3 rounded-lg hover:bg-surface-600 transition-colors"
            >
              Back to Trivia
            </button>
            <button
              onClick={onComplete}
              className="bg-brand-600 text-white px-6 py-3 rounded-lg hover:bg-brand-700 transition-colors"
            >
              New Quiz
            </button>
          </div>
        </div>
      </div>
    );
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

        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white">{session.session_name}</h1>
            <p className="text-surface-400">{session.difficulty_level} • {session.question_count} questions</p>
          </div>
          <div className="flex items-center text-surface-400">
            <ClockIcon className="h-5 w-5 mr-1" />
            <span>{Math.floor(elapsedTime / 60)}:{(elapsedTime % 60).toString().padStart(2, '0')}</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-surface-700 rounded-full h-2">
          <div
            className="bg-brand-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* Content */}
      {sessionCompleted ? renderFinalResults() : showResult ? renderResult() : renderQuestion()}
    </div>
  );
}