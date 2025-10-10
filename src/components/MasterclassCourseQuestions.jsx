// src/components/MasterclassCourseQuestions.jsx - FIXED VERSION WITHOUT ROUTER
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import './CourseQuestions.css';

const MasterclassCourseQuestions = ({ navigateTo }) => {
  const [questionSets, setQuestionSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchQuestionSets();
  }, []);

  const fetchQuestionSets = async () => {
    try {
      setLoading(true);
      console.log('🔄 Fetching masterclass course questions...');
      
      const response = await api.get('/masterclass-course-questions');
      console.log('📝 Questions response:', response.data);
      
      if (response.data.success) {
        setQuestionSets(response.data.questionSets || []);
        console.log(`✅ Loaded ${response.data.questionSets?.length || 0} masterclass question sets`);
      } else {
        console.error('❌ Failed to load question sets:', response.data.message);
        setQuestionSets([]);
        setError('Failed to load question sets: ' + (response.data.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('❌ Error fetching question sets:', error);
      setQuestionSets([]);
      setError('Failed to load question sets. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const attemptQuestions = (questionSet) => {
    if (!questionSet || !questionSet.questions || questionSet.questions.length === 0) {
      alert('No questions available in this question set.');
      return;
    }
    
    console.log('🎯 Attempting masterclass course questions:', questionSet.title);
    console.log('📝 Questions available:', questionSet.questions?.length || 0);
    
    // Store question set data for the quiz attempt
    const questionSetData = {
      id: questionSet._id,
      type: 'masterclass',
      title: questionSet.title,
      description: questionSet.description,
      questions: questionSet.questions,
      courseType: 'masterclass'
    };
    
    localStorage.setItem('currentQuestionSet', JSON.stringify(questionSetData));
    console.log('💾 Question set stored in localStorage');
    
    // 🚨 CRITICAL FIX: Navigate to masterclass-quiz-attempt instead of quiz-platform
    if (navigateTo) {
      console.log('📍 Navigating to: masterclass-quiz-attempt');
      navigateTo('masterclass-quiz-attempt');
    }
  };

  const formatQuestionSetDate = (questionSet) => {
    if (questionSet.createdAt) return new Date(questionSet.createdAt).toLocaleDateString();
    if (questionSet.updatedAt) return new Date(questionSet.updatedAt).toLocaleDateString();
    return 'Date not available';
  };

  if (loading) {
    return (
      <div className="course-questions-container">
        <div className="container-fluid py-4">
          <div className="row justify-content-center">
            <div className="col-12 col-md-8 col-lg-6">
              <div className="card shadow-lg border-0">
                <div className="card-body text-center py-5">
                  <div className="spinner-border text-warning mb-3" style={{width: '3rem', height: '3rem'}}>
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <h4 className="text-warning">Loading Masterclass Course Questions...</h4>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="course-questions-container">
        <div className="container-fluid py-4">
          <div className="row justify-content-center">
            <div className="col-12 col-md-8 col-lg-6">
              <div className="alert alert-danger text-center">
                <i className="fas fa-exclamation-triangle fa-2x mb-3"></i>
                <h4>Error Loading Questions</h4>
                <p>{error}</p>
                <button className="btn btn-warning" onClick={fetchQuestionSets}>
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="course-questions-container">
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
                      Masterclass Course Questions
                    </h1>
                    <p className="lead mb-0 opacity-75 text-dark">
                      Premium question sets for masterclass courses. Test your advanced knowledge with these comprehensive assessments.
                    </p>
                  </div>
                  <div className="col-md-4 text-md-end">
                    <div className="bg-dark rounded p-3 d-inline-block text-warning">
                      <h4 className="mb-0 fw-bold">{questionSets.length}</h4>
                      <small>Premium Question Sets</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Back Button */}
        <div className="row mb-4">
          <div className="col-12">
            <button 
              className="btn btn-outline-warning"
              onClick={() => navigateTo('masterclass-courses')}
            >
              <i className="fas fa-arrow-left me-2"></i>
              Back to Masterclass Courses
            </button>
          </div>
        </div>

        {/* Question Sets Grid */}
        <div className="row">
          <div className="col-12">
            {questionSets.length === 0 ? (
              <div className="card shadow-lg border-0">
                <div className="card-body text-center py-5">
                  <i className="fas fa-crown fa-4x text-muted mb-3"></i>
                  <h3 className="text-muted">No Masterclass Question Sets Available</h3>
                  <p className="text-muted">
                    There are no masterclass question sets available at the moment. 
                    Check back later for premium question additions.
                  </p>
                  <button className="btn btn-warning" onClick={fetchQuestionSets}>
                    Refresh Questions
                  </button>
                </div>
              </div>
            ) : (
              <div className="row">
                {questionSets.map((questionSet) => (
                  <div key={questionSet._id} className="col-lg-6 col-xl-4 mb-4">
                    <div className="card question-card h-100 shadow-sm border-warning">
                      <div className="card-header bg-warning text-dark">
                        <div className="d-flex justify-content-between align-items-center">
                          <span className="badge bg-dark text-white fs-6">
                            <i className="fas fa-crown me-1"></i>
                            Masterclass
                          </span>
                          <small className="text-dark">
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
                            20 Minutes Time Limit
                          </small>
                          <small className="text-muted d-block">
                            <i className="fas fa-star me-1"></i>
                            10 Marks per Question
                          </small>
                          <small className="text-warning d-block">
                            <i className="fas fa-crown me-1"></i>
                            Premium Masterclass Content
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
      </div>
    </div>
  );
};

export default MasterclassCourseQuestions;