import React, { useState, useEffect } from 'react';
import api from '../services/api';
import * as XLSX from 'xlsx';

const AdminCourseCompleted = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredResults, setFilteredResults] = useState([]);
  const [selectedResult, setSelectedResult] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);

  // Filter states
  const [dateFilter, setDateFilter] = useState({
    startDate: '',
    endDate: ''
  });
  const [scoreFilter, setScoreFilter] = useState({
    minScore: '',
    maxScore: ''
  });

  useEffect(() => {
    fetchResults();
    fetchNotificationCount();
  }, [activeTab]);

  useEffect(() => {
    filterResults();
  }, [results, searchTerm, dateFilter, scoreFilter, activeTab]);

  const fetchResults = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('📊 Admin fetching all course results...');
      
      const response = await api.get('/course-results');
      
      if (response.data.success) {
        setResults(response.data.results);
        console.log(`✅ Admin loaded ${response.data.results.length} course results`);
      } else {
        setError('Failed to load course results');
      }
    } catch (error) {
      console.error('❌ Error fetching course results:', error);
      setError('Failed to load course results. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const fetchNotificationCount = async () => {
    try {
      const response = await api.get('/course-results/notifications/count');
      if (response.data.success) {
        setNotificationCount(response.data.count);
        console.log(`🔔 Course completion notifications: ${response.data.count}`);
      }
    } catch (error) {
      console.error('❌ Error fetching notification count:', error);
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
        result.userName?.toLowerCase().includes(term) ||
        result.remark?.toLowerCase().includes(term) ||
        result.questionSetTitle?.toLowerCase().includes(term)
      );
    }

    // Filter by date range
    if (dateFilter.startDate) {
      filtered = filtered.filter(result => 
        new Date(result.createdAt) >= new Date(dateFilter.startDate)
      );
    }
    if (dateFilter.endDate) {
      const endDate = new Date(dateFilter.endDate);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(result => 
        new Date(result.createdAt) <= endDate
      );
    }

    // Filter by score range
    if (scoreFilter.minScore) {
      filtered = filtered.filter(result => 
        result.percentage >= parseFloat(scoreFilter.minScore)
      );
    }
    if (scoreFilter.maxScore) {
      filtered = filtered.filter(result => 
        result.percentage <= parseFloat(scoreFilter.maxScore)
      );
    }

    setFilteredResults(filtered);
  };

  const viewDetails = (result) => {
    setSelectedResult(result);
    setShowDetailsModal(true);
  };

  const exportToExcel = () => {
    try {
      if (filteredResults.length === 0) {
        alert('No results to export. Please adjust your filters.');
        return;
      }

      const dataForExport = filteredResults.map(result => ({
        'Student Name': result.userName,
        'Course Name': result.courseName,
        'Question Set': result.questionSetTitle,
        'Course Type': result.courseType,
        'Date Completed': result.createdAt ? new Date(result.createdAt).toLocaleDateString() : 'N/A',
        'Score': `${result.score}/${result.maxScore}`,
        'Percentage': `${result.percentage}%`,
        'Performance': result.remark,
        'Time Taken': result.timeTaken ? 
          `${Math.floor(result.timeTaken / 60)}:${(result.timeTaken % 60).toString().padStart(2, '0')}` 
          : 'N/A',
        'Total Questions': result.totalQuestions,
        'Scoring System': result.scoringSystem
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataForExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Course Results');
      
      const timestamp = new Date().toISOString().split('T')[0];
      XLSX.writeFile(workbook, `course_results_${timestamp}.xlsx`);
      
      alert('Course results exported successfully!');
    } catch (error) {
      console.error('❌ Error exporting to Excel:', error);
      alert('Failed to export course results. Please try again.');
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setDateFilter({ startDate: '', endDate: '' });
    setScoreFilter({ minScore: '', maxScore: '' });
  };

  const markAsRead = async () => {
    try {
      await api.put('/course-results/mark-read');
      setNotificationCount(0);
      alert('All course completions marked as read');
      fetchResults(); // Refresh to update read status
    } catch (error) {
      console.error('❌ Error marking course completions as read:', error);
      alert('Error marking completions as read');
    }
  };

  const getPerformanceColor = (percentage) => {
    if (percentage >= 90) return 'success';
    if (percentage >= 80) return 'primary';
    if (percentage >= 70) return 'info';
    if (percentage >= 60) return 'warning';
    return 'danger';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
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
                <h4 className="text-primary">Loading Course Completions...</h4>
                <p className="text-muted">Please wait while we fetch all results</p>
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
    <div className="admin-course-completed" style={{ background: '#f8f9fa', minHeight: '100vh' }}>
      <div className="container-fluid py-4">
        {/* Header Section */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="card text-white bg-primary shadow-lg">
              <div className="card-body py-4">
                <div className="row align-items-center">
                  <div className="col-md-8">
                    <h1 className="display-5 fw-bold mb-2">
                      <i className="fas fa-certificate me-3"></i>
                      Course Completions
                      {notificationCount > 0 && (
                        <span className="badge bg-warning ms-2 fs-6">
                          {notificationCount} New
                        </span>
                      )}
                    </h1>
                    <p className="lead mb-0 opacity-75">
                      Monitor all student course completions and performances
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

        {/* Notification Alert */}
        {notificationCount > 0 && (
          <div className="row mb-4">
            <div className="col-12">
              <div className="alert alert-warning alert-dismissible fade show">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <i className="fas fa-bell me-2"></i>
                    <strong>You have {notificationCount} new course completion(s)</strong>
                  </div>
                  <button 
                    className="btn btn-outline-warning btn-sm"
                    onClick={markAsRead}
                  >
                    Mark All as Read
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

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

        {/* Filters Section */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="card shadow-sm border-0">
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-md-3">
                    <div className="input-group">
                      <span className="input-group-text">
                        <i className="fas fa-search"></i>
                      </span>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Search students or courses..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="col-md-2">
                    <input
                      type="date"
                      className="form-control"
                      placeholder="Start Date"
                      value={dateFilter.startDate}
                      onChange={(e) => setDateFilter(prev => ({...prev, startDate: e.target.value}))}
                    />
                  </div>
                  <div className="col-md-2">
                    <input
                      type="date"
                      className="form-control"
                      placeholder="End Date"
                      value={dateFilter.endDate}
                      onChange={(e) => setDateFilter(prev => ({...prev, endDate: e.target.value}))}
                    />
                  </div>
                  <div className="col-md-2">
                    <input
                      type="number"
                      className="form-control"
                      placeholder="Min Score %"
                      min="0"
                      max="100"
                      value={scoreFilter.minScore}
                      onChange={(e) => setScoreFilter(prev => ({...prev, minScore: e.target.value}))}
                    />
                  </div>
                  <div className="col-md-2">
                    <input
                      type="number"
                      className="form-control"
                      placeholder="Max Score %"
                      min="0"
                      max="100"
                      value={scoreFilter.maxScore}
                      onChange={(e) => setScoreFilter(prev => ({...prev, maxScore: e.target.value}))}
                    />
                  </div>
                  <div className="col-md-1">
                    <div className="d-flex gap-2">
                      <button
                        className="btn btn-outline-secondary"
                        onClick={clearFilters}
                        title="Clear Filters"
                      >
                        <i className="fas fa-times"></i>
                      </button>
                      <button
                        className="btn btn-primary"
                        onClick={exportToExcel}
                        title="Export to Excel"
                        disabled={filteredResults.length === 0}
                      >
                        <i className="fas fa-download"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Results Table */}
        <div className="row">
          <div className="col-12">
            <div className="card shadow-lg border-0">
              <div className="card-header bg-white">
                <div className="row align-items-center">
                  <div className="col-md-6">
                    <h5 className="mb-0">
                      {activeTab === 'all' ? 'All' : activeTab === 'general' ? 'General' : 'Masterclass'} Course Completions
                      <span className="badge bg-primary ms-2">{filteredResults.length}</span>
                    </h5>
                  </div>
                  <div className="col-md-6 text-end">
                    <small className="text-muted">
                      Showing {filteredResults.length} of {results.length} results
                    </small>
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
                        ? 'No course completions recorded yet.'
                        : 'No results match your filter criteria.'
                      }
                    </p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead className="table-light">
                        <tr>
                          <th>Student Name</th>
                          <th>Course Name</th>
                          <th className="text-center">Type</th>
                          <th className="text-center">Score</th>
                          <th className="text-center">Percentage</th>
                          <th className="text-center">Performance</th>
                          <th className="text-center">Time Taken</th>
                          <th className="text-center">Date Completed</th>
                          <th className="text-center">Status</th>
                          <th className="text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredResults.map((result) => (
                          <tr key={result._id}>
                            <td>
                              <strong>{result.userName}</strong>
                            </td>
                            <td>
                              <div>
                                <strong>{result.courseName}</strong>
                                {result.questionSetTitle && result.questionSetTitle !== result.courseName && (
                                  <br />
                                )}
                                {result.questionSetTitle && result.questionSetTitle !== result.courseName && (
                                  <small className="text-muted">{result.questionSetTitle}</small>
                                )}
                              </div>
                            </td>
                            <td className="text-center">
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
                              <span className={`badge ${result.readByAdmin ? 'bg-success' : 'bg-warning'}`}>
                                {result.readByAdmin ? 'Read' : 'Unread'}
                              </span>
                            </td>
                            <td className="text-center">
                              <button
                                className="btn btn-outline-primary btn-sm"
                                onClick={() => viewDetails(result)}
                                title="View detailed results"
                              >
                                <i className="fas fa-eye me-1"></i>View
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
          <div className="modal-dialog modal-xl modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">
                  <i className="fas fa-analytics me-2"></i>
                  Course Completion Details
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
                    <h6>Student Information</h6>
                    <ul className="list-group list-group-flush">
                      <li className="list-group-item d-flex justify-content-between">
                        <span>Name:</span>
                        <strong>{selectedResult.userName}</strong>
                      </li>
                      <li className="list-group-item d-flex justify-content-between">
                        <span>User ID:</span>
                        <strong>{selectedResult.userId}</strong>
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
                    </ul>
                  </div>
                  <div className="col-md-6">
                    <h6>Course Information</h6>
                    <ul className="list-group list-group-flush">
                      <li className="list-group-item d-flex justify-content-between">
                        <span>Course Name:</span>
                        <strong>{selectedResult.courseName}</strong>
                      </li>
                      <li className="list-group-item d-flex justify-content-between">
                        <span>Question Set:</span>
                        <strong>{selectedResult.questionSetTitle}</strong>
                      </li>
                      <li className="list-group-item d-flex justify-content-between">
                        <span>Date Completed:</span>
                        <strong>{formatDate(selectedResult.createdAt)}</strong>
                      </li>
                      <li className="list-group-item d-flex justify-content-between">
                        <span>Time Taken:</span>
                        <strong>{formatTimeTaken(selectedResult.timeTaken)}</strong>
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
                        <div className="row mt-3">
                          <div className="col-12">
                            <small className="text-muted">
                              Scoring System: {selectedResult.scoringSystem} | 
                              Status: <span className={`badge ${selectedResult.readByAdmin ? 'bg-success' : 'bg-warning'}`}>
                                {selectedResult.readByAdmin ? 'Read by Admin' : 'Unread'}
                              </span>
                            </small>
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
                                <small className="text-muted">Student's Answer:</small>
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

export default AdminCourseCompleted;