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
  const [startTime, setStartTime] = useState(Date.now());
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());

  useEffect(() => {
    setQuestionStartTime(Date.now());
  }, [currentQuestionIndex]);

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

      // Auto-advance after showing result
      setTimeout(() => {
        setShowResult(false);
        if (currentQuestionIndex < session.questions.length - 1) {
          setCurrentQuestionIndex(prev => prev + 1);
        } else {
          completeSession();
        }
      }, 3000);

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
      const results = await completeTriviaSession(session.id);
      setFinalResults(results);
      setSessionCompleted(true);
    } catch (error) {
      console.error('Error completing session:', error);
      // Calculate results locally as fallback
      const correctAnswers = Object.values(answers).filter(a => a.isCorrect).length;
      setFinalResults({
        sessionId: session.id,
        score: correctAnswers,
        totalQuestions: session.questions.length
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
        case 'multiple_choice':
          const options = JSON.parse(currentQuestion.options || '[]');
          return (
            <div className="space-y-3">
              {options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswer(option)}
                  className="w-full text-left p-4 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded-lg transition-colors"
                >
                  <span className="font-medium text-gray-700 mr-2">{String.fromCharCode(65 + index)}.</span>
                  {option}
                </button>
              ))}
            </div>
          );

        case 'true_false':
          return (
            <div className="space-y-3">
              <button
                onClick={() => handleAnswer('true')}
                className="w-full text-left p-4 bg-gray-50 hover:bg-green-50 border border-gray-200 hover:border-green-300 rounded-lg transition-colors"
              >
                <span className="font-medium text-gray-700 mr-2">A.</span>
                True
              </button>
              <button
                onClick={() => handleAnswer('false')}
                className="w-full text-left p-4 bg-gray-50 hover:bg-red-50 border border-gray-200 hover:border-red-300 rounded-lg transition-colors"
              >
                <span className="font-medium text-gray-700 mr-2">B.</span>
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
                className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.target.value.trim()) {
                    handleAnswer(e.target.value.trim());
                  }
                }}
              />
              <p className="text-sm text-gray-500 mt-2">Press Enter to submit your answer</p>
            </div>
          );

        default:
          return (
            <div className="text-center py-8 text-gray-500">
              Question type not supported yet
            </div>
          );
      }
    };

    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          {/* Question Header */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm font-medium text-blue-600 uppercase tracking-wide">
                {currentQuestion.category?.replace('_', ' ')} • {currentQuestion.difficulty_level}
              </span>
              <span className="text-sm text-gray-500">
                Question {currentQuestionIndex + 1} of {session.questions.length}
              </span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
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
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <div className="mb-6">
            {lastResult.isCorrect ? (
              <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto" />
            ) : (
              <XCircleIcon className="h-16 w-16 text-red-500 mx-auto" />
            )}
          </div>

          <h2 className={`text-2xl font-bold mb-4 ${lastResult.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
            {lastResult.isCorrect ? 'Correct!' : 'Incorrect'}
          </h2>

          {!lastResult.isCorrect && (
            <p className="text-gray-600 mb-4">
              The correct answer was: <span className="font-semibold">{lastResult.correctAnswer}</span>
            </p>
          )}

          {lastResult.explanation && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-blue-800">{lastResult.explanation}</p>
            </div>
          )}

          <button
            onClick={nextQuestion}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center mx-auto"
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
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <TrophyIcon className="h-16 w-16 text-yellow-500 mx-auto mb-6" />

          <h2 className="text-3xl font-bold text-gray-900 mb-2">Quiz Complete!</h2>
          <p className="text-gray-600 mb-8">Here's how you did on your music trivia</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-blue-50 rounded-lg p-6">
              <div className="text-3xl font-bold text-blue-600 mb-2">{finalResults.score}</div>
              <div className="text-sm text-blue-800">Correct Answers</div>
            </div>
            <div className="bg-green-50 rounded-lg p-6">
              <div className="text-3xl font-bold text-green-600 mb-2">{percentage}%</div>
              <div className="text-sm text-green-800">Accuracy</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-6">
              <div className="text-3xl font-bold text-purple-600 mb-2">{Math.floor(totalTime / 60)}:{(totalTime % 60).toString().padStart(2, '0')}</div>
              <div className="text-sm text-purple-800">Total Time</div>
            </div>
          </div>

          <div className="flex justify-center space-x-4">
            <button
              onClick={onBack}
              className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Back to Trivia
            </button>
            <button
              onClick={onComplete}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
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
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ChevronLeftIcon className="h-5 w-5 mr-1" />
          Back to Trivia
        </button>

        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{session.session_name}</h1>
            <p className="text-gray-600">{session.difficulty_level} • {session.question_count} questions</p>
          </div>
          <div className="flex items-center text-gray-500">
            <ClockIcon className="h-5 w-5 mr-1" />
            <span>{Math.floor((Date.now() - startTime) / 1000 / 60)}:{((Date.now() - startTime) / 1000 % 60).toFixed(0).padStart(2, '0')}</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* Content */}
      {sessionCompleted ? renderFinalResults() : showResult ? renderResult() : renderQuestion()}
    </div>
  );
}