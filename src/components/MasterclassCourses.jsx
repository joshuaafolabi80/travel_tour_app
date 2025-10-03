// src/components/MasterclassCourses.jsx - COMPLETE UPDATED VERSION
import React, { useState, useEffect } from 'react';
import api from '../services/api';

const MasterclassCourses = ({ navigateTo }) => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [validating, setValidating] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [documentLoading, setDocumentLoading] = useState(false);
  const [documentContent, setDocumentContent] = useState(null);
  const [contentType, setContentType] = useState('text');
  const [hasAccess, setHasAccess] = useState(false);
  const [accessChecked, setAccessChecked] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    checkAccessAndFetchCourses();
  }, [currentPage]);

  const checkAccessAndFetchCourses = async () => {
    try {
      setLoading(true);
      
      // First, try to fetch masterclass courses to see if user has access
      const response = await api.get('/courses', {
        params: {
          type: 'masterclass',
          page: currentPage,
          limit: itemsPerPage
        }
      });
      
      if (response.data.success) {
        // 🚨 FIXED: Check if user actually has access by looking at the courses array
        // If courses array is empty AND there's a message about no access, user doesn't have access
        if (response.data.courses.length === 0 && 
            response.data.message && 
            response.data.message.includes('No access to masterclass courses')) {
          setHasAccess(false);
          setCourses([]);
          setTotalItems(0);
        } else {
          // User has access and there are courses (or no courses but user has access)
          setCourses(response.data.courses);
          setTotalItems(response.data.totalCount);
          setHasAccess(true);
          
          // Check localStorage for persistent access
          const storedAccess = localStorage.getItem('masterclassAccess');
          if (!storedAccess) {
            localStorage.setItem('masterclassAccess', 'granted');
          }
        }
      } else {
        setHasAccess(false);
      }
    } catch (error) {
      console.error('Error checking access:', error);
      // 🚨 FIXED: More specific error handling
      if (error.response?.status === 403 || 
          error.response?.data?.message?.includes('No access') ||
          (error.response?.data?.courses && error.response.data.courses.length === 0)) {
        setHasAccess(false);
        setCourses([]);
        setTotalItems(0);
      } else {
        setError('Failed to load courses. Please try again later.');
        // On general errors, still check localStorage for previous access
        const storedAccess = localStorage.getItem('masterclassAccess');
        if (storedAccess === 'granted') {
          setHasAccess(true);
        }
      }
    } finally {
      setLoading(false);
      setAccessChecked(true);
    }
  };

  const requestAccess = () => {
    setAccessCode('');
    setValidationError('');
    setShowAccessModal(true);
  };

  // 🚨 FIXED: Contact Admin button function
  const contactAdmin = () => {
    if (navigateTo) {
      navigateTo('contact-us');
    } else {
      console.error('Navigate function not available');
      // Fallback: try to use window location
      window.location.hash = 'contact-us';
    }
  };

  const validateAccessCode = async () => {
    if (!accessCode.trim()) {
      setValidationError('Please enter an access code');
      return;
    }

    setValidating(true);
    setValidationError('');

    try {
      const response = await api.post('/courses/validate-masterclass-access', {
        accessCode: accessCode.trim()
      });

      if (response.data.success) {
        // Grant access
        setHasAccess(true);
        localStorage.setItem('masterclassAccess', 'granted');
        setShowAccessModal(false);
        setAccessCode('');
        showCustomAlert('Access granted! Welcome to Masterclass Courses.', 'success');
        
        // Refresh courses now that access is granted
        await checkAccessAndFetchCourses();
      }
    } catch (error) {
      console.error('Error validating access code:', error);
      setValidationError(
        error.response?.data?.message || 
        'Invalid access code. Please contact the administrator for a valid code.'
      );
    } finally {
      setValidating(false);
    }
  };

  const viewCourse = async (courseId) => {
    if (!hasAccess) {
      requestAccess();
      return;
    }

    try {
      const response = await api.get(`/courses/${courseId}`);
      if (response.data.success) {
        setSelectedCourse(response.data.course);
        setShowCourseModal(true);
        setDocumentContent(null);
        setContentType('text');
      }
    } catch (error) {
      console.error('Error fetching course details:', error);
      if (error.response?.status === 403) {
        showCustomAlert('Access denied. You need a valid access code to view this course.', 'error');
      } else {
        showCustomAlert('Failed to load course content. Please try again.', 'error');
      }
    }
  };

  // READ DOCUMENT CONTENT - WITH IMAGE SUPPORT
  const readDocumentInApp = async () => {
    if (!selectedCourse) return;
    
    try {
      setDocumentLoading(true);
      setDocumentContent(null);
      console.log('📖 Reading document content for course:', selectedCourse._id);
      
      const response = await api.get(`/direct-courses/${selectedCourse._id}/view`);
      console.log('📄 API Response:', response.data);
      
      if (response.data.success) {
        setContentType(response.data.contentType || 'text');
        
        if (response.data.contentType === 'html' || response.data.contentType === 'text') {
          setDocumentContent(response.data.content);
          console.log('📝 Document content loaded:', response.data.contentLength, 'characters');
          console.log('🖼️ Has images:', response.data.hasImages);
        } else if (response.data.contentType === 'error') {
          setDocumentContent('Error: ' + response.data.content);
        } else {
          setDocumentContent(response.data.content || 'Document loaded but cannot be displayed.');
        }
      } else {
        setDocumentContent('Error: ' + (response.data.message || 'Failed to load document'));
      }
      
    } catch (error) {
      console.error('❌ Error reading document:', error);
      setDocumentContent('Error loading document: ' + error.message);
    } finally {
      setDocumentLoading(false);
    }
  };

  const closeModal = () => {
    setShowCourseModal(false);
    setSelectedCourse(null);
    setDocumentContent(null);
    setDocumentLoading(false);
    setContentType('text');
  };

  const closeAccessModal = () => {
    setShowAccessModal(false);
    setAccessCode('');
    setValidationError('');
  };

  // 🚨 NEW: Logout function that properly revokes access
  const handleLogout = () => {
    setHasAccess(false);
    localStorage.removeItem('masterclassAccess');
    setCourses([]);
    setTotalItems(0);
    setCurrentPage(1);
    showCustomAlert('Access revoked. You can enter a new access code anytime.', 'info');
  };

  // Format date function to handle different date fields
  const formatCourseDate = (course) => {
    if (course.uploadedAt) return new Date(course.uploadedAt).toLocaleDateString();
    if (course.createdAt) return new Date(course.createdAt).toLocaleDateString();
    if (course.date) return new Date(course.date).toLocaleDateString();
    if (course.updatedAt) return new Date(course.updatedAt).toLocaleDateString();
    return 'Date not available';
  };

  // Custom alert function
  const showCustomAlert = (message, type = 'success') => {
    // Create alert element
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    alertDiv.style.cssText = `
      top: 100px;
      right: 20px;
      z-index: 9999;
      min-width: 300px;
      animation: slideInRight 0.3s ease-out;
    `;
    alertDiv.innerHTML = `
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(alertDiv);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
      if (alertDiv.parentNode) {
        alertDiv.parentNode.removeChild(alertDiv);
      }
    }, 3000);
  };

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    return (
      <nav aria-label="Courses pagination">
        <ul className="pagination justify-content-center">
          <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
            <button
              className="page-link"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Previous
            </button>
          </li>
          
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <li key={page} className={`page-item ${currentPage === page ? 'active' : ''}`}>
              <button className="page-link" onClick={() => setCurrentPage(page)}>
                {page}
              </button>
            </li>
          ))}
          
          <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
            <button
              className="page-link"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </li>
        </ul>
      </nav>
    );
  };

  // If access not checked yet, show loading
  if (!accessChecked) {
    return (
      <div className="container-fluid py-4">
        <div className="row justify-content-center">
          <div className="col-12 col-md-8 col-lg-6">
            <div className="card shadow-lg border-0">
              <div className="card-body text-center py-5">
                <div className="spinner-border text-warning mb-3" style={{width: '3rem', height: '3rem'}}>
                  <span className="visually-hidden">Loading...</span>
                </div>
                <h4 className="text-warning">Checking Access...</h4>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 🚨 FIXED: Show access request page when user doesn't have access
  if (!hasAccess) {
    return (
      <div className="masterclass-courses" style={{ background: '#f8f9fa', minHeight: '100vh' }}>
        <div className="container-fluid py-4">
          <div className="row justify-content-center">
            <div className="col-12 col-md-8 col-lg-6">
              <div className="card shadow-lg border-warning">
                <div className="card-header bg-warning text-dark text-center py-4">
                  <i className="fas fa-crown fa-3x mb-3"></i>
                  <h1 className="display-5 fw-bold">Masterclass Courses</h1>
                  <p className="lead mb-0">Premium content requiring special access</p>
                </div>
                <div className="card-body text-center py-5">
                  <div className="mb-4">
                    <i className="fas fa-lock fa-4x text-warning mb-3"></i>
                    <h3 className="text-dark">Access Required</h3>
                    <p className="text-muted">
                      Masterclass courses contain premium content that requires a special access code.
                      Please contact the administrator to obtain an access code.
                    </p>
                  </div>
                  
                  <div className="row mb-4">
                    <div className="col-md-6 mb-3">
                      <div className="card h-100 border-0 bg-light">
                        <div className="card-body">
                          <i className="fas fa-key fa-2x text-warning mb-3"></i>
                          <h5>Get Access Code</h5>
                          <p className="text-muted small">
                            Contact the administrator to receive your unique access code
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6 mb-3">
                      <div className="card h-100 border-0 bg-light">
                        <div className="card-body">
                          <i className="fas fa-shield-alt fa-2x text-warning mb-3"></i>
                          <h5>Secure Access</h5>
                          <p className="text-muted small">
                            Each code is unique and can only be used by one user
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    className="btn btn-warning btn-lg"
                    onClick={requestAccess}
                  >
                    <i className="fas fa-key me-2"></i>Enter Access Code
                  </button>
                  
                  <div className="mt-3">
                    <button 
                      className="btn btn-outline-dark btn-sm"
                      onClick={contactAdmin}
                    >
                      <i className="fas fa-envelope me-2"></i>Contact Administrator
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Access Code Modal */}
        {showAccessModal && (
          <div className="modal fade show" style={{display: 'block', backgroundColor: 'rgba(0,0,0,0.5)'}}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header bg-warning text-dark">
                  <h5 className="modal-title">
                    <i className="fas fa-key me-2"></i>
                    Enter Access Code
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={closeAccessModal}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="alert alert-info">
                    <h6>Masterclass Access Required</h6>
                    <p className="mb-0">Enter the access code provided by the administrator.</p>
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label fw-bold">Access Code</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Enter your access code..."
                      value={accessCode}
                      onChange={(e) => setAccessCode(e.target.value)}
                      disabled={validating}
                    />
                    {validationError && (
                      <div className="text-danger small mt-2">{validationError}</div>
                    )}
                  </div>
                  
                  <div className="alert alert-warning">
                    <small>
                      <i className="fas fa-info-circle me-2"></i>
                      Don't have an access code? Contact the administrator to request one.
                    </small>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={closeAccessModal}
                    disabled={validating}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-warning"
                    onClick={validateAccessCode}
                    disabled={validating || !accessCode.trim()}
                  >
                    {validating ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Validating...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-check me-2"></i>
                        Validate Code
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Loading state (when user has access but data is loading)
  if (loading) {
    return (
      <div className="container-fluid py-4">
        <div className="row justify-content-center">
          <div className="col-12 col-md-8 col-lg-6">
            <div className="card shadow-lg border-0">
              <div className="card-body text-center py-5">
                <div className="spinner-border text-warning mb-3" style={{width: '3rem', height: '3rem'}}>
                  <span className="visually-hidden">Loading...</span>
                </div>
                <h4 className="text-warning">Loading Masterclass Courses...</h4>
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
              <h4>Error Loading Courses</h4>
              <p>{error}</p>
              <button className="btn btn-warning" onClick={checkAccessAndFetchCourses}>
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 🚨 FIXED: This is the "Access Granted" view that should only show when user has access
  return (
    <div className="masterclass-courses" style={{ background: '#f8f9fa', minHeight: '100vh' }}>
      <div className="container-fluid py-4">
        {/* Header */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="card text-white bg-warning shadow-lg">
              <div className="card-body py-4">
                <div className="row align-items-center">
                  <div className="col-md-8">
                    <h1 className="display-5 fw-bold mb-2 text-dark">
                      <i className="fas fa-crown me-3"></i>
                      Masterclass Courses
                    </h1>
                    <p className="lead mb-0 opacity-75 text-dark">
                      Premium courses with images and rich formatting. Read directly in the app.
                    </p>
                  </div>
                  <div className="col-md-4 text-md-end">
                    <div className="bg-dark rounded p-3 d-inline-block text-warning">
                      <h4 className="mb-0 fw-bold">{totalItems}</h4>
                      <small>Masterclass Courses</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Access Granted Banner */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="alert alert-success border-0 shadow-sm">
              <div className="row align-items-center">
                <div className="col-md-8">
                  <h5 className="mb-1">
                    <i className="fas fa-check-circle me-2"></i>
                    Access Granted
                  </h5>
                  <p className="mb-0">
                    You have access to premium masterclass courses. All documents can be viewed directly in the app with images and formatting preserved.
                  </p>
                </div>
                <div className="col-md-4 text-md-end">
                  <button 
                    className="btn btn-outline-success"
                    onClick={handleLogout}
                  >
                    <i className="fas fa-sign-out-alt me-2"></i>Logout
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Courses Grid */}
        <div className="row">
          <div className="col-12">
            {courses.length === 0 ? (
              <div className="card shadow-lg border-0">
                <div className="card-body text-center py-5">
                  <i className="fas fa-book-open fa-4x text-muted mb-3"></i>
                  <h3 className="text-muted">No Masterclass Courses Available</h3>
                  <p className="text-muted">
                    There are no masterclass courses available at the moment. 
                    Check back later for new course additions.
                  </p>
                </div>
              </div>
            ) : (
              <div className="row">
                {courses.map((course) => (
                  <div key={course._id} className="col-lg-6 col-xl-4 mb-4">
                    <div className="card course-card h-100 shadow-sm border-warning">
                      <div className="card-header bg-warning text-dark border-0">
                        <div className="d-flex justify-content-between align-items-center">
                          <span className="badge bg-dark fs-6">
                            <i className="fas fa-crown me-1"></i>
                            Masterclass
                          </span>
                          <i className="fas fa-unlock text-success"></i>
                        </div>
                      </div>
                      <div className="card-body">
                        <h5 className="card-title text-dark mb-3">{course.title}</h5>
                        <p className="card-text text-muted mb-3">
                          {course.description ? (course.description.length > 120 
                            ? `${course.description.substring(0, 120)}...` 
                            : course.description) : 'No description available'
                          }
                        </p>
                        
                        <div className="course-meta mb-3">
                          {course.fileName && (
                            <small className="text-muted d-block">
                              <i className="fas fa-file me-1"></i>
                              {course.fileName}
                            </small>
                          )}
                          {course.htmlContent && (
                            <small className="text-success d-block">
                              <i className="fas fa-image me-1"></i>
                              Includes images and formatting
                            </small>
                          )}
                        </div>
                      </div>
                      <div className="card-footer bg-transparent border-0 pt-0">
                        <div className="d-grid gap-2">
                          <button
                            className="btn btn-warning btn-sm"
                            onClick={() => viewCourse(course._id)}
                          >
                            <i className="fas fa-eye me-2"></i>View Course
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
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

      {/* Course Modal */}
      {showCourseModal && selectedCourse && (
        <div className="modal fade show" style={{display: 'block', backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog modal-xl modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-warning text-dark">
                <h5 className="modal-title">
                  <i className="fas fa-crown me-2"></i>
                  {selectedCourse.title}
                  {contentType === 'html' && (
                    <span className="badge bg-success ms-2">
                      <i className="fas fa-image me-1"></i>
                      With Images
                    </span>
                  )}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={closeModal}
                ></button>
              </div>
              
              <div className="modal-body" style={{maxHeight: '80vh', overflowY: 'auto'}}>
                
                {!documentContent ? (
                  // Preview View
                  <div>
                    <div className="row mb-4">
                      <div className="col-md-6">
                        <h6>Course Information</h6>
                        <p className="text-muted mb-2">
                          <strong>Type:</strong> Masterclass Course
                        </p>
                        <p className="text-muted mb-2">
                          <strong>Uploaded:</strong> {formatCourseDate(selectedCourse)}
                        </p>
                        {selectedCourse.fileName && (
                          <p className="text-muted mb-2">
                            <strong>File:</strong> {selectedCourse.fileName}
                          </p>
                        )}
                        {selectedCourse.htmlContent && (
                          <p className="text-success mb-2">
                            <strong>Format:</strong> Includes images and rich formatting
                          </p>
                        )}
                      </div>
                      <div className="col-md-6">
                        <h6>Description</h6>
                        <p className="text-muted">{selectedCourse.description || 'No description available'}</p>
                      </div>
                    </div>
                    
                    <div className="text-center py-4">
                      <button 
                        className="btn btn-warning btn-lg" 
                        onClick={readDocumentInApp}
                        disabled={documentLoading}
                      >
                        {documentLoading ? (
                          <>
                            <i className="fas fa-spinner fa-spin me-2"></i>Loading Document...
                          </>
                        ) : (
                          <>
                            <i className="fas fa-book-open me-2"></i>Read Document in App
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  // Document Content View - SUPPORTS HTML AND IMAGES
                  <div>
                    {documentLoading ? (
                      <div className="text-center py-5">
                        <div className="spinner-border text-warning mb-3" style={{width: '3rem', height: '3rem'}}>
                          <span className="visually-hidden">Loading...</span>
                        </div>
                        <h4>Loading Document</h4>
                        <p className="text-muted">Please wait while we load the document content...</p>
                      </div>
                    ) : (
                      <div className="document-content">
                        <div className="bg-light rounded p-3 mb-3 d-flex justify-content-between align-items-center">
                          <small className="text-muted">
                            <i className="fas fa-info-circle me-1"></i>
                            {contentType === 'html' ? 'Document with images and formatting' : 'Text document'}
                          </small>
                          <small className="text-muted">
                            <i className="fas fa-file-text me-1"></i>
                            {documentContent.length} characters
                          </small>
                        </div>
                        <div 
                          className="document-content-display"
                          style={{
                            background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                            padding: '2.5rem',
                            border: '1px solid #dee2e6',
                            borderRadius: '0.75rem',
                            maxHeight: '60vh',
                            overflowY: 'auto',
                            wordWrap: 'break-word',
                            lineHeight: '1.7',
                            fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                            fontSize: '16px',
                            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                            color: '#2c3e50'
                          }}
                        >
                          {contentType === 'html' ? (
                            <div 
                              dangerouslySetInnerHTML={{ __html: documentContent }}
                              style={{
                                textAlign: 'left'
                              }}
                            />
                          ) : (
                            <div style={{ textAlign: 'justify', whiteSpace: 'pre-wrap' }}>
                              {documentContent.split('\n').map((paragraph, index) => (
                                paragraph.trim() ? (
                                  <div 
                                    key={index} 
                                    className="paragraph"
                                    style={{
                                      marginBottom: '1.2rem',
                                      paddingBottom: '0.5rem',
                                      borderBottom: paragraph.trim().endsWith(':') ? '2px solid #ffc107' : 'none'
                                    }}
                                  >
                                    {paragraph}
                                  </div>
                                ) : (
                                  <br key={index} />
                                )
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="modal-footer">
                {documentContent && (
                  <button
                    className="btn btn-outline-secondary"
                    onClick={() => setDocumentContent(null)}
                  >
                    <i className="fas fa-arrow-left me-2"></i>Back to Preview
                  </button>
                )}
                <button
                  className="btn btn-secondary"
                  onClick={closeModal}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .course-card {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        
        .course-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(255, 193, 7, 0.2) !important;
        }
        
        .modal-content {
          max-height: 90vh;
        }
      `}</style>
    </div>
  );
};

export default MasterclassCourses;