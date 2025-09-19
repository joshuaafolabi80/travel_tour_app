// src/destinations/FullCourseContent.jsx
import React, { useState, useEffect } from 'react';

// Image Slider Component for each section
const ImageSlider = ({ images, sectionName }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (images && images.length > 1) {
      const timer = setInterval(() => {
        setCurrentIndex((prevIndex) => 
          prevIndex === images.length - 1 ? 0 : prevIndex + 1
        );
      }, 4000); // Change image every 4 seconds

      return () => clearInterval(timer);
    }
  }, [images]);

  if (!images || images.length === 0) return null;

  return (
    <div className="image-slider-container mt-4">
      <h6 className="fw-semibold mb-3">Gallery:</h6>
      <div className="slider-wrapper position-relative rounded overflow-hidden shadow">
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
                  border: 'none'
                }}
              ></button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const FullCourseContent = ({ course, onTakeQuiz }) => {
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [headerImageIndex, setHeaderImageIndex] = useState(0);

  const handleNext = () => {
    if (currentSectionIndex < course.fullCourseDetails.sections.length - 1) {
      setCurrentSectionIndex(currentSectionIndex + 1);
      setHeaderImageIndex(0); // Reset header image index when changing sections
    }
  };

  const handlePrevious = () => {
    if (currentSectionIndex > 0) {
      setCurrentSectionIndex(currentSectionIndex - 1);
      setHeaderImageIndex(0); // Reset header image index when changing sections
    }
  };

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
          <div className="text-center mb-5">
            <h1 className="fw-bold display-4 text-primary" style={{
              fontFamily: "'Playfair Display', serif",
              textShadow: '2px 2px 4px rgba(0,0,0,0.1)'
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
          <div className="progress mb-2" style={{ height: '12px', borderRadius: '10px' }}>
            <div 
              className="progress-bar progress-bar-striped progress-bar-animated" 
              role="progressbar" 
              style={{ 
                width: `${((currentSectionIndex + 1) / course.fullCourseDetails.sections.length) * 100}%`,
                backgroundColor: '#3B71CA'
              }}
            ></div>
          </div>
          <div className="d-flex justify-content-between">
            <span className="text-muted fw-semibold">
              Section {currentSectionIndex + 1} of {course.fullCourseDetails.sections.length}
            </span>
            <span className="text-muted fw-semibold">
              {Math.round(((currentSectionIndex + 1) / course.fullCourseDetails.sections.length) * 100)}% Complete
            </span>
          </div>
        </div>

        {/* Section display with engaging design */}
        <div className="section-card card border-0 shadow-lg mb-5" style={{
          borderRadius: '20px',
          overflow: 'hidden',
          background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)'
        }}>
          {/* Section-specific header image */}
          {headerImages.length > 0 && (
            <div className="section-header-image-container">
              <img 
                src={headerImages[headerImageIndex]} 
                alt={currentSection.heading}
                className="img-fluid w-100"
                style={{ height: '350px', objectFit: 'cover' }}
              />
            </div>
          )}
          
          <div className="card-body p-5">
            {/* Section heading with stylish font */}
            <h2 className="section-heading fw-bold mb-4 text-center" style={{
              fontFamily: "'Montserrat', sans-serif",
              color: '#2c3e50',
              fontSize: '2rem',
              borderBottom: '3px solid #3B71CA',
              paddingBottom: '1rem'
            }}>
              {currentSection.heading}
            </h2>
            
            {/* Content with improved readability */}
            <div className="content-container" style={{
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              padding: '2rem',
              borderRadius: '15px',
              borderLeft: '5px solid #3B71CA'
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
                <h5 className="fw-semibold mb-4 text-primary">Travel Itinerary:</h5>
                <div className="row g-4">
                  {currentSection.itinerary.map((day, index) => (
                    <div key={index} className="col-12">
                      <div className="itinerary-card card border-0 shadow-sm" style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        textAlign: 'justify'
                      }}>
                        <div className="card-body">
                          <h6 className="card-title fw-bold">Day {day.day}: {day.title}</h6>
                          <p className="card-text mb-0">{day.description}</p>
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
            className="btn btn-primary px-3 py-2 flex-grow-0" 
            onClick={handlePrevious} 
            disabled={currentSectionIndex === 0}
            style={{
              borderRadius: '8px',
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: '600',
              fontSize: '0.9rem',
              minWidth: '160px'
            }}
          >
            <i className="fas fa-arrow-left me-2"></i> Previous
          </button>
          
          <button 
            className="btn btn-primary px-3 py-2 flex-grow-0" 
            onClick={handleNext} 
            disabled={currentSectionIndex === course.fullCourseDetails.sections.length - 1}
            style={{
              borderRadius: '8px',
              fontFamily: "'Montserrat', sans-serif",
              fontWeight: '600',
              fontSize: '0.9rem',
              minWidth: '160px'
            }}
          >
            Next <i className="fas fa-arrow-right ms-2"></i>
          </button>
        </div>

        {/* Take Quiz button */}
        {currentSectionIndex === course.fullCourseDetails.sections.length - 1 && (
          <div className="text-center">
            <button 
              className="btn btn-success px-4 py-2" 
              onClick={onTakeQuiz}
              style={{
                borderRadius: '8px',
                fontFamily: "'Montserrat', sans-serif",
                fontWeight: '600',
                fontSize: '1rem'
              }}
            >
              <i className="fas fa-graduation-cap me-2"></i> Take Final Quiz
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FullCourseContent;