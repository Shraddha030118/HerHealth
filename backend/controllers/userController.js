/**
 * HerHealth AI — User Controller (Firebase Firestore)
 */
const { getFirestore, getAuth } = require('../config/firebase');
const { FieldValue } = require('firebase-admin/firestore');

exports.getProfile = async (req, res, next) => {
  try {
    const uid = req.user.uid;
    const db = getFirestore();
    const userDoc = await db.collection('users').doc(uid).get();
    const user = userDoc.exists ? { uid, ...userDoc.data() } : req.user;
    return res.status(200).json({ success: true, user });
  } catch (err) {
    next(err);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const uid = req.user.uid;
    const {
      name, age, averageCycleLength, averagePeriodDuration,
      lastPeriodStartDate, notificationPreferences, profileImage
    } = req.body;

    const updates = { updatedAt: FieldValue.serverTimestamp() };
    if (name !== undefined) updates.name = name.trim();
    if (age !== undefined) updates.age = Number(age);
    if (averageCycleLength !== undefined) updates.averageCycleLength = Number(averageCycleLength);
    if (averagePeriodDuration !== undefined) updates.averagePeriodDuration = Number(averagePeriodDuration);
    if (lastPeriodStartDate !== undefined) updates.lastPeriodStartDate = lastPeriodStartDate || null;
    if (notificationPreferences !== undefined) updates.notificationPreferences = notificationPreferences;
    if (profileImage !== undefined && typeof profileImage === 'string' && profileImage.length < 500000) {
      updates.profileImage = profileImage;
    }

    const db = getFirestore();
    await db.collection('users').doc(uid).set(updates, { merge: true });
    const updated = await db.collection('users').doc(uid).get();

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      user: { uid, ...updated.data() }
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteAccount = async (req, res, next) => {
  try {
    const uid = req.user.uid;
    const db = getFirestore();

    // Delete all Firestore collections for this user
    const collections = ['periods', 'symptoms', 'questionnaires', 'wellness',
                         'notifications', 'healthAlerts', 'hydration', 'chatConversations'];
    const deleteBatch = async (col) => {
      const snap = await db.collection(col).where('userId', '==', uid).get();
      const batch = db.batch();
      snap.docs.forEach(doc => batch.delete(doc.ref));
      if (snap.docs.length > 0) await batch.commit();
    };

    await Promise.all([
      ...collections.map(deleteBatch),
      db.collection('users').doc(uid).delete()
    ]);

    // Delete Firebase Auth account
    try { await getAuth().deleteUser(uid); } catch (e) {}

    return res.status(200).json({
      success: true,
      message: 'Your account and all associated health records have been permanently deleted.'
    });
  } catch (err) {
    next(err);
  }
};
