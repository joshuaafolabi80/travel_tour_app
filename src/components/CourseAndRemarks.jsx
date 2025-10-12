import React, { useState, useEffect } from 'react';
import api from '../services/api';

const CourseAndRemarks = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredResults, setFilteredResults] = useState([]);
  const [selectedResult, setSelectedResult] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    fetchResults();
  }, []);

  useEffect(() => {
    filterResults();
  }, [results, searchTerm, activeTab]);

  const fetchResults = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Get current user info - FIXED: Use the correct field that matches what's stored in the database
      const userData = JSON.parse(localStorage.getItem('userData') || '{}');
      
      // CRITICAL FIX: Try multiple possible fields to find the correct user name
      const userName = userData.name || userData.userName || userData.username || 'Unknown User';
      
      console.log('📊 Fetching course results for user:', userName);
      console.log('🔍 Available user data from localStorage:', userData);
      
      // DEBUG: Test the API endpoint directly
      console.log('🔧 Testing API endpoint with user:', userName);
      
      const response = await api.get(`/course-results/user/${encodeURIComponent(userName)}`);
      
      if (response.data.success) {
        setResults(response.data.results);
        console.log(`✅ Loaded ${response.data.results.length} course results`);
        console.log('📋 Results data:', response.data.results);
        
        // DEBUG: If no results, try fetching all results to see what's in the database
        if (response.data.results.length === 0) {
          console.log('🔍 No results found for user, checking all results in database...');
          try {
            const allResultsResponse = await api.get('/course-results');
            if (allResultsResponse.data.success) {
              console.log('📊 All results in database:', allResultsResponse.data.results);
              console.log('👤 All usernames in database:', allResultsResponse.data.results.map(r => r.userName));
            }
          } catch (debugError) {
            console.error('❌ Debug error fetching all results:', debugError);
          }
        }
      } else {
        setError('Failed to load course results');
        console.log('❌ API response indicated failure');
      }
    } catch (error) {
      console.error('❌ Error fetching course results:', error);
      console.error('Error details:', error.response?.data || error.message);
      setError('Failed to load course results. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const filterResults = () => {
    let filtered = results;
    
    // Filter by tab
    if (activeTab === 'general') {
      filtered = filtered.filter(result => result.courseType === 'general');
    } else if (activeTab === 'masterclass') {
      filtered = filtered.filter(result => result.courseType === 'masterclass');
    }
    
    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(result =>
        result.courseName?.toLowerCase().includes(term) ||
        result.questionSetTitle?.toLowerCase().includes(term) ||
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
    if (percentage >= 90) return 'success';
    if (percentage >= 80) return 'primary';
    if (percentage >= 70) return 'info';
    if (percentage >= 60) return 'warning';
    return 'danger';
  };

  const getPerformanceText = (percentage) => {
    if (percentage >= 90) return 'Excellent';
    if (percentage >= 80) return 'Very Good';
    if (percentage >= 70) return 'Good';
    if (percentage >= 60) return 'Satisfactory';
    return 'Needs Improvement';
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

  const formatTimeTaken = (seconds) => {
    if (!seconds) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
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
                <p className="text-muted">Please wait while we fetch your results</p>
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
                <i className="fas fa-refresh me-2"></i>
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
                      Course Results & Remarks
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
                      className={`nav-link ${activeTab === 'all' ? 'active' : ''}`}
                      onClick={() => setActiveTab('all')}
                    >
                      <i className="fas fa-list me-2"></i>All Results
                    </button>
                  </li>
                  <li className="nav-item">
                    <button
                      className={`nav-link ${activeTab === 'general' ? 'active' : ''}`}
                      onClick={() => setActiveTab('general')}
                    >
                      <i className="fas fa-book me-2"></i>General Courses
                    </button>
                  </li>
                  <li className="nav-item">
                    <button
                      className={`nav-link ${activeTab === 'masterclass' ? 'active' : ''}`}
                      onClick={() => setActiveTab('masterclass')}
                    >
                      <i className="fas fa-crown me-2"></i>Masterclass Courses
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
                      {activeTab === 'all' ? 'All' : activeTab === 'general' ? 'General' : 'Masterclass'} Course Results
                      <span className="badge bg-primary ms-2">{filteredResults.length}</span>
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
                        placeholder="Search by course name or remark..."
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
                        ? "You haven't completed any courses yet. Complete a course quiz to see your results here!"
                        : 'No results match your search criteria.'
                      }
                    </p>
                    {results.length === 0 && (
                      <button 
                        className="btn btn-primary mt-3"
                        onClick={() => window.location.href = '/general-courses'}
                      >
                        <i className="fas fa-play-circle me-2"></i>
                        Start a Course
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead className="table-light">
                        <tr>
                          <th>Course Name</th>
                          <th>Course Type</th>
                          <th className="text-center">Score</th>
                          <th className="text-center">Percentage</th>
                          <th className="text-center">Performance</th>
                          <th className="text-center">Time Taken</th>
                          <th className="text-center">Date Completed</th>
                          <th className="text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredResults.map((result) => (
                          <tr key={result._id}>
                            <td>
                              <strong>{result.courseName}</strong>
                              {result.questionSetTitle && result.questionSetTitle !== result.courseName && (
                                <br />
                              )}
                              {result.questionSetTitle && result.questionSetTitle !== result.courseName && (
                                <small className="text-muted">{result.questionSetTitle}</small>
                              )}
                            </td>
                            <td>
                              <span className={`badge ${
                                result.courseType === 'general' ? 'bg-info' : 'bg-warning'
                              }`}>
                                {result.courseType}
                              </span>
                            </td>
                            <td className="text-center">
                              <span className="badge bg-secondary fs-6">
                                {result.score}/{result.maxScore}
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
                              <small>{formatTimeTaken(result.timeTaken)}</small>
                            </td>
                            <td className="text-center">
                              <small>{formatDate(result.createdAt)}</small>
                            </td>
                            <td className="text-center">
                              <button
                                className="btn btn-outline-primary btn-sm"
                                onClick={() => viewDetails(result)}
                                title="View detailed results"
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
                <div className="row mb-4">
                  <div className="col-md-6">
                    <h6>Course Information</h6>
                    <ul className="list-group list-group-flush">
                      <li className="list-group-item d-flex justify-content-between">
                        <span>Course Name:</span>
                        <strong>{selectedResult.courseName}</strong>
                      </li>
                      <li className="list-group-item d-flex justify-content-between">
                        <span>Course Type:</span>
                        <strong>
                          <span className={`badge ${
                            selectedResult.courseType === 'general' ? 'bg-info' : 'bg-warning'
                          }`}>
                            {selectedResult.courseType}
                          </span>
                        </strong>
                      </li>
                      <li className="list-group-item d-flex justify-content-between">
                        <span>Question Set:</span>
                        <strong>{selectedResult.questionSetTitle}</strong>
                      </li>
                    </ul>
                  </div>
                  <div className="col-md-6">
                    <h6>Performance Summary</h6>
                    <ul className="list-group list-group-flush">
                      <li className="list-group-item d-flex justify-content-between">
                        <span>Date Completed:</span>
                        <strong>{formatDate(selectedResult.createdAt)}</strong>
                      </li>
                      <li className="list-group-item d-flex justify-content-between">
                        <span>Time Taken:</span>
                        <strong>{formatTimeTaken(selectedResult.timeTaken)}</strong>
                      </li>
                      <li className="list-group-item d-flex justify-content-between">
                        <span>Scoring System:</span>
                        <strong>{selectedResult.scoringSystem}</strong>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="row mb-4">
                  <div className="col-12">
                    <div className="card bg-light">
                      <div className="card-body text-center">
                        <div className="row">
                          <div className="col-md-3">
                            <h3 className="text-primary">{selectedResult.percentage}%</h3>
                            <p className="mb-0">Overall Score</p>
                          </div>
                          <div className="col-md-3">
                            <h3 className="text-info">{selectedResult.score}/{selectedResult.maxScore}</h3>
                            <p className="mb-0">Points Earned</p>
                          </div>
                          <div className="col-md-3">
                            <h3 className="text-success">{selectedResult.totalQuestions}</h3>
                            <p className="mb-0">Total Questions</p>
                          </div>
                          <div className="col-md-3">
                            <h3 className={`text-${getPerformanceColor(selectedResult.percentage)}`}>
                              {selectedResult.remark}
                            </h3>
                            <p className="mb-0">Performance</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {selectedResult.answers && selectedResult.answers.length > 0 && (
                  <>
                    <hr />
                    <h6>Detailed Question Breakdown</h6>
                    <div className="question-breakdown" style={{maxHeight: '400px', overflowY: 'auto'}}>
                      {selectedResult.answers.map((answer, index) => (
                        <div key={index} className={`card mb-3 ${answer.isCorrect ? 'border-success' : 'border-danger'}`}>
                          <div className="card-body">
                            <div className="d-flex justify-content-between align-items-start mb-2">
                              <h6 className="mb-0">Q{index + 1}: {answer.questionText}</h6>
                              <span className={`badge ${answer.isCorrect ? 'bg-success' : 'bg-danger'}`}>
                                {answer.isCorrect ? 'Correct' : 'Incorrect'}
                              </span>
                            </div>
                            <div className="row">
                              <div className="col-md-6">
                                <small className="text-muted">Your Answer:</small>
                                <div className={`p-2 rounded ${answer.isCorrect ? 'bg-success text-white' : 'bg-danger text-white'}`}>
                                  {answer.selectedAnswer}
                                </div>
                              </div>
                              <div className="col-md-6">
                                <small className="text-muted">Correct Answer:</small>
                                <div className="p-2 rounded bg-success text-white">
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
                            <div className="mt-2">
                              <small className="text-muted">Points: </small>
                              <span className={`badge ${answer.isCorrect ? 'bg-success' : 'bg-secondary'}`}>
                                {answer.points || 0} points
                              </span>
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