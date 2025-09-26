// src/components/AdminQuizCompleted.jsx
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import * as XLSX from 'xlsx';

const AdminQuizCompleted = () => {
  const [quizResults, setQuizResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedResult, setSelectedResult] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedGroups, setExpandedGroups] = useState({});
  const [filteredResults, setFilteredResults] = useState([]);
  const [showFilterOptions, setShowFilterOptions] = useState(false);
  const [filterCriteria, setFilterCriteria] = useState({
    minScore: '',
    maxScore: '',
    dateFrom: '',
    dateTo: '',
    performance: '',
    studentName: ''
  });
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [totalItems, setTotalItems] = useState(0);
  
  // Custom alert states
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState('success');

  // NEW: Navigation state for profile and messaging
  const [navigation, setNavigation] = useState({
    target: null, // 'profile' or 'message'
    studentData: null
  });

  useEffect(() => {
    fetchQuizResults();
  }, [currentPage, itemsPerPage]);

  useEffect(() => {
    filterResults();
  }, [quizResults, searchTerm, filterCriteria]);

  // NEW: Handle navigation to other admin pages
  useEffect(() => {
    if (navigation.target && navigation.studentData) {
      // Store the student data for the target page
      sessionStorage.setItem('adminNavigation', JSON.stringify({
        target: navigation.target,
        studentData: navigation.studentData
      }));
      
      // Navigate to the appropriate page
      if (navigation.target === 'profile') {
        window.location.hash = '#admin-students';
      } else if (navigation.target === 'message') {
        window.location.hash = '#admin-message-students';
      }
      
      // Reset navigation state
      setNavigation({ target: null, studentData: null });
    }
  }, [navigation]);

  const showCustomAlert = (message, type = 'success') => {
    setAlertMessage(message);
    setAlertType(type);
    setShowAlert(true);
    
    setTimeout(() => {
      setShowAlert(false);
    }, 3000);
  };

  const fetchQuizResults = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await api.get('/quiz/results/admin', {
        params: {
          page: currentPage,
          limit: itemsPerPage
        }
      });
      
      console.log('Admin quiz results response:', response.data);
      
      if (response.data.success) {
        setQuizResults(response.data.results);
        setTotalItems(response.data.totalCount);
        
        // Mark notifications as read when admin views them
        await markNotificationsAsRead();
      } else {
        setError('Failed to load quiz results');
      }
    } catch (error) {
      console.error('Error fetching admin quiz results:', error);
      setError('Failed to load quiz results. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const markNotificationsAsRead = async () => {
    try {
      await api.put('/notifications/mark-read', { type: 'quiz_completed_admin' });
      await api.put('/quiz/results/mark-read');
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  // NEW: Enhanced profile viewing function
  const handleViewProfile = (result) => {
    setNavigation({
      target: 'profile',
      studentData: {
        studentId: result.userId || result.userName, // Use whatever unique identifier you have
        studentName: result.userName,
        studentEmail: result.userEmail, // Add this if available in your data
        course: result.destination
      }
    });
    
    showCustomAlert(`Navigating to ${result.userName}'s profile...`, 'info');
  };

  // NEW: Enhanced messaging function
  const handleSendMessage = (result) => {
    setNavigation({
      target: 'message',
      studentData: {
        studentId: result.userId || result.userName,
        studentName: result.userName,
        studentEmail: result.userEmail, // Add this if available
        course: result.destination,
        quizScore: result.percentage,
        quizPerformance: result.remark
      }
    });
    
    showCustomAlert(`Preparing message to ${result.userName}...`, 'info');
  };

  // Rest of your existing functions remain the same...
  const filterResults = () => {
    let filtered = quizResults;

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(result =>
        result.userName?.toLowerCase().includes(term) ||
        result.destination?.toLowerCase().includes(term) ||
        result.remark?.toLowerCase().includes(term) ||
        result.score?.toString().includes(term) ||
        result.percentage?.toString().includes(term) ||
        new Date(result.date).toLocaleDateString().toLowerCase().includes(term)
      );
    }

    if (filterCriteria.minScore) {
      filtered = filtered.filter(result => result.percentage >= parseFloat(filterCriteria.minScore));
    }

    if (filterCriteria.maxScore) {
      filtered = filtered.filter(result => result.percentage <= parseFloat(filterCriteria.maxScore));
    }

    if (filterCriteria.dateFrom) {
      filtered = filtered.filter(result => new Date(result.date) >= new Date(filterCriteria.dateFrom));
    }

    if (filterCriteria.dateTo) {
      const toDate = new Date(filterCriteria.dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(result => new Date(result.date) <= toDate);
    }

    if (filterCriteria.performance) {
      filtered = filtered.filter(result => result.remark === filterCriteria.performance);
    }

    if (filterCriteria.studentName) {
      filtered = filtered.filter(result => 
        result.userName?.toLowerCase().includes(filterCriteria.studentName.toLowerCase())
      );
    }

    setFilteredResults(filtered);
  };

  const handleFilterClick = () => {
    setShowFilterOptions(!showFilterOptions);
  };

  const handleExportClick = () => {
    exportToExcel();
  };

  const exportToExcel = () => {
    try {
      const dataToExport = quizResults.length > 0 ? quizResults : [];
      
      if (dataToExport.length === 0) {
        showCustomAlert('No results to export.', 'warning');
        return;
      }

      const dataForExport = dataToExport.map(result => ({
        'Student Name': result.userName,
        'Course': result.destination,
        'Date': new Date(result.date).toLocaleDateString(),
        'Score': `${result.score}/${result.totalQuestions}`,
        'Percentage': `${result.percentage}%`,
        'Performance': result.remark,
        'Time Taken': result.timeTaken || 'N/A',
        'Read by Admin': result.readByAdmin ? 'Yes' : 'No',
        'Submission ID': result._id
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataForExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Quiz Results');
      
      const timestamp = new Date().toISOString().split('T')[0];
      XLSX.writeFile(workbook, `admin_quiz_results_${timestamp}.xlsx`);
      
      showCustomAlert('Quiz results exported successfully!', 'success');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      showCustomAlert('Failed to export quiz results. Please try again.', 'error');
    }
  };

  const printResults = () => {
    if (!selectedResult) {
      showCustomAlert('No result selected for printing.', 'warning');
      return;
    }
    
    const printContent = `
      <html>
        <head>
          <title>Quiz Results - ${selectedResult.destination}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .section { margin-bottom: 20px; }
            .section h3 { color: #ff6f00; border-bottom: 2px solid #ff6f00; padding-bottom: 5px; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
            .score-display { text-align: center; background: #f5f5f5; padding: 20px; border-radius: 10px; }
            .question-item { margin-bottom: 15px; padding: 10px; border-left: 3px solid #ccc; }
            .correct { border-left-color: #28a745; }
            .incorrect { border-left-color: #dc3545; }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Admin - Quiz Results Report</h1>
            <h2>${selectedResult.destination}</h2>
          </div>
          
          <div class="section">
            <h3>Student Information</h3>
            <div class="info-grid">
              <div><strong>Student Name:</strong> ${selectedResult.userName}</div>
              <div><strong>Course/Destination:</strong> ${selectedResult.destination}</div>
              <div><strong>Date Taken:</strong> ${new Date(selectedResult.date).toLocaleString()}</div>
              <div><strong>Submission ID:</strong> ${selectedResult._id}</div>
            </div>
          </div>
          
          <div class="section">
            <h3>Performance Summary</h3>
            <div class="score-display">
              <div style="font-size: 48px; font-weight: bold; color: #ff6f00;">${selectedResult.percentage}%</div>
              <div style="font-size: 24px; color: ${getPerformanceColor(selectedResult.percentage)};">${selectedResult.remark}</div>
              <div>Score: ${selectedResult.score} out of ${selectedResult.totalQuestions}</div>
            </div>
          </div>
          
          <div class="section">
            <h3>Question Breakdown</h3>
            ${selectedResult.answers ? selectedResult.answers.map((answer, index) => `
              <div class="question-item ${answer.isCorrect ? 'correct' : 'incorrect'}">
                <strong>Q${index + 1}:</strong> ${answer.question}<br>
                <span style="color: ${answer.isCorrect ? '#28a745' : '#dc3545'};">
                  Your Answer: ${answer.selectedOption} ${answer.isCorrect ? '✓' : '✗'}
                </span><br>
                <span style="color: #28a745;">Correct Answer: ${answer.correctAnswer}</span>
              </div>
            `).join('') : '<p>No answer details available.</p>'}
          </div>
          
          <div class="no-print" style="margin-top: 30px; text-align: center;">
            <button onclick="window.print()" style="padding: 10px 20px; background: #ff6f00; color: white; border: none; border-radius: 5px; cursor: pointer;">
              Print Results
            </button>
            <button onclick="window.close()" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer; margin-left: 10px;">
              Close
            </button>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  const clearFilters = () => {
    setFilterCriteria({
      minScore: '',
      maxScore: '',
      dateFrom: '',
      dateTo: '',
      performance: '',
      studentName: ''
    });
    setSearchTerm('');
    setCurrentPage(1);
    showCustomAlert('All filters cleared.', 'success');
  };

  const groupResultsByCourse = () => {
    const groups = {};
    filteredResults.forEach(result => {
      const course = result.destination || 'Unknown Course';
      if (!groups[course]) {
        groups[course] = {
          courseName: course,
          results: [],
          totalAttempts: 0,
          averageScore: 0,
          bestScore: 0
        };
      }
      groups[course].results.push(result);
      groups[course].totalAttempts++;
      groups[course].averageScore = (
        groups[course].results.reduce((sum, r) => sum + r.percentage, 0) / 
        groups[course].results.length
      ).toFixed(1);
      groups[course].bestScore = Math.max(...groups[course].results.map(r => r.percentage));
    });
    return groups;
  };

  const toggleGroup = (courseName) => {
    setExpandedGroups(prev => ({
      ...prev,
      [courseName]: !prev[courseName]
    }));
  };

  const viewDetailedResult = (result) => {
    setSelectedResult(result);
    setShowModal(true);
  };

  const getPerformanceColor = (percentage) => {
    if (percentage >= 80) return '#28a745';
    if (percentage >= 60) return '#007bff';
    if (percentage >= 40) return '#ffc107';
    return '#dc3545';
  };

  const getRemarkColor = (remark) => {
    switch (remark) {
      case 'Excellent': return 'success';
      case 'Good': return 'primary';
      case 'Fair': return 'warning';
      case 'Needs Improvement': return 'danger';
      default: return 'secondary';
    }
  };

  const getPerformanceBadge = (percentage) => {
    if (percentage >= 80) return 'success';
    if (percentage >= 60) return 'primary';
    if (percentage >= 40) return 'warning';
    return 'danger';
  };

  // Pagination functions
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  const renderPagination = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <li key={i} className={`page-item ${currentPage === i ? 'active' : ''}`}>
          <button className="page-link" onClick={() => handlePageChange(i)}>
            {i}
          </button>
        </li>
      );
    }
    
    return (
      <nav aria-label="Quiz results pagination">
        <ul className="pagination justify-content-center">
          <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
            <button 
              className="page-link" 
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Previous
            </button>
          </li>
          
          {startPage > 1 && (
            <>
              <li className="page-item">
                <button className="page-link" onClick={() => handlePageChange(1)}>1</button>
              </li>
              {startPage > 2 && <li className="page-item disabled"><span className="page-link">...</span></li>}
            </>
          )}
          
          {pages}
          
          {endPage < totalPages && (
            <>
              {endPage < totalPages - 1 && <li className="page-item disabled"><span className="page-link">...</span></li>}
              <li className="page-item">
                <button className="page-link" onClick={() => handlePageChange(totalPages)}>{totalPages}</button>
              </li>
            </>
          )}
          
          <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
            <button 
              className="page-link" 
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </li>
        </ul>
      </nav>
    );
  };

  const courseGroups = groupResultsByCourse();

  if (loading && currentPage === 1) {
    return (
      <div className="container-fluid py-4">
        <div className="row justify-content-center">
          <div className="col-12 col-md-10 col-lg-8">
            <div className="card shadow-lg border-0">
              <div className="card-body text-center py-5">
                <div className="spinner-border text-primary mb-3" style={{width: '3rem', height: '3rem', color: '#ff6f00'}}>
                  <span className="visually-hidden">Loading...</span>
                </div>
                <h4 className="text-primary" style={{color: '#ff6f00'}}>Loading Quiz Results...</h4>
                <p className="text-muted">Fetching student submissions data</p>
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
    <div className="admin-quiz-completed" style={{ background: '#f9fafb', minHeight: '100vh' }}>
      {/* Custom Alert Component */}
      {showAlert && (
        <div className={`custom-alert custom-alert-${alertType}`}>
          <div className="alert-content">
            <i className={`fas ${
              alertType === 'success' ? 'fa-check-circle' :
              alertType === 'error' ? 'fa-exclamation-circle' :
              'fa-info-circle'
            } me-2`}></i>
            {alertMessage}
            <button 
              className="alert-close" 
              onClick={() => setShowAlert(false)}
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>
      )}

      <div className="container-fluid py-4">
        {/* Header Section */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="card text-white shadow-lg" style={{backgroundColor: '#dc3545'}}>
              <div className="card-body py-4">
                <div className="row align-items-center">
                  <div className="col-md-8">
                    <h1 className="display-5 fw-bold mb-2">
                      <i className="fas fa-tasks me-3"></i>
                      Quiz Completed - Admin Dashboard
                    </h1>
                    <p className="lead mb-0 opacity-75">Monitor all student quiz submissions and performance analytics</p>
                  </div>
                  <div className="col-md-4 text-md-end">
                    <div className="bg-white rounded p-3 d-inline-block" style={{color: '#dc3545'}}>
                      <h4 className="mb-0 fw-bold">{totalItems}</h4>
                      <small>Total Submissions</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filter Section */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="card shadow-sm border-0">
              <div className="card-body">
                <div className="row g-3 align-items-center">
                  <div className="col-md-6">
                    <div className="input-group input-group-lg">
                      <span className="input-group-text bg-danger text-white">
                        <i className="fas fa-search"></i>
                      </span>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Search by student name, course, score, date, or performance..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="d-flex gap-2">
                      <button 
                        className="btn btn-outline-danger btn-lg w-50"
                        onClick={handleFilterClick}
                      >
                        <i className="fas fa-filter me-2"></i>Filter
                      </button>
                      <button 
                        className="btn btn-danger btn-lg w-50" 
                        onClick={handleExportClick}
                      >
                        <i className="fas fa-download me-2"></i>Export
                      </button>
                    </div>
                  </div>
                  <div className="col-md-3">
                    <select 
                      className="form-select form-select-lg"
                      value={itemsPerPage}
                      onChange={(e) => handleItemsPerPageChange(parseInt(e.target.value))}
                    >
                      <option value="10">10 per page</option>
                      <option value="20">20 per page</option>
                      <option value="50">50 per page</option>
                      <option value="100">100 per page</option>
                    </select>
                  </div>
                </div>

                {/* Advanced Filter Options */}
                {showFilterOptions && (
                  <div className="row mt-4 p-3 bg-light rounded">
                    <div className="col-md-2 mb-2">
                      <label className="form-label">Min Score (%)</label>
                      <input
                        type="number"
                        className="form-control"
                        min="0"
                        max="100"
                        value={filterCriteria.minScore}
                        onChange={(e) => setFilterCriteria(prev => ({...prev, minScore: e.target.value}))}
                      />
                    </div>
                    <div className="col-md-2 mb-2">
                      <label className="form-label">Max Score (%)</label>
                      <input
                        type="number"
                        className="form-control"
                        min="0"
                        max="100"
                        value={filterCriteria.maxScore}
                        onChange={(e) => setFilterCriteria(prev => ({...prev, maxScore: e.target.value}))}
                      />
                    </div>
                    <div className="col-md-2 mb-2">
                      <label className="form-label">From Date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={filterCriteria.dateFrom}
                        onChange={(e) => setFilterCriteria(prev => ({...prev, dateFrom: e.target.value}))}
                      />
                    </div>
                    <div className="col-md-2 mb-2">
                      <label className="form-label">To Date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={filterCriteria.dateTo}
                        onChange={(e) => setFilterCriteria(prev => ({...prev, dateTo: e.target.value}))}
                      />
                    </div>
                    <div className="col-md-2 mb-2">
                      <label className="form-label">Performance</label>
                      <select
                        className="form-select"
                        value={filterCriteria.performance}
                        onChange={(e) => setFilterCriteria(prev => ({...prev, performance: e.target.value}))}
                      >
                        <option value="">All</option>
                        <option value="Excellent">Excellent</option>
                        <option value="Good">Good</option>
                        <option value="Fair">Fair</option>
                        <option value="Needs Improvement">Needs Improvement</option>
                      </select>
                    </div>
                    <div className="col-md-2 mb-2">
                      <label className="form-label">Student Name</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Student name"
                        value={filterCriteria.studentName}
                        onChange={(e) => setFilterCriteria(prev => ({...prev, studentName: e.target.value}))}
                      />
                    </div>
                    <div className="col-12 d-flex justify-content-end">
                      <button 
                        className="btn btn-outline-secondary me-2"
                        onClick={clearFilters}
                      >
                        Clear Filters
                      </button>
                      <button 
                        className="btn btn-danger"
                        onClick={() => setShowFilterOptions(false)}
                      >
                        Apply Filters
                      </button>
                    </div>
                  </div>
                )}

                {searchTerm && (
                  <div className="mt-2">
                    <small className="text-muted">
                      Showing {filteredResults.length} of {quizResults.length} results for "{searchTerm}"
                    </small>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="row mb-4">
          <div className="col-md-3 mb-3">
            <div className="card text-white h-100 shadow" style={{backgroundColor: '#28a745'}}>
              <div className="card-body text-center">
                <i className="fas fa-trophy fa-2x mb-2"></i>
                <h3 className="fw-bold">
                  {quizResults.length > 0 ? 
                    Math.round(quizResults.reduce((acc, curr) => acc + curr.percentage, 0) / quizResults.length) + '%' 
                    : '0%'
                  }
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
                  {quizResults.length > 0 ? Math.max(...quizResults.map(r => r.percentage)) + '%' : '0%'}
                </h3>
                <p className="mb-0">Best Score</p>
              </div>
            </div>
          </div>
          <div className="col-md-3 mb-3">
            <div className="card text-white h-100 shadow" style={{backgroundColor: '#6f42c1'}}>
              <div className="card-body text-center">
                <i className="fas fa-users fa-2x mb-2"></i>
                <h3 className="fw-bold">
                  {new Set(quizResults.map(r => r.userName)).size}
                </h3>
                <p className="mb-0">Unique Students</p>
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
                    <i className="fas fa-inbox fa-4x text-muted"></i>
                  </div>
                  <h3 className="text-muted fw-bold mb-3">No Quiz Submissions Yet</h3>
                  <p className="text-muted mb-4">
                    Students haven't completed any quizzes yet. Quiz submissions will appear here once students start taking quizzes.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Grouped Results Table */}
            <div className="row">
              <div className="col-12">
                <div className="card shadow-lg border-0">
                  <div className="card-header bg-white py-3">
                    <div className="row align-items-center">
                      <div className="col-md-6">
                        <h4 className="mb-0" style={{color: '#1a237e'}}>
                          <i className="fas fa-list-alt me-2"></i>
                          Student Quiz Submissions
                        </h4>
                      </div>
                      <div className="col-md-6 text-end">
                        <small className="text-muted">
                          Page {currentPage} of {totalPages} • Showing {quizResults.length} results
                        </small>
                      </div>
                    </div>
                  </div>
                  <div className="card-body p-0">
                    <div className="table-responsive">
                      <table className="table table-hover align-middle mb-0">
                        <thead className="table-dark" style={{backgroundColor: '#1a237e'}}>
                          <tr>
                            <th className="ps-4" style={{width: '50px'}}></th>
                            <th>Student & Course Information</th>
                            <th className="text-center">Date Submitted</th>
                            <th className="text-center">Score</th>
                            <th className="text-center">Performance</th>
                            <th className="text-center">Status</th>
                            <th className="text-center pe-4">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.values(courseGroups).map((group, groupIndex) => (
                            <React.Fragment key={group.courseName}>
                              {/* Group Header Row */}
                              <tr 
                                className="group-header hover-shadow" 
                                style={{cursor: 'pointer', backgroundColor: expandedGroups[group.courseName] ? '#f8f9fa' : 'white'}}
                                onClick={() => toggleGroup(group.courseName)}
                              >
                                <td className="ps-4">
                                  <i className={`fas fa-chevron-${expandedGroups[group.courseName] ? 'down' : 'right'} text-primary`}></i>
                                </td>
                                <td>
                                  <div className="d-flex align-items-center">
                                    <div className="me-3">
                                      <i className="fas fa-book fa-2x text-primary"></i>
                                    </div>
                                    <div>
                                      <h6 className="mb-1 fw-bold text-dark">{group.courseName}</h6>
                                      <small className="text-muted">
                                        {group.results.length} submission{group.results.length !== 1 ? 's' : ''} • 
                                        Avg: {group.averageScore}% • Best: {group.bestScore}%
                                      </small>
                                    </div>
                                  </div>
                                </td>
                                <td className="text-center" colSpan="4">
                                  <span className="badge fs-6 py-2 px-3" style={{backgroundColor: '#dc3545'}}>
                                    {group.totalAttempts} Total Attempts
                                  </span>
                                </td>
                                <td className="text-center pe-4">
                                  <button 
                                    className="btn btn-outline-primary btn-sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleGroup(group.courseName);
                                    }}
                                  >
                                    <i className={`fas fa-${expandedGroups[group.courseName] ? 'minus' : 'plus'} me-1`}></i>
                                    {expandedGroups[group.courseName] ? 'Collapse' : 'Expand'}
                                  </button>
                                </td>
                              </tr>
                              
                              {/* Expanded Rows */}
                              {expandedGroups[group.courseName] && group.results.map((result, index) => (
                                <tr key={result._id} className={`group-detail ${!result.readByAdmin ? 'table-warning' : ''}`}>
                                  <td className="ps-5">
                                    <i className="fas fa-user text-muted"></i>
                                  </td>
                                  <td>
                                    <div className="ps-3">
                                      <h6 className="mb-1 fw-bold text-dark">
                                        {result.userName}
                                        {!result.readByAdmin && (
                                          <span className="badge bg-danger ms-2">New</span>
                                        )}
                                      </h6>
                                      <small className="text-muted">
                                        {result.destination}
                                      </small>
                                    </div>
                                  </td>
                                  <td className="text-center">
                                    <small>
                                      {new Date(result.date).toLocaleDateString()}<br/>
                                      <span className="text-muted">{new Date(result.date).toLocaleTimeString()}</span>
                                    </small>
                                  </td>
                                  <td className="text-center">
                                    <span className="badge bg-info fs-6">
                                      {result.score}/{result.totalQuestions}
                                    </span>
                                    <br/>
                                    <small className={`badge bg-${getPerformanceBadge(result.percentage)}`}>
                                      {result.percentage}%
                                    </small>
                                  </td>
                                  <td className="text-center">
                                    <span className={`badge fs-6 bg-${getRemarkColor(result.remark)}`}>
                                      {result.remark}
                                    </span>
                                  </td>
                                  <td className="text-center">
                                    <span className={`badge ${result.readByAdmin ? 'bg-success' : 'bg-warning'}`}>
                                      {result.readByAdmin ? 'Reviewed' : 'Pending'}
                                    </span>
                                  </td>
                                  <td className="text-center pe-4">
                                    <div className="btn-group" role="group">
                                      <button 
                                        className="btn btn-outline-primary btn-sm"
                                        onClick={() => viewDetailedResult(result)}
                                        title="View Details"
                                      >
                                        <i className="fas fa-eye"></i>
                                      </button>
                                      <button 
                                        className="btn btn-outline-success btn-sm"
                                        onClick={() => handleSendMessage(result)}
                                        title="Message Student"
                                      >
                                        <i className="fas fa-envelope"></i>
                                      </button>
                                      <button 
                                        className="btn btn-outline-info btn-sm"
                                        onClick={() => handleViewProfile(result)}
                                        title="Student Profile"
                                      >
                                        <i className="fas fa-user"></i>
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="row mt-4">
                <div className="col-12">
                  <div className="card">
                    <div className="card-body">
                      {renderPagination()}
                      <div className="text-center mt-2">
                        <small className="text-muted">
                          Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} submissions
                        </small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Detailed Result Modal */}
        {showModal && selectedResult && (
          <div className="modal fade show" style={{display: 'block', backgroundColor: 'rgba(0,0,0,0.5)'}}>
            <div className="modal-dialog modal-lg modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header text-white" style={{backgroundColor: '#dc3545'}}>
                  <h5 className="modal-title">
                    <i className="fas fa-analytics me-2"></i>
                    Detailed Quiz Results - {selectedResult.destination}
                  </h5>
                  <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
                </div>
                <div className="modal-body">
                  <div className="row">
                    <div className="col-md-6">
                      <h6>Student Information</h6>
                      <ul className="list-group list-group-flush">
                        <li className="list-group-item d-flex justify-content-between">
                          <span>Student Name:</span>
                          <strong>{selectedResult.userName}</strong>
                        </li>
                        <li className="list-group-item d-flex justify-content-between">
                          <span>Course/Destination:</span>
                          <strong>{selectedResult.destination}</strong>
                        </li>
                        <li className="list-group-item d-flex justify-content-between">
                          <span>Date Taken:</span>
                          <strong>{new Date(selectedResult.date).toLocaleString()}</strong>
                        </li>
                        <li className="list-group-item d-flex justify-content-between">
                          <span>Submission ID:</span>
                          <strong>{selectedResult._id}</strong>
                        </li>
                      </ul>
                    </div>
                    <div className="col-md-6">
                      <h6>Performance Summary</h6>
                      <div className="text-center p-3 bg-light rounded">
                        <div className="display-4 fw-bold" style={{color: '#dc3545'}}>{selectedResult.percentage}%</div>
                        <div className={`badge bg-${getRemarkColor(selectedResult.remark)} fs-6`}>
                          {selectedResult.remark}
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
                    {selectedResult.answers && selectedResult.answers.map((answer, index) => (
                      <div key={index} className="card mb-2">
                        <div className="card-body">
                          <div className="d-flex justify-content-between align-items-start">
                            <div>
                              <h6 className="mb-1">Q{index + 1}: {answer.question}</h6>
                              <small className={`badge bg-${answer.isCorrect ? 'success' : 'danger'}`}>
                                {answer.isCorrect ? 'Correct' : 'Incorrect'}
                              </small>
                            </div>
                            <div className="text-end">
                              <small className="text-muted">Your answer: {answer.selectedOption}</small>
                              <br />
                              <small className="text-success">Correct: {answer.correctAnswer}</small>
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
                  <button type="button" className="btn btn-primary" style={{backgroundColor: '#dc3545', borderColor: '#dc3545'}} onClick={printResults}>
                    <i className="fas fa-print me-2"></i>Print Results
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .group-header:hover {
          background-color: #f8f9fa !important;
          transform: translateY(-1px);
          transition: all 0.2s ease;
        }
        
        .group-detail {
          background-color: #fafafa;
          border-left: 4px solid #dc3545;
        }
        
        .group-detail:hover {
          background-color: #f0f0f0;
        }
        
        .hover-shadow:hover {
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .custom-alert {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 9999;
          min-width: 300px;
          max-width: 500px;
          animation: slideInRight 0.3s ease-out;
        }

        .custom-alert-success {
          background: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        .custom-alert-error {
          background: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        .custom-alert-warning {
          background: #fff3cd;
          color: #856404;
          border: 1px solid #ffeaa7;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        .alert-content {
          padding: 15px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .alert-close {
          background: none;
          border: none;
          color: inherit;
          cursor: pointer;
          padding: 5px;
          margin-left: 10px;
          opacity: 0.7;
          transition: opacity 0.2s;
        }

        .alert-close:hover {
          opacity: 1;
        }

        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default AdminQuizCompleted;