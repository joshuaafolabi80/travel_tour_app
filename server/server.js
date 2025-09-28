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

// Serve uploaded files statically
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));

// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is working!' });
});

// 🚨 INTELLIGENT FILE MATCHING - NO MANUAL MAPPINGS
app.get('/api/direct-courses/:id/view', async (req, res) => {
  try {
    const courseId = req.params.id;
    console.log('🎯 DIRECT ROUTE: Reading course:', courseId);
    
    const DocumentCourse = require('./models/DocumentCourse');
    const course = await DocumentCourse.findById(courseId);
    
    if (!course) {
      console.log('❌ Course not found in database');
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    console.log('✅ Course found:', course.title);
    console.log('📄 Stored file name:', course.fileName);
    console.log('💾 Stored file name (actual):', course.storedFileName);
    
    // 🎯 INTELLIGENT FILE MATCHING SYSTEM
    const uploadsPath = path.join(__dirname, 'uploads/courses');
    
    console.log('📂 Files in uploads directory:');
    const files = fs.readdirSync(uploadsPath);
    console.log(files);
    
    let actualFilePath = null;
    let actualFileName = null;

    // STRATEGY 1: Check if course has storedFileName field (most reliable)
    if (course.storedFileName) {
      const storedFilePath = path.join(uploadsPath, course.storedFileName);
      if (fs.existsSync(storedFilePath)) {
        actualFileName = course.storedFileName;
        actualFilePath = storedFilePath;
        console.log('✅ Found file by storedFileName:', actualFileName);
      }
    }

    // STRATEGY 2: Match by course creation timestamp with file creation timestamp
    if (!actualFilePath) {
      console.log('🔍 Matching by creation timestamp...');
      
      const courseCreatedTime = new Date(course.createdAt).getTime();
      console.log('📅 Course created at:', course.createdAt, '(', courseCreatedTime, ')');
      
      const docxFiles = files.filter(file => file.endsWith('.docx'))
                            .map(file => {
                              const filePath = path.join(uploadsPath, file);
                              const stats = fs.statSync(filePath);
                              return {
                                name: file,
                                path: filePath,
                                birthtime: stats.birthtime,
                                birthtimeMs: stats.birthtime.getTime()
                              };
                            })
                            .sort((a, b) => a.birthtimeMs - b.birthtimeMs);
      
      console.log('📅 DOCX files sorted by creation time:');
      docxFiles.forEach((file, index) => {
        const timeDiff = Math.abs(file.birthtimeMs - courseCreatedTime);
        console.log(`  ${index + 1}. ${file.name} - ${file.birthtime} (diff: ${timeDiff}ms)`);
      });

      // Get all courses sorted by creation time
      const allCourses = await DocumentCourse.find({ isActive: true })
        .sort({ createdAt: 1 })
        .select('_id title createdAt');
      
      console.log('📅 All courses sorted by creation time:');
      allCourses.forEach((c, index) => {
        console.log(`  ${index + 1}. ${c._id} - ${c.title} - ${c.createdAt}`);
      });

      // Match by array position (files and courses should be in same creation order)
      const courseIndex = allCourses.findIndex(c => c._id.toString() === courseId);
      if (courseIndex !== -1 && docxFiles[courseIndex]) {
        actualFileName = docxFiles[courseIndex].name;
        actualFilePath = docxFiles[courseIndex].path;
        console.log('✅ Found file by creation order position:', actualFileName);
      }
    }

    // STRATEGY 3: Find closest timestamp match
    if (!actualFilePath) {
      console.log('🔍 Finding closest timestamp match...');
      
      const courseCreatedTime = new Date(course.createdAt).getTime();
      const docxFiles = files.filter(file => file.endsWith('.docx'))
                            .map(file => {
                              const filePath = path.join(uploadsPath, file);
                              const stats = fs.statSync(filePath);
                              return {
                                name: file,
                                path: filePath,
                                birthtimeMs: stats.birthtime.getTime(),
                                timeDiff: Math.abs(stats.birthtime.getTime() - courseCreatedTime)
                              };
                            })
                            .sort((a, b) => a.timeDiff - b.timeDiff);
      
      if (docxFiles.length > 0 && docxFiles[0].timeDiff < 300000) { // 5 minutes threshold
        actualFileName = docxFiles[0].name;
        actualFilePath = docxFiles[0].path;
        console.log('✅ Found file by closest timestamp:', actualFileName, '(diff:', docxFiles[0].timeDiff + 'ms)');
      }
    }

    // FINAL: If we found a file, read and return it
    if (actualFilePath && fs.existsSync(actualFilePath)) {
      console.log('✅ Using file:', actualFileName);
      
      try {
        console.log('🔧 Reading DOCX file content...');
        const result = await mammoth.extractRawText({ path: actualFilePath });
        const textContent = result.value;
        
        console.log('✅ DOCX content extracted, length:', textContent.length);
        
        if (textContent && textContent.length > 10) {
          return res.json({
            success: true,
            content: textContent,
            contentType: 'text', 
            title: course.title,
            canViewInApp: true,
            source: 'docx-file',
            contentLength: textContent.length,
            actualFileUsed: actualFileName
          });
        } else {
          return res.json({
            success: true,
            content: 'DOCX file is empty or could not be read properly.',
            contentType: 'info'
          });
        }
        
      } catch (conversionError) {
        console.error('❌ DOCX conversion failed:', conversionError);
        return res.json({
          success: true,
          content: 'Error reading DOCX file: ' + conversionError.message,
          contentType: 'error'
        });
      }
    } else {
      console.error('❌ No matching DOCX file found for course:', course.title);
      
      // Return all available files for debugging
      return res.json({
        success: false,
        content: `No matching document file found for this course.

Course: ${course.title}
Course ID: ${courseId}
Course Created: ${course.createdAt}
Original File: ${course.fileName}
Stored File: ${course.storedFileName}

Available files in uploads folder:
${files.map(f => {
  const filePath = path.join(uploadsPath, f);
  const stats = fs.statSync(filePath);
  return `• ${f} (created: ${stats.birthtime})`;
}).join('\n')}

The system tried multiple matching strategies but could not find the correct file.`,
        contentType: 'error'
      });
    }

  } catch (error) {
    console.error('💥 Direct route error:', error);
    res.status(500).json({
      success: false,
      message: 'Direct route error: ' + error.message
    });
  }
});

// Add the missing notification counts route
app.get('/api/notifications/counts', async (req, res) => {
  try {
    const db = mongoose.connection.db;
    const userIdentifier = req.query.userId || 'default';

    const userNotificationsCount = await db.collection('notifications')
      .countDocuments({
        $or: [
          { userId: userIdentifier, forUser: true, read: false },
          { forAdmin: true, read: false }
        ]
      });

    const quizCompletedCount = await db.collection('quiz_results')
      .countDocuments({ status: 'completed', readByAdmin: false });

    res.json({
      success: true,
      counts: {
        quizScores: userNotificationsCount,
        courseRemarks: 0,
        generalCourses: 0,
        masterclassCourses: 0,
        importantInfo: 0,
        adminMessages: 0,
        quizCompleted: quizCompletedCount,
        courseCompleted: 0
      },
      user: userIdentifier
    });
  } catch (error) {
    console.error('Error fetching notification counts:', error);
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
        courseCompleted: 0
      }
    });
  }
});

// MongoDB connection
console.log('Attempting to connect to MongoDB...');

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => {
    console.log('✅ MongoDB Atlas connected successfully');

    // Get the native MongoDB driver instance after successful connection
    const db = mongoose.connection.db;
    console.log('✅ Native MongoDB driver instance available');

    // Make the database instance available globally for routes
    app.locals.db = db;
    
    // Create uploads directory if it doesn't exist
    const fs = require('fs');
    const uploadsDir = path.join(__dirname, 'uploads');
    const coursesDir = path.join(uploadsDir, 'courses');
    
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log('✅ Uploads directory created');
    }
    
    if (!fs.existsSync(coursesDir)) {
      fs.mkdirSync(coursesDir, { recursive: true });
      console.log('✅ Courses uploads directory created');
    }
  })
  .catch((error) => {
    console.log('❌ MongoDB connection error:', error.message);
    process.exit(1);
  });

// Import routes
const authRoutes = require('./routes/auth');
const courseRoutes = require('./routes/courses');
const quizRoutes = require('./routes/quiz');
const adminRoutes = require('./routes/admin');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api', courseRoutes);
app.use('/api', quizRoutes);
app.use('/api', adminRoutes);

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  console.log('❌ 404 - Route not found:', req.originalUrl);
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    requestedUrl: req.originalUrl
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📍 API available at: http://localhost:${PORT}/api`);
  console.log(`📍 Document viewing: http://localhost:${PORT}/api/direct-courses/:id/view`);
}).on('error', (error) => {
  console.log('❌ Server failed to start:', error.message);
});