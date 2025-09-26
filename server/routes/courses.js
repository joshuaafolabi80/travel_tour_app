// server/routes/courses.js
const express = require('express');
const Course = require('../models/Course');
const DocumentCourse = require('../models/DocumentCourse');
const AccessCode = require('../models/AccessCode');
const User = require('../models/User');

const router = express.Router();

// Middleware to check if user is authenticated
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Verify user exists and is active
    const user = await User.findById(decoded.id);
    if (!user || !user.active) {
      return res.status(401).json({ success: false, message: 'User not found or inactive' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// Get courses for users (both destination and document)
router.get('/courses', authMiddleware, async (req, res) => {
  try {
    const { type, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    
    let destinationQuery = { isActive: true };
    let documentQuery = { isActive: true };
    
    if (type === 'general') {
      destinationQuery.courseType = 'general';
      documentQuery.courseType = 'general';
    } else if (type === 'masterclass') {
      destinationQuery.courseType = 'masterclass';
      documentQuery.courseType = 'masterclass';
      
      // For masterclass, only show courses the user has access to
      const userAccess = await AccessCode.find({ 
        usedBy: req.user._id, 
        isUsed: true 
      });
      
      const accessibleDestinationIds = userAccess
        .filter(access => access.courseType === 'destination')
        .map(access => access.courseId);
      
      const accessibleDocumentIds = userAccess
        .filter(access => access.courseType === 'document')
        .map(access => access.courseId);
      
      destinationQuery._id = { $in: accessibleDestinationIds };
      documentQuery._id = { $in: accessibleDocumentIds };
    }
    
    const [destinationCourses, documentCourses] = await Promise.all([
      Course.find(destinationQuery)
        .select('-fullCourseDetails') // Don't send full content in list
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      
      DocumentCourse.find(documentQuery)
        .select('-content') // Don't send full content in list
        .sort({ uploadedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('uploadedBy', 'username')
    ]);
    
    // Combine and format results
    const allCourses = [
      ...destinationCourses.map(course => ({
        ...course.toObject(),
        contentType: 'destination',
        title: course.name,
        description: course.about
      })),
      ...documentCourses.map(course => ({
        ...course.toObject(),
        contentType: 'document'
      }))
    ];
    
    const totalCount = await Course.countDocuments(destinationQuery) + 
                      await DocumentCourse.countDocuments(documentQuery);
    
    res.json({
      success: true,
      courses: allCourses,
      totalCount,
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalCount / limit)
    });
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ success: false, message: 'Error fetching courses' });
  }
});

// Get single course by destinationId (for your existing destination courses)
router.get('/courses/destination/:destinationId', authMiddleware, async (req, res) => {
  try {
    const { destinationId } = req.params;
    const course = await Course.findOne({ destinationId: destinationId, isActive: true });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found.'
      });
    }

    // Check access for masterclass courses
    if (course.courseType === 'masterclass') {
      const hasAccess = await AccessCode.findOne({
        courseId: course._id,
        courseType: 'destination',
        usedBy: req.user._id,
        isUsed: true
      });
      
      if (!hasAccess) {
        return res.status(403).json({ 
          success: false, 
          message: 'Access denied. You need a valid access code for this masterclass course.' 
        });
      }
    }

    // Increment view count
    course.views += 1;
    await course.save();

    res.status(200).json({
      success: true,
      course: course,
      contentType: 'destination'
    });
    
  } catch (error) {
    console.error('Error fetching course by destinationId:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching course details.',
      error: error.message
    });
  }
});

// Get single course by ID (works for both destination and document courses)
router.get('/courses/:id', authMiddleware, async (req, res) => {
  try {
    const courseId = req.params.id;
    
    // Try to find in destination courses first
    let course = await Course.findById(courseId);
    let contentType = 'destination';
    
    // If not found in destination, try document courses
    if (!course) {
      course = await DocumentCourse.findById(courseId);
      contentType = 'document';
    }
    
    if (!course || !course.isActive) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }
    
    // Check access for masterclass courses
    if (course.courseType === 'masterclass') {
      const hasAccess = await AccessCode.findOne({
        courseId: course._id,
        courseType: contentType,
        usedBy: req.user._id,
        isUsed: true
      });
      
      if (!hasAccess) {
        return res.status(403).json({ 
          success: false, 
          message: 'Access denied. You need a valid access code for this course.' 
        });
      }
    }
    
    // Increment view count
    course.views += 1;
    await course.save();
    
    res.json({ 
      success: true, 
      course,
      contentType 
    });
  } catch (error) {
    console.error('Error fetching course:', error);
    res.status(500).json({ success: false, message: 'Error fetching course' });
  }
});

// Validate access code for masterclass course
router.post('/courses/:id/validate-access', authMiddleware, async (req, res) => {
  try {
    const { accessCode } = req.body;
    const courseId = req.params.id;
    
    if (!accessCode) {
      return res.status(400).json({ success: false, message: 'Access code is required' });
    }
    
    // Try to find course in both collections
    let course = await Course.findById(courseId);
    let courseType = 'destination';
    
    if (!course) {
      course = await DocumentCourse.findById(courseId);
      courseType = 'document';
    }
    
    if (!course || course.courseType !== 'masterclass') {
      return res.status(404).json({ success: false, message: 'Course not found or not a masterclass course' });
    }
    
    // Find valid access code
    const accessRecord = await AccessCode.findOne({
      code: accessCode,
      courseId: courseId,
      courseType: courseType,
      isUsed: false,
      expiresAt: { $gt: new Date() }
    });
    
    if (!accessRecord) {
      return res.status(400).json({ success: false, message: 'Invalid or expired access code' });
    }
    
    // Mark code as used
    accessRecord.isUsed = true;
    accessRecord.usedBy = req.user._id;
    accessRecord.usedAt = new Date();
    await accessRecord.save();
    
    // Add to user's masterclass access records
    await User.findByIdAndUpdate(req.user._id, {
      $push: {
        masterclassAccess: {
          courseId: courseId,
          accessedAt: new Date(),
          accessCode: accessCode,
          courseType: courseType
        }
      }
    });
    
    // Reset notification count for this user for masterclass courses
    await User.findByIdAndUpdate(req.user._id, {
      $set: { masterclassCoursesCount: 0 }
    });
    
    res.json({
      success: true,
      message: 'Access granted successfully!',
      course: {
        id: course._id,
        title: course.name || course.title,
        courseType: course.courseType
      }
    });
  } catch (error) {
    console.error('Error validating access code:', error);
    res.status(500).json({ success: false, message: 'Error validating access code' });
  }
});

// Get user's notification counts for courses
router.get('/courses/notification-counts', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    res.json({
      success: true,
      generalCourses: user.generalCoursesCount || 0,
      masterclassCourses: user.masterclassCoursesCount || 0
    });
  } catch (error) {
    console.error('Error fetching course notification counts:', error);
    res.status(500).json({ success: false, message: 'Error fetching notification counts' });
  }
});

// Mark course notifications as read
router.post('/courses/mark-notifications-read', authMiddleware, async (req, res) => {
  try {
    const { courseType } = req.body;
    
    if (courseType === 'general') {
      await User.findByIdAndUpdate(req.user._id, {
        $set: { generalCoursesCount: 0 }
      });
    } else if (courseType === 'masterclass') {
      await User.findByIdAndUpdate(req.user._id, {
        $set: { masterclassCoursesCount: 0 }
      });
    }
    
    res.json({ success: true, message: 'Notifications marked as read' });
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    res.status(500).json({ success: false, message: 'Error marking notifications as read' });
  }
});

// Get user's accessible masterclass courses
router.get('/courses/my-masterclass', authMiddleware, async (req, res) => {
  try {
    const userAccess = await AccessCode.find({ 
      usedBy: req.user._id, 
      isUsed: true 
    }).populate('courseId');
    
    const accessibleCourses = [];
    
    for (const access of userAccess) {
      let course;
      if (access.courseType === 'destination') {
        course = await Course.findById(access.courseId);
      } else {
        course = await DocumentCourse.findById(access.courseId);
      }
      
      if (course && course.isActive) {
        accessibleCourses.push({
          ...course.toObject(),
          contentType: access.courseType,
          accessGranted: access.usedAt
        });
      }
    }
    
    res.json({
      success: true,
      courses: accessibleCourses,
      totalCount: accessibleCourses.length
    });
  } catch (error) {
    console.error('Error fetching user masterclass courses:', error);
    res.status(500).json({ success: false, message: 'Error fetching masterclass courses' });
  }
});

// Download course file (for document courses)
router.get('/courses/:id/download', authMiddleware, async (req, res) => {
  try {
    const course = await DocumentCourse.findById(req.params.id);
    
    if (!course || !course.isActive) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }
    
    // Check access for masterclass courses
    if (course.courseType === 'masterclass') {
      const hasAccess = await AccessCode.findOne({
        courseId: course._id,
        courseType: 'document',
        usedBy: req.user._id,
        isUsed: true
      });
      
      if (!hasAccess) {
        return res.status(403).json({ 
          success: false, 
          message: 'Access denied. You need a valid access code to download this course.' 
        });
      }
    }
    
    // Set headers for file download
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="${course.fileName}"`);
    res.setHeader('Content-Length', course.content.length);
    
    res.send(course.content);
  } catch (error) {
    console.error('Error downloading course:', error);
    res.status(500).json({ success: false, message: 'Error downloading course' });
  }
});

// Search courses
router.get('/courses/search/:query', authMiddleware, async (req, res) => {
  try {
    const { query } = req.params;
    const { type } = req.query;
    
    let destinationQuery = { 
      isActive: true,
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { about: { $regex: query, $options: 'i' } },
        { continent: { $regex: query, $options: 'i' } }
      ]
    };
    
    let documentQuery = { 
      isActive: true,
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } }
      ]
    };
    
    if (type === 'general') {
      destinationQuery.courseType = 'general';
      documentQuery.courseType = 'general';
    } else if (type === 'masterclass') {
      destinationQuery.courseType = 'masterclass';
      documentQuery.courseType = 'masterclass';
    }
    
    const [destinationCourses, documentCourses] = await Promise.all([
      Course.find(destinationQuery)
        .select('-fullCourseDetails')
        .limit(10),
      
      DocumentCourse.find(documentQuery)
        .select('-content')
        .limit(10)
    ]);
    
    const allCourses = [
      ...destinationCourses.map(course => ({
        ...course.toObject(),
        contentType: 'destination',
        title: course.name,
        description: course.about
      })),
      ...documentCourses.map(course => ({
        ...course.toObject(),
        contentType: 'document'
      }))
    ];
    
    res.json({
      success: true,
      courses: allCourses,
      totalCount: allCourses.length
    });
  } catch (error) {
    console.error('Error searching courses:', error);
    res.status(500).json({ success: false, message: 'Error searching courses' });
  }
});

// Get course statistics for dashboard
router.get('/courses/stats/overview', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied. Admin only.' });
    }
    
    const [
      totalCourses,
      generalCourses,
      masterclassCourses,
      totalViews,
      recentCourses
    ] = await Promise.all([
      Course.countDocuments({ isActive: true }) + DocumentCourse.countDocuments({ isActive: true }),
      Course.countDocuments({ courseType: 'general', isActive: true }) + DocumentCourse.countDocuments({ courseType: 'general', isActive: true }),
      Course.countDocuments({ courseType: 'masterclass', isActive: true }) + DocumentCourse.countDocuments({ courseType: 'masterclass', isActive: true }),
      Course.aggregate([{ $group: { _id: null, total: { $sum: '$views' } } }]),
      Course.find({ isActive: true })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('name createdAt views')
    ]);
    
    const stats = {
      totalCourses,
      generalCourses,
      masterclassCourses,
      totalViews: totalViews[0]?.total || 0,
      recentCourses
    };
    
    res.json({ success: true, stats });
  } catch (error) {
    console.error('Error fetching course statistics:', error);
    res.status(500).json({ success: false, message: 'Error fetching statistics' });
  }
});

module.exports = router;