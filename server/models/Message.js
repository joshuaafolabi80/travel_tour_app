// server/models/Message.js
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  fromAdmin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  toStudent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  studentEmail: {
    type: String,
    required: true
  },
  subject: {
    type: String,
    default: 'Message from Admin'
  },
  message: {
    type: String,
    required: true
  },
  read: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  },
  important: {
    type: Boolean,
    default: false
  },
  category: {
    type: String,
    enum: ['general', 'quiz_feedback', 'course_related', 'important', 'system'],
    default: 'general'
  }
}, {
  timestamps: true
});

// Index for faster queries
messageSchema.index({ toStudent: 1, createdAt: -1 });
messageSchema.index({ fromAdmin: 1, createdAt: -1 });
messageSchema.index({ read: 1 });

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;