const Notification = require('../models/Notification');
const User = require('../models/User');
const PeriodRecord = require('../models/PeriodRecord');
const { calculateCycleMetrics } = require('../services/cycleService');

exports.getNotifications = async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const user = await User.findById(userId);

    // Auto-generate estimate notification if period is estimated soon and enabled
    if (user && user.notificationPreferences && user.notificationPreferences.periodReminder) {
      const periods = await PeriodRecord.find({ userId }).sort({ startDate: -1 });
      const metrics = calculateCycleMetrics(periods, user);

      if (metrics.nextEstimatedPeriodStart) {
        const daysUntil = metrics.daysUntilNextPeriod;
        if (daysUntil >= 0 && daysUntil <= 3) {
          // Check if notification was created in the last 48 hours
          const recentNotif = await Notification.findOne({
            userId,
            type: 'period_estimate',
            createdAt: { $gte: new Date(Date.now() - 48 * 60 * 60 * 1000) }
          });

          if (!recentNotif) {
            await Notification.create({
              userId,
              type: 'period_estimate',
              title: 'Upcoming Period Estimate 🌸',
              message: daysUntil === 0
                ? 'Your estimated period start date is today. Remember to carry your personal care items.'
                : `Your estimated period is expected in approximately ${daysUntil} day${daysUntil === 1 ? '' : 's'}. (${metrics.confidenceNote})`,
              severity: 'info',
              link: '/pages/period-tracker.html'
            });
          }
        }
      }
    }

    const notifications = await Notification.find({ userId }).sort({ createdAt: -1 }).limit(50);
    const unreadCount = notifications.filter(n => !n.readStatus).length;

    return res.status(200).json({
      success: true,
      count: notifications.length,
      unreadCount,
      notifications,
      preferences: user ? user.notificationPreferences : {}
    });
  } catch (err) {
    next(err);
  }
};

exports.markAsRead = async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const notif = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId },
      { readStatus: true },
      { new: true }
    );

    if (!notif) {
      return res.status(404).json({ success: false, error: 'Notification not found.' });
    }

    return res.status(200).json({ success: true, notification: notif });
  } catch (err) {
    next(err);
  }
};

exports.markAllRead = async (req, res, next) => {
  try {
    const userId = req.session.userId;
    await Notification.updateMany({ userId, readStatus: false }, { readStatus: true });
    return res.status(200).json({ success: true, message: 'All notifications marked as read.' });
  } catch (err) {
    next(err);
  }
};

exports.deleteNotification = async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const notif = await Notification.findOneAndDelete({ _id: req.params.id, userId });

    if (!notif) {
      return res.status(404).json({ success: false, error: 'Notification not found.' });
    }

    return res.status(200).json({ success: true, message: 'Notification removed.' });
  } catch (err) {
    next(err);
  }
};

exports.clearAllNotifications = async (req, res, next) => {
  try {
    const userId = req.session.userId;
    await Notification.deleteMany({ userId });
    return res.status(200).json({ success: true, message: 'Notification history cleared.' });
  } catch (err) {
    next(err);
  }
};

exports.updatePreferences = async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const { preferences } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    user.notificationPreferences = { ...user.notificationPreferences, ...(preferences || {}) };
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Notification preferences updated.',
      preferences: user.notificationPreferences
    });
  } catch (err) {
    next(err);
  }
};
