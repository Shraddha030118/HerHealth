const User = require('../models/User');
const PeriodRecord = require('../models/PeriodRecord');
const SymptomLog = require('../models/SymptomLog');
const QuestionnaireResponse = require('../models/QuestionnaireResponse');
const WellnessActivity = require('../models/WellnessActivity');
const Notification = require('../models/Notification');
const ChatConversation = require('../models/ChatConversation');
const HealthAlert = require('../models/HealthAlert');
const HydrationLog = require('../models/HydrationLog');

exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }
    return res.status(200).json({ success: true, user: user.toSafeObject() });
  } catch (err) {
    next(err);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const {
      name,
      age,
      averageCycleLength,
      averagePeriodDuration,
      lastPeriodStartDate,
      notificationPreferences,
      profileImage
    } = req.body;

    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (age !== undefined) updates.age = Number(age);
    if (averageCycleLength !== undefined) updates.averageCycleLength = Number(averageCycleLength);
    if (averagePeriodDuration !== undefined) updates.averagePeriodDuration = Number(averagePeriodDuration);
    if (lastPeriodStartDate !== undefined) updates.lastPeriodStartDate = lastPeriodStartDate ? new Date(lastPeriodStartDate) : null;
    if (notificationPreferences !== undefined) updates.notificationPreferences = notificationPreferences;
    if (profileImage !== undefined) {
      // Basic check for safe image string / base64 size
      if (typeof profileImage === 'string' && profileImage.length < 500000) {
        updates.profileImage = profileImage;
      }
    }

    const updatedUser = await User.findByIdAndUpdate(req.session.userId, updates, {
      new: true,
      runValidators: true
    });

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      user: updatedUser.toSafeObject()
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteAccount = async (req, res, next) => {
  try {
    const userId = req.session.userId;

    // Remove all associated user records for complete data privacy
    await Promise.all([
      PeriodRecord.deleteMany({ userId }),
      SymptomLog.deleteMany({ userId }),
      QuestionnaireResponse.deleteMany({ userId }),
      WellnessActivity.deleteMany({ userId }),
      Notification.deleteMany({ userId }),
      ChatConversation.deleteMany({ userId }),
      HealthAlert.deleteMany({ userId }),
      HydrationLog.deleteMany({ userId }),
      User.findByIdAndDelete(userId)
    ]);

    req.session.destroy(err => {
      res.clearCookie('connect.sid');
      return res.status(200).json({
        success: true,
        message: 'Your account and all associated health records have been permanently deleted.'
      });
    });
  } catch (err) {
    next(err);
  }
};
