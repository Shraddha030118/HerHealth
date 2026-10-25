/**
 * HerHealth AI — Period Controller (Firebase Firestore)
 */
const { getFirestore } = require('../config/firebase');
const { FieldValue } = require('firebase-admin/firestore');
const { calculateCycleMetrics } = require('../services/cycleService');

async function getUserPeriods(db, uid) {
  const snap = await db.collection('periods')
    .where('userId', '==', uid)
    .orderBy('startDate', 'desc')
    .get();
  return snap.docs.map(d => ({ id: d.id, _id: d.id, ...d.data() }));
}

exports.getAllPeriods = async (req, res, next) => {
  try {
    const uid = req.user.uid;
    const db = getFirestore();
    const records = await getUserPeriods(db, uid);
    const metrics = calculateCycleMetrics(records, req.user);
    return res.status(200).json({ success: true, count: records.length, records, metrics });
  } catch (err) {
    next(err);
  }
};

exports.createPeriod = async (req, res, next) => {
  try {
    const uid = req.user.uid;
    const { startDate, endDate, flowIntensity, notes } = req.body;

    if (!startDate) {
      return res.status(400).json({ success: false, error: 'Period start date is required.' });
    }

    const sDate = new Date(startDate);
    if (isNaN(sDate.getTime())) {
      return res.status(400).json({ success: false, error: 'Invalid start date format.' });
    }

    const eDate = endDate ? new Date(endDate) : null;
    if (eDate && eDate < sDate) {
      return res.status(400).json({ success: false, error: 'End date cannot precede the start date.' });
    }

    const db = getFirestore();
    const data = {
      userId: uid,
      startDate: sDate.toISOString(),
      endDate: eDate ? eDate.toISOString() : null,
      flowIntensity: flowIntensity || 'medium',
      notes: notes ? notes.trim() : '',
      createdAt: FieldValue.serverTimestamp()
    };

    const docRef = await db.collection('periods').add(data);
    const record = { id: docRef.id, _id: docRef.id, ...data };

    // Update user's lastPeriodStartDate
    const userDoc = await db.collection('users').doc(uid).get();
    const userData = userDoc.exists ? userDoc.data() : {};
    if (!userData.lastPeriodStartDate || sDate > new Date(userData.lastPeriodStartDate)) {
      await db.collection('users').doc(uid).set(
        { lastPeriodStartDate: sDate.toISOString(), updatedAt: FieldValue.serverTimestamp() },
        { merge: true }
      );
    }

    const allRecords = await getUserPeriods(db, uid);
    const metrics = calculateCycleMetrics(allRecords, req.user);

    return res.status(201).json({
      success: true, message: 'Period record created successfully.', record, metrics
    });
  } catch (err) {
    next(err);
  }
};

exports.getPeriodById = async (req, res, next) => {
  try {
    const uid = req.user.uid;
    const db = getFirestore();
    const doc = await db.collection('periods').doc(req.params.id).get();

    if (!doc.exists || doc.data().userId !== uid) {
      return res.status(404).json({ success: false, error: 'Period record not found.' });
    }

    return res.status(200).json({ success: true, record: { id: doc.id, _id: doc.id, ...doc.data() } });
  } catch (err) {
    next(err);
  }
};

exports.updatePeriod = async (req, res, next) => {
  try {
    const uid = req.user.uid;
    const { startDate, endDate, flowIntensity, notes } = req.body;
    const db = getFirestore();
    const docRef = db.collection('periods').doc(req.params.id);
    const doc = await docRef.get();

    if (!doc.exists || doc.data().userId !== uid) {
      return res.status(404).json({ success: false, error: 'Period record not found.' });
    }

    const updates = { updatedAt: FieldValue.serverTimestamp() };
    if (startDate) {
      const d = new Date(startDate);
      if (isNaN(d.getTime())) return res.status(400).json({ success: false, error: 'Invalid start date.' });
      updates.startDate = d.toISOString();
    }
    if (endDate !== undefined) updates.endDate = endDate ? new Date(endDate).toISOString() : null;
    if (flowIntensity) updates.flowIntensity = flowIntensity;
    if (notes !== undefined) updates.notes = notes.trim();

    await docRef.update(updates);
    const updated = await docRef.get();

    return res.status(200).json({
      success: true, message: 'Period record updated.',
      record: { id: updated.id, _id: updated.id, ...updated.data() }
    });
  } catch (err) {
    next(err);
  }
};

exports.deletePeriod = async (req, res, next) => {
  try {
    const uid = req.user.uid;
    const db = getFirestore();
    const docRef = db.collection('periods').doc(req.params.id);
    const doc = await docRef.get();

    if (!doc.exists || doc.data().userId !== uid) {
      return res.status(404).json({ success: false, error: 'Period record not found.' });
    }

    await docRef.delete();
    return res.status(200).json({ success: true, message: 'Period record deleted.' });
  } catch (err) {
    next(err);
  }
};
