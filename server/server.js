const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const mammoth = require('mammoth');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();

// Middleware - FINAL CORS CONFIGURATION FOR PRODUCTION
app.use(cors({
  origin: [
    "http://localhost:5173", 
    "http://localhost:5174",
    "https://travel-tour-app-seven.vercel.app", // Your ACTUAL frontend URL
    "https://travel-tour-backend-8erv.onrender.com" // Your backend URL
  ],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ENHANCED REQUEST LOGGING MIDDLEWARE
app.use((req, res, next) => {
  console.log(`🌐 ${req.method} ${req.path}`, {
    query: Object.keys(req.query).length > 0 ? req.query : undefined,
    body: Object.keys(req.body).length > 0 ? '***' : undefined,
    authorization: req.headers.authorization ? 'Bearer ***' : 'None'
  });
  next();
});

// Serve uploaded files statically
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/uploads/courses/images', express.static(path.join(__dirname, 'uploads', 'courses', 'images')));

// ADDED: Serve static files from React build
app.use(express.static(path.join(__dirname, '../dist')));

// Public Routes (no auth required)
const { router: authRouter, authMiddleware } = require('./routes/auth');
const messageRoutes = require('./routes/messages');

app.use('/api/auth', authRouter);
app.use('/api/messages', messageRoutes);

// ADDED: Community Routes
const communityRoutes = require('./routes/communityRoutes');
app.use('/api/community', communityRoutes);

// ADDED: API ENDPOINTS FOR CERTIFICATE ENHANCEMENT
// Get user by email
app.get('/api/users/email/:email', async (req, res) => {
  try {
    const email = req.params.email;
    console.log('🔍 Fetching user by email:', email);
    
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database temporarily unavailable'
      });
    }

    const db = mongoose.connection.db;
    const user = await db.collection('users').findOne({ email: email });
    
    if (!user) {
      console.log('❌ User not found for email:', email);
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Return only necessary fields for security
    const { _id, username, email: userEmail, name, role } = user;
    console.log('✅ User found:', username);
    
    res.json({
      success: true,
      user: { _id, username, email: userEmail, name, role }
    });
  } catch (error) {
    console.error('❌ Error fetching user by email:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user details',
      error: error.message
    });
  }
});

// ADDED: Get user by username for admin certificate enhancement
app.get('/api/users/username/:username', async (req, res) => {
  try {
    const username = req.params.username;
    console.log('🔍 Admin fetching user by username:', username);
    
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database temporarily unavailable'
      });
    }

    const db = mongoose.connection.db;
    const user = await db.collection('users').findOne({ username: username });
    
    if (!user) {
      console.log('❌ User not found for username:', username);
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Return only necessary fields for security
    const { _id, username: userUsername, email, name, role } = user;
    console.log('✅ User found by username:', userUsername);
    
    res.json({
      success: true,
      user: { _id, username: userUsername, email, name, role }
    });
  } catch (error) {
    console.error('❌ Error fetching user by username:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user details',
      error: error.message
    });
  }
});

// Get course details from general_course_questions collection
app.get('/api/courses/general/details', async (req, res) => {
  try {
    const { courseName } = req.query;
    
    console.log('🔍 Fetching course details for:', courseName);
    
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database temporarily unavailable'
      });
    }

    const db = mongoose.connection.db;
    
    // Search in general_course_questions collection
    const course = await db.collection('general_course_questions').findOne({ 
      $or: [
        { title: { $regex: courseName, $options: 'i' } },
        { description: { $regex: courseName, $options: 'i' } }
      ]
    });
    
    console.log('📊 Course search result:', course ? 'Found' : 'Not found');
    
    if (!course) {
      return res.status(404).json({ 
        success: false, 
        message: 'Course not found in general_course_questions' 
      });
    }
    
    // Return course details
    res.json({ 
      success: true, 
      course: { 
        _id: course._id,
        title: course.title,
        description: course.description,
        courseType: course.courseType
      } 
    });
  } catch (error) {
    console.error('❌ Error fetching course details:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching course details',
      error: error.message
    });
  }
});

// COURSE RESULTS ROUTES - PUBLIC (for quiz submissions)

// Submit course quiz results
app.post('/api/course-results', async (req, res) => {
  try {
    console.log('📥 Course quiz submission received');
    
    const { 
      answers, 
      userId, 
      userName, 
      courseId, 
      courseName, 
      courseType = 'general',
      score, 
      maxScore, 
      totalQuestions, 
      percentage, 
      timeTaken, 
      remark,
      questionSetId,
      questionSetTitle,
      questionSetType = 'general'
    } = req.body;
    
    console.log('📊 Course quiz data:', {
      userName,
      courseName,
      score,
      totalQuestions,
      percentage,
      courseType
    });

    // Validate required fields
    if (!userName || !courseName || score === undefined || !totalQuestions) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: userName, courseName, score, and totalQuestions are required'
      });
    }

    const CourseResult = require('./models/CourseResult');
    
    // Helper function to get remark based on percentage
    const getRemark = (percent) => {
      if (percent >= 90) return "Excellent";
      if (percent >= 80) return "Very Good";
      if (percent >= 70) return "Good";
      if (percent >= 60) return "Satisfactory";
      return "Needs Improvement";
    };

    // Create course result
    const courseResult = new CourseResult({
      userId: userId || 'anonymous',
      userName: userName,
      courseId: courseId || questionSetId || 'unknown-course',
      courseName: courseName,
      courseType: courseType,
      score: score,
      maxScore: maxScore || (totalQuestions * 5),
      totalQuestions: totalQuestions,
      percentage: percentage || Math.round((score / (maxScore || totalQuestions * 5)) * 100),
      timeTaken: timeTaken || 0,
      remark: remark || getRemark(percentage),
      answers: answers || [],
      questionSetId: questionSetId || 'unknown-set',
      questionSetTitle: questionSetTitle || courseName,
      questionSetType: questionSetType,
      scoringSystem: '5_points_per_question'
    });

    await courseResult.save();

    console.log(`✅ Course result saved: ${score}/${totalQuestions} (${courseResult.percentage}%) - ${courseResult.remark}`);

    res.json({
      success: true,
      message: 'Course quiz results saved successfully',
      resultId: courseResult._id,
      result: courseResult,
      collection: 'course_results'
    });

  } catch (error) {
    console.error('❌ Error saving course results:', error);
    res.status(500).json({
      success: false,
      message: 'Error saving course results',
      error: error.message
    });
  }
});

// Get course results for a specific user
app.get('/api/course-results/user/:userName', async (req, res) => {
  try {
    const userName = req.params.userName;
    console.log('📊 Fetching course results for user:', userName);
    
    const CourseResult = require('./models/CourseResult');
    
    const results = await CourseResult.find({ userName: userName })
      .sort({ createdAt: -1 });

    console.log(`✅ Found ${results.length} course results for user ${userName}`);

    res.json({
      success: true,
      results: results,
      total: results.length,
      collection: 'course_results'
    });

  } catch (error) {
    console.error('❌ Error fetching user course results:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching course results',
      error: error.message
    });
  }
});

// Get all course results (for admin)
app.get('/api/course-results', async (req, res) => {
  try {
    console.log('📊 Admin fetching all course results');
    
    const CourseResult = require('./models/CourseResult');
    
    const results = await CourseResult.find()
      .sort({ createdAt: -1 });

    console.log(`✅ Admin found ${results.length} course results total`);

    res.json({
      success: true,
      results: results,
      total: results.length,
      collection: 'course_results'
    });

  } catch (error) {
    console.error('❌ Error fetching all course results:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching course results',
      error: error.message
    });
  }
});

// Get course completion notifications count (for admin)
app.get('/api/course-results/notifications/count', async (req, res) => {
  try {
    const CourseResult = require('./models/CourseResult');
    
    const unreadCount = await CourseResult.countDocuments({ 
      readByAdmin: { $ne: true } 
    });

    console.log(`🔔 Course completion notifications count: ${unreadCount}`);

    res.json({
      success: true,
      count: unreadCount,
      message: 'Course completion notifications count retrieved'
    });

  } catch (error) {
    console.error('❌ Error counting course completion notifications:', error);
    res.json({
      success: true,
      count: 0
    });
  }
});

// Mark course results as read by admin
app.put('/api/course-results/mark-read', async (req, res) => {
  try {
    const { resultIds } = req.body;
    
    const CourseResult = require('./models/CourseResult');
    
    let updateResult;
    
    if (resultIds && Array.isArray(resultIds) && resultIds.length > 0) {
      // Mark specific results as read
      updateResult = await CourseResult.updateMany(
        { _id: { $in: resultIds } },
        { 
          $set: { 
            readByAdmin: true, 
            readAt: new Date() 
          } 
        }
      );
    } else {
      // Mark all unread results as read
      updateResult = await CourseResult.updateMany(
        { readByAdmin: { $ne: true } },
        { 
          $set: { 
            readByAdmin: true, 
            readAt: new Date() 
          } 
        }
      );
    }

    console.log(`✅ Marked ${updateResult.modifiedCount} course results as read`);

    res.json({
      success: true,
      message: `Marked ${updateResult.modifiedCount} course results as read`,
      modifiedCount: updateResult.modifiedCount
    });

  } catch (error) {
    console.error('❌ Error marking course results as read:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking course results as read',
      error: error.message
    });
  }
});

// CRITICAL FIX: ADD NOTIFICATION COUNTS ROUTE BEFORE COURSE-BY-ID ROUTE
app.get('/api/courses/notification-counts', async (req, res) => {
  try {
    console.log('🔔 Fetching course notification counts');
    
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database temporarily unavailable'
      });
    }

    const DocumentCourse = require('./models/DocumentCourse');
    
    // Count general courses
    const generalCoursesCount = await DocumentCourse.countDocuments({ 
      courseType: 'general',
      isActive: true 
    });
    
    // Count masterclass courses  
    const masterclassCoursesCount = await DocumentCourse.countDocuments({ 
      courseType: 'masterclass',
      isActive: true 
    });

    console.log(`✅ Course counts - General: ${generalCoursesCount}, Masterclass: ${masterclassCoursesCount}`);

    res.json({
      success: true,
      counts: {
        generalCourses: generalCoursesCount,
        masterclassCourses: masterclassCoursesCount,
        quizScores: 0,
        courseRemarks: 0,
        importantInfo: 0,
        adminMessages: 0
      },
      generalCourses: generalCoursesCount,
      masterclassCourses: masterclassCoursesCount,
      message: 'Course notification counts retrieved successfully'
    });

  } catch (error) {
    console.error('❌ Error fetching course notification counts:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching notification counts',
      error: error.message,
      counts: {
        generalCourses: 0,
        masterclassCourses: 0,
        quizScores: 0,
        courseRemarks: 0,
        importantInfo: 0,
        adminMessages: 0
      }
    });
  }
});

// CRITICAL FIX: ADD ADMIN MESSAGES ROUTE
app.get('/api/notifications/admin-messages/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    console.log('📨 Fetching admin messages for user:', userId);
    
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database temporarily unavailable'
      });
    }

    // For now, return empty messages - you can implement real message fetching later
    console.log(`✅ Admin messages count for user ${userId}: 0`);

    res.json({
      success: true,
      unreadCount: 0,
      messages: [],
      message: 'Admin messages retrieved successfully'
    });

  } catch (error) {
    console.error('❌ Error fetching admin messages:', error);
    res.json({
      success: true,
      unreadCount: 0,
      messages: []
    });
  }
});

// ADD: Course viewing routes
app.get('/api/courses/:id', async (req, res) => {
  try {
    const courseId = req.params.id;
    console.log('📖 Fetching course details:', courseId);
    
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database temporarily unavailable'
      });
    }

    const DocumentCourse = require('./models/DocumentCourse');
    const course = await DocumentCourse.findById(courseId);
    
    if (!course) {
      console.log('❌ Course not found:', courseId);
      return res.status(404).json({ 
        success: false, 
        message: 'Course not found' 
      });
    }

    console.log('✅ Course found:', course.title);
    
    res.json({
      success: true,
      course: course,
      message: 'Course details retrieved successfully'
    });

  } catch (error) {
    console.error('❌ Error fetching course:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching course details',
      error: error.message
    });
  }
});

// ADD: Get courses by type with pagination
app.get('/api/courses', async (req, res) => {
  try {
    const { type, page = 1, limit = 50 } = req.query;
    console.log('📚 Fetching courses:', { type, page, limit });
    
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database temporarily unavailable'
      });
    }

    const DocumentCourse = require('./models/DocumentCourse');
    
    // Build query
    let query = {};
    if (type && type !== 'all') {
      query.courseType = type;
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get courses with pagination
    const courses = await DocumentCourse.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    // Get total count
    const totalCount = await DocumentCourse.countDocuments(query);

    console.log(`✅ Found ${courses.length} ${type || 'all'} courses`);

    res.json({
      success: true,
      courses: courses,
      totalCount: totalCount,
      currentPage: pageNum,
      totalPages: Math.ceil(totalCount / limitNum),
      message: `${type || 'All'} courses retrieved successfully`
    });

  } catch (error) {
    console.error('❌ Error fetching courses:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching courses',
      error: error.message
    });
  }
});

// ADD: Validate masterclass access route
app.post('/api/courses/validate-masterclass-access', async (req, res) => {
  try {
    const { accessCode } = req.body;
    console.log('🔐 Validating masterclass access code:', accessCode);
    
    // Simple validation - you can replace this with your actual validation logic
    const validCodes = ['MASTER2024', 'PREMIUM123', 'ACCESS789'];
    
    if (validCodes.includes(accessCode)) {
      res.json({
        success: true,
        message: 'Access granted to masterclass courses',
        access: true
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Invalid access code',
        access: false
      });
    }

  } catch (error) {
    console.error('❌ Error validating access code:', error);
    res.status(500).json({
      success: false,
      message: 'Error validating access code',
      error: error.message
    });
  }
});

// ADD: Notification endpoint for quiz scores
app.put('/api/notifications/mark-read', async (req, res) => {
  try {
    const { type, userId } = req.body;
    
    console.log(`🔔 Marking ${type} notifications as read for user: ${userId}`);
    
    res.json({
      success: true,
      message: `Marked ${type} notifications as read for user ${userId}`,
      marked: true
    });
    
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking notifications as read'
    });
  }
});

// Test routes (no auth required)
app.get('/api/test', (req, res) => {
  res.json({ 
    success: true,
    message: 'Server is working!',
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    collections: {
      quiz_questions: 'Exists (120 documents)',
      quiz_results: 'Exists (3 documents)',
      courses: 'Exists (6 documents)',
      users: 'Exists (4 documents)',
      course_results: 'Exists (new collection)',
      general_course_questions: 'Exists (2 documents)'
    }
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    server: 'Running',
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/debug-routes', (req, res) => {
  const routes = [
    // NEW ENDPOINTS FOR CERTIFICATE ENHANCEMENT
    '/api/users/email/:email',
    '/api/users/username/:username',
    '/api/courses/general/details',
    
    // Course Results Routes
    '/api/course-results',
    '/api/course-results/user/:userName',
    '/api/course-results/notifications/count',
    '/api/course-results/mark-read',
    
    '/api/courses/notification-counts',
    '/api/notifications/admin-messages/:userId',
    '/api/courses/:id',
    '/api/courses',
    '/api/courses/validate-masterclass-access',
    '/api/messages/sent',
    '/api/messages/send-to-admin', 
    '/api/messages/test',
    '/api/messages/test-open',
    '/api/messages/debug-all',
    '/api/debug/auth-test',
    '/api/debug/messages-sent',
    '/api/debug-routes',
    '/api/health',
    '/api/test',
    '/api/quiz/questions',
    '/api/quiz/submit',
    '/api/quiz/results',
    '/api/quiz/results/:id',
    '/api/quiz/results/admin',
    '/api/notifications/counts',
    '/api/notifications/mark-admin-messages-read',
    '/api/notifications/mark-read',
    '/api/direct-courses/:id/view',
    '/api/debug/quiz-by-destination',
    // Course management routes
    '/api/admin/upload-general-questions',
    '/api/admin/upload-masterclass-questions',
    '/api/user/general-course-results',
    '/api/user/masterclass-course-results',
    '/api/admin/all-course-results',
    '/api/admin/course-completed-notifications',
    '/api/admin/mark-course-completed-read',
    // Course questions routes
    '/api/general-course-questions',
    '/api/masterclass-course-questions',
    // Community routes
    '/api/community/messages',
    '/api/community/active-call'
  ];
  
  console.log('🐛 DEBUG: Listing available routes');
  
  res.json({
    success: true,
    availableRoutes: routes,
    timestamp: new Date().toISOString(),
    message: 'Visit these routes to test different endpoints'
  });
});

app.get('/api/direct-courses/:id/view', async (req, res) => {
  try {
    // Check database connection first
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database temporarily unavailable. Please try again later.'
      });
    }

    const courseId = req.params.id;
    console.log('🎯 DIRECT ROUTE: Reading course:', courseId);
    
    const DocumentCourse = require('./models/DocumentCourse');
    const course = await DocumentCourse.findById(courseId);
    
    if (!course) {
      console.log('❌ Course not found in database');
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    console.log('✅ Course found:', course.title);
    
    // Check if course has HTML content with images
    if (course.htmlContent && course.htmlContent.length > 100) {
      console.log('📷 Returning HTML content with embedded images');
      return res.json({
        success: true,
        content: course.htmlContent,
        contentType: 'html',
        title: course.title,
        canViewInApp: true,
        source: 'html-content',
        contentLength: course.htmlContent.length,
        hasImages: true
      });
    }

    // File matching logic remains the same...
    const uploadsPath = path.join(__dirname, 'uploads/courses');
    const files = fs.readdirSync(uploadsPath);
    
    let actualFilePath = null;
    let actualFileName = null;

    // STRATEGY 1: Check storedFileName
    if (course.storedFileName) {
      const storedFilePath = path.join(uploadsPath, course.storedFileName);
      if (fs.existsSync(storedFilePath)) {
        actualFileName = course.storedFileName;
        actualFilePath = storedFilePath;
      }
    }

    // If no file found, return error
    if (!actualFilePath || !fs.existsSync(actualFilePath)) {
      return res.json({
        success: false,
        content: `No matching document file found for: ${course.title}`,
        contentType: 'error'
      });
    }

    // Convert file content
    try {
      const result = await mammoth.convertToHtml({ path: actualFilePath });
      const htmlContent = result.value;
      
      if (htmlContent && htmlContent.length > 10) {
        await DocumentCourse.findByIdAndUpdate(courseId, { htmlContent: htmlContent });
        return res.json({
          success: true,
          content: htmlContent,
          contentType: 'html',
          title: course.title,
          canViewInApp: true,
          source: 'html-conversion',
          contentLength: htmlContent.length,
          hasImages: htmlContent.includes('<img') || htmlContent.includes('image')
        });
      }
    } catch (conversionError) {
      console.error('❌ DOCX conversion failed:', conversionError);
      return res.json({
        success: true,
        content: 'Error reading document. Please try again later.',
        contentType: 'error'
      });
    }

  } catch (error) {
    console.error('💥 Direct route error:', error);
    res.status(500).json({
      success: false,
      message: 'Error loading course content'
    });
  }
});

// ADDED: Route to fetch general course questions
app.get('/api/general-course-questions', async (req, res) => {
  try {
    console.log('📝 Fetching general course questions');
    
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database temporarily unavailable'
      });
    }

    const db = mongoose.connection.db;
    
    // Fetch all general course questions
    const questionSets = await db.collection('general_course_questions')
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    console.log(`✅ Found ${questionSets.length} general course question sets`);

    res.json({
      success: true,
      questionSets: questionSets,
      total: questionSets.length,
      message: 'General course questions retrieved successfully'
    });

  } catch (error) {
    console.error('❌ Error fetching general course questions:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching general course questions',
      error: error.message
    });
  }
});

// ADDED: Route to fetch masterclass course questions
app.get('/api/masterclass-course-questions', async (req, res) => {
  try {
    console.log('📝 Fetching masterclass course questions');
    
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database temporarily unavailable'
      });
    }

    const db = mongoose.connection.db;
    
    // Fetch all masterclass course questions
    const questionSets = await db.collection('masterclass_course_questions')
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    console.log(`✅ Found ${questionSets.length} masterclass course question sets`);

    res.json({
      success: true,
      questionSets: questionSets,
      total: questionSets.length,
      message: 'Masterclass course questions retrieved successfully'
    });

  } catch (error) {
    console.error('❌ Error fetching masterclass course questions:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching masterclass course questions',
      error: error.message
    });
  }
});

// QUIZ ROUTES - FIXED: FILTER BY COURSE/DESTINATION
app.get('/api/quiz/questions', async (req, res) => {
  try {
    const { courseId, destinationId, destination } = req.query;
    
    console.log('📝 Fetching quiz questions for:', { courseId, destinationId, destination });
    
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        success: false,
        message: 'Database temporarily unavailable'
      });
    }

    const db = mongoose.connection.db;
    
    // FIX: Build query to filter by course/destination
    let query = {};
    
    if (courseId && mongoose.Types.ObjectId.isValid(courseId)) {
      // If courseId is provided, filter by courseRef
      query.courseRef = new mongoose.Types.ObjectId(courseId);
    } else if (destinationId) {
      // If destinationId is provided, filter by destinationId
      query.destinationId = destinationId;
    } else if (destination) {
      // If destination name is provided, filter by destination name
      query.destinationId = destination;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Either courseId, destinationId, or destination query parameter is required'
      });
    }
    
    console.log('🔍 Query filter:', query);
    
    const questions = await db.collection('quiz_questions')
      .find(query)
      .limit(20)
      .toArray();
    
    console.log(`✅ Found ${questions.length} questions for the specified course/destination`);
    
    if (questions.length === 0) {
      console.log('⚠️ No questions found for this course/destination, returning sample questions');
      
      // Return sample questions as fallback
      const sampleQuestions = [
        {
          id: new mongoose.Types.ObjectId(),
          question: "What is the capital city?",
          options: ["Option 1", "Option 2", "Option 3", "Option 4"],
          explanation: "Sample explanation"
        }
      ];
      
      return res.json({
        success: true,
        questions: sampleQuestions,
        total: sampleQuestions.length,
        message: "Using sample questions - no specific questions found for this destination",
        filteredBy: query
      });
    }
    
    // FIX: Include the correct answer index for frontend comparison
    const formattedQuestions = questions.map(q => {
      // Find the index of the correct answer in the options array
      const correctIndex = q.options.findIndex(option => option === q.correctAnswer);
      
      return {
        id: q._id,
        question: q.question,
        options: q.options || [],
        correctAnswer: correctIndex, // CRITICAL FIX: Send index instead of text
        explanation: q.explanation
      };
    });
    
    res.json({
      success: true,
      questions: formattedQuestions,
      total: formattedQuestions.length,
      filteredBy: query,
      collection: 'quiz_questions'
    });

  } catch (error) {
    console.error('❌ Error fetching quiz questions:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching quiz questions',
      error: error.message
    });
  }
});

// QUIZ SUBMIT ROUTE - ORIGINAL
app.post('/api/quiz/submit', async (req, res) => {
  try {
    console.log('📥 Quiz submission received via /api/quiz/submit');
    
    const { answers, userId, userName, courseId, courseName, destination } = req.body;
    
    if (!answers || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: answers and userId are required'
      });
    }

    const db = mongoose.connection.db;
    const QuizResult = require('./models/QuizResult');

    let score = 0;
    const questionResults = [];

    for (const answer of answers) {
      // FIX: Ensure we're checking questions from the correct course
      const questionQuery = { 
        _id: new mongoose.Types.ObjectId(answer.questionId)
      };
      
      // Add course filtering to ensure we're scoring the right questions
      if (courseId && mongoose.Types.ObjectId.isValid(courseId)) {
        questionQuery.courseRef = new mongoose.Types.ObjectId(courseId);
      } else if (destination) {
        questionQuery.destinationId = destination;
      }
      
      const question = await db.collection('quiz_questions').findOne(questionQuery);
      
      if (question) {
        // FIX: Compare based on option indexes, not text
        const correctIndex = question.options.findIndex(option => option === question.correctAnswer);
        const isCorrect = correctIndex === answer.selectedAnswer;
        
        if (isCorrect) score++;
        
        questionResults.push({
          questionId: answer.questionId,
          questionText: question.question,
          selectedAnswer: answer.selectedAnswer,
          correctAnswer: correctIndex, // Store index for frontend
          correctAnswerText: question.correctAnswer, // Keep text for explanation
          isCorrect: isCorrect,
          options: question.options || [],
          explanation: question.explanation
        });
      }
    }

    const totalQuestions = answers.length;
    const percentage = Math.round((score / totalQuestions) * 100);

    const quizResult = new QuizResult({
      userId: userId,
      userName: userName,
      courseId: courseId,
      courseName: courseName || destination,
      score: score,
      totalQuestions: totalQuestions,
      percentage: percentage,
      answers: questionResults,
      submittedAt: new Date()
    });

    await quizResult.save();

    console.log(`✅ Quiz result saved via /api/quiz/submit: ${score}/${totalQuestions} (${percentage}%)`);

    res.json({
      success: true,
      score: score,
      totalQuestions: totalQuestions,
      percentage: percentage,
      resultId: quizResult._id,
      answers: questionResults, // Return detailed results for frontend display
      collection: 'quiz_results'
    });

  } catch (error) {
    console.error('❌ Error submitting quiz via /api/quiz/submit:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting quiz',
      error: error.message
    });
  }
});

// ADDED: QUIZ SUBMIT ROUTE - COMPATIBILITY ROUTE (for frontend using /api/quiz/results)
app.post('/api/quiz/results', async (req, res) => {
  try {
    console.log('📥 Quiz submission received via /api/quiz/results');
    
    const { 
      answers, 
      userId, 
      userName, 
      courseId, 
      courseName, 
      destination, 
      score, 
      totalQuestions, 
      percentage, 
      timeTaken, 
      remark 
    } = req.body;
    
    if (!answers || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: answers and userId are required'
      });
    }

    const db = mongoose.connection.db;
    const QuizResult = require('./models/QuizResult');

    let calculatedScore = score || 0;
    const questionResults = [];

    // If score is not provided, calculate it from answers
    if (score === undefined) {
      for (const answer of answers) {
        const questionQuery = { 
          _id: new mongoose.Types.ObjectId(answer.questionId)
        };
        
        if (courseId && mongoose.Types.ObjectId.isValid(courseId)) {
          questionQuery.courseRef = new mongoose.Types.ObjectId(courseId);
        } else if (destination) {
          questionQuery.destinationId = destination;
        }
        
        const question = await db.collection('quiz_questions').findOne(questionQuery);
        
        if (question) {
          const correctIndex = question.options.findIndex(option => option === question.correctAnswer);
          const isCorrect = correctIndex === answer.selectedAnswer;
          
          if (isCorrect) calculatedScore++;
          
          questionResults.push({
            questionId: answer.questionId,
            questionText: question.question,
            selectedAnswer: answer.selectedAnswer,
            correctAnswer: correctIndex,
            correctAnswerText: question.correctAnswer,
            isCorrect: isCorrect,
            options: question.options || [],
            explanation: question.explanation
          });
        }
      }
    } else {
      // Use the provided answers directly
      questionResults.push(...answers);
    }

    const finalTotalQuestions = totalQuestions || answers.length;
    const finalPercentage = percentage || Math.round((calculatedScore / finalTotalQuestions) * 100);
    const finalTimeTaken = timeTaken || 0;
    
    // FIX: Determine remark if not provided
    const getRemark = (percent) => {
      if (percent >= 80) return "Excellent";
      if (percent >= 60) return "Good";
      if (percent >= 40) return "Fair";
      return "Needs Improvement";
    };
    
    const finalRemark = remark || getRemark(finalPercentage);

    // FIX: Create quiz result with ALL required fields
    const quizResult = new QuizResult({
      userId: userId,
      userName: userName,
      courseId: courseId,
      courseName: courseName || destination,
      destination: destination,
      score: calculatedScore,
      totalQuestions: finalTotalQuestions,
      percentage: finalPercentage,
      timeTaken: finalTimeTaken,
      remark: finalRemark,
      answers: questionResults,
      status: "completed",
      date: new Date(),
      submittedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await quizResult.save();

    console.log(`✅ Quiz result saved: ${calculatedScore}/${finalTotalQuestions} (${finalPercentage}%) - ${finalRemark}`);

    res.json({
      success: true,
      score: calculatedScore,
      totalQuestions: finalTotalQuestions,
      percentage: finalPercentage,
      timeTaken: finalTimeTaken,
      remark: finalRemark,
      resultId: quizResult._id,
      answers: questionResults,
      collection: 'quiz_results',
      message: 'Quiz results saved successfully'
    });

  } catch (error) {
    console.error('❌ Error submitting quiz via /api/quiz/results:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting quiz',
      error: error.message
    });
  }
});

// FIXED: Quiz results route - REMOVED .select('-answers') to include question breakdown
app.get('/api/quiz/results', async (req, res) => {
  try {
    const userId = req.query.userId;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId query parameter is required'
      });
    }

    const QuizResult = require('./models/QuizResult');
    
    // CRITICAL FIX: REMOVED .select('-answers') to INCLUDE detailed answers
    const results = await QuizResult.find({ userId: userId })
      .sort({ submittedAt: -1 });

    console.log(`✅ Found ${results.length} quiz results for user ${userId}`);

    res.json({
      success: true,
      results: results,
      total: results.length,
      collection: 'quiz_results'
    });

  } catch (error) {
    console.error('❌ Error fetching quiz results:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching quiz results',
      error: error.message
    });
  }
});

// ADDED: ADMIN QUIZ RESULTS ROUTE
app.get('/api/quiz/results/admin', async (req, res) => {
  try {
    console.log('📊 Admin fetching all quiz results');
    
    const QuizResult = require('./models/QuizResult');
    
    // Get all quiz results with user information
    const results = await QuizResult.find()
      .sort({ submittedAt: -1 })
      .populate('userId', 'username email'); // Populate user details if needed

    console.log(`✅ Admin found ${results.length} quiz results total`);

    res.json({
      success: true,
      results: results,
      total: results.length,
      totalCount: results.length, // ADDED: For frontend compatibility
      collection: 'quiz_results',
      message: 'Admin quiz results retrieved successfully'
    });

  } catch (error) {
    console.error('❌ Error fetching admin quiz results:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching admin quiz results',
      error: error.message
    });
  }
});

app.get('/api/quiz/results/:id', async (req, res) => {
  try {
    const resultId = req.params.id;
    
    const QuizResult = require('./models/QuizResult');
    
    const result = await QuizResult.findById(resultId);
    
    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Quiz result not found'
      });
    }

    console.log(`✅ Found detailed quiz result: ${resultId}`);

    res.json({
      success: true,
      result: result,
      collection: 'quiz_results'
    });

  } catch (error) {
    console.error('❌ Error fetching quiz result details:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching quiz result details',
      error: error.message
    });
  }
});

app.get('/api/notifications/counts', async (req, res) => {
  try {
    const userIdentifier = req.query.userId || 'default';
    const userRole = req.query.userRole || 'student';

    // Get course counts
    const DocumentCourse = require('./models/DocumentCourse');
    const generalCoursesCount = await DocumentCourse.countDocuments({ 
      courseType: 'general',
      isActive: true 
    });
    
    const masterclassCoursesCount = await DocumentCourse.countDocuments({ 
      courseType: 'masterclass',
      isActive: true 
    });

    const counts = {
      quizScores: 0,
      courseRemarks: 0,
      generalCourses: generalCoursesCount,
      masterclassCourses: masterclassCoursesCount,
      importantInfo: 0,
      adminMessages: 0,
      quizCompleted: 0,
      courseCompleted: 0,
      messagesFromStudents: 0
    };

    console.log(`✅ Notification counts - General: ${generalCoursesCount}, Masterclass: ${masterclassCoursesCount}`);

    res.json({
      success: true,
      counts: counts,
      user: userIdentifier
    });

  } catch (error) {
    console.error('Error in notification counts:', error);
    res.json({
      success: true,
      counts: {
        quizScores: 0,
        courseRemarks: 0,
        generalCourses: 0,
        masterclassCourses: 0,
        importantInfo: 0,
        adminMessages: 0,
        quizCompleted: 0,
        courseCompleted: 0,
        messagesFromStudents: 0
      }
    });
  }
});

// ADDED: MARK ADMIN MESSAGES AS READ ROUTE
app.put('/api/notifications/mark-admin-messages-read', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    
    console.log(`🔒 MARKING admin messages as read for user: ${userId}`);
    
    // Mark all unread admin messages as read
    const Message = require('./models/Message');
    const result = await Message.updateMany(
      { 
        toStudent: userId,
        read: false 
      },
      { 
        read: true,
        readAt: new Date()
      }
    );

    // Reset unread message count
    const User = require('./models/User');
    await User.findByIdAndUpdate(userId, {
      unreadMessages: 0,
      adminMessageCount: 0
    });

    res.json({
      success: true,
      message: `Marked ${result.modifiedCount} admin messages as read`,
      modifiedCount: result.modifiedCount
    });

  } catch (error) {
    console.error('Error marking admin messages as read:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking messages as read'
    });
  }
});

// ADDED: MARK READ ENDPOINT FOR ADMIN
app.put('/api/quiz/results/mark-read', async (req, res) => {
  try {
    const { resultIds } = req.body;
    
    console.log(`🔔 Marking quiz results as read:`, resultIds);
    
    // FIX: Make resultIds optional - if not provided, mark all as read
    if (!resultIds || !Array.isArray(resultIds) || resultIds.length === 0) {
      console.log('⚠️ No specific resultIds provided, marking all results as read');
      
      const QuizResult = require('./models/QuizResult');
      const updateResult = await QuizResult.updateMany(
        { readByAdmin: { $ne: true } },
        { $set: { readByAdmin: true, readAt: new Date() } }
      );

      console.log(`✅ Marked ${updateResult.modifiedCount} quiz results as read`);

      return res.json({
        success: true,
        message: `Marked ${updateResult.modifiedCount} quiz results as read`,
        modifiedCount: updateResult.modifiedCount
      });
    }

    const QuizResult = require('./models/QuizResult');
    
    // Mark specific results as read
    const updateResult = await QuizResult.updateMany(
      { _id: { $in: resultIds } },
      { $set: { readByAdmin: true, readAt: new Date() } }
    );

    console.log(`✅ Marked ${updateResult.modifiedCount} quiz results as read`);

    res.json({
      success: true,
      message: `Marked ${updateResult.modifiedCount} quiz results as read`,
      modifiedCount: updateResult.modifiedCount
    });

  } catch (error) {
    console.error('Error marking quiz results as read:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking quiz results as read',
      error: error.message
    });
  }
});

// All routes after this middleware will require authentication
app.use(authMiddleware);

// ADDED: COURSE MANAGEMENT ROUTES - MOVED AFTER AUTH MIDDLEWARE
// Admin routes for question upload
app.post('/api/admin/upload-general-questions', async (req, res) => {
  try {
    const { title, description, questions } = req.body;
    
    const db = mongoose.connection.db;
    const result = await db.collection('general_course_questions').insertOne({
      title,
      description,
      questions,
      courseType: 'general',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    res.json({
      success: true,
      message: 'General course questions uploaded successfully',
      questionSetId: result.insertedId
    });
  } catch (error) {
    console.error('Error uploading general questions:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading questions'
    });
  }
});

app.post('/api/admin/upload-masterclass-questions', async (req, res) => {
  try {
    const { title, description, questions } = req.body;
    
    const db = mongoose.connection.db;
    const result = await db.collection('masterclass_course_questions').insertOne({
      title,
      description,
      questions,
      courseType: 'masterclass',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    res.json({
      success: true,
      message: 'Masterclass course questions uploaded successfully',
      questionSetId: result.insertedId
    });
  } catch (error) {
    console.error('Error uploading masterclass questions:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading questions'
    });
  }
});

// Routes for fetching results - NOW AFTER AUTH MIDDLEWARE
app.get('/api/user/general-course-results', async (req, res) => {
  try {
    const userId = req.user._id;
    
    const db = mongoose.connection.db;
    const results = await db.collection('general_course_results')
      .find({ userId })
      .sort({ date: -1 })
      .toArray();

    res.json({
      success: true,
      results: results
    });
  } catch (error) {
    console.error('Error fetching general course results:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching results'
    });
  }
});

app.get('/api/user/masterclass-course-results', async (req, res) => {
  try {
    const userId = req.user._id;
    
    const db = mongoose.connection.db;
    const results = await db.collection('masterclass_course_results')
      .find({ userId })
      .sort({ date: -1 })
      .toArray();

    res.json({
      success: true,
      results: results
    });
  } catch (error) {
    console.error('Error fetching masterclass course results:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching results'
    });
  }
});

app.get('/api/admin/all-course-results', async (req, res) => {
  try {
    const db = mongoose.connection.db;
    
    // Combine results from both collections
    const generalResults = await db.collection('general_course_results')
      .find()
      .sort({ date: -1 })
      .toArray();

    const masterclassResults = await db.collection('masterclass_course_results')
      .find()
      .sort({ date: -1 })
      .toArray();

    const allResults = [
      ...generalResults.map(r => ({ ...r, courseType: 'general' })),
      ...masterclassResults.map(r => ({ ...r, courseType: 'masterclass' }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({
      success: true,
      results: allResults
    });
  } catch (error) {
    console.error('Error fetching all course results:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching results'
    });
  }
});

// Notification routes
app.get('/api/admin/course-completed-notifications', async (req, res) => {
  try {
    // This would typically count unread submissions
    const db = mongoose.connection.db;
    const count = await db.collection('general_course_results')
      .countDocuments({ readByAdmin: { $ne: true } }) +
      await db.collection('masterclass_course_results')
      .countDocuments({ readByAdmin: { $ne: true } });

    res.json({
      success: true,
      count: count
    });
  } catch (error) {
    console.error('Error counting notifications:', error);
    res.json({
      success: true,
      count: 0
    });
  }
});

app.put('/api/admin/mark-course-completed-read', async (req, res) => {
  try {
    const db = mongoose.connection.db;
    
    await db.collection('general_course_results').updateMany(
      { readByAdmin: { $ne: true } },
      { $set: { readByAdmin: true, readAt: new Date() } }
    );
    
    await db.collection('masterclass_course_results').updateMany(
      { readByAdmin: { $ne: true } },
      { $set: { readByAdmin: true, readAt: new Date() } }
    );

    res.json({
      success: true,
      message: 'All course completions marked as read'
    });
  } catch (error) {
    console.error('Error marking as read:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking as read'
    });
  }
});

// Authenticated Routes
const courseRoutes = require('./routes/courses');
const adminRoutes = require('./routes/admin');

app.use('/api', courseRoutes);
app.use('/api', adminRoutes);

// DEBUG ROUTE - Add this to test messages
app.get('/api/debug/messages-sent', async (req, res) => {
  try {
    console.log('🐛 DEBUG: Testing messages/sent route');
    
    // Simple auth check
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token' });
    }
    
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    console.log('🐛 DEBUG: Token decoded for user:', decoded.id);
    
    res.json({
      success: true,
      debug: {
        message: 'Debug route working',
        userId: decoded.id,
        route: '/api/debug/messages-sent'
      }
    });
  } catch (error) {
    console.error('🐛 DEBUG Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ADDED: DEBUG AUTH TEST ROUTE
app.get('/api/debug/auth-test', async (req, res) => {
  try {
    console.log('🐛 DEBUG: Testing authentication...');
    
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }
    
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    
    const User = require('./models/User');
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      debug: {
        message: 'Authentication successful',
        userId: decoded.id,
        username: user.username,
        role: user.role,
        active: user.active,
        tokenLength: token.length
      }
    });
  } catch (error) {
    console.error('🐛 DEBUG Auth Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// QUIZ COLLECTION DEBUG ROUTE
app.get('/api/debug/quiz-collections', async (req, res) => {
  try {
    console.log('🐛 DEBUG: Checking quiz collections...');
    
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ success: false, message: 'Database not connected' });
    }

    const db = mongoose.connection.db;
    
    // List all collections
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(col => col.name);
    
    console.log('📊 Available collections:', collectionNames);
    
    // Check quiz_questions collection
    const quizQuestionsCount = await db.collection('quiz_questions').countDocuments();
    const quizResultsCount = await db.collection('quiz_results').countDocuments();
    const courseResultsCount = await db.collection('course_results').countDocuments();
    
    // Sample questions
    const sampleQuestions = await db.collection('quiz_questions').find().limit(2).toArray();
    
    res.json({
      success: true,
      collections: {
        available: collectionNames,
        quiz_questions: {
          exists: collectionNames.includes('quiz_questions'),
          documentCount: quizQuestionsCount,
          sample: sampleQuestions
        },
        quiz_results: {
          exists: collectionNames.includes('quiz_results'),
          documentCount: quizResultsCount
        },
        course_results: {
          exists: collectionNames.includes('course_results'),
          documentCount: courseResultsCount
        },
        questions: {
          exists: collectionNames.includes('questions'),
          documentCount: await db.collection('questions').countDocuments().catch(() => 0)
        }
      }
    });

  } catch (error) {
    console.error('🐛 DEBUG Quiz Collections Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ADDED: DEBUG ROUTE TO CHECK QUESTIONS BY DESTINATION
app.get('/api/debug/quiz-by-destination', async (req, res) => {
  try {
    const db = mongoose.connection.db;
    
    // Get all unique destinations with question counts
    const destinations = await db.collection('quiz_questions').aggregate([
      {
        $group: {
          _id: '$destinationId',
          questionCount: { $sum: 1 },
          courseRefs: { $addToSet: '$courseRef' }
        }
      },
      { $sort: { _id: 1 } }
    ]).toArray();
    
    // Sample questions for each destination
    const destinationSamples = {};
    
    for (const dest of destinations) {
      const sampleQuestions = await db.collection('quiz_questions')
        .find({ destinationId: dest._id })
        .limit(2)
        .toArray();
      
      destinationSamples[dest._id] = {
        count: dest.questionCount,
        sample: sampleQuestions.map(q => ({
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer
        }))
      };
    }
    
    res.json({
      success: true,
      destinations: destinations,
      samples: destinationSamples
    });

  } catch (error) {
    console.error('🐛 DEBUG Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ADDED: Handle client-side routing - MUST BE AFTER ALL API ROUTES BUT BEFORE ERROR HANDLERS
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  }
});

// IMPROVED MONGODB CONNECTION WITH RETRY LOGIC
const connectWithRetry = async (retries = 5, delay = 5000) => {
  console.log('🔄 Attempting to connect to MongoDB...');
  
  const mongooseOptions = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
    retryWrites: true,
    w: 'majority'
  };

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await mongoose.connect(process.env.MONGODB_URI, mongooseOptions);
      console.log('✅ MongoDB Atlas connected successfully');
      
      // Initialize database
      await initializeDatabase();
      return true;
      
    } catch (error) {
      console.log(`❌ MongoDB connection attempt ${attempt}/${retries} failed:`, error.message);
      
      if (attempt < retries) {
        console.log(`🔄 Retrying in ${delay/1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        // Increase delay for next attempt
        delay *= 1.5;
      } else {
        console.log('💥 All connection attempts failed');
        console.log('\n🔧 TROUBLESHOOTING STEPS:');
        console.log('1. Check your MONGODB_URI in .env file');
        console.log('2. Whitelist your IP in MongoDB Atlas');
        console.log('3. Check internet connection');
        console.log('4. Verify database user credentials');
        return false;
      }
    }
  }
};

// Initialize database collections and indexes
const initializeDatabase = async () => {
  try {
    const db = mongoose.connection.db;
    console.log('✅ Native MongoDB driver instance available');

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(__dirname, 'uploads');
    const coursesDir = path.join(uploadsDir, 'courses');
    const imagesDir = path.join(coursesDir, 'images');
    
    [uploadsDir, coursesDir, imagesDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`✅ Created directory: ${dir}`);
      }
    });

    console.log('✅ Database initialization complete');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
  }
};

// DATABASE CONNECTION MIDDLEWARE
const requireDatabase = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      message: 'Database temporarily unavailable. Please try again later.'
    });
  }
  next();
};

console.log('🔄 Loading routes...');

console.log('✅ Routes loaded successfully');

// ENHANCED ERROR HANDLING
app.use((error, req, res, next) => {
  console.error('💥 Server error:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method
  });
  
  // MongoDB specific errors
  if (error.name.includes('Mongo') || error.name.includes('Mongoose')) {
    return res.status(503).json({
      success: false,
      message: 'Database service temporarily unavailable. Please try again later.'
    });
  }
  
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler - UPDATED to handle API routes properly
app.use('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    console.log(`🔍 404 - API endpoint not found: ${req.originalUrl}`);
    return res.status(404).json({
      success: false,
      message: 'API endpoint not found',
      requestedUrl: req.originalUrl
    });
  }
});

// Initialize Socket.io - UPDATED VERSION WITH PERSISTENT CALLS
const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: [
        "http://localhost:5173", 
        "http://localhost:5174",
        "https://travel-tour-app-seven.vercel.app", // Your ACTUAL frontend URL
        "https://travel-tour-backend-8erv.onrender.com" // Your backend URL
      ],
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  const activeCalls = new Map();
  const userSockets = new Map();
  const communityMessages = []; // Store messages persistently

  // Load existing active calls from database or keep them in memory
  // For production, you'd want to store this in Redis or MongoDB

  io.on('connection', (socket) => {
    console.log('🔌 User connected:', socket.id);

    // User joins the app
    socket.on('user_join', (userData) => {
      userSockets.set(socket.id, {
        socketId: socket.id,
        userId: userData.userId,
        userName: userData.userName,
        role: userData.role
      });
      
      console.log(`👤 ${userData.userName} (${userData.role}) joined`);
      
      // Send current active calls to the user
      if (activeCalls.size > 0) {
        activeCalls.forEach((call, callId) => {
          if (call.isActive) {
            socket.emit('call_started', {
              callId,
              adminName: call.adminName,
              message: `${call.adminName} has an active community call`,
              startTime: call.startTime
            });
          }
        });
      }
      
      // Send message history
      if (communityMessages.length > 0) {
        socket.emit('message_history', communityMessages.slice(-50)); // Last 50 messages
      }
      
      // Broadcast to all users that someone joined
      socket.broadcast.emit('user_online', {
        userName: userData.userName,
        userId: userData.userId,
        role: userData.role
      });
    });

    // Admin starts a community call
    socket.on('admin_start_call', (callData) => {
      const callId = `community_call_${Date.now()}`;
      const adminUser = userSockets.get(socket.id);
      
      if (!adminUser || adminUser.role !== 'admin') {
        socket.emit('error', { message: 'Only admins can start calls' });
        return;
      }

      const call = {
        id: callId,
        adminId: adminUser.userId,
        adminName: adminUser.userName,
        participants: new Map([[socket.id, adminUser]]),
        startTime: new Date(),
        isActive: true,
        createdAt: new Date()
      };
      
      activeCalls.set(callId, call);
      
      console.log(`📞 Admin ${adminUser.userName} started call: ${callId}`);
      
      // Add admin as first participant
      socket.join(callId);
      
      // Notify ALL users about the call - this persists until admin ends it
      io.emit('call_started', {
        callId,
        adminName: adminUser.userName,
        message: `${adminUser.userName} has started a community call`,
        startTime: call.startTime,
        persistent: true
      });
      
      // Send current participants to admin
      socket.emit('call_participants_update', {
        callId,
        participants: Array.from(call.participants.values())
      });
    });

    // User joins a call
    socket.on('join_call', (data) => {
      const call = activeCalls.get(data.callId);
      const user = userSockets.get(socket.id);
      
      if (!call || !call.isActive) {
        socket.emit('error', { message: 'Call not found or ended' });
        return;
      }

      if (!user) {
        socket.emit('error', { message: 'User not registered' });
        return;
      }

      // Add user to call participants
      call.participants.set(socket.id, user);
      socket.join(data.callId);
      
      console.log(`👤 ${user.userName} joined call: ${data.callId}`);
      
      // Notify all participants in the call about new user
      io.to(data.callId).emit('user_joined_call', {
        userName: user.userName,
        userId: user.userId,
        role: user.role,
        participantCount: call.participants.size
      });
      
      // Send updated participants list to everyone in call
      io.to(data.callId).emit('call_participants_update', {
        callId: data.callId,
        participants: Array.from(call.participants.values())
      });
    });

    // User leaves a call
    socket.on('leave_call', (data) => {
      const call = activeCalls.get(data.callId);
      const user = userSockets.get(socket.id);
      
      if (call && user) {
        call.participants.delete(socket.id);
        socket.leave(data.callId);
        
        console.log(`👤 ${user.userName} left call: ${data.callId}`);
        
        // Notify remaining participants
        socket.to(data.callId).emit('user_left_call', {
          userName: user.userName,
          participantCount: call.participants.size
        });
        
        // Send updated participants list
        io.to(data.callId).emit('call_participants_update', {
          callId: data.callId,
          participants: Array.from(call.participants.values())
        });
        
        // If no participants left, DON'T end the call - keep it active for others to join
        if (call.participants.size === 0) {
          console.log(`📞 Call ${data.callId} has no participants, but remains active`);
        }
      }
    });

    // Admin ends the call
    socket.on('admin_end_call', (data) => {
      const call = activeCalls.get(data.callId);
      const adminUser = userSockets.get(socket.id);
      
      if (call && adminUser && adminUser.role === 'admin' && call.adminId === adminUser.userId) {
        // Notify all participants
        io.emit('call_ended', {
          callId: data.callId,
          message: 'Call has been ended by admin',
          endedBy: adminUser.userName
        });
        
        // Remove all participants from the room
        io.socketsLeave(data.callId);
        activeCalls.delete(data.callId);
        
        console.log(`📞 Call ended by admin: ${data.callId}`);
      }
    });

    // Send message in community chat
    socket.on('send_message', (messageData) => {
      const user = userSockets.get(socket.id);
      if (user) {
        const message = {
          id: `msg_${Date.now()}_${socket.id}`,
          sender: user.userName,
          senderId: user.userId,
          text: messageData.text,
          timestamp: new Date(),
          isAdmin: user.role === 'admin',
          callId: messageData.callId || null
        };
        
        // Store message persistently
        communityMessages.push(message);
        
        // Keep only last 1000 messages to prevent memory issues
        if (communityMessages.length > 1000) {
          communityMessages.splice(0, communityMessages.length - 1000);
        }
        
        // Broadcast message to all users
        if (messageData.callId) {
          // If it's a call message, send only to call participants
          io.to(messageData.callId).emit('new_message', message);
        } else {
          // If it's a general community message, send to everyone
          io.emit('new_message', message);
        }
        
        console.log(`💬 ${user.userName}: ${messageData.text}`);
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      const user = userSockets.get(socket.id);
      if (user) {
        console.log(`👤 ${user.userName} disconnected`);
        
        // Remove user from all active calls
        activeCalls.forEach((call, callId) => {
          if (call.participants.has(socket.id)) {
            call.participants.delete(socket.id);
            
            // Notify other participants
            socket.to(callId).emit('user_left_call', {
              userName: user.userName,
              participantCount: call.participants.size
            });
            
            // Send updated participants list
            io.to(callId).emit('call_participants_update', {
              callId: callId,
              participants: Array.from(call.participants.values())
            });
            
            // If admin disconnects, keep the call active but notify
            if (call.adminId === user.userId) {
              io.emit('call_admin_away', {
                callId: callId,
                message: 'Admin has left the call, but call remains active',
                adminName: user.userName
              });
            }
          }
        });
        
        userSockets.delete(socket.id);
      }
      
      console.log('🔌 User disconnected:', socket.id);
    });
  });

  return io;
};

// START SERVER WITH DATABASE CONNECTION
const startServer = async () => {
  const PORT = process.env.PORT || 5000;
  
  try {
    // Start server immediately
    const server = app.listen(PORT, () => {
      console.log(`\n🎉 Server running on port ${PORT}`);
      console.log(`📍 API available at: http://localhost:${PORT}/api`);
      console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
      console.log(`📍 Frontend served from: http://localhost:${PORT}`);
      console.log(`\n🎓 ENHANCED CERTIFICATE ENDPOINTS:`);
      console.log(`📍   Get user by email: http://localhost:${PORT}/api/users/email/:email`);
      console.log(`📍   Get user by username: http://localhost:${PORT}/api/users/username/:username`);
      console.log(`📍   Get course details: http://localhost:${PORT}/api/courses/general/details`);
      console.log(`\n📊 Course Results Routes:`);
      console.log(`📍   Submit course results: http://localhost:${PORT}/api/course-results`);
      console.log(`📍   Get user results: http://localhost:${PORT}/api/course-results/user/:userName`);
      console.log(`📍   Get all results (admin): http://localhost:${PORT}/api/course-results`);
      console.log(`📍   Notifications count: http://localhost:${PORT}/api/course-results/notifications/count`);
      console.log(`📍   Mark as read: http://localhost:${PORT}/api/course-results/mark-read`);
      console.log(`\n📚 Course routes:`);
      console.log(`📍   Notification counts: http://localhost:${PORT}/api/courses/notification-counts`);
      console.log(`📍   Admin messages: http://localhost:${PORT}/api/notifications/admin-messages/:userId`);
      console.log(`📍   Get courses: http://localhost:${Port}/api/courses`);
      console.log(`📍   Get course by ID: http://localhost:${PORT}/api/courses/:id`);
      console.log(`📍   Validate masterclass: http://localhost:${PORT}/api/courses/validate-masterclass-access`);
      console.log(`📍   Direct course view: http://localhost:${PORT}/api/direct-courses/:id/view`);
      console.log(`\n❓ Quiz routes:`);
      console.log(`📍   Quiz questions: http://localhost:${PORT}/api/quiz/questions`);
      console.log(`📍   Quiz submit (route 1): http://localhost:${PORT}/api/quiz/submit`);
      console.log(`📍   Quiz submit (route 2): http://localhost:${PORT}/api/quiz/results`);
      console.log(`📍   Quiz results admin: http://localhost:${PORT}/api/quiz/results/admin`);
      console.log(`📍   Mark quiz read: http://localhost:${PORT}/api/quiz/results/mark-read`);
      console.log(`\n⚙️ Course management routes:`);
      console.log(`📍   Upload general questions: http://localhost:${PORT}/api/admin/upload-general-questions`);
      console.log(`📍   Upload masterclass questions: http://localhost:${PORT}/api/admin/upload-masterclass-questions`);
      console.log(`📍   General course results: http://localhost:${PORT}/api/user/general-course-results`);
      console.log(`📍   Masterclass course results: http://localhost:${PORT}/api/user/masterclass-course-results`);
      console.log(`📍   All course results (admin): http://localhost:${PORT}/api/admin/all-course-results`);
      console.log(`📍   Course notifications: http://localhost:${PORT}/api/admin/course-completed-notifications`);
      console.log(`📍   Mark course read: http://localhost:${PORT}/api/admin/mark-course-completed-read`);
      console.log(`\n📝 Course questions routes:`);
      console.log(`📍   General course questions: http://localhost:${PORT}/api/general-course-questions`);
      console.log(`📍   Masterclass course questions: http://localhost:${PORT}/api/masterclass-course-questions`);
      console.log(`\n👥 Community routes:`);
      console.log(`📍   Community messages: http://localhost:${PORT}/api/community/messages`);
      console.log(`📍   Active call: http://localhost:${PORT}/api/community/active-call`);
      console.log(`\n🐛 Debug routes:`);
      console.log(`📍   Quiz collections debug: http://localhost:${PORT}/api/debug/quiz-collections`);
      console.log(`📍   Quiz by destination debug: http://localhost:${PORT}/api/debug/quiz-by-destination`);
      console.log(`📍   Messaging system: http://localhost:${PORT}/api/messages/`);
      console.log(`📍   Debug route: http://localhost:${PORT}/api/debug/messages-sent`);
      console.log(`📍   Auth test: http://localhost:${PORT}/api/debug/auth-test`);
      console.log(`📍   Routes list: http://localhost:${PORT}/api/debug-routes`);
      console.log(`📍   Mark messages read: http://localhost:${PORT}/api/notifications/mark-admin-messages-read`);
      console.log(`📍   Mark notifications read: http://localhost:${PORT}/api/notifications/mark-read`);
      console.log('\n📊 Enhanced logging enabled - all requests will be logged');
      console.log('🎯 Quiz system using: quiz_questions (120 docs) and quiz_results (3 docs) collections');
      console.log('📚 Course management: course_results (new), general_course_questions, masterclass_course_questions collections');
      console.log('🎓 Certificate enhancement: Now fetches user details and course descriptions from MongoDB');
      console.log('👤 User data: Fetches from users collection for enhanced certificates');
      console.log('📝 Course descriptions: Fetched from general_course_questions collection');
      console.log('👥 Community features: Real-time messaging and voice calls enabled');
      console.log('🌐 CORS configured for production: travel-tour-app-seven.vercel.app and travel-tour-backend-8erv.onrender.com');
      console.log('📦 Frontend static files served from: ../dist directory');
    });

    // Attempt database connection in background
    const dbConnected = await connectWithRetry();
    
    if (dbConnected) {
      console.log('✅ MongoDB: Connected and ready');
    } else {
      console.log('⚠️  MongoDB: Running in limited mode - database features disabled');
      console.log('💡 Server will continue running with basic functionality');
    }

    // Initialize Socket.io for real-time communication
    const io = initializeSocket(server);
    console.log('🔌 Socket.io initialized for real-time communication');

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down gracefully...');
      server.close(() => {
        console.log('✅ HTTP server closed');
        if (io) {
          io.close();
          console.log('✅ Socket.io closed');
        }
        mongoose.connection.close().then(() => {
          console.log('✅ MongoDB connection closed');
          process.exit(0);
        }).catch(err => {
          console.log('✅ MongoDB connection closed');
          process.exit(0);
        });
      });
    });

  } catch (error) {
    console.error('💥 Failed to start server:', error);
    process.exit(1);
  }
};

// START THE SERVER
startServer();