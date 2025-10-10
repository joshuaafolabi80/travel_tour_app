// src/components/CourseAndRemarks.jsx
import React, { useState, useEffect } from 'react';
import api from '../services/api';

const CourseAndRemarks = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('general');
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredResults, setFilteredResults] = useState([]);
  const [selectedResult, setSelectedResult] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    fetchResults();
  }, [activeTab]);

  useEffect(() => {
    filterResults();
  }, [results, searchTerm]);

  const fetchResults = async () => {
    try {
      setLoading(true);
      setError('');
      
      const endpoint = activeTab === 'general' 
        ? '/user/general-course-results'
        : '/user/masterclass-course-results';

      const response = await api.get(endpoint);
      
      if (response.data.success) {
        setResults(response.data.results);
      } else {
        setError('Failed to load results');
      }
    } catch (error) {
      console.error('Error fetching results:', error);
      setError('Failed to load results. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const filterResults = () => {
    let filtered = results;
    
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(result =>
        result.courseName?.toLowerCase().includes(term) ||
        result.userName?.toLowerCase().includes(term) ||
        result.remark?.toLowerCase().includes(term)
      );
    }
    
    setFilteredResults(filtered);
  };

  const viewDetails = (result) => {
    setSelectedResult(result);
    setShowDetailsModal(true);
  };

  const getPerformanceColor = (percentage) => {
    if (percentage >= 80) return 'success';
    if (percentage >= 60) return 'primary';
    if (percentage >= 40) return 'warning';
    return 'danger';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="container-fluid py-4">
        <div className="row justify-content-center">
          <div className="col-12 col-md-8 col-lg-6">
            <div className="card shadow-lg border-0">
              <div className="card-body text-center py-5">
                <div className="spinner-border text-primary mb-3" style={{width: '3rem', height: '3rem'}}>
                  <span className="visually-hidden">Loading...</span>
                </div>
                <h4 className="text-primary">Loading Course Results...</h4>
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
            <div className="alert alert-danger text-center">
              <i className="fas fa-exclamation-triangle fa-2x mb-3"></i>
              <h4>Error Loading Results</h4>
              <p>{error}</p>
              <button className="btn btn-primary" onClick={fetchResults}>
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="course-remarks" style={{ background: '#f8f9fa', minHeight: '100vh' }}>
      <div className="container-fluid py-4">
        {/* Header Section */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="card text-white bg-primary shadow-lg">
              <div className="card-body py-4">
                <div className="row align-items-center">
                  <div className="col-md-8">
                    <h1 className="display-5 fw-bold mb-2">
                      <i className="fas fa-graduation-cap me-3"></i>
                      Course and Remarks
                    </h1>
                    <p className="lead mb-0 opacity-75">
                      Track your course completion and performance remarks
                    </p>
                  </div>
                  <div className="col-md-4 text-md-end">
                    <div className="bg-white rounded p-3 d-inline-block text-primary">
                      <h4 className="mb-0 fw-bold">{results.length}</h4>
                      <small>Total Completions</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="card shadow-sm border-0">
              <div className="card-body p-0">
                <ul className="nav nav-tabs nav-justified">
                  <li className="nav-item">
                    <button
                      className={`nav-link ${activeTab === 'general' ? 'active' : ''}`}
                      onClick={() => setActiveTab('general')}
                    >
                      <i className="fas fa-book me-2"></i>General Course Results
                    </button>
                  </li>
                  <li className="nav-item">
                    <button
                      className={`nav-link ${activeTab === 'masterclass' ? 'active' : ''}`}
                      onClick={() => setActiveTab('masterclass')}
                    >
                      <i className="fas fa-crown me-2"></i>Masterclass Course Results
                    </button>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Results */}
        <div className="row">
          <div className="col-12">
            <div className="card shadow-lg border-0">
              <div className="card-header bg-white">
                <div className="row align-items-center">
                  <div className="col-md-6">
                    <h5 className="mb-0">
                      {activeTab === 'general' ? 'General' : 'Masterclass'} Course Results
                    </h5>
                  </div>
                  <div className="col-md-6">
                    <div className="input-group">
                      <span className="input-group-text">
                        <i className="fas fa-search"></i>
                      </span>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Search by course name, your name, or remark..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="card-body">
                {filteredResults.length === 0 ? (
                  <div className="text-center py-5">
                    <i className="fas fa-clipboard-list fa-4x text-muted mb-3"></i>
                    <h5 className="text-muted">No Results Found</h5>
                    <p className="text-muted">
                      {results.length === 0 
                        ? `You haven't completed any ${activeTab === 'general' ? 'general' : 'masterclass'} courses yet.`
                        : 'No results match your search criteria.'
                      }
                    </p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead className="table-light">
                        <tr>
                          <th>Course Name</th>
                          <th>Your Name</th>
                          <th className="text-center">Score</th>
                          <th className="text-center">Percentage</th>
                          <th className="text-center">Remark</th>
                          <th className="text-center">Date Completed</th>
                          <th className="text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredResults.map((result) => (
                          <tr key={result._id}>
                            <td>
                              <strong>{result.courseName}</strong>
                            </td>
                            <td>{result.userName}</td>
                            <td className="text-center">
                              <span className="badge bg-info fs-6">
                                {result.score}/{result.totalQuestions}
                              </span>
                            </td>
                            <td className="text-center">
                              <span className={`badge bg-${getPerformanceColor(result.percentage)} fs-6`}>
                                {result.percentage}%
                              </span>
                            </td>
                            <td className="text-center">
                              <span className={`badge bg-${getPerformanceColor(result.percentage)}`}>
                                {result.remark}
                              </span>
                            </td>
                            <td className="text-center">
                              <small>{formatDate(result.date)}</small>
                            </td>
                            <td className="text-center">
                              <button
                                className="btn btn-outline-primary btn-sm"
                                onClick={() => viewDetails(result)}
                              >
                                <i className="fas fa-eye me-1"></i>Details
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedResult && (
        <div className="modal fade show" style={{display: 'block', backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">
                  <i className="fas fa-analytics me-2"></i>
                  Result Details - {selectedResult.courseName}
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowDetailsModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-md-6">
                    <h6>Course Information</h6>
                    <ul className="list-group list-group-flush">
                      <li className="list-group-item d-flex justify-content-between">
                        <span>Course Name:</span>
                        <strong>{selectedResult.courseName}</strong>
                      </li>
                      <li className="list-group-item d-flex justify-content-between">
                        <span>Your Name:</span>
                        <strong>{selectedResult.userName}</strong>
                      </li>
                      <li className="list-group-item d-flex justify-content-between">
                        <span>Date Completed:</span>
                        <strong>{formatDate(selectedResult.date)}</strong>
                      </li>
                    </ul>
                  </div>
                  <div className="col-md-6">
                    <h6>Performance Summary</h6>
                    <div className="text-center p-3 bg-light rounded">
                      <div className="display-4 fw-bold text-primary">{selectedResult.percentage}%</div>
                      <div className={`badge bg-${getPerformanceColor(selectedResult.percentage)} fs-6 mt-2`}>
                        {selectedResult.remark}
                      </div>
                      <div className="mt-3">
                        <div className="row">
                          <div className="col-6">
                            <strong>Score:</strong><br />
                            {selectedResult.score}/{selectedResult.totalQuestions}
                          </div>
                          <div className="col-6">
                            <strong>Time Taken:</strong><br />
                            {selectedResult.timeTaken ? 
                              `${Math.floor(selectedResult.timeTaken / 60)}:${(selectedResult.timeTaken % 60).toString().padStart(2, '0')}` 
                              : 'N/A'
                            }
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {selectedResult.answers && selectedResult.answers.length > 0 && (
                  <>
                    <hr />
                    <h6>Question Breakdown</h6>
                    <div className="question-breakdown" style={{maxHeight: '300px', overflowY: 'auto'}}>
                      {selectedResult.answers.map((answer, index) => (
                        <div key={index} className={`card mb-2 ${answer.isCorrect ? 'border-success' : 'border-danger'}`}>
                          <div className="card-body py-2">
                            <div className="d-flex justify-content-between align-items-start">
                              <div className="flex-grow-1">
                                <h6 className="mb-1">Q{index + 1}: {answer.questionText}</h6>
                                <div className="row">
                                  <div className="col-md-6">
                                    <small className="text-muted">Your Answer:</small>
                                    <div className={`p-1 rounded ${answer.isCorrect ? 'bg-success text-white' : 'bg-danger text-white'}`}>
                                      {answer.selectedAnswer}
                                    </div>
                                  </div>
                                  <div className="col-md-6">
                                    <small className="text-muted">Correct Answer:</small>
                                    <div className="p-1 rounded bg-success text-white">
                                      {answer.correctAnswerText}
                                    </div>
                                  </div>
                                </div>
                                {answer.explanation && (
                                  <div className="mt-2">
                                    <small className="text-muted">Explanation:</small>
                                    <div className="p-2 bg-light rounded small">
                                      {answer.explanation}
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className="ms-3">
                                <span className={`badge ${answer.isCorrect ? 'bg-success' : 'bg-danger'}`}>
                                  {answer.isCorrect ? 'Correct' : 'Incorrect'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowDetailsModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseAndRemarks;