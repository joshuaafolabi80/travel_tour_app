// server/routes/courses.js
const express = require('express');
const Course = require('../models/Course'); // Import the new Course model

const router = express.Router();

// GET a single course by its destinationId
router.get('/courses/:destinationId', async (req, res) => {
  try {
    const { destinationId } = req.params;
    const course = await Course.findOne({ destinationId: destinationId });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found.'
      });
    }

    res.status(200).json({
      success: true,
      course: course,
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error fetching course details.',
      error: error.message
    });
  }
});

module.exports = router;