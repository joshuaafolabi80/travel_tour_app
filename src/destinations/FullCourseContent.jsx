// src/destinations/FullCourseContent.jsx
import React, { useState } from 'react';

const FullCourseContent = ({ course, onTakeQuiz }) => {
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);

  const handleNext = () => {
    if (currentSectionIndex < course.fullCourseDetails.sections.length - 1) {
      setCurrentSectionIndex(currentSectionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentSectionIndex > 0) {
      setCurrentSectionIndex(currentSectionIndex - 1);
    }
  };

  const currentSection = course.fullCourseDetails.sections[currentSectionIndex];

  return (
    <div className="container py-4">
      {/* Course header */}
      <h1 className="fw-bold mb-3">{course.name}</h1>
      <img 
        src={course.heroImage} 
        alt={course.name} 
        className="img-fluid rounded shadow-sm mb-4" 
      />

      {/* Section display */}
      <div className="card mb-4">
        <div className="card-body">
          <h2 className="h5 fw-semibold">{currentSection.heading}</h2>
          <p className="text-muted">{currentSection.content}</p>
          {/* Later: you can map images/videos here inside this card */}
        </div>
      </div>

      {/* Navigation */}
      <div className="d-flex justify-content-between mb-4">
        <button 
          className="btn btn-outline-secondary" 
          onClick={handlePrevious} 
          disabled={currentSectionIndex === 0}
        >
          <i className="fas fa-arrow-left me-2"></i> Previous
        </button>
        <button 
          className="btn btn-outline-primary" 
          onClick={handleNext} 
          disabled={currentSectionIndex === course.fullCourseDetails.sections.length - 1}
        >
          Next <i className="fas fa-arrow-right ms-2"></i>
        </button>
      </div>

      {/* Show "Take Quiz" only at last section */}
      {currentSectionIndex === course.fullCourseDetails.sections.length - 1 && (
        <div className="text-center">
          <button 
            className="btn btn-success btn-lg" 
            onClick={onTakeQuiz}
          >
            Take Quiz <i className="fas fa-pen ms-2"></i>
          </button>
        </div>
      )}
    </div>
  );
};

export default FullCourseContent;
