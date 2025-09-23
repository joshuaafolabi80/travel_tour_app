// server/routes/quiz.js
const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');

// Get questions for a specific course/destination - UPDATED
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

    // REMOVE the projection - we need correctAnswer now
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

// Submit quiz results - KEEP THIS EXACTLY AS IS
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
      submittedAt: new Date()
    };

    const result = await db.collection('quiz_results').insertOne(quizResult);

    // Create notification
    const notification = {
      type: 'quiz_completed',
      message: `${userName} completed ${destination} quiz with score ${score}/${totalQuestions}`,
      read: false,
      relatedId: result.insertedId,
      createdAt: new Date()
    };

    await db.collection('notifications').insertOne(notification);

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

// Get quiz results for a user - KEEP THIS EXACTLY AS IS
router.get('/quiz-results', async (req, res) => {
  try {
    const { userId } = req.query;
    const db = req.app.locals.db;

    let query = {};
    if (userId) {
      query.userName = userId;
    }

    const results = await db.collection('quiz_results')
      .find(query)
      .sort({ date: -1 })
      .toArray();

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

// Health check for quiz routes - KEEP THIS EXACTLY AS IS
router.get('/quiz/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Quiz routes are working',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;