const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [80, 'Name cannot exceed 80 characters']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required']
    },
    age: {
      type: Number,
      min: [10, 'Age must be at least 10'],
      max: [120, 'Age must be valid']
    },
    profileImage: {
      type: String,
      default: ''
    },
    averageCycleLength: {
      type: Number,
      default: 28,
      min: [15, 'Cycle length must be at least 15 days'],
      max: [60, 'Cycle length must be 60 days or fewer']
    },
    averagePeriodDuration: {
      type: Number,
      default: 5,
      min: [1, 'Period duration must be at least 1 day'],
      max: [15, 'Period duration must be 15 days or fewer']
    },
    lastPeriodStartDate: {
      type: Date
    },
    notificationPreferences: {
      periodReminder: { type: Boolean, default: true },
      symptomReminder: { type: Boolean, default: true },
      wellnessReminder: { type: Boolean, default: true },
      healthAlerts: { type: Boolean, default: true }
    },
    privacyConsent: {
      type: Boolean,
      required: [true, 'Privacy notice consent is required'],
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Method to return user representation without sensitive fields
userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
