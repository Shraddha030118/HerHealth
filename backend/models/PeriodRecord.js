const mongoose = require('mongoose');

const periodRecordSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required']
    },
    endDate: {
      type: Date,
      validate: {
        validator: function (value) {
          if (!value) return true;
          return value >= this.startDate;
        },
        message: 'End date cannot be earlier than start date'
      }
    },
    flowIntensity: {
      type: String,
      enum: {
        values: ['spotting', 'light', 'medium', 'heavy'],
        message: 'Flow intensity must be spotting, light, medium, or heavy'
      },
      default: 'medium'
    },
    notes: {
      type: String,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
      default: ''
    }
  },
  {
    timestamps: true
  }
);

periodRecordSchema.index({ userId: 1, startDate: -1 });

module.exports = mongoose.model('PeriodRecord', periodRecordSchema);
