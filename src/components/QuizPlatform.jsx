// src/components/QuizPlatform.jsx - COMPLETE FIXED VERSION
import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

// Sound effects
const playCorrectSound = () => {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance('Correct!');
    utterance.rate = 1.2;
    speechSynthesis.speak(utterance);
  }
};

const playWrongSound = () => {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance('Wrong!');
    utterance.rate = 1.2;
    speechSynthesis.speak(utterance);
  }
};

const QuizPlatform = ({ course, onQuizComplete }) => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(20 * 60); // 20 minutes in seconds
  const [userName, setUserName] = useState('');
  const [showResultsScreen, setShowResultsScreen] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [answerSubmitted, setAnswerSubmitted] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [quizStartTime, setQuizStartTime] = useState(null);
  const [quizEndTime, setQuizEndTime] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Track quiz start time
  useEffect(() => {
    if (questions.length > 0 && !quizStartTime) {
      setQuizStartTime(new Date());
    }
  }, [questions.length, quizStartTime]);

  // Fetch questions based on course
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('📝 Fetching questions for course:', {
          courseId: course._id,
          courseName: course.name,
          destinationId: course.destinationId
        });

        const response = await api.get('/quiz/questions', {
          params: {
            courseId: course._id,
            destination: course.name,
            destinationId: course.destinationId
          }
        });

        console.log('✅ Questions response:', response.data);

        if (response.data.success) {
          setQuestions(response.data.questions);
          console.log(`✅ Loaded ${response.data.questions.length} questions for ${course.name}`);
        } else {
          setError(response.data.message || 'Failed to load questions');
        }
      } catch (err) {
        console.error('❌ Error fetching questions:', err);
        setError('Failed to load quiz questions. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (course) {
      fetchQuestions();
    }
  }, [course]);

  const currentQuestion = questions[currentQuestionIndex];

  // Timer countdown - 20 minutes
  useEffect(() => {
    if (questions.length === 0 || timeLeft <= 0 || quizCompleted) return;

    const timer = setInterval(() => {
      setTimeLeft(prevTime => {
        if (prevTime <= 1) {
          clearInterval(timer);
          if (!quizCompleted) {
            handleAutoSubmit();
          }
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, quizCompleted, questions.length]);

  const handleAutoSubmit = useCallback(() => {
    console.log('Time expired - auto submitting quiz');
    setQuizCompleted(true);
    setQuizEndTime(new Date());
    
    const finalScoreValue = score;
    setFinalScore(finalScoreValue);
    setShowResultsScreen(true);
  }, [score, answers.length, questions.length]);

  const handleAnswer = (option) => {
    if (answerSubmitted || !currentQuestion) return;
    
    const isCorrect = option === currentQuestion.options[currentQuestion.correctAnswer];
    setSelectedOption(option);
    setShowFeedback(true);
    setAnswerSubmitted(true);

    if (isCorrect) {
      playCorrectSound();
      setScore(score + 1);
    } else {
      playWrongSound();
    }

    const newAnswer = {
      questionId: currentQuestion.id,
      question: currentQuestion.question,
      selectedOption: option,
      correctAnswer: currentQuestion.options[currentQuestion.correctAnswer],
      isCorrect: isCorrect,
      explanation: currentQuestion.explanation
    };
    
    setAnswers(prev => [...prev, newAnswer]);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedOption(null);
      setShowFeedback(false);
      setAnswerSubmitted(false);
    } else {
      setQuizEndTime(new Date());
      setFinalScore(score);
      setQuizCompleted(true);
      setShowResultsScreen(true);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      
      const prevAnswer = answers[currentQuestionIndex - 1];
      if (prevAnswer) {
        setSelectedOption(prevAnswer.selectedOption);
        setShowFeedback(true);
        setAnswerSubmitted(true);
      } else {
        setSelectedOption(null);
        setShowFeedback(false);
        setAnswerSubmitted(false);
      }
    }
  };

  const calculateTimeTaken = () => {
    if (!quizStartTime) return 0;
    const endTime = quizEndTime || new Date();
    return Math.round((endTime - quizStartTime) / 1000);
  };

  const getOptionClass = (option) => {
    if (!showFeedback) return "quiz-option";
    
    if (option === currentQuestion.options[currentQuestion.correctAnswer]) {
      return "quiz-option correct";
    } else if (option === selectedOption && option !== currentQuestion.options[currentQuestion.correctAnswer]) {
      return "quiz-option incorrect";
    }
    return "quiz-option";
  };

  const calculateProgress = () => {
    return questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmitQuiz = async () => {
    if (!userName.trim()) {
      alert('Please enter your name before submitting.');
      return;
    }

    try {
      setSubmitting(true);
      
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      const userId = userData._id || userData.id;

      if (!userId) {
        alert('User not authenticated. Please log in again.');
        setSubmitting(false);
        return;
      }

      // Calculate all required fields
      const timeTaken = calculateTimeTaken();
      const percentage = questions.length > 0 ? Math.round((finalScore / questions.length) * 100) : 0;
      
      const getRemark = (percent) => {
        if (percent >= 80) return "Excellent";
        if (percent >= 60) return "Good";
        if (percent >= 40) return "Fair";
        return "Needs Improvement";
      };

      const quizData = {
        answers: answers,
        userId: userId,
        userName: userName.trim(),
        courseId: course._id || course.destinationId,
        courseName: course.name,
        destination: course.name,
        score: finalScore,
        totalQuestions: questions.length,
        percentage: percentage,
        timeTaken: timeTaken,
        remark: getRemark(percentage),
        status: "completed",
        date: new Date().toISOString(),
        submittedAt: new Date().toISOString()
      };

      console.log('📤 Submitting quiz data:', quizData);
      
      const response = await api.post('/quiz/results', quizData);
      console.log('✅ Quiz submission response:', response.data);
      
      if (response.data.success) {
        setShowSuccessMessage(true);
        console.log('🎉 Quiz submitted successfully!');
        
        // 🚨 FIX: Use React navigation instead of window.location
        setTimeout(() => {
          // Use the onQuizComplete prop to navigate properly
          if (onQuizComplete) {
            onQuizComplete();
          } else {
            // Fallback to window.location only if prop is not available
            window.location.href = '/quiz-scores';
          }
        }, 1000);
      } else {
        alert('Error submitting quiz results: ' + (response.data.message || 'Unknown error'));
        setSubmitting(false);
      }
    } catch (error) {
      console.error('❌ Error submitting quiz:', error);
      console.error('Error details:', error.response?.data || error.message);
      setSubmitting(false);
      
      if (error.response?.status === 400) {
        alert('Missing required information. Please check your user session and try again.');
      } else if (error.response?.status === 500) {
        alert('Server error. Please try again later.');
      } else {
        alert('Error submitting quiz. Please check console for details.');
      }
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="quiz-platform" style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        minHeight: '100vh',
        padding: '2rem 0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-12 col-lg-8 text-center text-white">
              <div className="spinner-border mb-3" style={{width: '3rem', height: '3rem'}}>
                <span className="visually-hidden">Loading...</span>
              </div>
              <h3>Loading {course.name} Quiz...</h3>
              <p>Please wait while we prepare your questions</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="quiz-platform" style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        minHeight: '100vh',
        padding: '2rem 0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-12 col-lg-8">
              <div className="card shadow-lg border-0">
                <div className="card-body text-center p-5">
                  <i className="fas fa-exclamation-triangle fa-4x text-danger mb-3"></i>
                  <h3 className="text-danger mb-3">Failed to Load Quiz</h3>
                  <p className="text-muted mb-4">{error}</p>
                  <button 
                    className="btn btn-primary"
                    onClick={() => window.location.reload()}
                  >
                    <i className="fas fa-redo me-2"></i>
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // No questions state
  if (questions.length === 0) {
    return (
      <div className="quiz-platform" style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        minHeight: '100vh',
        padding: '2rem 0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-12 col-lg-8">
              <div className="card shadow-lg border-0">
                <div className="card-body text-center p-5">
                  <i className="fas fa-clipboard-question fa-4x text-warning mb-3"></i>
                  <h3 className="text-warning mb-3">No Questions Available</h3>
                  <p className="text-muted mb-4">
                    No quiz questions are currently available for {course.name}. 
                    Please check back later or contact support.
                  </p>
                  <button 
                    className="btn btn-outline-primary"
                    onClick={() => window.history.back()}
                  >
                    <i className="fas fa-arrow-left me-2"></i>
                    Go Back
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Results Screen
  if (showResultsScreen) {
    const percentage = questions.length > 0 ? ((finalScore / questions.length) * 100).toFixed(1) : 0;
    const timeTaken = calculateTimeTaken();
    
    return (
      <div className="quiz-results-container" style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        minHeight: '100vh',
        padding: '2rem 0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-md-8 col-lg-6">
              
              {showSuccessMessage && (
                <div className="alert alert-success alert-dismissible fade show mb-4" role="alert" style={{ borderRadius: '10px' }}>
                  <i className="fas fa-check-circle me-2"></i>
                  <strong>Success!</strong> Quiz submitted successfully! Redirecting to scores page...
                </div>
              )}
              
              <div className="card shadow-lg border-0" style={{ borderRadius: '20px' }}>
                <div className="card-header bg-primary text-white text-center py-4" style={{ borderTopLeftRadius: '20px', borderTopRightRadius: '20px' }}>
                  <h2 className="mb-0">
                    <i className="fas fa-trophy me-2"></i>
                    Quiz Completed!
                  </h2>
                  {timeLeft <= 0 && <p className="mb-0 mt-2">Time expired - quiz auto-submitted</p>}
                </div>
                
                <div className="card-body p-5 text-center">
                  <div className="score-circle mx-auto mb-4" style={{
                    width: '120px',
                    height: '120px',
                    borderRadius: '50%',
                    background: `conic-gradient(#28a745 ${percentage}%, #e9ecef ${percentage}%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2rem',
                    fontWeight: 'bold',
                    color: '#28a745'
                  }}>
                    <div style={{
                      width: '100px',
                      height: '100px',
                      borderRadius: '50%',
                      background: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {percentage}%
                    </div>
                  </div>

                  <h3 className="text-primary mb-3">{course.name} Quiz Results</h3>
                  
                  <div className="results-grid mb-4">
                    <div className="row text-center">
                      <div className="col-4">
                        <div className="result-item">
                          <h4 className="text-success">{finalScore}</h4>
                          <p className="text-muted mb-0">Correct</p>
                        </div>
                      </div>
                      <div className="col-4">
                        <div className="result-item">
                          <h4 className="text-danger">{questions.length - finalScore}</h4>
                          <p className="text-muted mb-0">Wrong</p>
                        </div>
                      </div>
                      <div className="col-4">
                        <div className="result-item">
                          <h4 className="text-info">{questions.length}</h4>
                          <p className="text-muted mb-0">Total</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="additional-info mb-4 p-3 bg-light rounded">
                    <div className="row">
                      <div className="col-6">
                        <strong>Time Taken:</strong> {Math.floor(timeTaken / 60)}:{(timeTaken % 60).toString().padStart(2, '0')}
                      </div>
                      <div className="col-6">
                        <strong>Score:</strong> {finalScore}/{questions.length}
                      </div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label htmlFor="userName" className="form-label fw-semibold">
                      Enter your name to save results:
                    </label>
                    <input
                      type="text"
                      className="form-control form-control-lg"
                      id="userName"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder="Your full name"
                      style={{ borderRadius: '10px' }}
                    />
                  </div>

                  <button 
                    className="btn btn-success btn-lg w-100 py-3"
                    onClick={handleSubmitQuiz}
                    disabled={!userName.trim() || submitting}
                    style={{ borderRadius: '12px', fontSize: '1.1rem' }}
                  >
                    {submitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-paper-plane me-2"></i>
                        Submit Results
                      </>
                    )}
                  </button>

                  {/* 🚨 REMOVED: Retry Quiz and View Scores buttons as requested */}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main Quiz Interface
  return (
    <div className="quiz-platform" style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      minHeight: '100vh',
      padding: '2rem 0'
    }}>
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-12 col-lg-10">
            <div className="card shadow-lg border-0">
              {/* Quiz Header */}
              <div className="card-header bg-primary text-white py-4">
                <div className="row align-items-center">
                  <div className="col-md-6">
                    <h2 className="mb-0">
                      <i className="fas fa-brain me-2"></i>
                      {course.name} Quiz
                    </h2>
                    <p className="mb-0 opacity-75">Test your knowledge and earn your certificate</p>
                  </div>
                  <div className="col-md-6 text-md-end">
                    <div className="quiz-info">
                      <span className="badge bg-light text-primary fs-6 me-2">
                        Q{currentQuestionIndex + 1} of {questions.length}
                      </span>
                      <span className="badge bg-success fs-6 me-2">
                        Score: {score}
                      </span>
                      <span className={`badge fs-6 ${timeLeft < 300 ? 'bg-danger' : 'bg-warning'}`}>
                        <i className="fas fa-clock me-1"></i>
                        {formatTime(timeLeft)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="card-body px-0">
                <div className="px-4 mb-4">
                  <div className="progress" style={{height: '10px', borderRadius: '5px'}}>
                    <div 
                      className="progress-bar bg-success progress-bar-striped progress-bar-animated" 
                      style={{width: `${calculateProgress()}%`}}
                    ></div>
                  </div>
                  <div className="d-flex justify-content-between mt-2">
                    <small className="text-muted">Progress</small>
                    <small className="text-muted">{Math.round(calculateProgress())}%</small>
                  </div>
                </div>

                {/* Question Content */}
                <div className="px-4">
                  <div className="question-card card border-0 bg-light mb-4">
                    <div className="card-body">
                      <h4 className="question-text fw-bold text-dark mb-4">
                        <span className="text-primary me-2">Q{currentQuestionIndex + 1}:</span>
                        {currentQuestion.question}
                      </h4>
                      
                      <div className="options-container">
                        {currentQuestion.options.map((option, index) => (
                          <div
                            key={index}
                            className={getOptionClass(option)}
                            onClick={() => !answerSubmitted && handleAnswer(option)}
                          >
                            <div className="option-content">
                              <span className="option-letter me-3">
                                {String.fromCharCode(65 + index)}
                              </span>
                              <span className="option-text">{option}</span>
                            </div>
                            {showFeedback && option === currentQuestion.options[currentQuestion.correctAnswer] && (
                              <i className="fas fa-check text-success ms-auto"></i>
                            )}
                            {showFeedback && option === selectedOption && option !== currentQuestion.options[currentQuestion.correctAnswer] && (
                              <i className="fas fa-times text-danger ms-auto"></i>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Feedback Section */}
                  {showFeedback && (
                    <div className={`feedback-card card border-${selectedOption === currentQuestion.options[currentQuestion.correctAnswer] ? 'success' : 'danger'} mb-4`}>
                      <div className="card-body">
                        <div className="d-flex align-items-center">
                          <i className={`fas fa-${selectedOption === currentQuestion.options[currentQuestion.correctAnswer] ? 'check' : 'times'} fa-2x text-${selectedOption === currentQuestion.options[currentQuestion.correctAnswer] ? 'success' : 'danger'} me-3`}></i>
                          <div>
                            <h5 className={`text-${selectedOption === currentQuestion.options[currentQuestion.correctAnswer] ? 'success' : 'danger'} mb-1`}>
                              {selectedOption === currentQuestion.options[currentQuestion.correctAnswer] ? 'Correct! Well done!' : 'Incorrect!'}
                            </h5>
                            <p className="mb-0 text-muted">
                              {currentQuestion.explanation || 
                                (selectedOption === currentQuestion.options[currentQuestion.correctAnswer] 
                                  ? 'You selected the right answer.' 
                                  : `The correct answer is: ${currentQuestion.options[currentQuestion.correctAnswer]}`)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Navigation Buttons */}
                  <div className="navigation-buttons d-flex justify-content-between gap-3 mb-4">
                    <button
                      className="btn btn-outline-primary"
                      onClick={handlePreviousQuestion}
                      disabled={currentQuestionIndex === 0}
                    >
                      <i className="fas fa-arrow-left me-2"></i>
                      Previous
                    </button>
                    
                    <button
                      className="btn btn-primary"
                      onClick={handleNextQuestion}
                      disabled={!answerSubmitted}
                    >
                      {currentQuestionIndex < questions.length - 1 ? (
                        <>
                          Next <i className="fas fa-arrow-right ms-2"></i>
                        </>
                      ) : (
                        <>
                          Finish Quiz <i className="fas fa-flag-checkered ms-2"></i>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Quiz Tips */}
                  <div className="quiz-tips card border-info">
                    <div className="card-body py-2">
                      <small className="text-info">
                        <i className="fas fa-lightbulb me-2"></i>
                        {!answerSubmitted 
                          ? 'Tip: Read each question carefully before selecting your answer.' 
                          : 'Review your answer before proceeding to the next question.'}
                        {timeLeft < 300 && (
                          <span className="ms-2 text-warning">
                            <i className="fas fa-exclamation-triangle me-1"></i>
                            Time is running out!
                          </span>
                        )}
                      </small>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quiz Footer */}
              <div className="card-footer bg-light py-3">
                <div className="row align-items-center">
                  <div className="col-md-6">
                    <small className="text-muted">
                      <i className="fas fa-clock me-1"></i>
                      Time: {formatTime(timeLeft)} | Questions: {questions.length} | Answered: {answers.length}
                    </small>
                  </div>
                  <div className="col-md-6 text-md-end">
                    <button 
                      className="btn btn-outline-danger btn-sm"
                      onClick={handleAutoSubmit}
                    >
                      <i className="fas fa-stopwatch me-1"></i>
                      Submit Now
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .quiz-option {
          padding: 1rem 1.5rem;
          margin-bottom: 0.75rem;
          border: 2px solid #e9ecef;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.3s ease;
          background: white;
          display: flex;
          align-items: center;
          justify-content: between;
        }

        .quiz-option:hover:not(.correct):not(.incorrect) {
          border-color: #3B71CA;
          background-color: #f8f9fa;
          transform: translateX(5px);
        }

        .quiz-option.correct {
          border-color: #28a745;
          background-color: #d4edda;
          color: #155724;
          cursor: default;
        }

        .quiz-option.incorrect {
          border-color: #dc3545;
          background-color: #f8d7da;
          color: #721c24;
          cursor: default;
        }

        .quiz-option:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .option-letter {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 30px;
          height: 30px;
          background: #3B71CA;
          color: white;
          border-radius: 50%;
          font-weight: bold;
        }

        .option-content {
          display: flex;
          align-items: center;
          flex-grow: 1;
        }

        .option-text {
          flex-grow: 1;
        }

        .question-text {
          line-height: 1.6;
        }

        .feedback-card {
          animation: slideIn 0.5s ease;
        }

        @keyframes slideIn {
          from { transform: translateY(-10px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        .timer-warning {
          animation: pulse 1s infinite;
        }

        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export { QuizPlatform };
export default QuizPlatform;