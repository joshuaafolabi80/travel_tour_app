// src/components/AdminStudents.jsx
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import * as XLSX from 'xlsx';

const AdminStudents = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showModal, setShowModal] = useState(false);
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

  useEffect(() => {
    fetchStudents();
  }, [currentPage, itemsPerPage]);

  useEffect(() => {
    // Check if we have navigation data from Quiz Completed page
    const navigationData = sessionStorage.getItem('adminNavigation');
    if (navigationData) {
      const { target, studentData } = JSON.parse(navigationData);
      if (target === 'profile' && studentData) {
        // Find the student in our list
        const student = students.find(s => 
          s._id === studentData.studentId || 
          s.name === studentData.studentName ||
          s.email === studentData.studentEmail
        );
        if (student) {
          setSelectedStudent(student);
          setShowModal(true);
        }
        // Clear the navigation data
        sessionStorage.removeItem('adminNavigation');
      }
    }
  }, [students]);

  useEffect(() => {
    filterStudents();
  }, [students, searchTerm, filterCriteria]);

  const showCustomAlert = (message, type = 'success') => {
    setAlertMessage(message);
    setAlertType(type);
    setShowAlert(true);
    
    setTimeout(() => {
      setShowAlert(false);
    }, 3000);
  };

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
      
      console.log('Admin students response:', response.data);
      
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
      filtered = filtered.filter(student =>
        student.name?.toLowerCase().includes(term) ||
        student.email?.toLowerCase().includes(term) ||
        student.role?.toLowerCase().includes(term) ||
        student.status?.toLowerCase().includes(term) ||
        new Date(student.createdAt).toLocaleDateString().toLowerCase().includes(term)
      );
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

  const handleFilterClick = () => {
    setShowFilterOptions(!showFilterOptions);
  };

  const handleExportClick = () => {
    exportToExcel();
  };

  const exportToExcel = () => {
    try {
      const dataToExport = students.length > 0 ? students : [];
      
      if (dataToExport.length === 0) {
        showCustomAlert('No students data to export.', 'warning');
        return;
      }

      const dataForExport = dataToExport.map(student => ({
        'Student Name': student.name,
        'Email': student.email,
        'Role': student.role,
        'Status': student.active ? 'Active' : 'Inactive',
        'Registration Date': new Date(student.createdAt).toLocaleDateString(),
        'Last Login': student.lastLogin ? new Date(student.lastLogin).toLocaleDateString() : 'Never',
        'Courses Completed': student.coursesCompleted || 0,
        'Quizzes Taken': student.quizzesTaken || 0,
        'User ID': student._id
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataForExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Registered Students');
      
      const timestamp = new Date().toISOString().split('T')[0];
      XLSX.writeFile(workbook, `registered_students_${timestamp}.xlsx`);
      
      showCustomAlert('Students data exported successfully!', 'success');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      showCustomAlert('Failed to export students data. Please try again.', 'error');
    }
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

  const handleViewProfile = (student) => {
    setSelectedStudent(student);
    setShowModal(true);
  };

  const handleCloseProfile = () => {
    setSelectedStudent(null);
    setShowModal(false);
  };

  const handleSendMessage = (student) => {
    // Navigate to Message Students page with this student pre-selected
    sessionStorage.setItem('adminNavigation', JSON.stringify({
      target: 'message',
      studentData: {
        studentId: student._id,
        studentName: student.name,
        studentEmail: student.email
      }
    }));
    
    // Navigate using hash
    window.location.hash = '#admin-message-students';
    showCustomAlert(`Redirecting to message page for ${student.name}...`, 'info');
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

  if (loading && currentPage === 1) {
    return (
      <div className="container-fluid py-4">
        <div className="row justify-content-center">
          <div className="col-12 col-md-10 col-lg-8">
            <div className="card shadow-lg border-0">
              <div className="card-body text-center py-5">
                <div className="spinner-border text-primary mb-3" style={{width: '3rem', height: '3rem', color: '#28a745'}}>
                  <span className="visually-hidden">Loading...</span>
                </div>
                <h4 className="text-primary" style={{color: '#28a745'}}>Loading Students Data...</h4>
                <p className="text-muted">Fetching registered users information</p>
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

  return (
    <div className="admin-students" style={{ background: '#f9fafb', minHeight: '100vh' }}>
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
            <div className="card text-white shadow-lg" style={{backgroundColor: '#28a745'}}>
              <div className="card-body py-4">
                <div className="row align-items-center">
                  <div className="col-md-8">
                    <h1 className="display-5 fw-bold mb-2">
                      <i className="fas fa-user-graduate me-3"></i>
                      Registered Students - Admin Dashboard
                    </h1>
                    <p className="lead mb-0 opacity-75">Manage and view all registered users in the system</p>
                  </div>
                  <div className="col-md-4 text-md-end">
                    <div className="bg-white rounded p-3 d-inline-block" style={{color: '#28a745'}}>
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
                      <span className="input-group-text bg-success text-white">
                        <i className="fas fa-search"></i>
                      </span>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Search by name, email, role, or status..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="d-flex gap-2">
                      <button 
                        className="btn btn-outline-success btn-lg w-50"
                        onClick={handleFilterClick}
                      >
                        <i className="fas fa-filter me-2"></i>Filter
                      </button>
                      <button 
                        className="btn btn-success btn-lg w-50" 
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
                        className="btn btn-success"
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

        {/* Statistics Cards */}
        <div className="row mb-4">
          <div className="col-md-3 mb-3">
            <div className="card text-white h-100 shadow" style={{backgroundColor: '#28a745'}}>
              <div className="card-body text-center">
                <i className="fas fa-users fa-2x mb-2"></i>
                <h3 className="fw-bold">{students.length}</h3>
                <p className="mb-0">Total Users</p>
              </div>
            </div>
          </div>
          <div className="col-md-3 mb-3">
            <div className="card text-white h-100 shadow" style={{backgroundColor: '#17a2b8'}}>
              <div className="card-body text-center">
                <i className="fas fa-user-graduate fa-2x mb-2"></i>
                <h3 className="fw-bold">
                  {students.filter(s => s.role === 'student').length}
                </h3>
                <p className="mb-0">Students</p>
              </div>
            </div>
          </div>
          <div className="col-md-3 mb-3">
            <div className="card text-white h-100 shadow" style={{backgroundColor: '#ffc107', color: '#000'}}>
              <div className="card-body text-center">
                <i className="fas fa-user-shield fa-2x mb-2"></i>
                <h3 className="fw-bold">
                  {students.filter(s => s.role === 'admin').length}
                </h3>
                <p className="mb-0">Admins</p>
              </div>
            </div>
          </div>
          <div className="col-md-3 mb-3">
            <div className="card text-white h-100 shadow" style={{backgroundColor: '#6f42c1'}}>
              <div className="card-body text-center">
                <i className="fas fa-user-check fa-2x mb-2"></i>
                <h3 className="fw-bold">
                  {students.filter(s => s.active).length}
                </h3>
                <p className="mb-0">Active Users</p>
              </div>
            </div>
          </div>
        </div>

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
            {/* Students Table */}
            <div className="row">
              <div className="col-12">
                <div className="card shadow-lg border-0">
                  <div className="card-header bg-white py-3">
                    <div className="row align-items-center">
                      <div className="col-md-6">
                        <h4 className="mb-0" style={{color: '#1a237e'}}>
                          <i className="fas fa-list-alt me-2"></i>
                          Registered Users
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
                        <thead className="table-dark" style={{backgroundColor: '#1a237e'}}>
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
                          {filteredStudents.map((student, index) => (
                            <tr key={student._id} className="hover-shadow">
                              <td className="ps-4">
                                <div className="avatar-circle bg-primary text-white d-flex align-items-center justify-content-center">
                                  <i className={`fas ${getRoleIcon(student.role)}`}></i>
                                </div>
                              </td>
                              <td>
                                <div>
                                  <h6 className="mb-1 fw-bold text-dark">{student.name}</h6>
                                  <small className="text-muted">{student.email}</small>
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
                                <div className="btn-group" role="group">
                                  <button 
                                    className="btn btn-outline-primary btn-sm"
                                    onClick={() => handleViewProfile(student)}
                                    title="View Profile"
                                  >
                                    <i className="fas fa-eye"></i>
                                  </button>
                                  <button 
                                    className="btn btn-outline-success btn-sm"
                                    onClick={() => handleSendMessage(student)}
                                    title="Send Message"
                                  >
                                    <i className="fas fa-envelope"></i>
                                  </button>
                                  <button 
                                    className="btn btn-outline-info btn-sm"
                                    onClick={() => {
                                      // View student progress/analytics
                                      showCustomAlert(`Viewing analytics for ${student.name}`, 'info');
                                    }}
                                    title="View Analytics"
                                  >
                                    <i className="fas fa-chart-bar"></i>
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

        {/* Student Profile Modal */}
        {showModal && selectedStudent && (
          <div className="modal fade show" style={{display: 'block', backgroundColor: 'rgba(0,0,0,0.5)'}}>
            <div className="modal-dialog modal-lg modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header text-white" style={{backgroundColor: '#28a745'}}>
                  <h5 className="modal-title">
                    <i className="fas fa-user-circle me-2"></i>
                    User Profile - {selectedStudent.name}
                  </h5>
                  <button type="button" className="btn-close btn-close-white" onClick={handleCloseProfile}></button>
                </div>
                <div className="modal-body">
                  <div className="row">
                    <div className="col-md-4 text-center">
                      <div className="avatar-large bg-primary text-white d-flex align-items-center justify-content-center mx-auto mb-3">
                        <i className={`fas ${getRoleIcon(selectedStudent.role)} fa-3x`}></i>
                      </div>
                      <h5>{selectedStudent.name}</h5>
                      <span className={`badge bg-${getRoleBadge(selectedStudent.role)} fs-6`}>
                        {selectedStudent.role}
                      </span>
                    </div>
                    <div className="col-md-8">
                      <div className="row">
                        <div className="col-md-6">
                          <div className="mb-3">
                            <label className="form-label fw-bold">Email Address</label>
                            <p className="mb-0">{selectedStudent.email}</p>
                          </div>
                          <div className="mb-3">
                            <label className="form-label fw-bold">Registration Date</label>
                            <p className="mb-0">{new Date(selectedStudent.createdAt).toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="mb-3">
                            <label className="form-label fw-bold">Status</label>
                            <p className="mb-0">
                              <span className={`badge bg-${getStatusColor(selectedStudent.active)}`}>
                                {selectedStudent.active ? 'Active' : 'Inactive'}
                              </span>
                            </p>
                          </div>
                          <div className="mb-3">
                            <label className="form-label fw-bold">User ID</label>
                            <p className="mb-0 text-muted small">{selectedStudent._id}</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Additional user statistics can be added here */}
                      <div className="row mt-3">
                        <div className="col-12">
                          <h6 className="border-bottom pb-2">Quick Actions</h6>
                          <div className="d-flex gap-2">
                            <button 
                              className="btn btn-outline-success btn-sm"
                              onClick={() => handleSendMessage(selectedStudent)}
                            >
                              <i className="fas fa-envelope me-1"></i>Send Message
                            </button>
                            <button 
                              className="btn btn-outline-primary btn-sm"
                              onClick={() => {
                                // View user activity
                                showCustomAlert(`Viewing activity for ${selectedStudent.name}`, 'info');
                              }}
                            >
                              <i className="fas fa-chart-line me-1"></i>View Activity
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={handleCloseProfile}>
                    Close
                  </button>
                  <button type="button" className="btn btn-success">
                    <i className="fas fa-edit me-2"></i>Edit Profile
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
        
        .avatar-large {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          font-size: 24px;
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

export default AdminStudents;