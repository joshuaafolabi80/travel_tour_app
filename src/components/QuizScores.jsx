// src/components/QuizScores.jsx
import React, { useState, useEffect } from 'react';
import api from '../services/api';

const QuizScores = () => {
  const [quizResults, setQuizResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedResult, setSelectedResult] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchQuizResults();
  }, []);

  const fetchQuizResults = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await api.get('/quiz/results', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setQuizResults(response.data.results);
      } else {
        setError('Failed to load quiz results');
      }
    } catch (error) {
      console.error('Error fetching quiz results:', error);
      setError('Failed to load quiz results. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const viewDetailedResult = (result) => {
    setSelectedResult(result);
    setShowModal(true);
  };

  const downloadCertificate = (result) => {
    alert(`Downloading certificate for ${result.userName} - ${result.subject}`);
  };

  if (loading) {
    return (
      <div className="container-fluid py-4">
        <div className="row justify-content-center">
          <div className="col-12 col-md-10 col-lg-8">
            <div className="card shadow-lg border-0">
              <div className="card-body text-center py-5">
                <div className="spinner-border text-primary mb-3" style={{width: '3rem', height: '3rem', color: '#ff6f00'}}>
                  <span className="visually-hidden">Loading...</span>
                </div>
                <h4 className="text-primary" style={{color: '#ff6f00'}}>Loading Your Quiz Results...</h4>
                <p className="text-muted">Please wait while we fetch your performance data</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-fluid py-4">
        <div className="row justify-content-center">
          <div className="col-12 col-md-8 col-lg-6">
            <div className="alert alert-danger d-flex align-items-center" role="alert">
              <i className="fas fa-exclamation-triangle fa-2x me-3"></i>
              <div>
                <h4 className="alert-heading">Oops! Something went wrong</h4>
                <p className="mb-0">{error}</p>
                <button className="btn btn-outline-danger mt-2" onClick={fetchQuizResults}>
                  <i className="fas fa-redo me-2"></i>Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-scores-container" style={{ background: '#f9fafb', minHeight: '100vh' }}>
      <div className="container-fluid py-4">
        {/* Header Section */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="card text-white shadow-lg" style={{backgroundColor: '#ff6f00'}}>
              <div className="card-body py-4">
                <div className="row align-items-center">
                  <div className="col-md-8">
                    <h1 className="display-5 fw-bold mb-2">
                      <i className="fas fa-chart-line me-3"></i>
                      Quiz Scores & Performance
                    </h1>
                    <p className="lead mb-0 opacity-75">Track your learning progress and achievements</p>
                  </div>
                  <div className="col-md-4 text-md-end">
                    <div className="bg-white rounded p-3 d-inline-block" style={{color: '#ff6f00'}}>
                      <h4 className="mb-0 fw-bold">{quizResults.length}</h4>
                      <small>Quizzes Completed</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {quizResults.length === 0 ? (
          <div className="row justify-content-center">
            <div className="col-12 col-md-8 col-lg-6">
              <div className="card shadow-lg border-0">
                <div className="card-body text-center py-5">
                  <div className="empty-state-icon mb-4">
                    <i className="fas fa-clipboard-list fa-4x text-muted"></i>
                  </div>
                  <h3 className="text-muted fw-bold mb-3">No Quiz Done Yet</h3>
                  <p className="text-muted mb-4">
                    You haven't completed any quizzes yet. Start your learning journey by taking a course quiz!
                  </p>
                  <div className="row g-3 justify-content-center">
                    <div className="col-auto">
                      <button className="btn btn-primary btn-lg" style={{backgroundColor: '#ff6f00', borderColor: '#ff6f00'}}>
                        <i className="fas fa-book me-2"></i>Browse Courses
                      </button>
                    </div>
                    <div className="col-auto">
                      <button className="btn btn-outline-primary btn-lg" style={{borderColor: '#ff6f00', color: '#ff6f00'}}>
                        <i className="fas fa-play-circle me-2"></i>Start Learning
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Statistics Cards */}
            <div className="row mb-4">
              <div className="col-md-3 mb-3">
                <div className="card text-white h-100 shadow" style={{backgroundColor: '#28a745'}}>
                  <div className="card-body text-center">
                    <i className="fas fa-trophy fa-2x mb-2"></i>
                    <h3 className="fw-bold">
                      {Math.round(quizResults.reduce((acc, curr) => acc + curr.percentage, 0) / quizResults.length)}%
                    </h3>
                    <p className="mb-0">Average Score</p>
                  </div>
                </div>
              </div>
              <div className="col-md-3 mb-3">
                <div className="card text-white h-100 shadow" style={{backgroundColor: '#17a2b8'}}>
                  <div className="card-body text-center">
                    <i className="fas fa-check-circle fa-2x mb-2"></i>
                    <h3 className="fw-bold">
                      {quizResults.filter(r => r.percentage >= 60).length}
                    </h3>
                    <p className="mb-0">Passed Quizzes</p>
                  </div>
                </div>
              </div>
              <div className="col-md-3 mb-3">
                <div className="card text-white h-100 shadow" style={{backgroundColor: '#ffc107', color: '#000'}}>
                  <div className="card-body text-center">
                    <i className="fas fa-star fa-2x mb-2"></i>
                    <h3 className="fw-bold">
                      {Math.max(...quizResults.map(r => r.percentage))}%
                    </h3>
                    <p className="mb-0">Best Score</p>
                  </div>
                </div>
              </div>
              <div className="col-md-3 mb-3">
                <div className="card text-white h-100 shadow" style={{backgroundColor: '#dc3545'}}>
                  <div className="card-body text-center">
                    <i className="fas fa-clock fa-2x mb-2"></i>
                    <h3 className="fw-bold">
                      {quizResults.length}
                    </h3>
                    <p className="mb-0">Total Attempts</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Results Table */}
            <div className="row">
              <div className="col-12">
                <div className="card shadow-lg border-0">
                  <div className="card-header bg-white py-3">
                    <h4 className="mb-0" style={{color: '#1a237e'}}>
                      <i className="fas fa-list-alt me-2"></i>
                      Quiz Results History
                    </h4>
                  </div>
                  <div className="card-body p-0">
                    <div className="table-responsive">
                      <table className="table table-hover align-middle mb-0">
                        <thead className="table-dark" style={{backgroundColor: '#1a237e'}}>
                          <tr>
                            <th className="ps-4">#</th>
                            <th>Course & Topic</th>
                            <th>Date Completed</th>
                            <th className="text-center">Score</th>
                            <th className="text-center">Percentage</th>
                            <th className="text-center">Performance</th>
                            <th className="text-center pe-4">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {quizResults.map((result, index) => (
                            <tr key={result._id} className="hover-shadow">
                              <td className="ps-4 fw-bold" style={{color: '#ff6f00'}}>{index + 1}</td>
                              <td>
                                <div>
                                  <h6 className="mb-1 fw-bold text-dark">{result.subject}</h6>
                                  <small className="text-muted">{result.topic}</small>
                                </div>
                              </td>
                              <td>
                                <div className="d-flex align-items-center">
                                  <i className="fas fa-calendar text-muted me-2"></i>
                                  {new Date(result.date).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                  })}
                                </div>
                              </td>
                              <td className="text-center">
                                <span className="badge fs-6 py-2 px-3" style={{backgroundColor: '#ff6f00'}}>
                                  {result.score}/{result.totalQuestions}
                                </span>
                              </td>
                              <td className="text-center">
                                <span className={`badge fs-6 py-2 px-3 ${
                                  result.percentage >= 80 ? 'bg-success' :
                                  result.percentage >= 60 ? 'bg-warning' : 'bg-danger'
                                }`}>
                                  {result.percentage}%
                                </span>
                              </td>
                              <td className="text-center">
                                <div className="progress" style={{height: '8px', width: '80px', margin: '0 auto'}}>
                                  <div 
                                    className={`progress-bar ${
                                      result.percentage >= 80 ? 'bg-success' :
                                      result.percentage >= 60 ? 'bg-warning' : 'bg-danger'
                                    }`} 
                                    style={{width: `${result.percentage}%`}}
                                  ></div>
                                </div>
                                <small className="text-muted">
                                  {result.percentage >= 80 ? 'Excellent' :
                                   result.percentage >= 60 ? 'Good' :
                                   result.percentage >= 40 ? 'Fair' : 'Needs Improvement'}
                                </small>
                              </td>
                              <td className="text-center pe-4">
                                <div className="btn-group" role="group">
                                  <button 
                                    className="btn btn-outline-primary btn-sm"
                                    onClick={() => viewDetailedResult(result)}
                                    title="View Details"
                                    style={{borderColor: '#ff6f00', color: '#ff6f00'}}
                                  >
                                    <i className="fas fa-eye"></i>
                                  </button>
                                  <button 
                                    className="btn btn-outline-success btn-sm"
                                    onClick={() => downloadCertificate(result)}
                                    title="Download Certificate"
                                  >
                                    <i className="fas fa-download"></i>
                                  </button>
                                  <button 
                                    className="btn btn-outline-info btn-sm"
                                    title="Share Results"
                                  >
                                    <i className="fas fa-share-alt"></i>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Detailed Result Modal */}
        {showModal && selectedResult && (
          <div className="modal fade show" style={{display: 'block', backgroundColor: 'rgba(0,0,0,0.5)'}}>
            <div className="modal-dialog modal-lg modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header text-white" style={{backgroundColor: '#ff6f00'}}>
                  <h5 className="modal-title">
                    <i className="fas fa-analytics me-2"></i>
                    Detailed Quiz Results - {selectedResult.subject}
                  </h5>
                  <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
                </div>
                <div className="modal-body">
                  <div className="row">
                    <div className="col-md-6">
                      <h6>Quiz Information</h6>
                      <ul className="list-group list-group-flush">
                        <li className="list-group-item d-flex justify-content-between">
                          <span>Student Name:</span>
                          <strong>{selectedResult.userName}</strong>
                        </li>
                        <li className="list-group-item d-flex justify-content-between">
                          <span>Subject:</span>
                          <strong>{selectedResult.subject}</strong>
                        </li>
                        <li className="list-group-item d-flex justify-content-between">
                          <span>Topic:</span>
                          <strong>{selectedResult.topic}</strong>
                        </li>
                        <li className="list-group-item d-flex justify-content-between">
                          <span>Date Taken:</span>
                          <strong>{new Date(selectedResult.date).toLocaleString()}</strong>
                        </li>
                      </ul>
                    </div>
                    <div className="col-md-6">
                      <h6>Performance Summary</h6>
                      <div className="text-center p-3 bg-light rounded">
                        <div className="display-4 fw-bold" style={{color: '#ff6f00'}}>{selectedResult.percentage}%</div>
                        <div className={`badge bg-${
                          selectedResult.percentage >= 80 ? 'success' :
                          selectedResult.percentage >= 60 ? 'warning' : 'danger'
                        } fs-6`}>
                          {selectedResult.percentage >= 80 ? 'Excellent' :
                           selectedResult.percentage >= 60 ? 'Good' :
                           selectedResult.percentage >= 40 ? 'Fair' : 'Needs Improvement'}
                        </div>
                        <div className="mt-2">
                          <small className="text-muted">
                            Score: {selectedResult.score} out of {selectedResult.totalQuestions}
                          </small>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <hr />
                  
                  <h6>Question Breakdown</h6>
                  <div className="question-breakdown">
                    {selectedResult.answers.map((answer, index) => (
                      <div key={index} className="card mb-2">
                        <div className="card-body">
                          <div className="d-flex justify-content-between align-items-start">
                            <div>
                              <h6 className="mb-1">Q{index + 1}: {selectedResult.questions[index]?.question}</h6>
                              <small className={`badge bg-${answer.isCorrect ? 'success' : 'danger'}`}>
                                {answer.isCorrect ? 'Correct' : 'Incorrect'}
                              </small>
                            </div>
                            <div className="text-end">
                              <small className="text-muted">Your answer: {answer.selectedOption}</small>
                              <br />
                              <small className="text-success">Correct: {selectedResult.questions[index]?.correctAnswer}</small>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                    Close
                  </button>
                  <button type="button" className="btn btn-primary" style={{backgroundColor: '#ff6f00', borderColor: '#ff6f00'}}>
                    <i className="fas fa-print me-2"></i>Print Results
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizScores;