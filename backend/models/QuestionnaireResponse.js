const mongoose = require('mongoose');

const questionnaireResponseSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    answers: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    completionStatus: {
      type: String,
      enum: ['in_progress', 'completed'],
      default: 'in_progress'
    },
    currentStep: {
      type: Number,
      default: 1
    },
    totalSteps: {
      type: Number,
      default: 6
    },
    submittedAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

questionnaireResponseSchema.index({ userId: 1, updatedAt: -1 });

module.exports = mongoose.model('QuestionnaireResponse', questionnaireResponseSchema);
