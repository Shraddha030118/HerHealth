/**
 * HerHealth AI — Notification Controller (Firebase Firestore)
 */
const { getFirestore } = require('../config/firebase');
const { FieldValue } = require('firebase-admin/firestore');
const { calculateCycleMetrics } = require('../services/cycleService');

exports.getNotifications = async (req, res, next) => {
  try {
    const uid = req.user.uid;
    const db = getFirestore();
    const user = req.user;

    // Auto-generate period estimate notification if needed
    if (user.notificationPreferences && user.notificationPreferences.periodReminder) {
      const periodsSnap = await db.collection('periods').where('userId', '==', uid).orderBy('startDate', 'desc').get();
      const periods = periodsSnap.docs.map(d => d.data());
      const metrics = calculateCycleMetrics(periods, user);

      if (metrics.nextEstimatedPeriodStart) {
        const daysUntil = metrics.daysUntilNextPeriod;
        if (daysUntil >= 0 && daysUntil <= 3) {
          const oneDayAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
          const recentSnap = await db.collection('notifications')
            .where('userId', '==', uid)
            .where('type', '==', 'period_estimate')
            .get();

          const hasRecent = recentSnap.docs.some(d => {
            const ts = d.data().createdAt;
            return ts && (ts.toDate ? ts.toDate().toISOString() : ts) > oneDayAgo;
          });

          if (!hasRecent) {
            await db.collection('notifications').add({
              userId: uid,
              type: 'period_estimate',
              title: 'Upcoming Period Estimate 🌸',
              message: daysUntil === 0
                ? 'Your estimated period start date is today.'
                : `Your period is expected in approximately ${daysUntil} day${daysUntil === 1 ? '' : 's'}.`,
              severity: 'info',
              link: '/pages/period-tracker.html',
              readStatus: false,
              createdAt: FieldValue.serverTimestamp()
            });
          }
        }
      }
    }

    const snap = await db.collection('notifications')
      .where('userId', '==', uid)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const notifications = snap.docs.map(d => ({ id: d.id, _id: d.id, ...d.data() }));
    const unreadCount = notifications.filter(n => !n.readStatus).length;

    return res.status(200).json({
      success: true, count: notifications.length, unreadCount, notifications,
      preferences: user.notificationPreferences || {}
    });
  } catch (err) {
    next(err);
  }
};

exports.markAsRead = async (req, res, next) => {
  try {
    const uid = req.user.uid;
    const db = getFirestore();
    const docRef = db.collection('notifications').doc(req.params.id);
    const doc = await docRef.get();
    if (!doc.exists || doc.data().userId !== uid) {
      return res.status(404).json({ success: false, error: 'Notification not found.' });
    }
    await docRef.update({ readStatus: true });
    return res.status(200).json({ success: true, notification: { id: doc.id, ...doc.data(), readStatus: true } });
  } catch (err) {
    next(err);
  }
};

exports.markAllRead = async (req, res, next) => {
  try {
    const uid = req.user.uid;
    const db = getFirestore();
    const snap = await db.collection('notifications').where('userId', '==', uid).where('readStatus', '==', false).get();
    const batch = db.batch();
    snap.docs.forEach(d => batch.update(d.ref, { readStatus: true }));
    if (snap.docs.length > 0) await batch.commit();
    return res.status(200).json({ success: true, message: 'All notifications marked as read.' });
  } catch (err) {
    next(err);
  }
};

exports.deleteNotification = async (req, res, next) => {
  try {
    const uid = req.user.uid;
    const db = getFirestore();
    const docRef = db.collection('notifications').doc(req.params.id);
    const doc = await docRef.get();
    if (!doc.exists || doc.data().userId !== uid) {
      return res.status(404).json({ success: false, error: 'Notification not found.' });
    }
    await docRef.delete();
    return res.status(200).json({ success: true, message: 'Notification removed.' });
  } catch (err) {
    next(err);
  }
};

exports.clearAllNotifications = async (req, res, next) => {
  try {
    const uid = req.user.uid;
    const db = getFirestore();
    const snap = await db.collection('notifications').where('userId', '==', uid).get();
    const batch = db.batch();
    snap.docs.forEach(d => batch.delete(d.ref));
    if (snap.docs.length > 0) await batch.commit();
    return res.status(200).json({ success: true, message: 'Notification history cleared.' });
  } catch (err) {
    next(err);
  }
};

exports.updatePreferences = async (req, res, next) => {
  try {
    const uid = req.user.uid;
    const { preferences } = req.body;
    const db = getFirestore();
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();
    const existing = userDoc.exists ? (userDoc.data().notificationPreferences || {}) : {};
    const merged = { ...existing, ...(preferences || {}) };
    await userRef.set({ notificationPreferences: merged, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return res.status(200).json({ success: true, message: 'Preferences updated.', preferences: merged });
  } catch (err) {
    next(err);
  }
};
