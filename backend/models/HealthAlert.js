const mongoose = require('mongoose');

const healthAlertSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    alertCode: {
      type: String,
      required: true
    },
    title: {
      type: String,
      required: true
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    },
    explanation: {
      type: String,
      required: true
    },
    recommendedAction: {
      type: String,
      required: true
    },
    symptomsFlagged: {
      type: [String],
      default: []
    },
    readStatus: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  {
    timestamps: true
  }
);

healthAlertSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('HealthAlert', healthAlertSchema);
