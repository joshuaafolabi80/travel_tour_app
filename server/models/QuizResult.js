// server/models/QuizResult.js
const mongoose = require('mongoose');

const quizResultSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  score: {
    type: Number,
    required: true
  },
  totalQuestions: {
    type: Number,
    required: true
  },
  percentage: {
    type: Number,
    required: true
  },
  answers: [{
    questionId: mongoose.Schema.Types.ObjectId,
    question: String,
    userAnswer: String,
    correctAnswer: String,
    isCorrect: Boolean
  }],
  timeTaken: {
    type: Number, // in seconds
    default: 0
  },
  status: {
    type: String,
    enum: ['in_progress', 'completed', 'abandoned'],
    default: 'completed'
  },
  readByAdmin: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for better query performance
quizResultSchema.index({ userId: 1, courseId: 1 });
quizResultSchema.index({ status: 1, readByAdmin: 1 });
quizResultSchema.index({ createdAt: -1 });

const QuizResult = mongoose.model('QuizResult', quizResultSchema);

module.exports = QuizResult;