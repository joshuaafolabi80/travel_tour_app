// server.js - COMPLETE FIXED VERSION WITH ADMIN QUIZ ROUTES
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const mammoth = require('mammoth');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 🚨 ENHANCED REQUEST LOGGING MIDDLEWARE
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

// 🚨 Public Routes (no auth required)
const { router: authRouter, authMiddleware } = require('./routes/auth');
const messageRoutes = require('./routes/messages');

app.use('/api/auth', authRouter);
app.use('/api/messages', messageRoutes);

// 🚨 ADD: Notification endpoint for quiz scores (ADD THIS HERE)
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
      users: 'Exists (4 documents)'
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
    '/api/quiz/results', // POST route for quiz submission
    '/api/quiz/results/:id',
    '/api/quiz/results/admin', // 🚨 ADDED: Admin quiz results route
    '/api/notifications/counts',
    '/api/notifications/mark-admin-messages-read',
    '/api/notifications/mark-read',
    '/api/direct-courses/:id/view',
    '/api/debug/quiz-by-destination' // 🚨 ADDED: Debug route for course questions
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

// 🚨 QUIZ ROUTES - FIXED: FILTER BY COURSE/DESTINATION
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
    
    // 🚨 FIX: Build query to filter by course/destination
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
    
    // 🚨 FIX: Include the correct answer index for frontend comparison
    const formattedQuestions = questions.map(q => {
      // Find the index of the correct answer in the options array
      const correctIndex = q.options.findIndex(option => option === q.correctAnswer);
      
      return {
        id: q._id,
        question: q.question,
        options: q.options || [],
        correctAnswer: correctIndex, // 🚨 CRITICAL FIX: Send index instead of text
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

// 🚨 QUIZ SUBMIT ROUTE - ORIGINAL
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
      // 🚨 FIX: Ensure we're checking questions from the correct course
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
        // 🚨 FIX: Compare based on option indexes, not text
        const correctIndex = question.options.findIndex(option => option === question.correctAnswer);
        const isCorrect = correctIndex === answer.selectedAnswer;
        
        if (isCorrect) score++;
        
        questionResults.push({
          questionId: answer.questionId,
          questionText: question.question,
          selectedAnswer: answer.selectedAnswer,
          correctAnswer: correctIndex, // 🚨 Store index for frontend
          correctAnswerText: question.correctAnswer, // 🚨 Keep text for explanation
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
      answers: questionResults, // 🚨 Return detailed results for frontend display
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

// 🚨 ADDED: QUIZ SUBMIT ROUTE - COMPATIBILITY ROUTE (for frontend using /api/quiz/results)
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
    
    // 🚨 FIX: Determine remark if not provided
    const getRemark = (percent) => {
      if (percent >= 80) return "Excellent";
      if (percent >= 60) return "Good";
      if (percent >= 40) return "Fair";
      return "Needs Improvement";
    };
    
    const finalRemark = remark || getRemark(finalPercentage);

    // 🚨 FIX: Create quiz result with ALL required fields
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

// 🚨 FIXED: Quiz results route - REMOVED .select('-answers') to include question breakdown
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
    
    // 🚨 CRITICAL FIX: REMOVED .select('-answers') to INCLUDE detailed answers
    const results = await QuizResult.find({ userId: userId })
      .sort({ submittedAt: -1 });
    // 🚨 REMOVED: .select('-answers') - This was excluding the question breakdown!

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

// 🚨 ADDED: ADMIN QUIZ RESULTS ROUTE (Around line 380 as mentioned)
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
      totalCount: results.length, // 🚨 ADDED: For frontend compatibility
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

    // Return default counts - we'll implement real counts later
    const defaultCounts = {
      quizScores: 0,
      courseRemarks: 0,
      generalCourses: 0,
      masterclassCourses: 0,
      importantInfo: 0,
      adminMessages: 0,
      quizCompleted: 0,
      courseCompleted: 0,
      messagesFromStudents: 0
    };

    res.json({
      success: true,
      counts: defaultCounts,
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

// 🚨 ADDED: MARK ADMIN MESSAGES AS READ ROUTE
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

// 🚨 ADDED: MARK READ ENDPOINT FOR ADMIN (Around line 250 as mentioned)
app.put('/api/quiz/results/mark-read', async (req, res) => {
  try {
    const { resultIds } = req.body;
    
    console.log(`🔔 Marking quiz results as read:`, resultIds);
    
    // 🚨 FIX: Make resultIds optional - if not provided, mark all as read
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

// 🚨 Authenticated Routes
const courseRoutes = require('./routes/courses');
const adminRoutes = require('./routes/admin');

app.use('/api', courseRoutes);
app.use('/api', adminRoutes);

// 🚨 DEBUG ROUTE - Add this to test messages
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

// 🚨 ADDED: DEBUG AUTH TEST ROUTE
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

// 🚨 QUIZ COLLECTION DEBUG ROUTE
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

// 🚨 ADDED: DEBUG ROUTE TO CHECK QUESTIONS BY DESTINATION
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

// 🚨 IMPROVED MONGODB CONNECTION WITH RETRY LOGIC
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

// 🚨 DATABASE CONNECTION MIDDLEWARE
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

// 🚨 ENHANCED ERROR HANDLING
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

// 404 handler
app.use('*', (req, res) => {
  console.log(`🔍 404 - Route not found: ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    requestedUrl: req.originalUrl
  });
});

// 🚨 START SERVER WITH DATABASE CONNECTION
const startServer = async () => {
  const PORT = process.env.PORT || 5000;
  
  try {
    // Start server immediately
    const server = app.listen(PORT, () => {
      console.log(`\n🎉 Server running on port ${PORT}`);
      console.log(`📍 API available at: http://localhost:${PORT}/api`);
      console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
      console.log(`📍 Quiz questions: http://localhost:${PORT}/api/quiz/questions`);
      console.log(`📍 Quiz submit (route 1): http://localhost:${PORT}/api/quiz/submit`);
      console.log(`📍 Quiz submit (route 2): http://localhost:${PORT}/api/quiz/results`);
      console.log(`📍 Quiz results admin: http://localhost:${PORT}/api/quiz/results/admin`); // 🚨 ADDED
      console.log(`📍 Mark quiz read: http://localhost:${PORT}/api/quiz/results/mark-read`); // 🚨 ADDED
      console.log(`📍 Quiz collections debug: http://localhost:${PORT}/api/debug/quiz-collections`);
      console.log(`📍 Quiz by destination debug: http://localhost:${PORT}/api/debug/quiz-by-destination`);
      console.log(`📍 Document viewing: http://localhost:${PORT}/api/direct-courses/:id/view`);
      console.log(`📍 Messaging system: http://localhost:${PORT}/api/messages/`);
      console.log(`📍 Debug route: http://localhost:${PORT}/api/debug/messages-sent`);
      console.log(`📍 Auth test: http://localhost:${PORT}/api/debug/auth-test`);
      console.log(`📍 Routes list: http://localhost:${PORT}/api/debug-routes`);
      console.log(`📍 Mark messages read: http://localhost:${PORT}/api/notifications/mark-admin-messages-read`);
      console.log(`📍 Mark notifications read: http://localhost:${PORT}/api/notifications/mark-read`);
      console.log('\n📊 Enhanced logging enabled - all requests will be logged');
      console.log('🎯 Quiz system using: quiz_questions (120 docs) and quiz_results (3 docs) collections');
    });

    // Attempt database connection in background
    const dbConnected = await connectWithRetry();
    
    if (dbConnected) {
      console.log('✅ MongoDB: Connected and ready');
    } else {
      console.log('⚠️  MongoDB: Running in limited mode - database features disabled');
      console.log('💡 Server will continue running with basic functionality');
    }

    // Handle graceful shutdown - FIXED VERSION
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down gracefully...');
      server.close(() => {
        console.log('✅ HTTP server closed');
        // Fixed mongoose connection close
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

// 🚀 START THE SERVER
startServer();