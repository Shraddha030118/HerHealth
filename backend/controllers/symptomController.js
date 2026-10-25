/**
 * HerHealth AI — Symptom Controller (Firebase Firestore)
 */
const { getFirestore } = require('../config/firebase');
const { FieldValue } = require('firebase-admin/firestore');
const { evaluateHealthAlerts } = require('../services/healthAlertService');

exports.getAllSymptoms = async (req, res, next) => {
  try {
    const uid = req.user.uid;
    const { limit = 50 } = req.query;
    const db = getFirestore();

    let query = db.collection('symptoms')
      .where('userId', '==', uid)
      .orderBy('date', 'desc')
      .limit(Number(limit));

    const snap = await query.get();
    const logs = snap.docs.map(d => ({ id: d.id, _id: d.id, ...d.data() }));

    const frequency = {};
    const painTrends = [];
    const moodDistribution = {};

    [...logs].reverse().forEach(log => {
      painTrends.push({ date: log.date, painLevel: log.painLevel, mood: log.mood });
      (log.symptoms || []).forEach(sym => { frequency[sym] = (frequency[sym] || 0) + 1; });
      if (log.mood) moodDistribution[log.mood] = (moodDistribution[log.mood] || 0) + 1;
    });

    return res.status(200).json({
      success: true, count: logs.length, logs,
      trends: { painTrends, frequency, moodDistribution }
    });
  } catch (err) {
    next(err);
  }
};

exports.createSymptom = async (req, res, next) => {
  try {
    const uid = req.user.uid;
    const { date, symptoms, painLevel, mood, flowInformation, notes } = req.body;

    const logDate = date ? new Date(date) : new Date();
    if (isNaN(logDate.getTime())) {
      return res.status(400).json({ success: false, error: 'Invalid log date.' });
    }

    const db = getFirestore();
    const data = {
      userId: uid,
      date: logDate.toISOString(),
      symptoms: Array.isArray(symptoms) ? symptoms : [],
      painLevel: painLevel !== undefined ? Number(painLevel) : 0,
      mood: mood || 'neutral',
      flowInformation: flowInformation || 'none',
      notes: notes ? notes.trim() : '',
      createdAt: FieldValue.serverTimestamp()
    };

    const docRef = await db.collection('symptoms').add(data);
    const log = { id: docRef.id, _id: docRef.id, ...data };

    // Evaluate health alerts
    const evaluation = evaluateHealthAlerts({
      symptoms: data.symptoms, painLevel: data.painLevel,
      flow: data.flowInformation, notes: data.notes
    });

    const createdAlerts = [];
    for (const alertData of (evaluation.alerts || [])) {
      const alertDoc = {
        userId: uid,
        alertCode: alertData.alertCode,
        title: alertData.title,
        severity: alertData.severity,
        explanation: alertData.explanation,
        recommendedAction: alertData.recommendedAction,
        symptomsFlagged: alertData.symptomsFlagged,
        readStatus: false,
        createdAt: FieldValue.serverTimestamp()
      };
      const alertRef = await db.collection('healthAlerts').add(alertDoc);
      createdAlerts.push({ id: alertRef.id, ...alertDoc });

      if (alertData.severity === 'urgent' || alertData.severity === 'high') {
        await db.collection('notifications').add({
          userId: uid,
          type: 'health_alert',
          title: `⚠️ ${alertData.title}`,
          message: alertData.explanation.substring(0, 140) + '...',
          severity: alertData.severity,
          link: '/pages/health-alerts.html',
          readStatus: false,
          createdAt: FieldValue.serverTimestamp()
        });
      }
    }

    return res.status(201).json({
      success: true, message: 'Symptom log recorded.', log, triggeredAlerts: createdAlerts
    });
  } catch (err) {
    next(err);
  }
};

exports.getSymptomById = async (req, res, next) => {
  try {
    const uid = req.user.uid;
    const db = getFirestore();
    const doc = await db.collection('symptoms').doc(req.params.id).get();
    if (!doc.exists || doc.data().userId !== uid) {
      return res.status(404).json({ success: false, error: 'Symptom log not found.' });
    }
    return res.status(200).json({ success: true, log: { id: doc.id, _id: doc.id, ...doc.data() } });
  } catch (err) {
    next(err);
  }
};

exports.updateSymptom = async (req, res, next) => {
  try {
    const uid = req.user.uid;
    const { date, symptoms, painLevel, mood, flowInformation, notes } = req.body;
    const db = getFirestore();
    const docRef = db.collection('symptoms').doc(req.params.id);
    const doc = await docRef.get();

    if (!doc.exists || doc.data().userId !== uid) {
      return res.status(404).json({ success: false, error: 'Symptom log not found.' });
    }

    const updates = { updatedAt: FieldValue.serverTimestamp() };
    if (date) { const d = new Date(date); if (!isNaN(d)) updates.date = d.toISOString(); }
    if (symptoms !== undefined) updates.symptoms = Array.isArray(symptoms) ? symptoms : [];
    if (painLevel !== undefined) updates.painLevel = Number(painLevel);
    if (mood !== undefined) updates.mood = mood;
    if (flowInformation !== undefined) updates.flowInformation = flowInformation;
    if (notes !== undefined) updates.notes = notes.trim();

    await docRef.update(updates);
    const updated = await docRef.get();
    return res.status(200).json({ success: true, message: 'Symptom log updated.', log: { id: updated.id, _id: updated.id, ...updated.data() } });
  } catch (err) {
    next(err);
  }
};

exports.deleteSymptom = async (req, res, next) => {
  try {
    const uid = req.user.uid;
    const db = getFirestore();
    const docRef = db.collection('symptoms').doc(req.params.id);
    const doc = await docRef.get();
    if (!doc.exists || doc.data().userId !== uid) {
      return res.status(404).json({ success: false, error: 'Symptom log not found.' });
    }
    await docRef.delete();
    return res.status(200).json({ success: true, message: 'Symptom log deleted.' });
  } catch (err) {
    next(err);
  }
};
