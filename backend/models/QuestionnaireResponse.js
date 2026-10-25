const mongoose = require('mongoose');

const questionnaireResponseSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    questionnaireVersion: {
      type: String,
      default: '1.0.0'
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
    },
    answers: {
      // Section A: Menstrual Cycle Information
      lastPeriodStart: { type: String, default: '' },
      periodDuration: { type: mongoose.Schema.Types.Mixed, default: '' },
      cycleLength: { type: mongoose.Schema.Types.Mixed, default: '' },
      cycleRegularity: { type: String, default: '' },
      missedPeriod: { type: String, default: '' },
      recentCycleChanges: { type: String, default: '' },

      // Section B: Symptoms and Pain
      experiencesPain: { type: String, default: '' },
      painLevel: { type: Number, min: 0, max: 10 },
      painLocations: { type: [String], default: [] },
      painLocationOther: { type: String, default: '', maxlength: 500 },
      symptoms: { type: [String], default: [] },
      otherSymptoms: { type: String, default: '', maxlength: 500 },
      symptomTiming: { type: String, default: '' },
      interferesWithDailyActivities: { type: String, default: '' },
      symptomProgression: { type: String, default: '' },

      // Section C: Bleeding Patterns
      flowDescription: { type: String, default: '' },
      productChangeFrequency: { type: String, default: '' },
      floodingOrClots: { type: String, default: '' },
      bleedingBetweenPeriods: { type: String, default: '' },
      prolongedBleeding: { type: String, default: '' },
      bleedingWithDizzinessOrSeverePain: { type: String, default: '' },
      faintingOrCollapse: { type: String, default: '' },
      isTypicalBleeding: { type: String, default: '' },

      // Section D: Mood and Well-being
      moodDescription: { type: String, default: '' },
      emotionalChanges: { type: String, default: '' },
      sleepQuality: { type: String, default: '' },
      energyLevel: { type: String, default: '' },
      wellbeingInterference: { type: String, default: '' },

      // Section E: Relevant Health Information
      pregnancyPossibility: { type: String, default: 'Prefer not to answer' },
      similarSymptomsBefore: { type: String, default: '' },
      consultedDoctor: { type: String, default: '' },
      additionalInformation: { type: String, default: '', maxlength: 2000 },
      personalNotes: { type: String, default: '', maxlength: 2000 }
    },
    assessment: {
      level: { type: Number, min: 1, max: 4, default: 1 },
      levelName: { type: String, default: 'General Wellness' },
      colorCode: { type: String, default: '#2E7D32' },
      badgeClass: { type: String, default: 'badge-wellness' },
      icon: { type: String, default: '🌱' },
      title: { type: String, default: 'Level 1: General Wellness Notice' },
      bannerText: { type: String, default: '' },
      actionHeader: { type: String, default: '' },
      urgencyStatement: { type: String, default: '' },
      triggeredRules: { type: [String], default: [] },
      explanations: { type: [String], default: [] },
      recommendedNextSteps: { type: [String], default: [] },
      evaluatedAt: { type: Date }
    }
  },
  {
    timestamps: true
  }
);

questionnaireResponseSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('QuestionnaireResponse', questionnaireResponseSchema);
