/**
 * HerHealth AI — Auth Controller (Firebase)
 * Registration/Login are handled by Firebase Auth on the frontend.
 * These endpoints sync user profiles to Firestore and return status.
 */
const { getFirestore } = require('../config/firebase');
const { FieldValue } = require('firebase-admin/firestore');

exports.register = async (req, res, next) => {
  try {
    // Registration is done via Firebase Auth on the frontend.
    // This endpoint syncs the profile to Firestore if needed.
    const { name, email, age } = req.body;
    const uid = req.user?.uid;

    if (!uid) {
      return res.status(401).json({ success: false, error: 'Not authenticated.' });
    }

    const db = getFirestore();
    const userRef = db.collection('users').doc(uid);
    const existing = await userRef.get();

    if (!existing.exists) {
      await userRef.set({
        uid,
        name: name || 'User',
        email: email || req.user.email,
        age: age ? Number(age) : null,
        averageCycleLength: 28,
        averagePeriodDuration: 5,
        notificationPreferences: {
          periodReminder: true,
          symptomReminder: true,
          wellnessReminder: true,
          healthAlerts: true
        },
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });
    }

    return res.status(201).json({ success: true, message: 'Profile synced.', user: { uid, email, name } });
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    // Login is handled by Firebase Auth on the frontend.
    // This endpoint just confirms the token is valid (middleware already verified it).
    const uid = req.user.uid;
    const db = getFirestore();
    const userDoc = await db.collection('users').doc(uid).get();

    // Create Firestore doc if it doesn't exist yet
    if (!userDoc.exists) {
      await db.collection('users').doc(uid).set({
        uid,
        name: req.user.name || 'User',
        email: req.user.email,
        averageCycleLength: 28,
        averagePeriodDuration: 5,
        notificationPreferences: {
          periodReminder: true, symptomReminder: true,
          wellnessReminder: true, healthAlerts: true
        },
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });
    }

    const user = userDoc.exists ? { uid, ...userDoc.data() } : req.user;
    return res.status(200).json({ success: true, message: 'Login successful.', user });
  } catch (err) {
    next(err);
  }
};

exports.logout = (req, res) => {
  // Firebase logout is handled client-side via firebase.auth().signOut()
  return res.status(200).json({ success: true, message: 'Logged out successfully.' });
};

exports.getMe = async (req, res, next) => {
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
