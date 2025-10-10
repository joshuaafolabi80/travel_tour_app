// src/components/GeneralCourses.jsx - FIXED VERSION WITHOUT ROUTER
import React, { useState, useEffect } from 'react';
import api from '../services/api';

const GeneralCourses = ({ navigateTo }) => {
  const [courses, setCourses] = useState([]);
  const [questionSets, setQuestionSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [documentLoading, setDocumentLoading] = useState(false);
  const [documentContent, setDocumentContent] = useState(null);
  const [contentType, setContentType] = useState('text');
  const [activeTab, setActiveTab] = useState('courses');
  const [questionsLoading, setQuestionsLoading] = useState(false);

  useEffect(() => {
    fetchCourses();
    fetchQuestionSets();
  }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      console.log('🔄 Fetching general courses...');
      
      const response = await api.get('/courses', {
        params: { type: 'general', page: 1, limit: 50 }
      });
      
      console.log('📚 Courses response:', response.data);
      
      if (response.data.success) {
        setCourses(response.data.courses || []);
        console.log(`✅ Loaded ${response.data.courses?.length || 0} general courses`);
      } else {
        setError('Failed to load courses: ' + (response.data.message || 'Unknown error'));
        setCourses([]);
      }
    } catch (error) {
      console.error('❌ Error fetching courses:', error);
      setError('Failed to load courses. Please try again later.');
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchQuestionSets = async () => {
    try {
      setQuestionsLoading(true);
      console.log('🔄 Fetching general course questions...');
      
      const response = await api.get('/general-course-questions');
      console.log('📝 Questions response:', response.data);
      
      if (response.data.success) {
        setQuestionSets(response.data.questionSets || []);
        console.log(`✅ Loaded ${response.data.questionSets?.length || 0} question sets`);
      } else {
        console.error('❌ Failed to load question sets:', response.data.message);
        setQuestionSets([]);
      }
    } catch (error) {
      console.error('❌ Error fetching question sets:', error);
      setQuestionSets([]);
    } finally {
      setQuestionsLoading(false);
    }
  };

  const handleCourseQuestionsTab = () => {
    console.log('🎯 Navigating to General Course Questions');
    if (navigateTo) {
      navigateTo('general-course-questions');
    }
  };

  const attemptQuestions = (questionSet) => {
    if (!questionSet || !questionSet.questions || questionSet.questions.length === 0) {
      alert('No questions available in this question set.');
      return;
    }
    
    console.log('🎯 Attempting questions:', questionSet.title);
    console.log('📝 Questions available:', questionSet.questions?.length || 0);
    
    // Store question set data
    const questionSetData = {
      id: questionSet._id,
      type: 'general',
      title: questionSet.title,
      description: questionSet.description,
      questions: questionSet.questions
    };
    
    localStorage.setItem('currentQuestionSet', JSON.stringify(questionSetData));
    console.log('💾 Question set stored in localStorage');
    
    // 🚨 FIXED: Navigate to general-quiz-attempt instead of quiz-platform
    if (navigateTo) {
      navigateTo('general-quiz-attempt');
    }
  };

  const viewCourse = async (courseId) => {
    try {
      console.log('🎯 Viewing course:', courseId);
      setSelectedCourse(null);
      setShowCourseModal(true);
      setDocumentContent(null);
      
      const response = await api.get(`/courses/${courseId}`);
      console.log('📄 Course details response:', response.data);
      
      if (response.data.success) {
        setSelectedCourse(response.data.course);
        console.log('✅ Course loaded successfully:', response.data.course.title);
      } else {
        console.error('❌ Failed to load course content');
        alert('Failed to load course content: ' + (response.data.message || 'Unknown error'));
        setShowCourseModal(false);
      }
    } catch (error) {
      console.error('❌ Error fetching course details:', error);
      alert('Failed to load course content. Please try again.');
      setShowCourseModal(false);
    }
  };

  const readDocumentInApp = async () => {
    if (!selectedCourse) return;
    
    try {
      setDocumentLoading(true);
      setDocumentContent(null);
      console.log('📖 Reading document content for course:', selectedCourse._id);
      
      const response = await api.get(`/direct-courses/${selectedCourse._id}/view`);
      console.log('📄 Document API Response:', response.data);
      
      if (response.data.success) {
        setContentType(response.data.contentType || 'text');
        setDocumentContent(response.data.content);
        console.log('✅ Document content loaded successfully');
      } else {
        setDocumentContent('Error: ' + (response.data.message || 'Failed to load document'));
        console.error('❌ Document loading failed:', response.data.message);
      }
      
    } catch (error) {
      console.error('❌ Error reading document:', error);
      setDocumentContent('Error loading document: ' + (error.response?.data?.message || error.message));
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

  const formatCourseDate = (course) => {
    if (course.uploadedAt) return new Date(course.uploadedAt).toLocaleDateString();
    if (course.createdAt) return new Date(course.createdAt).toLocaleDateString();
    if (course.date) return new Date(course.date).toLocaleDateString();
    if (course.updatedAt) return new Date(course.updatedAt).toLocaleDateString();
    return 'Date not available';
  };

  const formatQuestionSetDate = (questionSet) => {
    if (questionSet.createdAt) return new Date(questionSet.createdAt).toLocaleDateString();
    if (questionSet.updatedAt) return new Date(questionSet.updatedAt).toLocaleDateString();
    return 'Date not available';
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
                <h4 className="text-primary">Loading General Courses...</h4>
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
              <button className="btn btn-primary" onClick={fetchCourses}>
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="general-courses" style={{ background: '#f8f9fa', minHeight: '100vh' }}>
      <div className="container-fluid py-4">
        <div className="row mb-4">
          <div className="col-12">
            <div className="card text-white bg-primary shadow-lg">
              <div className="card-body py-4">
                <div className="row align-items-center">
                  <div className="col-md-8">
                    <h1 className="display-5 fw-bold mb-2">
                      <i className="fas fa-book me-3"></i>
                      General Courses
                    </h1>
                    <p className="lead mb-0 opacity-75">
                      Read documents directly in the app. Images and formatting are preserved.
                    </p>
                  </div>
                  <div className="col-md-4 text-md-end">
                    <div className="bg-white rounded p-3 d-inline-block text-primary">
                      <h4 className="mb-0 fw-bold">{courses.length + questionSets.length}</h4>
                      <small>Total Learning Items</small>
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
                      className={`nav-link ${activeTab === 'courses' ? 'active' : ''}`}
                      onClick={() => setActiveTab('courses')}
                    >
                      <i className="fas fa-book me-2"></i>General Courses
                      <span className="badge bg-primary ms-2">{courses.length}</span>
                    </button>
                  </li>
                  <li className="nav-item">
                    <button
                      className={`nav-link ${activeTab === 'questions' ? 'active' : ''}`}
                      onClick={handleCourseQuestionsTab}
                    >
                      <i className="fas fa-question-circle me-2"></i>Course Questions
                      <span className="badge bg-info ms-2">{questionSets.length}</span>
                    </button>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Courses Tab Content */}
        {activeTab === 'courses' && (
          <div className="row">
            <div className="col-12">
              {courses.length === 0 ? (
                <div className="card shadow-lg border-0">
                  <div className="card-body text-center py-5">
                    <i className="fas fa-book-open fa-4x text-muted mb-3"></i>
                    <h3 className="text-muted">No General Courses Available</h3>
                    <p className="text-muted">
                      There are no general courses available at the moment. 
                      Check back later for new course additions.
                    </p>
                    <button className="btn btn-primary" onClick={fetchCourses}>
                      Refresh Courses
                    </button>
                  </div>
                </div>
              ) : (
                <div className="row">
                  {courses.map((course) => (
                    <div key={course._id} className="col-lg-6 col-xl-4 mb-4">
                      <div className="card course-card h-100 shadow-sm border-0">
                        <div className="card-body">
                          <div className="d-flex justify-content-between align-items-start mb-3">
                            <span className="badge bg-info fs-6">
                              <i className="fas fa-book me-1"></i>
                              General Course
                            </span>
                            <small className="text-muted">
                              {formatCourseDate(course)}
                            </small>
                          </div>
                          
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
                              className="btn btn-primary btn-sm"
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
        )}

        {/* Questions Tab Content */}
        {activeTab === 'questions' && (
          <div className="row">
            <div className="col-12">
              {questionsLoading ? (
                <div className="card shadow-lg border-0">
                  <div className="card-body text-center py-5">
                    <div className="spinner-border text-primary mb-3" style={{width: '3rem', height: '3rem'}}>
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    <h4 className="text-primary">Loading Questions...</h4>
                  </div>
                </div>
              ) : questionSets.length === 0 ? (
                <div className="card shadow-lg border-0">
                  <div className="card-body text-center py-5">
                    <i className="fas fa-question-circle fa-4x text-muted mb-3"></i>
                    <h3 className="text-muted">No Question Sets Available</h3>
                    <p className="text-muted">
                      There are no question sets available at the moment. 
                      Check back later for new question additions.
                    </p>
                    <button className="btn btn-primary" onClick={fetchQuestionSets}>
                      Refresh Questions
                    </button>
                  </div>
                </div>
              ) : (
                <div className="row">
                  {questionSets.map((questionSet) => (
                    <div key={questionSet._id} className="col-lg-6 col-xl-4 mb-4">
                      <div className="card question-card h-100 shadow-sm border-primary">
                        <div className="card-header bg-primary text-white">
                          <div className="d-flex justify-content-between align-items-center">
                            <span className="badge bg-white text-primary fs-6">
                              <i className="fas fa-question-circle me-1"></i>
                              Question Set
                            </span>
                            <small>
                              {formatQuestionSetDate(questionSet)}
                            </small>
                          </div>
                        </div>
                        <div className="card-body">
                          <h5 className="card-title text-dark mb-3">{questionSet.title}</h5>
                          <p className="card-text text-muted mb-3">
                            {questionSet.description ? (questionSet.description.length > 120 
                              ? `${questionSet.description.substring(0, 120)}...` 
                              : questionSet.description) : 'No description available'
                            }
                          </p>
                          
                          <div className="question-meta mb-3">
                            <small className="text-muted d-block">
                              <i className="fas fa-list-ol me-1"></i>
                              {questionSet.questions?.length || 0} Questions
                            </small>
                            <small className="text-muted d-block">
                              <i className="fas fa-clock me-1"></i>
                              15 Minutes Time Limit
                            </small>
                            <small className="text-muted d-block">
                              <i className="fas fa-star me-1"></i>
                              5 Marks per Question
                            </small>
                          </div>
                        </div>
                        <div className="card-footer bg-transparent border-0 pt-0">
                          <div className="d-grid gap-2">
                            <button
                              className="btn btn-success btn-lg"
                              onClick={() => attemptQuestions(questionSet)}
                            >
                              <i className="fas fa-play me-2"></i>Attempt Questions
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
        )}

        {/* Course Modal */}
        {showCourseModal && (
          <div className="modal fade show" style={{display: 'block', backgroundColor: 'rgba(0,0,0,0.5)'}}>
            <div className="modal-dialog modal-xl modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header bg-primary text-white">
                  <h5 className="modal-title">
                    <i className="fas fa-book me-2"></i>
                    {selectedCourse ? selectedCourse.title : 'Loading Course...'}
                    {contentType === 'html' && (
                      <span className="badge bg-success ms-2">
                        <i className="fas fa-image me-1"></i>
                        With Images
                      </span>
                    )}
                  </h5>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={closeModal}
                  ></button>
                </div>
                
                <div className="modal-body" style={{maxHeight: '80vh', overflowY: 'auto'}}>
                  {!selectedCourse ? (
                    <div className="text-center py-5">
                      <div className="spinner-border text-primary mb-3" style={{width: '3rem', height: '3rem'}}>
                        <span className="visually-hidden">Loading...</span>
                      </div>
                      <h4>Loading Course...</h4>
                    </div>
                  ) : !documentContent ? (
                    // Preview View
                    <div>
                      <div className="row mb-4">
                        <div className="col-md-6">
                          <h6>Course Information</h6>
                          <p className="text-muted mb-2">
                            <strong>Type:</strong> General Course
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
                          className="btn btn-primary btn-lg" 
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
                    // Document Content View
                    <div>
                      {documentLoading ? (
                        <div className="text-center py-5">
                          <div className="spinner-border text-primary mb-3" style={{width: '3rem', height: '3rem'}}>
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
                              lineHeight: '1.7'
                            }}
                          >
                            {contentType === 'html' ? (
                              <div dangerouslySetInnerHTML={{ __html: documentContent }} />
                            ) : (
                              <div style={{ textAlign: 'justify', whiteSpace: 'pre-wrap' }}>
                                {documentContent}
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
      </div>
    </div>
  );
};

export default GeneralCourses;