// src/components/AdminManageCourses.jsx
import React, { useState, useEffect } from 'react';
import api from '../services/api';

const AdminManageCourses = () => {
  // State declarations
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('upload-general');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showAccessCodeModal, setShowAccessCodeModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [courseTypeFilter, setCourseTypeFilter] = useState('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [totalItems, setTotalItems] = useState(0);
  
  // Upload form state
  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    courseType: 'general',
    accessCode: ''
  });
  const [selectedFile, setSelectedFile] = useState(null);
  
  // Edit form state
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    isActive: true
  });
  
  // Custom alert states
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState('success');
  
  // Access code state
  const [generatedAccessCode, setGeneratedAccessCode] = useState('');
  const [accessCodes, setAccessCodes] = useState([]);

  // Effects
  useEffect(() => {
    if (activeTab === 'view-courses') {
      fetchCourses();
    }
  }, [currentPage, itemsPerPage, activeTab]);

  useEffect(() => {
    filterCourses();
  }, [courses, searchTerm, courseTypeFilter]);

  // Helper functions
  const showCustomAlert = (message, type = 'success') => {
    setAlertMessage(message);
    setAlertType(type);
    setShowAlert(true);
    setTimeout(() => {
      setShowAlert(false);
    }, 3000);
  };

  const filterCourses = () => {
    let filtered = courses;
    
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(course =>
        course.title?.toLowerCase().includes(term) ||
        course.description?.toLowerCase().includes(term) ||
        course.fileName?.toLowerCase().includes(term)
      );
    }
    
    if (courseTypeFilter) {
      filtered = filtered.filter(course => course.courseType === courseTypeFilter);
    }
    
    setFilteredCourses(filtered);
  };

  // API functions
  const fetchCourses = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/admin/courses', {
        params: {
          page: currentPage,
          limit: itemsPerPage,
          courseType: courseTypeFilter || '',
          search: searchTerm
        }
      });
      
      if (response.data.success) {
        setCourses(response.data.courses);
        setTotalItems(response.data.totalCount);
      } else {
        setError('Failed to load courses data');
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
      setError('Failed to load courses. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const allowedTypes = ['.doc', '.docx', '.txt'];
      const fileExt = '.' + file.name.split('.').pop().toLowerCase();
      
      if (!allowedTypes.includes(fileExt)) {
        showCustomAlert('Please select a .doc, .docx, or .txt file', 'error');
        e.target.value = '';
        return;
      }
      
      if (file.size > 10 * 1024 * 1024) {
        showCustomAlert('File size must be less than 10MB', 'error');
        e.target.value = '';
        return;
      }
      
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!uploadForm.title.trim() || !uploadForm.description.trim() || !selectedFile) {
      showCustomAlert('Please fill all fields and select a file', 'error');
      return;
    }

    if (uploadForm.courseType === 'masterclass' && !uploadForm.accessCode.trim()) {
      showCustomAlert('Please provide an access code for masterclass courses', 'error');
      return;
    }

    setUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('title', uploadForm.title);
      formData.append('description', uploadForm.description);
      formData.append('courseType', uploadForm.courseType);
      formData.append('accessCode', uploadForm.accessCode);
      formData.append('courseFile', selectedFile);

      const response = await api.post('/admin/upload-course', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        showCustomAlert(`Course uploaded successfully!`, 'success');
        setShowUploadModal(false);
        resetUploadForm();
        // Refresh courses if on view tab
        if (activeTab === 'view-courses') {
          fetchCourses();
        }
      } else {
        showCustomAlert('Failed to upload course. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Error uploading course:', error);
      showCustomAlert('Failed to upload course. Please try again.', 'error');
    }
    
    setUploading(false);
  };

  const handleEdit = async () => {
    if (!editForm.title.trim() || !editForm.description.trim()) {
      showCustomAlert('Please fill all required fields', 'error');
      return;
    }

    try {
      const response = await api.put(`/admin/courses/${selectedCourse._id}`, editForm);
      
      if (response.data.success) {
        showCustomAlert('Course updated successfully!', 'success');
        setShowEditModal(false);
        fetchCourses();
      } else {
        showCustomAlert('Failed to update course. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Error updating course:', error);
      showCustomAlert('Failed to update course. Please try again.', 'error');
    }
  };

  const handleDelete = async () => {
    try {
      const response = await api.delete(`/admin/courses/${selectedCourse._id}`);
      
      if (response.data.success) {
        showCustomAlert('Course deleted successfully!', 'success');
        setShowDeleteModal(false);
        fetchCourses();
      } else {
        showCustomAlert('Failed to delete course. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Error deleting course:', error);
      showCustomAlert('Failed to delete course. Please try again.', 'error');
    }
  };

  const generateAccessCode = async () => {
    try {
      const response = await api.post(`/admin/courses/${selectedCourse._id}/generate-access-code`);
      
      if (response.data.success) {
        setGeneratedAccessCode(response.data.accessCode);
        showCustomAlert('Access code generated successfully!', 'success');
        fetchAccessCodes();
      } else {
        showCustomAlert('Failed to generate access code. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Error generating access code:', error);
      showCustomAlert('Failed to generate access code. Please try again.', 'error');
    }
  };

  const fetchAccessCodes = async () => {
    if (!selectedCourse) return;
    
    try {
      const response = await api.get(`/admin/courses/${selectedCourse._id}/access-codes`);
      
      if (response.data.success) {
        setAccessCodes(response.data.accessCodes);
      }
    } catch (error) {
      console.error('Error fetching access codes:', error);
    }
  };

  const resetUploadForm = () => {
    setUploadForm({
      title: '',
      description: '',
      courseType: 'general',
      accessCode: ''
    });
    setSelectedFile(null);
  };

  const openEditModal = (course) => {
    setSelectedCourse(course);
    setEditForm({
      title: course.title,
      description: course.description,
      isActive: course.isActive
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (course) => {
    setSelectedCourse(course);
    setShowDeleteModal(true);
  };

  const openAccessCodeModal = async (course) => {
    setSelectedCourse(course);
    setGeneratedAccessCode('');
    setShowAccessCodeModal(true);
    await fetchAccessCodes();
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
      <nav aria-label="Courses pagination">
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
  if (loading && activeTab === 'view-courses') {
    return (
      <div className="container-fluid py-4">
        <div className="row justify-content-center">
          <div className="col-12 col-md-10 col-lg-8">
            <div className="card shadow-lg border-0">
              <div className="card-body text-center py-5">
                <div className="spinner-border text-primary mb-3" style={{width: '3rem', height: '3rem', color: '#17a2b8'}}>
                  <span className="visually-hidden">Loading...</span>
                </div>
                <h4 className="text-primary" style={{color: '#17a2b8'}}>Loading Courses Data...</h4>
                <p className="text-muted">Fetching courses information</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && activeTab === 'view-courses') {
    return (
      <div className="container-fluid py-4">
        <div className="row justify-content-center">
          <div className="col-12 col-md-8 col-lg-6">
            <div className="alert alert-danger d-flex align-items-center" role="alert">
              <i className="fas fa-exclamation-triangle fa-2x me-3"></i>
              <div>
                <h4 className="alert-heading">Oops! Something went wrong</h4>
                <p className="mb-0">{error}</p>
                <button className="btn btn-outline-danger mt-2" onClick={fetchCourses}>
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
    <div className="admin-manage-courses" style={{ background: '#f9fafb', minHeight: '100vh' }}>
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
                      <i className="fas fa-book me-3"></i>
                      Manage Courses - Admin Dashboard
                    </h1>
                    <p className="lead mb-0 opacity-75">Upload and manage general and masterclass courses</p>
                  </div>
                  <div className="col-md-4 text-md-end">
                    <div className="bg-white rounded p-3 d-inline-block" style={{color: '#17a2b8'}}>
                      <h4 className="mb-0 fw-bold">{totalItems}</h4>
                      <small>Total Courses</small>
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
                <ul className="nav nav-tabs nav-justified" id="coursesTab" role="tablist">
                  <li className="nav-item" role="presentation">
                    <button
                      className={`nav-link ${activeTab === 'upload-general' ? 'active' : ''}`}
                      onClick={() => setActiveTab('upload-general')}
                    >
                      <i className="fas fa-upload me-2"></i>Upload General Courses
                    </button>
                  </li>
                  <li className="nav-item" role="presentation">
                    <button
                      className={`nav-link ${activeTab === 'upload-masterclass' ? 'active' : ''}`}
                      onClick={() => setActiveTab('upload-masterclass')}
                    >
                      <i className="fas fa-crown me-2"></i>Upload Masterclass Courses
                    </button>
                  </li>
                  <li className="nav-item" role="presentation">
                    <button
                      className={`nav-link ${activeTab === 'view-courses' ? 'active' : ''}`}
                      onClick={() => setActiveTab('view-courses')}
                    >
                      <i className="fas fa-list me-2"></i>View/Edit/Delete Courses
                    </button>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="row">
          <div className="col-12">
            <div className="card shadow-lg border-0">
              <div className="card-body">
                {/* Upload General Courses Tab */}
                {activeTab === 'upload-general' && (
                  <div className="upload-section">
                    <h4 className="mb-4" style={{color: '#0c5460'}}>
                      <i className="fas fa-book me-2"></i>
                      Upload General Course
                    </h4>
                    <div className="row">
                      <div className="col-md-8">
                        <div className="mb-3">
                          <label className="form-label fw-bold">Course Title</label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Enter course title..."
                            value={uploadForm.title}
                            onChange={(e) => setUploadForm({...uploadForm, title: e.target.value})}
                          />
                        </div>
                        <div className="mb-3">
                          <label className="form-label fw-bold">Description</label>
                          <textarea
                            className="form-control"
                            rows="4"
                            placeholder="Enter course description..."
                            value={uploadForm.description}
                            onChange={(e) => setUploadForm({...uploadForm, description: e.target.value})}
                          />
                        </div>
                        <div className="mb-3">
                          <label className="form-label fw-bold">Course File</label>
                          <input
                            type="file"
                            className="form-control"
                            accept=".doc,.docx,.txt"
                            onChange={handleFileSelect}
                          />
                          <small className="text-muted">Supported formats: .doc, .docx, .txt (Max 10MB)</small>
                        </div>
                        <button
                          className="btn btn-info btn-lg"
                          onClick={() => {
                            setUploadForm({...uploadForm, courseType: 'general'});
                            setShowUploadModal(true);
                          }}
                          disabled={!uploadForm.title || !uploadForm.description || !selectedFile}
                        >
                          <i className="fas fa-upload me-2"></i>Upload General Course
                        </button>
                      </div>
                      <div className="col-md-4">
                        <div className="alert alert-info">
                          <h6><i className="fas fa-info-circle me-2"></i>General Courses Information</h6>
                          <ul className="mb-0">
                            <li>General courses are accessible to all users</li>
                            <li>No access codes required</li>
                            <li>Users will see notification badges</li>
                            <li>Upload .doc, .docx, or .txt files</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Upload Masterclass Courses Tab */}
                {activeTab === 'upload-masterclass' && (
                  <div className="upload-section">
                    <h4 className="mb-4" style={{color: '#0c5460'}}>
                      <i className="fas fa-crown me-2"></i>
                      Upload Masterclass Course
                    </h4>
                    <div className="row">
                      <div className="col-md-8">
                        <div className="mb-3">
                          <label className="form-label fw-bold">Course Title</label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Enter course title..."
                            value={uploadForm.title}
                            onChange={(e) => setUploadForm({...uploadForm, title: e.target.value})}
                          />
                        </div>
                        <div className="mb-3">
                          <label className="form-label fw-bold">Description</label>
                          <textarea
                            className="form-control"
                            rows="4"
                            placeholder="Enter course description..."
                            value={uploadForm.description}
                            onChange={(e) => setUploadForm({...uploadForm, description: e.target.value})}
                          />
                        </div>
                        <div className="mb-3">
                          <label className="form-label fw-bold">Access Code</label>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Enter access code (will be provided to specific users)..."
                            value={uploadForm.accessCode}
                            onChange={(e) => setUploadForm({...uploadForm, accessCode: e.target.value})}
                          />
                          <small className="text-muted">This code will be required for users to access the course</small>
                        </div>
                        <div className="mb-3">
                          <label className="form-label fw-bold">Course File</label>
                          <input
                            type="file"
                            className="form-control"
                            accept=".doc,.docx,.txt"
                            onChange={handleFileSelect}
                          />
                          <small className="text-muted">Supported formats: .doc, .docx, .txt (Max 10MB)</small>
                        </div>
                        <button
                          className="btn btn-warning btn-lg"
                          onClick={() => {
                            setUploadForm({...uploadForm, courseType: 'masterclass'});
                            setShowUploadModal(true);
                          }}
                          disabled={!uploadForm.title || !uploadForm.description || !uploadForm.accessCode || !selectedFile}
                        >
                          <i className="fas fa-crown me-2"></i>Upload Masterclass Course
                        </button>
                      </div>
                      <div className="col-md-4">
                        <div className="alert alert-warning">
                          <h6><i className="fas fa-exclamation-triangle me-2"></i>Masterclass Courses Information</h6>
                          <ul className="mb-0">
                            <li>Require access codes for user access</li>
                            <li>Each code can be used by one user only</li>
                            <li>Generate additional codes as needed</li>
                            <li>Premium content for authorized users</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* View/Edit/Delete Courses Tab */}
                {activeTab === 'view-courses' && (
                  <div className="view-courses-section">
                    {/* Search and Filter Controls */}
                    <div className="row mb-4">
                      <div className="col-md-6">
                        <div className="input-group">
                          <span className="input-group-text">
                            <i className="fas fa-search"></i>
                          </span>
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Search courses by title, description, or filename..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="col-md-3">
                        <select
                          className="form-select"
                          value={courseTypeFilter}
                          onChange={(e) => setCourseTypeFilter(e.target.value)}
                        >
                          <option value="">All Course Types</option>
                          <option value="general">General Courses</option>
                          <option value="masterclass">Masterclass Courses</option>
                        </select>
                      </div>
                      <div className="col-md-3">
                        <select
                          className="form-select"
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

                    {/* Courses Table */}
                    <div className="table-responsive">
                      <table className="table table-hover">
                        <thead className="table-light">
                          <tr>
                            <th>Title</th>
                            <th>Type</th>
                            <th>File Name</th>
                            <th>Uploaded</th>
                            <th>Status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredCourses.length === 0 ? (
                            <tr>
                              <td colSpan="6" className="text-center py-4">
                                <i className="fas fa-inbox fa-3x text-muted mb-3"></i>
                                <h5 className="text-muted">No courses found</h5>
                                <p className="text-muted">Try adjusting your search or filters</p>
                              </td>
                            </tr>
                          ) : (
                            filteredCourses.map((course) => (
                              <tr key={course._id}>
                                <td>
                                  <strong>{course.title}</strong>
                                  <br />
                                  <small className="text-muted">{course.description.substring(0, 50)}...</small>
                                </td>
                                <td>
                                  <span className={`badge ${
                                    course.courseType === 'general' ? 'bg-info' : 'bg-warning'
                                  }`}>
                                    {course.courseType}
                                  </span>
                                </td>
                                <td>
                                  <small>
                                    <i className="fas fa-file me-1"></i>
                                    {course.fileName}
                                  </small>
                                  <br />
                                  <small className="text-muted">({(course.fileSize / 1024).toFixed(1)} KB)</small>
                                </td>
                                <td>
                                  <small>
                                    {new Date(course.uploadedAt).toLocaleDateString()}
                                  </small>
                                </td>
                                <td>
                                  <span className={`badge ${course.isActive ? 'bg-success' : 'bg-secondary'}`}>
                                    {course.isActive ? 'Active' : 'Inactive'}
                                  </span>
                                </td>
                                <td>
                                  <div className="btn-group btn-group-sm">
                                    <button
                                      className="btn btn-outline-primary"
                                      onClick={() => openEditModal(course)}
                                      title="Edit Course"
                                    >
                                      <i className="fas fa-edit"></i>
                                    </button>
                                    {course.courseType === 'masterclass' && (
                                      <button
                                        className="btn btn-outline-warning"
                                        onClick={() => openAccessCodeModal(course)}
                                        title="Manage Access Codes"
                                      >
                                        <i className="fas fa-key"></i>
                                      </button>
                                    )}
                                    <button
                                      className="btn btn-outline-danger"
                                      onClick={() => openDeleteModal(course)}
                                      title="Delete Course"
                                    >
                                      <i className="fas fa-trash"></i>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="row mt-4">
                        <div className="col-12">
                          {renderPagination()}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Confirmation Modal */}
      {showUploadModal && (
        <div className="modal fade show" style={{display: 'block', backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header" style={{backgroundColor: uploadForm.courseType === 'general' ? '#17a2b8' : '#ffc107', color: 'white'}}>
                <h5 className="modal-title">
                  <i className={`fas ${uploadForm.courseType === 'general' ? 'fa-book' : 'fa-crown'} me-2`}></i>
                  Confirm {uploadForm.courseType === 'general' ? 'General' : 'Masterclass'} Course Upload
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowUploadModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="alert alert-info">
                  <h6>Course Details:</h6>
                  <p><strong>Title:</strong> {uploadForm.title}</p>
                  <p><strong>Type:</strong> {uploadForm.courseType}</p>
                  <p><strong>File:</strong> {selectedFile?.name}</p>
                  {uploadForm.courseType === 'masterclass' && (
                    <p><strong>Access Code:</strong> {uploadForm.accessCode}</p>
                  )}
                </div>
                <p className="text-muted">
                  This course will be immediately available to users. 
                  {uploadForm.courseType === 'masterclass' && ' Users will need the access code to view the content.'}
                </p>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowUploadModal(false)}
                  disabled={uploading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={`btn ${uploadForm.courseType === 'general' ? 'btn-info' : 'btn-warning'}`}
                  onClick={handleUpload}
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-upload me-2"></i>
                      Confirm Upload
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Course Modal */}
      {showEditModal && selectedCourse && (
        <div className="modal fade show" style={{display: 'block', backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">
                  <i className="fas fa-edit me-2"></i>
                  Edit Course
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowEditModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label fw-bold">Course Title</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editForm.title}
                    onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-bold">Description</label>
                  <textarea
                    className="form-control"
                    rows="4"
                    value={editForm.description}
                    onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                  />
                </div>
                <div className="mb-3">
                  <div className="form-check form-switch">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      checked={editForm.isActive}
                      onChange={(e) => setEditForm({...editForm, isActive: e.target.checked})}
                    />
                    <label className="form-check-label fw-bold">Active Course</label>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleEdit}
                >
                  <i className="fas fa-save me-2"></i>
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedCourse && (
        <div className="modal fade show" style={{display: 'block', backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-danger text-white">
                <h5 className="modal-title">
                  <i className="fas fa-exclamation-triangle me-2"></i>
                  Confirm Deletion
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowDeleteModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="alert alert-danger">
                  <h6>Warning: This action cannot be undone!</h6>
                  <p className="mb-0">
                    You are about to delete the course: <strong>"{selectedCourse.title}"</strong>
                  </p>
                </div>
                <p className="text-muted">
                  This will remove the course from the system and users will no longer have access to it.
                  The notification count for users will be updated accordingly.
                </p>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowDeleteModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleDelete}
                >
                  <i className="fas fa-trash me-2"></i>
                  Delete Course
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Access Code Management Modal */}
      {showAccessCodeModal && selectedCourse && (
        <div className="modal fade show" style={{display: 'block', backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-warning text-dark">
                <h5 className="modal-title">
                  <i className="fas fa-key me-2"></i>
                  Access Code Management - {selectedCourse.title}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowAccessCodeModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                {/* Generate New Access Code */}
                <div className="mb-4 p-3 border rounded">
                  <h6>Generate New Access Code</h6>
                  <div className="row align-items-center">
                    <div className="col-md-8">
                      <p className="mb-2 text-muted">
                        Generate a unique access code for this masterclass course. Each code can be used by one user only.
                      </p>
                    </div>
                    <div className="col-md-4 text-end">
                      <button
                        className="btn btn-warning"
                        onClick={generateAccessCode}
                      >
                        <i className="fas fa-plus me-2"></i>Generate Code
                      </button>
                    </div>
                  </div>
                  
                  {generatedAccessCode && (
                    <div className="alert alert-success mt-3">
                      <h6>New Access Code Generated!</h6>
                      <code className="fs-5">{generatedAccessCode}</code>
                      <p className="mb-0 mt-2 text-muted">
                        Share this code with the authorized user. It expires in 1 year.
                      </p>
                    </div>
                  )}
                </div>

                {/* Existing Access Codes */}
                <div>
                  <h6>Existing Access Codes</h6>
                  {accessCodes.length === 0 ? (
                    <div className="text-center py-3 text-muted">
                      <i className="fas fa-key fa-2x mb-2"></i>
                      <p>No access codes generated yet</p>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-sm">
                        <thead>
                          <tr>
                            <th>Access Code</th>
                            <th>Status</th>
                            <th>Used By</th>
                            <th>Generated</th>
                            <th>Expires</th>
                          </tr>
                        </thead>
                        <tbody>
                          {accessCodes.map((code) => (
                            <tr key={code._id}>
                              <td><code>{code.code}</code></td>
                              <td>
                                <span className={`badge ${code.isUsed ? 'bg-success' : 'bg-secondary'}`}>
                                  {code.isUsed ? 'Used' : 'Available'}
                                </span>
                              </td>
                              <td>
                                {code.usedBy ? (
                                  <span>{code.usedBy.username}</span>
                                ) : (
                                  <span className="text-muted">Not used</span>
                                )}
                              </td>
                              <td>{new Date(code.createdAt).toLocaleDateString()}</td>
                              <td>{new Date(code.expiresAt).toLocaleDateString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAccessCodeModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom CSS */}
      <style jsx>{`
        .custom-alert {
          position: fixed;
          top: 100px;
          right: 20px;
          z-index: 9999;
          min-width: 300px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          animation: slideInRight 0.3s ease-out;
        }
        
        .custom-alert-success {
          background: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }
        
        .custom-alert-error {
          background: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        }
        
        .alert-content {
          padding: 12px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        
        .alert-close {
          background: none;
          border: none;
          color: inherit;
          cursor: pointer;
          padding: 4px;
          margin-left: 12px;
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
        
        .nav-tabs .nav-link {
          color: #6c757d;
          font-weight: 500;
          border: none;
          padding: 1rem 1.5rem;
        }
        
        .nav-tabs .nav-link.active {
          color: #17a2b8;
          border-bottom: 3px solid #17a2b8;
          background: transparent;
        }
        
        .table-hover tbody tr:hover {
          background-color: rgba(23, 162, 184, 0.05);
        }
        
        .btn-group-sm > .btn {
          padding: 0.25rem 0.5rem;
        }
      `}</style>
    </div>
  );
};

export default AdminManageCourses;