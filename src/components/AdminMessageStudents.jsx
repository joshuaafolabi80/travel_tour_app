// src/components/AdminMessageStudents.jsx - COMPLETE UPDATED VERSION
import React, { useState, useEffect } from 'react';
import api from '../services/api';

const AdminMessageStudents = () => {
  // State declarations
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageContent, setMessageContent] = useState('');
  const [messageSubject, setMessageSubject] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [showFilterOptions, setShowFilterOptions] = useState(false);
  const [filterCriteria, setFilterCriteria] = useState({
    role: '',
    status: '',
    dateFrom: '',
    dateTo: '',
    email: ''
  });
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [totalItems, setTotalItems] = useState(0);
  
  // Custom alert states
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState('success');

  // Effects
  useEffect(() => {
    fetchStudents();
  }, [currentPage, itemsPerPage]);

  useEffect(() => {
    // Check if we have stored student data from AdminStudents page
    const storedStudentData = sessionStorage.getItem('adminMessageStudent');
    console.log('🔍 Checking for stored student data:', storedStudentData);
    
    if (storedStudentData) {
      try {
        const studentData = JSON.parse(storedStudentData);
        console.log('🎯 Found stored student data:', studentData);
        
        // Find the student in our current list
        const student = students.find(s => 
          s._id === studentData.studentId || 
          s.username === studentData.studentUsername ||
          s.email === studentData.studentEmail
        );
        
        if (student) {
          console.log('✅ Found matching student, opening message modal');
          handleSendMessageClick(student);
        } else {
          console.log('❌ No matching student found in current list');
        }
        
        // Clear the stored data after use
        sessionStorage.removeItem('adminMessageStudent');
      } catch (error) {
        console.error('Error parsing stored student data:', error);
        sessionStorage.removeItem('adminMessageStudent');
      }
    }
  }, [students]);

  useEffect(() => {
    filterStudents();
  }, [students, searchTerm, filterCriteria]);

  // Get student display name
  const getStudentDisplayName = (student) => {
    if (student.profile?.firstName && student.profile?.lastName) {
      return `${student.profile.firstName} ${student.profile.lastName}`;
    }
    return student.username || student.email || 'Unknown User';
  };

  // Helper functions
  const showCustomAlert = (message, type = 'success') => {
    setAlertMessage(message);
    setAlertType(type);
    setShowAlert(true);
    
    setTimeout(() => {
      setShowAlert(false);
    }, 3000);
  };

  const getStatusColor = (active) => {
    return active ? 'success' : 'secondary';
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin': return 'danger';
      case 'student': return 'primary';
      case 'instructor': return 'warning';
      default: return 'secondary';
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin': return 'fa-user-shield';
      case 'student': return 'fa-user-graduate';
      case 'instructor': return 'fa-chalkboard-teacher';
      default: return 'fa-user';
    }
  };

  // API functions
  const fetchStudents = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await api.get('/admin/students', {
        params: {
          page: currentPage,
          limit: itemsPerPage
        }
      });
      
      if (response.data.success) {
        setStudents(response.data.students);
        setTotalItems(response.data.totalCount);
      } else {
        setError('Failed to load students data');
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      setError('Failed to load students. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const filterStudents = () => {
    let filtered = students;

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(student => {
        const displayName = getStudentDisplayName(student).toLowerCase();
        return (
          displayName.includes(term) ||
          student.username?.toLowerCase().includes(term) ||
          student.email?.toLowerCase().includes(term) ||
          student.role?.toLowerCase().includes(term) ||
          (student.active ? 'active' : 'inactive').includes(term) ||
          new Date(student.createdAt).toLocaleDateString().toLowerCase().includes(term)
        );
      });
    }

    if (filterCriteria.role) {
      filtered = filtered.filter(student => student.role === filterCriteria.role);
    }

    if (filterCriteria.status) {
      filtered = filtered.filter(student => student.active === (filterCriteria.status === 'active'));
    }

    if (filterCriteria.dateFrom) {
      filtered = filtered.filter(student => new Date(student.createdAt) >= new Date(filterCriteria.dateFrom));
    }

    if (filterCriteria.dateTo) {
      const toDate = new Date(filterCriteria.dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(student => new Date(student.createdAt) <= toDate);
    }

    if (filterCriteria.email) {
      filtered = filtered.filter(student => 
        student.email?.toLowerCase().includes(filterCriteria.email.toLowerCase())
      );
    }

    setFilteredStudents(filtered);
  };

  // Message handling functions
  const handleSendMessageClick = (student) => {
    setSelectedStudent(student);
    setMessageSubject('');
    setMessageContent('');
    setShowMessageModal(true);
  };

  // FIXED: Using the working endpoint without /admin prefix
  const handleSendMessage = async () => {
    if (!messageSubject.trim() || !messageContent.trim()) {
      showCustomAlert('Please enter both subject and message content.', 'error');
      return;
    }

    setSendingMessage(true);
    try {
      console.log('📨 Sending message to:', selectedStudent.email);
      
      // USE THE SIMPLE ENDPOINT THAT WORKS - REMOVED /admin PREFIX
      const response = await api.post('/send-message', {
        studentId: selectedStudent._id,
        studentEmail: selectedStudent.email,
        subject: messageSubject.trim(),
        message: messageContent.trim()
      });

      if (response.data.success) {
        showCustomAlert(`Message sent successfully to ${getStudentDisplayName(selectedStudent)}!`, 'success');
        setShowMessageModal(false);
        setMessageSubject('');
        setMessageContent('');
        setSelectedStudent(null);
      } else {
        showCustomAlert('Failed to send message. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      showCustomAlert('Failed to send message. Please try again.', 'error');
    }
    setSendingMessage(false);
  };

  // Filter functions
  const handleFilterClick = () => {
    setShowFilterOptions(!showFilterOptions);
  };

  const clearFilters = () => {
    setFilterCriteria({
      role: '',
      status: '',
      dateFrom: '',
      dateTo: '',
      email: ''
    });
    setSearchTerm('');
    setCurrentPage(1);
    showCustomAlert('All filters cleared.', 'success');
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
      <nav aria-label="Students pagination">
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

  // Loading state
  if (loading && currentPage === 1) {
    return (
      <div className="container-fluid py-4">
        <div className="row justify-content-center">
          <div className="col-12 col-md-10 col-lg-8">
            <div className="card shadow-lg border-0">
              <div className="card-body text-center py-5">
                <div className="spinner-border text-primary mb-3" style={{width: '3rem', height: '3rem', color: '#17a2b8'}}>
                  <span className="visually-hidden">Loading...</span>
                </div>
                <h4 className="text-primary" style={{color: '#17a2b8'}}>Loading Students Data...</h4>
                <p className="text-muted">Fetching registered users information</p>
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
      <div className="container-fluid py-4">
        <div className="row justify-content-center">
          <div className="col-12 col-md-8 col-lg-6">
            <div className="alert alert-danger d-flex align-items-center" role="alert">
              <i className="fas fa-exclamation-triangle fa-2x me-3"></i>
              <div>
                <h4 className="alert-heading">Oops! Something went wrong</h4>
                <p className="mb-0">{error}</p>
                <button className="btn btn-outline-danger mt-2" onClick={fetchStudents}>
                  <i className="fas fa-redo me-2"></i>Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main render
  return (
    <div className="admin-message-students" style={{ background: '#f9fafb', minHeight: '100vh' }}>
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
            <div className="card text-white shadow-lg" style={{backgroundColor: '#17a2b8'}}>
              <div className="card-body py-4">
                <div className="row align-items-center">
                  <div className="col-md-8">
                    <h1 className="display-5 fw-bold mb-2">
                      <i className="fas fa-comments me-3"></i>
                      Message Your Students - Admin Dashboard
                    </h1>
                    <p className="lead mb-0 opacity-75">Send private messages to registered users</p>
                  </div>
                  <div className="col-md-4 text-md-end">
                    <div className="bg-white rounded p-3 d-inline-block" style={{color: '#17a2b8'}}>
                      <h4 className="mb-0 fw-bold">{totalItems}</h4>
                      <small>Total Users</small>
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
                      <span className="input-group-text bg-info text-white">
                        <i className="fas fa-search"></i>
                      </span>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Search students by name, email, or role..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="d-flex gap-2">
                      <button 
                        className="btn btn-outline-info btn-lg w-50"
                        onClick={handleFilterClick}
                      >
                        <i className="fas fa-filter me-2"></i>Filter
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
                    <div className="col-md-3 mb-2">
                      <label className="form-label">Role</label>
                      <select
                        className="form-select"
                        value={filterCriteria.role}
                        onChange={(e) => setFilterCriteria(prev => ({...prev, role: e.target.value}))}
                      >
                        <option value="">All Roles</option>
                        <option value="admin">Admin</option>
                        <option value="student">Student</option>
                        <option value="instructor">Instructor</option>
                      </select>
                    </div>
                    <div className="col-md-3 mb-2">
                      <label className="form-label">Status</label>
                      <select
                        className="form-select"
                        value={filterCriteria.status}
                        onChange={(e) => setFilterCriteria(prev => ({...prev, status: e.target.value}))}
                      >
                        <option value="">All Status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                    <div className="col-md-3 mb-2">
                      <label className="form-label">From Date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={filterCriteria.dateFrom}
                        onChange={(e) => setFilterCriteria(prev => ({...prev, dateFrom: e.target.value}))}
                      />
                    </div>
                    <div className="col-md-3 mb-2">
                      <label className="form-label">To Date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={filterCriteria.dateTo}
                        onChange={(e) => setFilterCriteria(prev => ({...prev, dateTo: e.target.value}))}
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
                        className="btn btn-info"
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
                      Showing {filteredStudents.length} of {students.length} results for "{searchTerm}"
                    </small>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Students Table */}
        {students.length === 0 ? (
          <div className="row justify-content-center">
            <div className="col-12 col-md-8 col-lg-6">
              <div className="card shadow-lg border-0">
                <div className="card-body text-center py-5">
                  <div className="empty-state-icon mb-4">
                    <i className="fas fa-users fa-4x text-muted"></i>
                  </div>
                  <h3 className="text-muted fw-bold mb-3">No Registered Users Yet</h3>
                  <p className="text-muted mb-4">
                    No users have registered in the system yet. User accounts will appear here once they register.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="row">
              <div className="col-12">
                <div className="card shadow-lg border-0">
                  <div className="card-header bg-white py-3">
                    <div className="row align-items-center">
                      <div className="col-md-6">
                        <h4 className="mb-0" style={{color: '#0c5460'}}>
                          <i className="fas fa-list-alt me-2"></i>
                          Registered Users - Click Send Message to Contact
                        </h4>
                      </div>
                      <div className="col-md-6 text-end">
                        <small className="text-muted">
                          Page {currentPage} of {totalPages} • Showing {students.length} users
                        </small>
                      </div>
                    </div>
                  </div>
                  <div className="card-body p-0">
                    <div className="table-responsive">
                      <table className="table table-hover align-middle mb-0">
                        <thead className="table-dark" style={{backgroundColor: '#0c5460'}}>
                          <tr>
                            <th className="ps-4" style={{width: '60px'}}>Avatar</th>
                            <th>User Information</th>
                            <th className="text-center">Role</th>
                            <th className="text-center">Registration Date</th>
                            <th className="text-center">Status</th>
                            <th className="text-center pe-4">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredStudents.map((student) => (
                            <tr key={student._id} className="hover-shadow">
                              <td className="ps-4">
                                <div className="avatar-circle bg-primary text-white d-flex align-items-center justify-content-center">
                                  <i className={`fas ${getRoleIcon(student.role)}`}></i>
                                </div>
                              </td>
                              <td>
                                <div>
                                  <h6 className="mb-1 fw-bold text-dark">{getStudentDisplayName(student)}</h6>
                                  <small className="text-muted">{student.email}</small>
                                  <br/>
                                  <small className="text-muted">Username: {student.username}</small>
                                  <br/>
                                  <small className="text-muted">ID: {student._id}</small>
                                </div>
                              </td>
                              <td className="text-center">
                                <span className={`badge bg-${getRoleBadge(student.role)} fs-6`}>
                                  <i className={`fas ${getRoleIcon(student.role)} me-1`}></i>
                                  {student.role}
                                </span>
                              </td>
                              <td className="text-center">
                                <small>
                                  {new Date(student.createdAt).toLocaleDateString()}<br/>
                                  <span className="text-muted">{new Date(student.createdAt).toLocaleTimeString()}</span>
                                </small>
                              </td>
                              <td className="text-center">
                                <span className={`badge bg-${getStatusColor(student.active)}`}>
                                  {student.active ? 'Active' : 'Inactive'}
                                </span>
                              </td>
                              <td className="text-center pe-4">
                                <button 
                                  className="btn btn-info btn-sm"
                                  onClick={() => handleSendMessageClick(student)}
                                  title="Send Message"
                                >
                                  <i className="fas fa-envelope me-1"></i>Send Message
                                </button>
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

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="row mt-4">
                <div className="col-12">
                  <div className="card">
                    <div className="card-body">
                      {renderPagination()}
                      <div className="text-center mt-2">
                        <small className="text-muted">
                          Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} users
                        </small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Message Modal */}
        {showMessageModal && selectedStudent && (
          <div className="modal fade show" style={{display: 'block', backgroundColor: 'rgba(0,0,0,0.5)'}}>
            <div className="modal-dialog modal-lg modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header text-white" style={{backgroundColor: '#17a2b8'}}>
                  <h5 className="modal-title">
                    <i className="fas fa-envelope me-2"></i>
                    Send Message to {getStudentDisplayName(selectedStudent)}
                  </h5>
                  <button type="button" className="btn-close btn-close-white" onClick={() => setShowMessageModal(false)}></button>
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label fw-bold">To:</label>
                    <div className="d-flex align-items-center p-2 bg-light rounded">
                      <div className="avatar-circle bg-primary text-white d-flex align-items-center justify-content-center me-3">
                        <i className={`fas ${getRoleIcon(selectedStudent.role)}`}></i>
                      </div>
                      <div>
                        <h6 className="mb-0">{getStudentDisplayName(selectedStudent)}</h6>
                        <small className="text-muted">{selectedStudent.email}</small>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label fw-bold">Subject:</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Enter message subject..."
                      value={messageSubject}
                      onChange={(e) => setMessageSubject(e.target.value)}
                    />
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label fw-bold">Message:</label>
                    <textarea
                      className="form-control"
                      rows="8"
                      placeholder="Type your message here..."
                      value={messageContent}
                      onChange={(e) => setMessageContent(e.target.value)}
                    />
                  </div>
                  
                  <div className="alert alert-info">
                    <i className="fas fa-info-circle me-2"></i>
                    This message will be sent privately to the user's email and will also appear in their "Message from Admin" tab with a notification badge.
                  </div>
                </div>
                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => setShowMessageModal(false)}
                    disabled={sendingMessage}
                  >
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-info" 
                    onClick={handleSendMessage}
                    disabled={sendingMessage || !messageSubject.trim() || !messageContent.trim()}
                  >
                    {sendingMessage ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Sending...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-paper-plane me-2"></i>
                        Send Message
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .hover-shadow:hover {
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          transform: translateY(-1px);
          transition: all 0.2s ease;
        }
        
        .avatar-circle {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          font-size: 16px;
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

        .custom-alert-info {
          background: #d1ecf1;
          color: #0c5460;
          border: 1px solid #bee5eb;
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

export default AdminMessageStudents;