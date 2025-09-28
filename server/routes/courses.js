const express = require('express');
const mongoose = require('mongoose');
const DocumentCourse = require('../models/DocumentCourse');
const User = require('../models/User');

const router = express.Router();

// Simple auth middleware
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ success: false, message: 'User not found' });
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// 🚨 FIXED: Put specific routes BEFORE parameterized routes

// Notification counts route - MUST COME BEFORE :id routes
router.get('/courses/notification-counts', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({
      success: true,
      generalCourses: user.generalCoursesCount || 0,
      masterclassCourses: user.masterclassCoursesCount || 0
    });
  } catch (error) {
    console.error('Error fetching notification counts:', error);
    res.status(500).json({ success: false, message: 'Error fetching notification counts' });
  }
});

// Get courses list
router.get('/courses', authMiddleware, async (req, res) => {
  try {
    const { type, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    
    let query = { isActive: true };
    if (type === 'general') query.courseType = 'general';
    
    const courses = await DocumentCourse.find(query)
      .select('-content')
      .sort({ uploadedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const totalCount = await DocumentCourse.countDocuments(query);
    
    res.json({
      success: true,
      courses: courses,
      totalCount,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalCount / limit)
    });
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ success: false, message: 'Error fetching courses' });
  }
});

// Get single course - Add ObjectId validation
router.get('/courses/:id', authMiddleware, async (req, res) => {
  try {
    const courseId = req.params.id;
    
    // Check if it's a valid ObjectId to avoid the notification-counts error
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ success: false, message: 'Invalid course ID' });
    }
    
    const course = await DocumentCourse.findById(courseId);
    
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }
    
    res.json({ 
      success: true, 
      course
    });
  } catch (error) {
    console.error('Error fetching course:', error);
    res.status(500).json({ success: false, message: 'Error fetching course' });
  }
});

module.exports = router;