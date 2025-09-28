// src/components/MasterclassCourses.jsx
import React, { useState, useEffect } from 'react';
import api from '../services/api';

const MasterclassCourses = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [validating, setValidating] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [notificationCount, setNotificationCount] = useState(0);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    fetchCourses();
    fetchNotificationCount();
    
    // Mark notifications as read when component mounts
    markNotificationsAsRead();
  }, [currentPage]);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const response = await api.get('/courses', {
        params: {
          type: 'masterclass',
          page: currentPage,
          limit: itemsPerPage
        }
      });
      
      if (response.data.success) {
        setCourses(response.data.courses);
        setTotalItems(response.data.totalCount);
      } else {
        setError('Failed to load courses');
      }
    } catch (error) {
      console.error('Error fetching masterclass courses:', error);
      setError('Failed to load masterclass courses. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const fetchNotificationCount = async () => {
    try {
      const response = await api.get('/courses/notification-counts');
      if (response.data.success) {
        setNotificationCount(response.data.masterclassCourses);
      }
    } catch (error) {
      console.error('Error fetching notification count:', error);
    }
  };

  const markNotificationsAsRead = async () => {
    try {
      await api.post('/courses/mark-notifications-read', {
        courseType: 'masterclass'
      });
      setNotificationCount(0);
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  const requestAccess = (course) => {
    setSelectedCourse(course);
    setAccessCode('');
    setValidationError('');
    setShowAccessModal(true);
  };

  const validateAccessCode = async () => {
    if (!accessCode.trim()) {
      setValidationError('Please enter an access code');
      return;
    }

    setValidating(true);
    setValidationError('');

    try {
      const response = await api.post(`/courses/${selectedCourse._id}/validate-access`, {
        accessCode: accessCode.trim()
      });

      if (response.data.success) {
        setShowAccessModal(false);
        setAccessCode('');
        
        // Refresh courses to show the newly accessible course
        await fetchCourses();
        
        // Now view the course
        viewCourse(selectedCourse._id);
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
    try {
      const response = await api.get(`/courses/${courseId}`);
      if (response.data.success) {
        setSelectedCourse(response.data.course);
        setShowCourseModal(true);
      }
    } catch (error) {
      console.error('Error fetching course details:', error);
      if (error.response?.status === 403) {
        alert('Access denied. You need a valid access code to view this course.');
      } else {
        alert('Failed to load course content. Please try again.');
      }
    }
  };

  const downloadFile = (course) => {
    const blob = new Blob([course.content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = course.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
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
              <button className="btn btn-warning" onClick={fetchCourses}>
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
                      Premium courses requiring special access codes. Contact administrator for access.
                    </p>
                  </div>
                  <div className="col-md-4 text-md-end">
                    <div className="bg-dark rounded p-3 d-inline-block text-warning">
                      <h4 className="mb-0 fw-bold">{totalItems}</h4>
                      <small>Masterclass Courses</small>
                    </div>
                    {notificationCount > 0 && (
                      <div className="mt-2">
                        <span className="badge bg-danger fs-6">
                          <i className="fas fa-bell me-1"></i>
                          {notificationCount} New Masterclass
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Access Information Banner */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="alert alert-warning border-0 shadow-sm">
              <div className="row align-items-center">
                <div className="col-md-8">
                  <h5 className="mb-1">
                    <i className="fas fa-lock me-2"></i>
                    Access Required
                  </h5>
                  <p className="mb-0">
                    Masterclass courses require special access codes. Please contact the administrator to obtain access codes for these premium courses.
                  </p>
                </div>
                <div className="col-md-4 text-md-end">
                  <button className="btn btn-outline-warning">
                    <i className="fas fa-envelope me-2"></i>Contact Admin
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
                  <i className="fas fa-lock fa-4x text-muted mb-3"></i>
                  <h3 className="text-muted">No Access to Masterclass Courses</h3>
                  <p className="text-muted mb-3">
                    You don't have access to any masterclass courses yet. 
                    Contact the administrator to get access codes for premium courses.
                  </p>
                  <button className="btn btn-warning">
                    <i className="fas fa-envelope me-2"></i>Request Access
                  </button>
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
                          {course.description.length > 120 
                            ? `${course.description.substring(0, 120)}...` 
                            : course.description
                          }
                        </p>
                        
                        <div className="course-meta mb-3">
                          <small className="text-muted d-block">
                            <i className="fas fa-file me-1"></i>
                            {course.fileName}
                          </small>
                          <small className="text-muted">
                            <i className="fas fa-download me-1"></i>
                            {(course.fileSize / 1024).toFixed(1)} KB
                          </small>
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
                          <button
                            className="btn btn-outline-dark btn-sm"
                            onClick={() => downloadFile(course)}
                          >
                            <i className="fas fa-download me-2"></i>Download
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

        {/* Courses Available but Locked */}
        {totalItems > courses.length && (
          <div className="row mt-4">
            <div className="col-12">
              <div className="card border-warning">
                <div className="card-body text-center py-4">
                  <i className="fas fa-lock fa-2x text-warning mb-3"></i>
                  <h5 className="text-warning">More Masterclass Courses Available</h5>
                  <p className="text-muted mb-3">
                    There are {totalItems - courses.length} additional masterclass courses that require access codes.
                  </p>
                  <button className="btn btn-warning">
                    <i className="fas fa-key me-2"></i>Request Access Codes
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="row mt-4">
            <div className="col-12">
              {renderPagination()}
            </div>
          </div>
        )}
      </div>

      {/* Access Code Modal */}
      {showAccessModal && selectedCourse && (
        <div className="modal fade show" style={{display: 'block', backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-warning text-dark">
                <h5 className="modal-title">
                  <i className="fas fa-key me-2"></i>
                  Access Required
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowAccessModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="alert alert-info">
                  <h6>Course: {selectedCourse.title}</h6>
                  <p className="mb-0">Enter the access code provided by the administrator.</p>
                </div>
                
                <div className="mb-3">
                  <label className="form-label fw-bold">Access Code</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Enter access code..."
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
                  onClick={() => setShowAccessModal(false)}
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

      {/* Course View Modal */}
      {showCourseModal && selectedCourse && (
        <div className="modal fade show" style={{display: 'block', backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog modal-xl modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-warning text-dark">
                <h5 className="modal-title">
                  <i className="fas fa-crown me-2"></i>
                  {selectedCourse.title}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowCourseModal(false)}
                ></button>
              </div>
              <div className="modal-body" style={{maxHeight: '70vh', overflowY: 'auto'}}>
                <div className="row mb-4">
                  <div className="col-md-6">
                    <h6>Course Information</h6>
                    <p className="text-muted mb-2">
                      <strong>Type:</strong> Masterclass Course
                    </p>
                    <p className="text-muted mb-2">
                      <strong>Uploaded:</strong> {new Date(selectedCourse.uploadedAt).toLocaleDateString()}
                    </p>
                    <p className="text-muted mb-2">
                      <strong>File:</strong> {selectedCourse.fileName}
                    </p>
                  </div>
                  <div className="col-md-6">
                    <h6>Description</h6>
                    <p className="text-muted">{selectedCourse.description}</p>
                  </div>
                </div>
                
                <div className="border-top pt-3">
                  <h6>Premium Course Content</h6>
                  <div className="course-content bg-light p-3 rounded">
                    <pre style={{whiteSpace: 'pre-wrap', fontFamily: 'inherit'}}>
                      {selectedCourse.content}
                    </pre>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowCourseModal(false)}
                >
                  Close
                </button>
                <button
                  className="btn btn-warning"
                  onClick={() => downloadFile(selectedCourse)}
                >
                  <i className="fas fa-download me-2"></i>Download File
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
          box-shadow: 0 4px 15px rgba(0,0,0,0.1) !important;
        }
        
        .course-content pre {
          font-size: 14px;
          line-height: 1.5;
          margin: 0;
        }
        
        .modal-content {
          max-height: 90vh;
        }
      `}</style>
    </div>
  );
};

export default MasterclassCourses;