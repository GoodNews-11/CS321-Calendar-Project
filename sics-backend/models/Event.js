const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    startTime: {
      type: Date,
      required: [true, 'Start time is required'],
    },
    endTime: {
      type: Date,
      required: [true, 'End time is required'],
    },
    isAllDay: {
      type: Boolean,
      default: false,
    },
    color: {
      type: String,
      default: '#3B82F6',
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    googleEventId: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

// Index for fast queries by user and date range
eventSchema.index({ userId: 1, startTime: 1 });

module.exports = mongoose.model('Event', eventSchema);