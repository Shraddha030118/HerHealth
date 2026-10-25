const mongoose = require('mongoose');

const hydrationLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    dateString: {
      type: String, // YYYY-MM-DD
      required: true
    },
    amountMl: {
      type: Number,
      default: 0,
      min: 0
    },
    goalMl: {
      type: Number,
      default: 2000,
      min: 500,
      max: 6000
    },
    glasses: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  {
    timestamps: true
  }
);

hydrationLogSchema.index({ userId: 1, dateString: 1 }, { unique: true });

module.exports = mongoose.model('HydrationLog', hydrationLogSchema);
