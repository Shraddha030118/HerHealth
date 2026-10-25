const mongoose = require('mongoose');

const symptomLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    date: {
      type: Date,
      required: [true, 'Log date is required'],
      default: Date.now
    },
    symptoms: {
      type: [String],
      default: []
    },
    painLevel: {
      type: Number,
      min: [0, 'Pain level must be between 0 and 10'],
      max: [10, 'Pain level must be between 0 and 10'],
      default: 0
    },
    mood: {
      type: String,
      enum: ['calm', 'happy', 'sensitive', 'irritable', 'anxious', 'sad', 'fatigued', 'energetic', 'neutral'],
      default: 'neutral'
    },
    flowInformation: {
      type: String,
      enum: ['none', 'spotting', 'light', 'medium', 'heavy'],
      default: 'none'
    },
    notes: {
      type: String,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
      default: ''
    }
  },
  {
    timestamps: true
  }
);

symptomLogSchema.index({ userId: 1, date: -1 });

module.exports = mongoose.model('SymptomLog', symptomLogSchema);
