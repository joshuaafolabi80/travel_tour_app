// server/models/AccessCode.js
const mongoose = require('mongoose');

const accessCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  usedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  usedAt: {
    type: Date,
    default: null
  },
  isUsed: {
    type: Boolean,
    default: false
  },
  expiresAt: {
    type: Date,
    required: true
  }
}, {
  timestamps: true
});

// Index for better query performance
accessCodeSchema.index({ code: 1 });
accessCodeSchema.index({ courseId: 1 });
accessCodeSchema.index({ isUsed: 1, expiresAt: 1 });

const AccessCode = mongoose.model('AccessCode', accessCodeSchema);

module.exports = AccessCode;