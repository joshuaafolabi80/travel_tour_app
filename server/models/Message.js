// server/models/Message.js
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  // For messages from students to admin
  fromStudent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  toAdmin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  
  // For messages from admin to students
  fromAdmin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  toStudent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  
  // Common fields
  subject: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  messageType: {
    type: String,
    enum: ['student_to_admin', 'admin_to_student', 'access_code', 'system'],
    required: true
  },
  contentType: {
    type: String,
    enum: ['text', 'access_code', 'system'],
    default: 'text'
  },
  
  // Status fields
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
    enum: ['general', 'access_request', 'complaint', 'feedback', 'course_related', 'important', 'system'],
    default: 'general'
  },
  
  // For access code messages
  accessCode: {
    type: String
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DocumentCourse'
  },
  
  // Reply tracking
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  reply: {
    type: String
  },
  repliedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes for faster queries
messageSchema.index({ toStudent: 1, createdAt: -1 });
messageSchema.index({ toAdmin: 1, createdAt: -1 });
messageSchema.index({ fromStudent: 1, createdAt: -1 });
messageSchema.index({ fromAdmin: 1, createdAt: -1 });
messageSchema.index({ messageType: 1, createdAt: -1 });
messageSchema.index({ read: 1 });
messageSchema.index({ category: 1 });

// Static method to get unread message count for admin
messageSchema.statics.getAdminUnreadCount = function() {
  return this.countDocuments({
    messageType: 'student_to_admin',
    read: false
  });
};

// Static method to get unread message count for student
messageSchema.statics.getStudentUnreadCount = function(studentId) {
  return this.countDocuments({
    toStudent: studentId,
    read: false
  });
};

// Method to mark as read
messageSchema.methods.markAsRead = function() {
  this.read = true;
  this.readAt = new Date();
  return this.save();
};

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;