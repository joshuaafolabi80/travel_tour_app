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
  const [timeLeft, setTimeLeft] = useState(15 * 60);
  const [showResultsScreen, setShowResultsScreen] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [answerSubmitted, setAnswerSubmitted] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [quizStartTime, setQuizStartTime] = useState(null);
  const [quizEndTime, setQuizEndTime] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [currentQuestionSet, setCurrentQuestionSet] = useState(null);
  
  // Sound effects using Speech Synthesis
  const playCorrectSound = () => {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance('Correct!');
      utterance.rate = 1.2;
      utterance.volume = 0.8;
      utterance.pitch = 1.1;
      speechSynthesis.speak(utterance);
    }
  };

  const playWrongSound = () => {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance('Wrong!');
      utterance.rate = 1.2;
      utterance.volume = 0.8;
      utterance.pitch = 0.9;
      speechSynthesis.speak(utterance);
    }
  };

  // Load question set from localStorage on component mount
  useEffect(() => {
    const storedQuestionSet = localStorage.getItem('currentQuestionSet');
    if (storedQuestionSet) {
      try {
        const questionSetData = JSON.parse(storedQuestionSet);
        setCurrentQuestionSet(questionSetData);
        console.log('📝 Loaded question set from storage:', questionSetData);
        
        if (questionSetData.questions && questionSetData.questions.length > 0) {
          console.log('🎯 Using stored questions:', questionSetData.questions.length);
          
          // Format questions to ensure they have the correct structure
          const formattedQuestions = questionSetData.questions.map((q, index) => {
            // DEBUG: Log each question's correct answer
            console.log(`🔍 Question ${index}:`, {
              question: q.question,
              options: q.options,
              correctAnswer: q.correctAnswer,
              correctOption: q.correctOption,
              explanation: q.explanation
            });
            
            // FIX: Handle both text-based correctAnswer and index-based correctOption
            let correctAnswerIndex = 0;
            
            if (q.correctOption !== undefined) {
              // If correctOption exists (index-based), use it
              correctAnswerIndex = parseInt(q.correctOption);
              console.log(`✅ Using correctOption index: ${correctAnswerIndex}`);
            } else if (q.correctAnswer && q.options) {
              // If correctAnswer is text-based, find the index of the matching option
              const index = q.options.findIndex(option => 
                option.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase()
              );
              if (index !== -1) {
                correctAnswerIndex = index;
                console.log(`✅ Found correct answer index from text: ${correctAnswerIndex}`);
              } else {
                // Fallback: try to find partial match
                const partialMatch = q.options.findIndex(option => 
                  option.toLowerCase().includes(q.correctAnswer.toLowerCase()) ||
                  q.correctAnswer.toLowerCase().includes(option.toLowerCase())
                );
                if (partialMatch !== -1) {
                  correctAnswerIndex = partialMatch;
                  console.log(`✅ Found partial match index: ${correctAnswerIndex}`);
                } else {
                  console.warn(`❌ Could not find matching option for correctAnswer: "${q.correctAnswer}"`);
                }
              }
            }
            
            return {
              id: q._id || q.id || `q-${index}`,
              question: q.question || q.text || 'Question not available',
              options: q.options || [],
              correctAnswer: correctAnswerIndex,
              explanation: q.explanation || '',
              originalCorrectAnswer: q.correctAnswer // Keep original for debugging
            };
          });
          
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

  const currentQuestion = questions[currentQuestionIndex];

  // DEBUG: Log current question details whenever it changes
  useEffect(() => {
    if (currentQuestion) {
      console.log('🎯 Current Question Details:', {
        index: currentQuestionIndex,
        question: currentQuestion.question,
        options: currentQuestion.options,
        correctAnswerIndex: currentQuestion.correctAnswer,
        correctAnswerValue: currentQuestion.options ? currentQuestion.options[currentQuestion.correctAnswer] : 'N/A',
        originalCorrectAnswer: currentQuestion.originalCorrectAnswer,
        explanation: currentQuestion.explanation
      });
    }
  }, [currentQuestion, currentQuestionIndex]);

  // Track quiz start time
  useEffect(() => {
    if (questions.length > 0 && !quizStartTime) {
      setQuizStartTime(new Date());
    }
  }, [questions.length, quizStartTime]);

  // Timer countdown - 15 minutes
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
    setFinalScore(score);
    setShowResultsScreen(true);
  }, [score]);

  const handleAnswer = (optionIndex) => {
    if (answerSubmitted || !currentQuestion) return;
    
    // DEBUG: Log answer selection details
    console.log('🎯 Answer Selection:', {
      selectedOptionIndex: optionIndex,
      selectedOptionValue: currentQuestion.options[optionIndex],
      correctAnswerIndex: currentQuestion.correctAnswer,
      correctAnswerValue: currentQuestion.options[currentQuestion.correctAnswer],
      isCorrect: optionIndex === currentQuestion.correctAnswer
    });

    const isCorrect = optionIndex === currentQuestion.correctAnswer;
    setSelectedOption(optionIndex);
    setShowFeedback(true);
    setAnswerSubmitted(true);

    // Play sound feedback and update score
    if (isCorrect) {
      playCorrectSound();
      // FIXED: Add 5 points for each correct answer
      setScore(prevScore => {
        const newScore = prevScore + 5;
        console.log(`✅ Correct answer! Score increased from ${prevScore} to ${newScore}`);
        return newScore;
      });
    } else {
      playWrongSound();
      console.log(`❌ Wrong answer! Score remains at ${score}`);
    }

    const newAnswer = {
      questionId: currentQuestion.id, // This is now a string, not ObjectId
      questionText: currentQuestion.question,
      selectedOption: optionIndex,
      selectedAnswer: currentQuestion.options[optionIndex],
      correctAnswer: currentQuestion.correctAnswer,
      correctAnswerText: currentQuestion.options[currentQuestion.correctAnswer],
      isCorrect: isCorrect,
      explanation: currentQuestion.explanation,
      options: currentQuestion.options,
      points: isCorrect ? 5 : 0 // Track points earned for this question
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

  // Calculate maximum possible score
  const calculateMaxScore = () => {
    return questions.length * 5;
  };

  // Calculate percentage based on 5-point system
  const calculatePercentage = () => {
    const maxScore = calculateMaxScore();
    return maxScore > 0 ? Math.round((finalScore / maxScore) * 100) : 0;
  };

  const handleSubmitQuiz = async () => {
    try {
      setSubmitting(true);
      
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      const userId = userData._id || userData.id || 'anonymous';

      // CRITICAL FIX: Use the username from localStorage to ensure consistency
      const userDisplayName = userData.username || userData.name || 'Unknown User';
      
      const timeTaken = calculateTimeTaken();
      const percentage = calculatePercentage();
      const maxScore = calculateMaxScore();
      
      const getRemark = (percent) => {
        if (percent >= 90) return "Excellent";
        if (percent >= 80) return "Very Good";
        if (percent >= 70) return "Good";
        if (percent >= 60) return "Satisfactory";
        return "Needs Improvement";
      };

      const courseName = currentQuestionSet?.title || 'Course Questions';
      const courseType = currentQuestionSet?.type || 'general';
      const finalRemark = getRemark(percentage);

      // FIXED: Use the consistent user name from localStorage
      const quizData = {
        answers: answers,
        userId: userId,
        userName: userDisplayName, // Use consistent name from localStorage
        courseId: currentQuestionSet?.id || 'unknown-course',
        courseName: courseName,
        courseType: courseType,
        score: finalScore,
        maxScore: maxScore,
        totalQuestions: questions.length,
        percentage: percentage,
        timeTaken: timeTaken,
        remark: finalRemark,
        questionSetId: currentQuestionSet?.id || 'unknown-set',
        questionSetTitle: currentQuestionSet?.title || 'Unknown Title',
        questionSetType: courseType
      };

      console.log('📤 Submitting course quiz data:', quizData);
      console.log('👤 Using username from localStorage:', userDisplayName);
      
      // 🚨 CRITICAL FIX: Use the new course-results endpoint instead of quiz/results
      const response = await api.post('/course-results', quizData);
      console.log('✅ Course quiz submission response:', response.data);
      
      if (response.data.success) {
        setShowSuccessMessage(true);
        console.log('🎉 Course quiz submitted successfully!');
        
        // Clear stored question set
        localStorage.removeItem('currentQuestionSet');
        
        setTimeout(() => {
          if (navigateTo) {
            // Navigate to Course and Remarks
            navigateTo('course-remarks');
          } else {
            // Fallback navigation
            window.location.href = '/course-remarks';
          }
        }, 2000);
      } else {
        alert('Error submitting quiz results: ' + (response.data.message || 'Unknown error'));
        setSubmitting(false);
      }
    } catch (error) {
      console.error('❌ Error submitting course quiz:', error);
      console.error('Error details:', error.response?.data || error.message);
      setSubmitting(false);
      
      // More detailed error handling
      if (error.response?.data?.error) {
        console.error('Server validation error:', error.response.data.error);
        alert('Validation error: ' + JSON.stringify(error.response.data.error));
      } else if (error.response?.data?.message) {
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
    const percentage = calculatePercentage();
    const timeTaken = calculateTimeTaken();
    const maxScore = calculateMaxScore();
    
    // Get user data for display
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const userDisplayName = userData.username || userData.name || 'Student';
    
    return (
      <div className="quiz-results-container">
        <div className="container-fluid py-4">
          <div className="row justify-content-center">
            <div className="col-md-8 col-lg-6">
              
              {showSuccessMessage && (
                <div className="alert alert-success alert-dismissible fade show mb-4" role="alert">
                  <i className="fas fa-check-circle me-2"></i>
                  <strong>Success!</strong> Quiz submitted successfully! Redirecting to course results...
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
                  
                  <div className="user-info mb-4 p-3 bg-light rounded">
                    <h5 className="text-success">Results will be saved for: {userDisplayName}</h5>
                    <small className="text-muted">Your quiz results are automatically linked to your account</small>
                  </div>
                  
                  <div className="results-grid mb-4">
                    <div className="row text-center">
                      <div className="col-4">
                        <div className="result-item">
                          <h4 className="text-success">{finalScore}</h4>
                          <p className="text-muted mb-0">Your Score</p>
                        </div>
                      </div>
                      <div className="col-4">
                        <div className="result-item">
                          <h4 className="text-info">{maxScore}</h4>
                          <p className="text-muted mb-0">Max Score</p>
                        </div>
                      </div>
                      <div className="col-4">
                        <div className="result-item">
                          <h4 className="text-warning">{questions.length}</h4>
                          <p className="text-muted mb-0">Questions</p>
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
                        <strong>Score:</strong> {finalScore}/{maxScore}
                      </div>
                    </div>
                    <div className="row mt-2">
                      <div className="col-12">
                        <small className="text-muted">
                          <i className="fas fa-star text-warning me-1"></i>
                          Scoring: 5 points per correct answer
                        </small>
                      </div>
                    </div>
                  </div>

                  <button 
                    className="btn btn-success btn-lg w-100 py-3"
                    onClick={handleSubmitQuiz}
                    disabled={submitting}
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
                      <span className="badge bg-info fs-6 me-2">
                        Max: {calculateMaxScore()}
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
                                {selectedOption === currentQuestion.correctAnswer ? 'Correct! +5 Points! 🎉' : 'Incorrect! No points ❌'}
                              </h5>
                              <p className="mb-0 text-muted">
                                {selectedOption === currentQuestion.correctAnswer 
                                  ? `You earned 5 points! Total: ${score} points` 
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
    </div>
  );
};

export default QuizAttempt;