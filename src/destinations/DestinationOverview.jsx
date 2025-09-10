// src/destinations/DestinationOverview.jsx
import React, { useState } from 'react';

const FAQItem = ({ faq }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="card mb-2">
      <div 
        className="card-header d-flex justify-content-between align-items-center"
        style={{ cursor: "pointer" }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{faq.question}</span>
        <i className={`fas fa-chevron-right ${isOpen ? 'rotate-90' : ''}`}></i>
      </div>
      {isOpen && (
        <div className="card-body">
          <p className="mb-0">{faq.answer}</p>
        </div>
      )}
    </div>
  );
};

const DestinationOverview = ({ course, onStartCourse }) => {
  return (
    <div className="container py-4">
      {/* Breadcrumb / header */}
      <div className="mb-3">
        <small className="text-muted">Home / Destinations / {course.name}</small>
        <div className="d-flex align-items-center mt-2">
          <i className="fas fa-user-check text-success me-2"></i>
          <span className="fw-semibold">{course.enrollmentCount} people have enrolled in this course</span>
        </div>
      </div>

      {/* Course overview */}
      <div className="row g-4 mb-4">
        <div className="col-12 col-md-6">
          <img 
            src={course.heroImage} 
            alt={course.name} 
            className="img-fluid rounded shadow-sm" 
          />
        </div>
        <div className="col-12 col-md-6">
          <h2 className="fw-bold">{course.name}</h2>
          <p className="text-muted">{course.about}</p>
        </div>
      </div>

      {/* FAQs */}
      <div className="mb-4">
        <h3 className="mb-3">FAQs</h3>
        {course.faqs.map((faq, index) => (
          <FAQItem key={index} faq={faq} />
        ))}
      </div>

      {/* Call to action */}
      <button 
        className="btn btn-primary btn-lg d-flex align-items-center gap-2"
        onClick={onStartCourse}
      >
        Start This Course <i className="fas fa-arrow-right"></i>
      </button>
    </div>
  );
};

export default DestinationOverview;
