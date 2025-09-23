// src/components/QuizResults.jsx
import React, { useState, useEffect } from 'react';
import api from '../services/api';

const QuizResults = ({ score, totalQuestions, subject, topic, answers, questions, onReturnToCourses }) => {
  const [userName, setUserName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [userData, setUserData] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      try {
        const decoded = JSON.parse(atob(token.split('.')[1]));
        setUserData(decoded);
        setUserName(decoded.name || decoded.email.split('@')[0]);
      } catch (error) {
        console.error('Error decoding token:', error);
      }
    }
  }, []);

  const percentage = ((score / totalQuestions) * 100).toFixed(2);
  
  const getRemark = (percent) => {
    if (percent >= 80) return "Excellent! 🎉";
    if (percent >= 60) return "Good job! 👍";
    if (percent >= 40) return "Fair effort 💪";
    return "Keep practicing! 📚";
  };

  const getGradeColor = (percent) => {
    if (percent >= 80) return 'success';
    if (percent >= 60) return 'warning';
    return 'danger';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const token = localStorage.getItem('authToken');
      const resultData = {
        userName: userName.trim(),
        score,
        totalQuestions,
        percentage: parseFloat(percentage),
        subject,
        topic,
        answers,
        questions,
        date: new Date().toISOString(),
        userId: userData?.id || 'unknown'
      };

      const response = await api.post('/quiz/submit', resultData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setSubmitted(true);
        
        setTimeout(() => {
          if (onReturnToCourses) {
            onReturnToCourses();
          }
        }, 3000);
      }
    } catch (error) {
      console.error('Failed to submit results:', error);
      alert('Failed to submit results. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="quiz-results-container" style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      minHeight: '100vh',
      padding: '2rem 0'
    }}>
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-10 col-lg-8">
            <div className="card shadow-lg border-0">
              <div className="card-header text-white text-center py-4 position-relative" style={{backgroundColor: '#ff6f00'}}>
                <div className="position-absolute top-0 start-0 m-3">
                  <i className="fas fa-graduation-cap fa-2x opacity-25"></i>
                </div>
                <div className="position-absolute top-0 end-0 m-3">
                  <i className="fas fa-trophy fa-2x opacity-25"></i>
                </div>
                <i className="fas fa-check-circle fa-4x mb-3"></i>
                <h1 className="display-5 fw-bold mb-2">Quiz Completed!</h1>
                <p className="lead mb-0 opacity-75">Congratulations on finishing the quiz</p>
              </div>
              
              <div className="card-body p-4 p-md-5">
                {!submitted ? (
                  <>
                    {/* Results Summary */}
                    <div className="text-center mb-5">
                      <div className={`results-circle mx-auto mb-4 bg-${getGradeColor(percentage)}`}>
                        <span className="display-3 fw-bold text-white">{percentage}%</span>
                      </div>
                      <h3 className={`text-${getGradeColor(percentage)} fw-bold mb-2`}>
                        {getRemark(percentage)}
                      </h3>
                      <p className="text-muted">You scored {score} out of {totalQuestions} questions correctly</p>
                    </div>

                    {/* Performance Stats */}
                    <div className="row mb-4">
                      <div className="col-md-6 mb-3">
                        <div className="card border-0 bg-light h-100">
                          <div className="card-body text-center">
                            <i className="fas fa-check text-success fa-2x mb-2"></i>
                            <h4 className="fw-bold text-success">{score}</h4>
                            <p className="mb-0 text-muted">Correct Answers</p>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-6 mb-3">
                        <div className="card border-0 bg-light h-100">
                          <div className="card-body text-center">
                            <i className="fas fa-times text-danger fa-2x mb-2"></i>
                            <h4 className="fw-bold text-danger">{totalQuestions - score}</h4>
                            <p className="mb-0 text-muted">Incorrect Answers</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Course Info */}
                    <div className="card border-primary mb-4">
                      <div className="card-header text-white" style={{backgroundColor: '#ff6f00'}}>
                        <h5 className="mb-0">
                          <i className="fas fa-book me-2"></i>
                          Course Information
                        </h5>
                      </div>
                      <div className="card-body">
                        <div className="row">
                          <div className="col-md-6">
                            <strong>Subject:</strong> {subject}
                          </div>
                          <div className="col-md-6">
                            <strong>Topic:</strong> {topic}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Detailed Results Toggle */}
                    <div className="text-center mb-4">
                      <button 
                        className="btn btn-outline-primary"
                        onClick={() => setShowDetails(!showDetails)}
                        style={{borderColor: '#ff6f00', color: '#ff6f00'}}
                      >
                        <i className={`fas fa-chevron-${showDetails ? 'up' : 'down'} me-2`}></i>
                        {showDetails ? 'Hide Detailed Results' : 'Show Detailed Results'}
                      </button>
                    </div>

                    {/* Detailed Results */}
                    {showDetails && (
                      <div className="card border-warning mb-4">
                        <div className="card-header bg-warning text-dark">
                          <h5 className="mb-0">
                            <i className="fas fa-list-alt me-2"></i>
                            Question Breakdown
                          </h5>
                        </div>
                        <div className="card-body">
                          {answers.map((answer, index) => (
                            <div key={index} className={`border-start border-${answer.isCorrect ? 'success' : 'danger'} border-3 ps-3 mb-3`}>
                              <h6 className="fw-bold">Q{index + 1}: {questions[index]?.question}</h6>
                              <div className="row">
                                <div className="col-md-6">
                                  <small className="text-muted">Your answer: </small>
                                  <span className={answer.isCorrect ? 'text-success fw-bold' : 'text-danger fw-bold'}>
                                    {answer.selectedOption}
                                  </span>
                                </div>
                                <div className="col-md-6">
                                  <small className="text-muted">Correct answer: </small>
                                  <span className="text-success fw-bold">{questions[index]?.correctAnswer}</span>
                                </div>
                              </div>
                              <div className={`badge bg-${answer.isCorrect ? 'success' : 'danger'} mt-1`}>
                                {answer.isCorrect ? 'Correct' : 'Incorrect'}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Submission Form */}
                    <form onSubmit={handleSubmit}>
                      <div className="card border-info">
                        <div className="card-header bg-info text-white">
                          <h5 className="mb-0">
                            <i className="fas fa-certificate me-2"></i>
                            Submit Your Results
                          </h5>
                        </div>
                        <div className="card-body">
                          <div className="mb-3">
                            <label htmlFor="userName" className="form-label fw-semibold">
                              <i className="fas fa-user me-2"></i>
                              Enter your name for the certificate:
                            </label>
                            <input
                              type="text"
                              className="form-control form-control-lg"
                              id="userName"
                              value={userName}
                              onChange={(e) => setUserName(e.target.value)}
                              required
                              placeholder="Your full name as you want it to appear on the certificate"
                            />
                            <div className="form-text">
                              This name will be displayed on your achievement certificate
                            </div>
                          </div>
                          
                          <div className="d-grid gap-2 d-md-flex justify-content-md-end">
                            <button 
                              type="button"
                              className="btn btn-outline-secondary me-md-2"
                              onClick={() => setShowDetails(!showDetails)}
                            >
                              <i className="fas fa-redo me-2"></i>
                              Review Answers
                            </button>
                            <button 
                              type="submit" 
                              disabled={submitting || !userName.trim()}
                              className="btn btn-success btn-lg"
                              style={{backgroundColor: '#ff6f00', borderColor: '#ff6f00'}}
                            >
                              {submitting ? (
                                <>
                                  <span className="spinner-border spinner-border-sm me-2"></span>
                                  Submitting...
                                </>
                              ) : (
                                <>
                                  <i className="fas fa-paper-plane me-2"></i>
                                  Submit Results & Get Certificate
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </form>
                  </>
                ) : (
                  /* Success Message */
                  <div className="text-center py-4">
                    <div className="success-animation mb-4">
                      <i className="fas fa-check-circle fa-5x text-success"></i>
                    </div>
                    <h2 className="text-success fw-bold mb-3">Results Submitted Successfully!</h2>
                    <p className="lead text-muted mb-4">
                      Your quiz results have been saved and will appear in your Quiz Scores section. 
                      You can now track your progress and download your certificate.
                    </p>
                    
                    <div className="row mb-4">
                      <div className="col-md-4 mb-3">
                        <div className="card border-success">
                          <div className="card-body text-center">
                            <i className="fas fa-chart-line text-success fa-2x mb-2"></i>
                            <h6>View in Dashboard</h6>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-4 mb-3">
                        <div className="card border-primary">
                          <div className="card-body text-center">
                            <i className="fas fa-download text-primary fa-2x mb-2"></i>
                            <h6>Download Certificate</h6>
                          </div>
                        </div>
                      </div>
                      <div className="col-md-4 mb-3">
                        <div className="card border-info">
                          <div className="card-body text-center">
                            <i className="fas fa-share-alt text-info fa-2x mb-2"></i>
                            <h6>Share Achievement</h6>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="d-grid gap-2 d-md-flex justify-content-md-center">
                      <button 
                        className="btn btn-primary btn-lg me-md-3"
                        onClick={onReturnToCourses}
                        style={{backgroundColor: '#ff6f00', borderColor: '#ff6f00'}}
                      >
                        <i className="fas fa-arrow-left me-2"></i>
                        Return to Courses
                      </button>
                      <button className="btn btn-outline-success btn-lg">
                        <i className="fas fa-download me-2"></i>
                        Download Certificate
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .results-circle {
          width: 150px;
          height: 150px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        }
        .success-animation {
          animation: bounce 1s ease-in-out;
        }
        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% {transform: translateY(0);}
          40% {transform: translateY(-10px);}
          60% {transform: translateY(-5px);}
        }
      `}</style>
    </div>
  );
};

export default QuizResults;