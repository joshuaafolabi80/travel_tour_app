const express = require('express');
const mongoose = require('mongoose');
const DocumentCourse = require('../models/DocumentCourse');
const User = require('../models/User');
const AccessCode = require('../models/AccessCode');

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

// 🚨 NEW: Masterclass Access Code Validation
router.post('/courses/validate-masterclass-access', authMiddleware, async (req, res) => {
  try {
    const { accessCode } = req.body;
    
    if (!accessCode) {
      return res.status(400).json({ success: false, message: 'Access code is required' });
    }

    // Find the access code
    const accessCodeRecord = await AccessCode.findOne({ 
      code: accessCode.trim(),
      isUsed: false,
      expiresAt: { $gt: new Date() }
    }).populate('courseId');

    if (!accessCodeRecord) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid or expired access code. Please contact the administrator.' 
      });
    }

    // Mark the access code as used
    accessCodeRecord.isUsed = true;
    accessCodeRecord.usedBy = req.user._id;
    accessCodeRecord.usedAt = new Date();
    await accessCodeRecord.save();

    // Add course to user's accessible masterclass courses
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { accessibleMasterclassCourses: accessCodeRecord.courseId._id }
    });

    res.json({
      success: true,
      message: 'Access granted to masterclass courses',
      course: accessCodeRecord.courseId
    });

  } catch (error) {
    console.error('Error validating access code:', error);
    res.status(500).json({ success: false, message: 'Error validating access code' });
  }
});

// Get courses list - FIXED: Proper course type separation
router.get('/courses', authMiddleware, async (req, res) => {
  try {
    const { type, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    
    let query = { isActive: true };
    
    // 🚨 FIXED: Proper course type separation
    if (type === 'general') {
      query.courseType = 'general';
    } else if (type === 'masterclass') {
      query.courseType = 'masterclass';
      
      // For masterclass courses, only show courses the user has access to
      const user = await User.findById(req.user._id);
      if (user && user.accessibleMasterclassCourses && user.accessibleMasterclassCourses.length > 0) {
        query._id = { $in: user.accessibleMasterclassCourses };
      } else {
        // User has no access to any masterclass courses
        return res.json({
          success: true,
          courses: [],
          totalCount: 0,
          currentPage: parseInt(page),
          totalPages: 0,
          message: 'No access to masterclass courses. Please enter an access code.'
        });
      }
    }
    
    const courses = await DocumentCourse.find(query)
      .select('-content -htmlContent')
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
    
    // 🚨 FIXED: Check access for masterclass courses
    if (course.courseType === 'masterclass') {
      const user = await User.findById(req.user._id);
      if (!user.accessibleMasterclassCourses.includes(courseId)) {
        return res.status(403).json({ 
          success: false, 
          message: 'Access denied. You need a valid access code to view this masterclass course.' 
        });
      }
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