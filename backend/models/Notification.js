const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: ['period_estimate', 'period_reminder', 'symptom_reminder', 'wellness_reminder', 'health_alert', 'system'],
      default: 'system'
    },
    title: {
      type: String,
      required: true
    },
    message: {
      type: String,
      required: true
    },
    readStatus: {
      type: Boolean,
      default: false,
      index: true
    },
    severity: {
      type: String,
      enum: ['info', 'warning', 'urgent'],
      default: 'info'
    },
    link: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

notificationSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
