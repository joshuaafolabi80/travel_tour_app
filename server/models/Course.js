// server/models/Course.js
const mongoose = require('mongoose');

const faqSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
  },
  answer: {
    type: String,
    required: true,
  },
});

const sectionSchema = new mongoose.Schema({
  heading: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  images: [String],
  videos: [String],
});

const courseSchema = new mongoose.Schema({
  destinationId: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  continent: {
    type: String,
    required: true,
  },
  heroImage: { // For the initial 'About' page
    type: String,
    required: true,
  },
  about: { // Brief description for the 'About' page
    type: String,
    required: true,
  },
  enrollmentCount: { // Number of people enrolled
    type: Number,
    default: 0,
  },
  faqs: [faqSchema], // Array of FAQ objects

  // Full course details for the "Start this Course" page
  fullCourseDetails: {
    itinerary: [{ // This can be a separate field
      day: Number,
      title: String,
      description: String
    }],
    sections: [sectionSchema], // Array of all detailed sections
  }
});

const Course = mongoose.model('Course', courseSchema);

module.exports = Course;