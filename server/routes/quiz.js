// server/routes/quiz.js
const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');

// Get questions for a specific course/destination
router.get('/quiz/questions', async (req, res) => {
  try {
    const { courseId } = req.query;
    const db = req.app.locals.db;
    
    console.log('🔍 Fetching quiz questions for courseId:', courseId);
    
    if (!courseId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Course ID is required' 
      });
    }

    if (!ObjectId.isValid(courseId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid course ID format'
      });
    }

    const questions = await db.collection('quiz_questions')
      .find({ courseRef: new ObjectId(courseId) })
      .limit(20)
      .toArray();

    console.log(`📚 Found ${questions.length} questions for course ${courseId}`);

    // Process questions to convert string correctAnswer to index number
    const processedQuestions = questions.map((question) => {
      // Convert string correctAnswer to option index
      let correctAnswerIndex = 0; // Default to first option
      
      if (question.correctAnswer && question.options && Array.isArray(question.options)) {
        // Find the index of the correct answer in the options array
        correctAnswerIndex = question.options.findIndex(option => 
          option === question.correctAnswer
        );
        
        // If not found, default to 0 and log warning
        if (correctAnswerIndex === -1) {
          correctAnswerIndex = 0;
          console.warn(`⚠️ Correct answer "${question.correctAnswer}" not found in options for question: ${question.question}`);
          console.warn(`Available options:`, question.options);
        }
      }

      return {
        id: question._id.toString(),
        _id: question._id,
        destinationId: question.destinationId,
        courseRef: question.courseRef,
        destination: question.destination,
        question: question.question,
        options: question.options || [],
        correctAnswer: correctAnswerIndex, // Converted to index number
        explanation: question.explanation || "No explanation provided."
      };
    });

    const shuffledQuestions = processedQuestions.sort(() => Math.random() - 0.5);
    
    res.json({ 
      success: true, 
      questions: shuffledQuestions,
      message: `Found ${shuffledQuestions.length} questions`
    });
    
  } catch (error) {
    console.error('❌ Error fetching questions:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Server error fetching questions',
      details: error.message
    });
  }
});

// Submit quiz results
router.post('/quiz/results', async (req, res) => {
  try {
    const { 
      userName, 
      courseId, 
      destination, 
      score, 
      totalQuestions, 
      answers 
    } = req.body;
    
    const db = req.app.locals.db;

    console.log('📝 Saving quiz results for user:', userName);

    const percentage = ((score / totalQuestions) * 100).toFixed(2);
    let remark;
    if (percentage >= 80) remark = "Excellent";
    else if (percentage >= 60) remark = "Good";
    else if (percentage >= 40) remark = "Fair";
    else remark = "Needs Improvement";

    const quizResult = {
      userName,
      courseId: new ObjectId(courseId),
      destination,
      score,
      totalQuestions,
      percentage: parseFloat(percentage),
      remark,
      answers,
      date: new Date(),
      createdAt: new Date(),
      submittedAt: new Date(),
      status: 'completed',
      readByAdmin: false // Add this field for admin notifications
    };

    const result = await db.collection('quiz_results').insertOne(quizResult);

    // Create notification for USER
    const userNotification = {
      type: 'quiz_completed',
      message: `You completed ${destination} quiz with score ${score}/${totalQuestions}`,
      read: false,
      relatedId: result.insertedId,
      userId: userName, // Store username as userId for filtering
      createdAt: new Date(),
      forUser: true
    };

    await db.collection('notifications').insertOne(userNotification);

    // Create notification for ADMIN
    const adminNotification = {
      type: 'quiz_completed_admin',
      message: `${userName} completed ${destination} quiz with score ${score}/${totalQuestions} (${percentage}%)`,
      read: false,
      relatedId: result.insertedId,
      userId: 'admin', // Special identifier for admin notifications
      userName: userName,
      courseName: destination,
      score: score,
      totalQuestions: totalQuestions,
      percentage: percentage,
      remark: remark,
      createdAt: new Date(),
      forAdmin: true
    };

    await db.collection('notifications').insertOne(adminNotification);

    console.log(`✅ Quiz results saved for ${userName}. Notifications created for user and admin.`);

    res.json({ 
      success: true, 
      message: 'Quiz results saved successfully',
      resultId: result.insertedId,
      score,
      totalQuestions,
      percentage: parseFloat(percentage),
      remark
    });
    
  } catch (error) {
    console.error('❌ Error saving quiz results:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to save results',
      details: error.message
    });
  }
});

// Get quiz results for a user
router.get('/quiz/results', async (req, res) => {
  try {
    const { userId } = req.query;
    const db = req.app.locals.db;

    console.log('📊 Fetching quiz results for user:', userId);

    let query = {};
    if (userId) {
      query.userName = userId;
    }

    const results = await db.collection('quiz_results')
      .find(query)
      .sort({ date: -1 })
      .toArray();

    console.log(`📋 Found ${results.length} quiz results`);

    res.json({
      success: true,
      results: results
    });
    
  } catch (error) {
    console.error('❌ Error fetching quiz results:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch quiz results'
    });
  }
});

// Get quiz results for admin (all results) WITH PAGINATION
router.get('/quiz/results/admin', async (req, res) => {
  try {
    const db = req.app.locals.db;

    // Get pagination parameters with defaults
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    console.log('👨‍💼 Admin fetching quiz results - Page:', page, 'Limit:', limit);

    // Get total count
    const totalCount = await db.collection('quiz_results').countDocuments();
    
    // Get paginated results with sorting
    const results = await db.collection('quiz_results')
      .find({})
      .sort({ date: -1, readByAdmin: 1 }) // Newest first, then unread first
      .skip(skip)
      .limit(limit)
      .toArray();

    // Get unread count for notifications
    const unreadCount = await db.collection('quiz_results')
      .countDocuments({ readByAdmin: { $ne: true } });

    console.log(`📋 Admin found ${results.length} quiz results (Page ${page} of ${Math.ceil(totalCount / limit)})`);

    res.json({
      success: true,
      results: results,
      totalCount: totalCount,
      unreadCount: unreadCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
      hasNextPage: page < Math.ceil(totalCount / limit),
      hasPrevPage: page > 1
    });
    
  } catch (error) {
    console.error('❌ Error fetching admin quiz results:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch admin quiz results'
    });
  }
});

// Mark quiz results as read by admin
router.put('/quiz/results/mark-read', async (req, res) => {
  try {
    const db = req.app.locals.db;
    
    console.log('📌 Marking all quiz results as read by admin');
    
    const result = await db.collection('quiz_results').updateMany(
      { readByAdmin: { $ne: true } },
      { $set: { readByAdmin: true, readAt: new Date() } }
    );
    
    console.log(`✅ Marked ${result.modifiedCount} quiz results as read by admin`);
    
    res.json({ 
      success: true, 
      message: 'Quiz results marked as read',
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('❌ Error marking quiz results as read:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to mark quiz results as read' 
    });
  }
});

// Mark specific quiz result as read by admin
router.put('/quiz/results/:resultId/mark-read', async (req, res) => {
  try {
    const { resultId } = req.params;
    const db = req.app.locals.db;
    
    console.log('📌 Marking quiz result as read:', resultId);
    
    if (!ObjectId.isValid(resultId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid result ID format'
      });
    }

    const result = await db.collection('quiz_results').updateOne(
      { _id: new ObjectId(resultId) },
      { $set: { readByAdmin: true, readAt: new Date() } }
    );
    
    if (result.modifiedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Quiz result not found'
      });
    }
    
    console.log(`✅ Marked quiz result ${resultId} as read by admin`);
    
    res.json({ 
      success: true, 
      message: 'Quiz result marked as read'
    });
  } catch (error) {
    console.error('❌ Error marking quiz result as read:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to mark quiz result as read' 
    });
  }
});

// Mark notifications as read
router.put('/notifications/mark-read', async (req, res) => {
  try {
    const { type, userId } = req.body;
    const db = req.app.locals.db;
    
    console.log('📌 Marking notifications as read. Type:', type, 'User:', userId);
    
    const query = { read: false };
    if (type) {
      query.type = type;
    }
    if (userId) {
      query.userId = userId;
    }
    
    const result = await db.collection('notifications').updateMany(
      query,
      { $set: { read: true, readAt: new Date() } }
    );
    
    console.log(`✅ Marked ${result.modifiedCount} notifications as read`);
    
    res.json({ 
      success: true, 
      message: 'Notifications marked as read',
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('❌ Error marking notifications as read:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to mark notifications as read' 
    });
  }
});

// Get notification counts for admin and users
router.get('/notifications/counts', async (req, res) => {
  try {
    const { userId, userRole } = req.query;
    const db = req.app.locals.db;
    
    console.log('🔔 Fetching notification counts for user:', userId, 'Role:', userRole);

    let quizCompletedCount = 0;
    let userNotificationCount = 0;

    // Get unread quiz results for admin
    if (userRole === 'admin') {
      quizCompletedCount = await db.collection('quiz_results')
        .countDocuments({ readByAdmin: { $ne: true } });
    }

    // Get user notifications
    if (userId && userId !== 'admin') {
      userNotificationCount = await db.collection('notifications')
        .countDocuments({ 
          $or: [
            { userId: userId, forUser: true, read: false },
            { userId: 'all', forUser: true, read: false } // General notifications for all users
          ]
        });
    }

    console.log(`📊 Notification counts - Admin quiz completed: ${quizCompletedCount}, User notifications: ${userNotificationCount}`);

    res.json({ 
      success: true,
      counts: {
        quizScores: userNotificationCount,
        courseRemarks: 0,
        generalCourses: 0,
        masterclassCourses: 0,
        importantInfo: 0,
        adminMessages: 0,
        quizCompleted: quizCompletedCount, // For admin only
        courseCompleted: 0
      }
    });
  } catch (error) {
    console.error('❌ Error fetching notification counts:', error);
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

// Get admin notifications
router.get('/notifications/admin', async (req, res) => {
  try {
    const db = req.app.locals.db;
    
    console.log('👨‍💼 Fetching admin notifications');

    const notifications = await db.collection('notifications')
      .find({ forAdmin: true })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    console.log(`📋 Found ${notifications.length} admin notifications`);

    res.json({
      success: true,
      notifications: notifications
    });
    
  } catch (error) {
    console.error('❌ Error fetching admin notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch admin notifications'
    });
  }
});

// Health check for quiz routes
router.get('/quiz/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Quiz routes are working',
    timestamp: new Date().toISOString(),
    routes: [
      'GET /quiz/questions',
      'POST /quiz/results', 
      'GET /quiz/results',
      'GET /quiz/results/admin',
      'PUT /quiz/results/mark-read',
      'PUT /quiz/results/:id/mark-read',
      'PUT /notifications/mark-read',
      'GET /notifications/counts',
      'GET /notifications/admin'
    ]
  });
});

module.exports = router;