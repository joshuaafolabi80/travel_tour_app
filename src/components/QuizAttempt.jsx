// src/components/QuizAttempt.jsx - COMPLETE FIXED VERSION WITH AUDIO FEEDBACK
import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import './QuizAttempt.css';

const QuizAttempt = ({ navigateTo }) => {
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
  const [currentQuestionSet, setCurrentQuestionSet] = useState(null);
  
  // Audio references
  const correctSoundRef = useRef(null);
  const wrongSoundRef = useRef(null);

  // Load question set from localStorage on component mount
  useEffect(() => {
    const storedQuestionSet = localStorage.getItem('currentQuestionSet');
    if (storedQuestionSet) {
      try {
        const questionSetData = JSON.parse(storedQuestionSet);
        setCurrentQuestionSet(questionSetData);
        console.log('📝 Loaded question set from storage:', questionSetData);
        
        // Use questions from the stored set
        if (questionSetData.questions && questionSetData.questions.length > 0) {
          console.log('🎯 Using stored questions:', questionSetData.questions.length);
          
          // Format questions to ensure they have the correct structure
          const formattedQuestions = questionSetData.questions.map((q, index) => ({
            id: q._id || q.id || `q-${index}`,
            question: q.question || q.text || 'Question not available',
            options: q.options || [],
            correctAnswer: q.correctAnswer !== undefined ? q.correctAnswer : 0,
            explanation: q.explanation || ''
          }));
          
          setQuestions(formattedQuestions);
          setLoading(false);
        } else {
          setError('No questions available in this question set.');
          setLoading(false);
        }
      } catch (error) {
        console.error('❌ Error parsing stored question set:', error);
        setError('Error loading questions. Please try again.');
        setLoading(false);
      }
    } else {
      console.log('📝 No stored question set found');
      setError('No question set found. Please go back and select a question set.');
      setLoading(false);
    }
  }, []);

  // Initialize audio elements
  useEffect(() => {
    correctSoundRef.current = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==');
    wrongSoundRef.current = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==');
    
    // Create simple beep sounds
    const createBeepSound = (frequency, duration) => {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration);
    };

    // Override play methods with custom beeps
    correctSoundRef.current.play = () => createBeepSound(800, 0.3);
    wrongSoundRef.current.play = () => createBeepSound(400, 0.5);
  }, []);

  const currentQuestion = questions[currentQuestionIndex];

  // Track quiz start time
  useEffect(() => {
    if (questions.length > 0 && !quizStartTime) {
      setQuizStartTime(new Date());
    }
  }, [questions.length, quizStartTime]);

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

  const handleAnswer = (optionIndex) => {
    if (answerSubmitted || !currentQuestion) return;
    
    const isCorrect = optionIndex === currentQuestion.correctAnswer;
    setSelectedOption(optionIndex);
    setShowFeedback(true);
    setAnswerSubmitted(true);

    // Play sound feedback
    if (isCorrect) {
      if (correctSoundRef.current) {
        correctSoundRef.current.play().catch(e => console.log('Audio play failed:', e));
      }
      setScore(score + 1);
    } else {
      if (wrongSoundRef.current) {
        wrongSoundRef.current.play().catch(e => console.log('Audio play failed:', e));
      }
    }

    const newAnswer = {
      questionId: currentQuestion.id,
      question: currentQuestion.question,
      selectedOption: optionIndex,
      selectedAnswer: optionIndex,
      correctAnswer: currentQuestion.correctAnswer,
      isCorrect: isCorrect,
      explanation: currentQuestion.explanation,
      options: currentQuestion.options
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

  const getOptionClass = (optionIndex) => {
    if (!showFeedback) return "quiz-option";
    
    if (optionIndex === currentQuestion.correctAnswer) {
      return "quiz-option correct-option";
    } else if (optionIndex === selectedOption && optionIndex !== currentQuestion.correctAnswer) {
      return "quiz-option wrong-option";
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
      const userId = userData._id || userData.id || 'anonymous';

      // Calculate all required fields
      const timeTaken = calculateTimeTaken();
      const percentage = questions.length > 0 ? Math.round((finalScore / questions.length) * 100) : 0;
      
      const getRemark = (percent) => {
        if (percent >= 80) return "Excellent";
        if (percent >= 60) return "Good";
        if (percent >= 40) return "Fair";
        return "Needs Improvement";
      };

      const courseName = currentQuestionSet?.title || 'Course Questions';
      const finalRemark = getRemark(percentage);

      // Format answers to match server schema
      const formattedAnswers = answers.map((answer, index) => ({
        questionId: answer.questionId,
        question: answer.question,
        selectedOption: answer.selectedOption,
        correctAnswer: answer.correctAnswer,
        isCorrect: answer.isCorrect,
        explanation: answer.explanation,
        options: answer.options
      }));

      const quizData = {
        answers: formattedAnswers,
        userId: userId,
        userName: userName.trim(),
        courseId: currentQuestionSet?.id,
        courseName: courseName,
        courseType: currentQuestionSet?.type || 'general',
        destination: courseName,
        score: finalScore,
        totalQuestions: questions.length,
        percentage: percentage,
        timeTaken: timeTaken,
        remark: finalRemark,
        status: "completed",
        date: new Date().toISOString(),
        submittedAt: new Date().toISOString(),
        questionSetId: currentQuestionSet?.id,
        questionSetTitle: currentQuestionSet?.title,
        questionSetType: currentQuestionSet?.type
      };

      console.log('📤 Submitting quiz data:', quizData);
      
      const response = await api.post('/quiz/results', quizData);
      console.log('✅ Quiz submission response:', response.data);
      
      if (response.data.success) {
        setShowSuccessMessage(true);
        console.log('🎉 Quiz submitted successfully!');
        
        // Clear stored question set
        localStorage.removeItem('currentQuestionSet');
        
        // Navigate to quiz scores using navigateTo prop
        setTimeout(() => {
          if (navigateTo) {
            navigateTo('quiz-scores');
          }
        }, 2000);
      } else {
        alert('Error submitting quiz results: ' + (response.data.message || 'Unknown error'));
        setSubmitting(false);
      }
    } catch (error) {
      console.error('❌ Error submitting quiz:', error);
      console.error('Error details:', error.response?.data || error.message);
      setSubmitting(false);
      
      if (error.response?.data?.message) {
        alert('Error submitting quiz: ' + error.response.data.message);
      } else {
        alert('Error submitting quiz. Please check console for details.');
      }
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="quiz-attempt-container">
        <div className="container-fluid py-4">
          <div className="row justify-content-center">
            <div className="col-12 col-md-8 col-lg-6">
              <div className="card shadow-lg border-0">
                <div className="card-body text-center py-5">
                  <div className="spinner-border text-primary mb-3" style={{width: '3rem', height: '3rem'}}>
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <h4 className="text-primary">Loading Quiz...</h4>
                  <p>Please wait while we prepare your questions</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="quiz-attempt-container">
        <div className="container-fluid py-4">
          <div className="row justify-content-center">
            <div className="col-12 col-md-8 col-lg-6">
              <div className="card shadow-lg border-0">
                <div className="card-body text-center p-5">
                  <i className="fas fa-exclamation-triangle fa-4x text-danger mb-3"></i>
                  <h3 className="text-danger mb-3">Failed to Load Quiz</h3>
                  <p className="text-muted mb-4">{error}</p>
                  <button 
                    className="btn btn-primary"
                    onClick={() => navigateTo ? navigateTo('general-courses') : window.history.back()}
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

  // No questions state
  if (questions.length === 0) {
    return (
      <div className="quiz-attempt-container">
        <div className="container-fluid py-4">
          <div className="row justify-content-center">
            <div className="col-12 col-md-8 col-lg-6">
              <div className="card shadow-lg border-0">
                <div className="card-body text-center p-5">
                  <i className="fas fa-clipboard-question fa-4x text-warning mb-3"></i>
                  <h3 className="text-warning mb-3">No Questions Available</h3>
                  <p className="text-muted mb-4">
                    No quiz questions are currently available. 
                    Please check back later or contact support.
                  </p>
                  <button 
                    className="btn btn-outline-primary"
                    onClick={() => navigateTo ? navigateTo('general-courses') : window.history.back()}
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
      <div className="quiz-results-container">
        <div className="container-fluid py-4">
          <div className="row justify-content-center">
            <div className="col-md-8 col-lg-6">
              
              {showSuccessMessage && (
                <div className="alert alert-success alert-dismissible fade show mb-4" role="alert">
                  <i className="fas fa-check-circle me-2"></i>
                  <strong>Success!</strong> Quiz submitted successfully! Redirecting to scores page...
                </div>
              )}
              
              <div className="card shadow-lg border-0">
                <div className="card-header bg-primary text-white text-center py-4">
                  <h2 className="mb-0">
                    <i className="fas fa-trophy me-2"></i>
                    Quiz Completed!
                  </h2>
                  {timeLeft <= 0 && <p className="mb-0 mt-2">Time expired - quiz auto-submitted</p>}
                </div>
                
                <div className="card-body p-5 text-center">
                  <div className="score-circle mx-auto mb-4">
                    <div className="score-percentage">{percentage}%</div>
                  </div>

                  <h3 className="text-primary mb-3">
                    {currentQuestionSet?.title || 'Course Questions'} Results
                  </h3>
                  
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
                    />
                  </div>

                  <button 
                    className="btn btn-success btn-lg w-100 py-3"
                    onClick={handleSubmitQuiz}
                    disabled={!userName.trim() || submitting}
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
    <div className="quiz-attempt-container">
      <div className="container-fluid py-4">
        <div className="row justify-content-center">
          <div className="col-12 col-lg-10">
            <div className="card shadow-lg border-0">
              {/* Quiz Header */}
              <div className="card-header bg-primary text-white py-4">
                <div className="row align-items-center">
                  <div className="col-md-6">
                    <h2 className="mb-0">
                      <i className="fas fa-brain me-2"></i>
                      {currentQuestionSet?.title || 'Course Questions'}
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
                            className={getOptionClass(index)}
                            onClick={() => !answerSubmitted && handleAnswer(index)}
                          >
                            <div className="option-content">
                              <span className="option-letter me-3">
                                {String.fromCharCode(65 + index)}
                              </span>
                              <span className="option-text">{option}</span>
                            </div>
                            {showFeedback && index === currentQuestion.correctAnswer && (
                              <i className="fas fa-check text-success ms-auto"></i>
                            )}
                            {showFeedback && index === selectedOption && index !== currentQuestion.correctAnswer && (
                              <i className="fas fa-times text-danger ms-auto"></i>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Enhanced Feedback Section with Explanation Box */}
                  {showFeedback && (
                    <div className="feedback-section">
                      {/* Status Card */}
                      <div className={`status-card card border-${selectedOption === currentQuestion.correctAnswer ? 'success' : 'danger'} mb-3`}>
                        <div className="card-body">
                          <div className="d-flex align-items-center">
                            <i className={`fas fa-${selectedOption === currentQuestion.correctAnswer ? 'check' : 'times'} fa-2x text-${selectedOption === currentQuestion.correctAnswer ? 'success' : 'danger'} me-3`}></i>
                            <div>
                              <h5 className={`text-${selectedOption === currentQuestion.correctAnswer ? 'success' : 'danger'} mb-1`}>
                                {selectedOption === currentQuestion.correctAnswer ? 'Correct! Well done! 🎉' : 'Incorrect! ❌'}
                              </h5>
                              <p className="mb-0 text-muted">
                                {selectedOption === currentQuestion.correctAnswer 
                                  ? 'You selected the right answer.' 
                                  : `You selected: "${currentQuestion.options[selectedOption]}"`}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Explanation Box with Curved Edges */}
                      {(currentQuestion.explanation || selectedOption !== currentQuestion.correctAnswer) && (
                        <div className="explanation-box card border-info mb-4">
                          <div className="card-header bg-info text-white">
                            <h6 className="mb-0">
                              <i className="fas fa-lightbulb me-2"></i>
                              Explanation & Learning Point
                            </h6>
                          </div>
                          <div className="card-body">
                            {currentQuestion.explanation ? (
                              <p className="mb-0 text-dark">{currentQuestion.explanation}</p>
                            ) : (
                              <div>
                                <p className="mb-2 text-dark">
                                  <strong>Correct Answer:</strong> "{currentQuestion.options[currentQuestion.correctAnswer]}"
                                </p>
                                {selectedOption !== currentQuestion.correctAnswer && (
                                  <p className="mb-0 text-muted">
                                    Remember this for next time! The correct option is highlighted in green above.
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
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
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden audio elements for fallback */}
      <audio ref={correctSoundRef} preload="auto">
        <source src="data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==" type="audio/wav" />
      </audio>
      <audio ref={wrongSoundRef} preload="auto">
        <source src="data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==" type="audio/wav" />
      </audio>

      <style jsx>{`
        .quiz-option {
          border: 2px solid #e9ecef;
          transition: all 0.3s ease;
        }
        
        .quiz-option:hover:not(.correct-option):not(.wrong-option) {
          border-color: #007bff;
          background-color: #f8f9fa;
        }
        
        .correct-option {
          border: 3px solid #28a745 !important;
          background-color: #d4edda !important;
          box-shadow: 0 0 10px rgba(40, 167, 69, 0.3);
        }
        
        .wrong-option {
          border: 3px solid #dc3545 !important;
          background-color: #f8d7da !important;
          box-shadow: 0 0 10px rgba(220, 53, 69, 0.3);
        }
        
        .explanation-box {
          border-radius: 15px !important;
          box-shadow: 0 4px 15px rgba(0, 123, 255, 0.1);
          border: 2px solid #17a2b8 !important;
        }
        
        .explanation-box .card-header {
          border-radius: 13px 13px 0 0 !important;
          border-bottom: 2px solid #17a2b8;
        }
        
        .status-card {
          border-radius: 10px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        
        .score-circle {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          background: linear-gradient(135deg, #007bff, #0056b3);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 1.5rem;
          box-shadow: 0 4px 15px rgba(0, 123, 255, 0.3);
        }
      `}</style>
    </div>
  );
};

export default QuizAttempt;