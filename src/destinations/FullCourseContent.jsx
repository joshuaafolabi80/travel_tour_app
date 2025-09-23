// src/destinations/FullCourseContent.jsx
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { QuizPlatform } from '../components/QuizPlatform.jsx';
import QuizResults from '../components/QuizResults.jsx';

// Image Slider Component for each section
const ImageSlider = ({ images, sectionName }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (images && images.length > 1) {
      const timer = setInterval(() => {
        setCurrentIndex((prevIndex) => 
          prevIndex === images.length - 1 ? 0 : prevIndex + 1
        );
      }, 4000);
      return () => clearInterval(timer);
    }
  }, [images]);

  if (!images || images.length === 0) return null;

  return (
    <div className="image-slider-container mt-4">
      <h6 className="fw-semibold mb-3 text-primary">
        <i className="fas fa-images me-2"></i>
        Gallery Preview
      </h6>
      <div className="slider-wrapper position-relative rounded overflow-hidden shadow-lg">
        <div className="slider-inner" style={{ height: '300px' }}>
          {images.map((image, index) => (
            <div
              key={index}
              className={`slider-image position-absolute w-100 h-100 ${index === currentIndex ? 'active' : ''}`}
              style={{
                backgroundImage: `url(${image})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                opacity: index === currentIndex ? 1 : 0,
                transition: 'opacity 1s ease-in-out',
                zIndex: index === currentIndex ? 1 : 0
              }}
            ></div>
          ))}
        </div>
        
        {/* Navigation dots */}
        {images.length > 1 && (
          <div className="slider-dots position-absolute bottom-0 start-50 translate-middle-x mb-3 d-flex gap-2">
            {images.map((_, index) => (
              <button
                key={index}
                className={`dot btn p-0 ${index === currentIndex ? 'active' : ''}`}
                onClick={() => setCurrentIndex(index)}
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: index === currentIndex ? '#fff' : 'rgba(255,255,255,0.5)',
                  border: 'none',
                  transition: 'all 0.3s ease'
                }}
              ></button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Function to fetch quiz questions from API
const fetchQuizQuestions = async (courseId) => {
  try {
    console.log('Fetching quiz questions for courseId:', courseId);
    const response = await api.get(`/quiz/questions?courseId=${courseId}`);
    console.log('Quiz API response:', response.data);
    
    if (response.data.success) {
      return response.data.questions;
    } else {
      throw new Error(response.data.error || 'Failed to fetch quiz questions');
    }
  } catch (error) {
    console.error('Error fetching quiz questions:', error);
    throw error;
  }
};

const FullCourseContent = ({ course, onTakeQuiz }) => {
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [headerImageIndex, setHeaderImageIndex] = useState(0);
  const [showQuiz, setShowQuiz] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [quizScore, setQuizScore] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState([]);
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const newProgress = ((currentSectionIndex + 1) / course.fullCourseDetails.sections.length) * 100;
    setProgress(newProgress);
  }, [currentSectionIndex, course.fullCourseDetails.sections.length]);

  const handleTakeQuiz = async () => {
    setLoadingQuiz(true);
    try {
      console.log('Starting quiz for course:', course.name);
      console.log('Course ID:', course._id);
      
      const questions = await fetchQuizQuestions(course._id);
      console.log('Loaded questions:', questions);
      
      setQuizQuestions(questions);
      setShowQuiz(true);
      if (onTakeQuiz) onTakeQuiz();
    } catch (error) {
      console.error('Failed to fetch quiz questions:', error);
      alert('Failed to load quiz. Please try again. Check console for details.');
    } finally {
      setLoadingQuiz(false);
    }
  };

  const handleNext = () => {
    if (currentSectionIndex < course.fullCourseDetails.sections.length - 1) {
      setCurrentSectionIndex(currentSectionIndex + 1);
      setHeaderImageIndex(0);
    }
  };

  const handlePrevious = () => {
    if (currentSectionIndex > 0) {
      setCurrentSectionIndex(currentSectionIndex - 1);
      setHeaderImageIndex(0);
    }
  };

  const handleQuizComplete = (score, answers) => {
    console.log('Quiz completed with score:', score);
    setQuizScore(score);
    setQuizAnswers(answers);
    setShowQuiz(false);
    setShowResults(true); // This should show your results screen
  };

  const handleReturnToCourses = () => {
    setShowResults(false);
    setCurrentSectionIndex(0);
    window.history.back();
  };

  // If quiz is active, show the QuizPlatform
  if (showQuiz) {
    return (
      <QuizPlatform 
        course={course} 
        questions={quizQuestions}
        onQuizComplete={handleQuizComplete} // Make sure this is passed correctly
      />
    );
  }

  // If results are being shown
  if (showResults) {
    return (
      <QuizResults
        score={quizScore}
        totalQuestions={quizQuestions.length}
        subject={course.name}
        topic={course.topic || "Course Completion"}
        answers={quizAnswers}
        questions={quizQuestions}
        onReturnToCourses={handleReturnToCourses}
      />
    );
  }

  const currentSection = course.fullCourseDetails.sections[currentSectionIndex];
  const headerImages = currentSection.images || [];

  return (
    <div className="full-course-container" style={{
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      minHeight: '100vh',
      padding: '2rem 0'
    }}>
      <div className="container py-4">
        {/* Course header with stylish font - ONLY SHOWS ON FIRST SECTION */}
        {currentSectionIndex === 0 && (
          <div className="text-center mb-5 animate__animated animate__fadeInDown">
            <h1 className="fw-bold display-4 text-primary mb-3" style={{
              fontFamily: "'Playfair Display', serif",
              textShadow: '2px 2px 4px rgba(0,0,0,0.1)',
              background: 'linear-gradient(135deg, #3B71CA 0%, #2a4a8a 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              {course.name}
            </h1>
            <div className="header-image-container rounded overflow-hidden shadow-lg mx-auto" style={{ maxWidth: '800px' }}>
              <img 
                src={course.heroImage} 
                alt={course.name} 
                className="img-fluid w-100"
                style={{ height: '400px', objectFit: 'cover' }}
              />
            </div>
          </div>
        )}

        {/* Progress indicator */}
        <div className="progress-container mb-5">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="text-primary mb-0">
              <i className="fas fa-tasks me-2"></i>
              Course Progress
            </h5>
            <span className="badge bg-primary fs-6">
              Section {currentSectionIndex + 1} of {course.fullCourseDetails.sections.length}
            </span>
          </div>
          <div className="progress mb-2" style={{ height: '15px', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <div 
              className="progress-bar progress-bar-striped progress-bar-animated" 
              role="progressbar" 
              style={{ 
                width: `${progress}%`,
                backgroundColor: '#3B71CA',
                transition: 'width 0.5s ease-in-out'
              }}
            ></div>
          </div>
          <div className="d-flex justify-content-between">
            <span className="text-muted fw-semibold">
              {Math.round(progress)}% Complete
            </span>
            <span className="text-muted fw-semibold">
              {currentSectionIndex + 1}/{course.fullCourseDetails.sections.length} Sections
            </span>
          </div>
        </div>

        {/* Section display with engaging design */}
        <div className="section-card card border-0 shadow-lg mb-5 animate__animated animate__fadeInUp" style={{
          borderRadius: '20px',
          overflow: 'hidden',
          background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)',
          border: '1px solid rgba(59, 113, 202, 0.1)'
        }}>
          {/* Section-specific header image */}
          {headerImages.length > 0 && (
            <div className="section-header-image-container position-relative">
              <img 
                src={headerImages[headerImageIndex]} 
                alt={currentSection.heading}
                className="img-fluid w-100"
                style={{ height: '350px', objectFit: 'cover' }}
              />
              <div className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-end p-4" 
                   style={{background: 'linear-gradient(transparent 40%, rgba(0,0,0,0.7))'}}>
                <h2 className="text-white mb-0 fw-bold" style={{textShadow: '2px 2px 4px rgba(0,0,0,0.5)'}}>
                  {currentSection.heading}
                </h2>
              </div>
            </div>
          )}
          
          <div className="card-body p-4 p-md-5">
            {/* Section heading with stylish font */}
            {headerImages.length === 0 && (
              <h2 className="section-heading fw-bold mb-4 text-center" style={{
                fontFamily: "'Montserrat', sans-serif",
                color: '#2c3e50',
                fontSize: '2rem',
                borderBottom: '3px solid #3B71CA',
                paddingBottom: '1rem'
              }}>
                <i className="fas fa-book-open me-3 text-primary"></i>
                {currentSection.heading}
              </h2>
            )}
            
            {/* Content with improved readability */}
            <div className="content-container" style={{
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              padding: '2rem',
              borderRadius: '15px',
              borderLeft: '5px solid #3B71CA',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}>
              <p className="section-content lead" style={{
                fontFamily: "'Open Sans', sans-serif",
                lineHeight: '1.8',
                color: '#2c3e50',
                fontSize: '1.1rem',
                textAlign: 'justify'
              }}>
                {currentSection.content}
              </p>
            </div>

            {/* Image Slider for the 3 images */}
            {headerImages.length > 0 && (
              <ImageSlider images={headerImages} sectionName={currentSection.heading} />
            )}

            {/* Display itinerary if it exists */}
            {currentSection.itinerary && (
              <div className="itinerary-container mt-5">
                <h5 className="fw-semibold mb-4 text-primary">
                  <i className="fas fa-route me-2"></i>
                  Travel Itinerary
                </h5>
                <div className="row g-4">
                  {currentSection.itinerary.map((day, index) => (
                    <div key={index} className="col-12 col-md-6 col-lg-4">
                      <div className="itinerary-card card border-0 shadow-sm h-100" style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        transition: 'transform 0.3s ease, box-shadow 0.3s ease'
                      }} onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-5px)';
                        e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.2)';
                      }} onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
                      }}>
                        <div className="card-body">
                          <div className="d-flex align-items-center mb-3">
                            <span className="badge bg-light text-primary fs-6 me-2">Day {day.day}</span>
                            <h6 className="card-title fw-bold mb-0">{day.title}</h6>
                          </div>
                          <p className="card-text mb-0 small">{day.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation buttons */}
        <div className="navigation-buttons d-flex justify-content-between gap-3 mb-5">
          <button 
            className="btn btn-primary px-4 py-3 flex-grow-0" 
            onClick={handlePrevious} 
            disabled={currentSectionIndex === 0}
            style={{
              borderRadius: '12px',
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: '600',
              fontSize: '1rem',
              minWidth: '160px',
              transition: 'all 0.3s ease',
              opacity: currentSectionIndex === 0 ? 0.6 : 1
            }}
            onMouseEnter={(e) => {
              if (currentSectionIndex !== 0) {
                e.currentTarget.style.transform = 'translateX(-5px)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateX(0)';
            }}
          >
            <i className="fas fa-arrow-left me-2"></i> Previous Section
          </button>
          
          <button 
            className="btn btn-primary px-4 py-3 flex-grow-0" 
            onClick={handleNext} 
            disabled={currentSectionIndex === course.fullCourseDetails.sections.length - 1}
            style={{
              borderRadius: '12px',
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: '600',
              fontSize: '1rem',
              minWidth: '160px',
              transition: 'all 0.3s ease',
              opacity: currentSectionIndex === course.fullCourseDetails.sections.length - 1 ? 0.6 : 1
            }}
            onMouseEnter={(e) => {
              if (currentSectionIndex !== course.fullCourseDetails.sections.length - 1) {
                e.currentTarget.style.transform = 'translateX(5px)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateX(0)';
            }}
          >
            Next Section <i className="fas fa-arrow-right ms-2"></i>
          </button>
        </div>

        {/* Take Quiz button */}
        {currentSectionIndex === course.fullCourseDetails.sections.length - 1 && (
          <div className="text-center mb-5">
            <div className="card border-success bg-light">
              <div className="card-body py-4">
                <h4 className="text-success mb-3">
                  <i className="fas fa-graduation-cap me-2"></i>
                  Ready to Test Your Knowledge?
                </h4>
                <p className="text-muted mb-4">
                  Complete the final quiz to earn your certificate and track your progress in the Quiz Scores section.
                </p>
                <button 
                  className="btn btn-success px-5 py-3 btn-lg" 
                  onClick={handleTakeQuiz}
                  disabled={loadingQuiz}
                  style={{
                    borderRadius: '12px',
                    fontFamily: "'Montserrat', sans-serif",
                    fontWeight: '600',
                    fontSize: '1.1rem',
                    minWidth: '200px',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!loadingQuiz) {
                      e.currentTarget.style.transform = 'scale(1.05)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  {loadingQuiz ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Loading Quiz...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-play-circle me-2"></i> Take Final Quiz
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quick Navigation Dots */}
        <div className="text-center">
          <div className="section-dots d-flex justify-content-center gap-2 flex-wrap">
            {course.fullCourseDetails.sections.map((_, index) => (
              <button
                key={index}
                className={`btn btn-sm ${index === currentSectionIndex ? 'btn-primary' : 'btn-outline-primary'} rounded-pill`}
                onClick={() => {
                  setCurrentSectionIndex(index);
                  setHeaderImageIndex(0);
                }}
                style={{
                  width: '12px',
                  height: '12px',
                  padding: 0,
                  borderRadius: '50%'
                }}
                title={`Go to section ${index + 1}`}
              ></button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FullCourseContent;