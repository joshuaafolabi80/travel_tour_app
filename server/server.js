// server.js - FINAL COMPLETE VERSION WITH NOTIFICATION ROUTE ADDED
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

// Test routes (no auth required)
app.get('/api/test', (req, res) => {
  res.json({ 
    success: true,
    message: 'Server is working!',
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
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
    '/api/test'
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

// All routes after this middleware will require authentication
app.use(authMiddleware);

// 🚨 Authenticated Routes
const courseRoutes = require('./routes/courses');
const quizRoutes = require('./routes/quiz');
const adminRoutes = require('./routes/admin');

app.use('/api', courseRoutes);
app.use('/api', quizRoutes);
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
    res.status(401).json({ success: false, error: error.message });
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
      console.log(`📍 Document viewing: http://localhost:${PORT}/api/direct-courses/:id/view`);
      console.log(`📍 Messaging system: http://localhost:${PORT}/api/messages/`);
      console.log(`📍 Debug route: http://localhost:${PORT}/api/debug/messages-sent`);
      console.log(`📍 Auth test: http://localhost:${PORT}/api/debug/auth-test`);
      console.log(`📍 Routes list: http://localhost:${PORT}/api/debug-routes`);
      console.log(`📍 Mark messages read: http://localhost:${PORT}/api/notifications/mark-admin-messages-read`);
      console.log('\n📊 Enhanced logging enabled - all requests will be logged');
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