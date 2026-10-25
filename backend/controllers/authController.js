/**
 * HerHealth AI — Auth Controller (Firebase)
 * /register and /login sync the Firestore user profile after Firebase Auth login on the frontend.
 * These endpoints accept the Firebase ID token via Authorization header.
 */
const { getFirestore } = require('../config/firebase');
const { FieldValue } = require('firebase-admin/firestore');
const { getAuth: getFirebaseAuth } = require('../config/firebase');

// Helper: extract and verify token from request (optional — doesn't block)
async function tryGetUid(req) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return null;
    const decoded = await getFirebaseAuth().verifyIdToken(token);
    return decoded;
  } catch (e) {
    return null;
  }
}

exports.register = async (req, res, next) => {
  try {
    const decoded = await tryGetUid(req);
    if (!decoded) {
      return res.status(401).json({ success: false, error: 'Valid Firebase token required.' });
    }

    const uid = decoded.uid;
    const { name, email, age } = req.body;
    const db = getFirestore();
    const userRef = db.collection('users').doc(uid);
    const existing = await userRef.get();

    if (!existing.exists) {
      await userRef.set({
        uid,
        name: name || decoded.name || 'User',
        email: email || decoded.email,
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

    const userDoc = await userRef.get();
    return res.status(201).json({
      success: true,
      message: 'Profile synced.',
      user: { uid, ...userDoc.data() }
    });
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const decoded = await tryGetUid(req);
    if (!decoded) {
      return res.status(401).json({ success: false, error: 'Valid Firebase token required.' });
    }

    const uid = decoded.uid;
    const db = getFirestore();
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      await userRef.set({
        uid,
        name: decoded.name || 'User',
        email: decoded.email,
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

    const finalDoc = await userRef.get();
    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      user: { uid, ...finalDoc.data() }
    });
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
    const decoded = await tryGetUid(req);
    if (!decoded) {
      return res.status(401).json({ success: false, error: 'Not authenticated.' });
    }

    const db = getFirestore();
    const userDoc = await db.collection('users').doc(decoded.uid).get();
    const user = userDoc.exists ? { uid: decoded.uid, ...userDoc.data() } : { uid: decoded.uid, email: decoded.email };
    return res.status(200).json({ success: true, user });
  } catch (err) {
    next(err);
  }
};
