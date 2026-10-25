const mongoose = require('mongoose');

const wellnessActivitySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    activityType: {
      type: String,
      enum: ['yoga', 'breathing', 'music', 'stretching', 'walking', 'meditation'],
      required: true
    },
    activityName: {
      type: String,
      required: true,
      trim: true
    },
    duration: {
      type: Number,
      required: true, // in minutes
      min: 1
    },
    completedAt: {
      type: Date,
      default: Date.now
    },
    notes: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

wellnessActivitySchema.index({ userId: 1, completedAt: -1 });

module.exports = mongoose.model('WellnessActivity', wellnessActivitySchema);
