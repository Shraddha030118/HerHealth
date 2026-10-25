/**
 * HerHealth AI — Health Alert Controller (Firebase Firestore)
 */
const { getFirestore } = require('../config/firebase');
const { FieldValue } = require('firebase-admin/firestore');
const { calculateCycleMetrics } = require('../services/cycleService');
const { evaluateHealthAlerts } = require('../services/healthAlertService');

exports.getAlerts = async (req, res, next) => {
  try {
    const uid = req.user.uid;
    const db = getFirestore();
    const snap = await db.collection('healthAlerts')
      .where('userId', '==', uid)
      .orderBy('createdAt', 'desc')
      .get();

    const alerts = snap.docs.map(d => ({ id: d.id, _id: d.id, ...d.data() }));
    const unreadCount = alerts.filter(a => !a.readStatus).length;

    return res.status(200).json({
      success: true, count: alerts.length, unreadCount, alerts,
      disclaimer: 'Educational Alert Notice: HerHealth AI provides supportive observations and is NOT an automated diagnostic system.'
    });
  } catch (err) {
    next(err);
  }
};

exports.evaluateAll = async (req, res, next) => {
  try {
    const uid = req.user.uid;
    const db = getFirestore();

    const periodsSnap = await db.collection('periods').where('userId', '==', uid).orderBy('startDate', 'desc').get();
    const periods = periodsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const symptomsSnap = await db.collection('symptoms').where('userId', '==', uid).orderBy('date', 'desc').limit(14).get();
    const symptoms = symptomsSnap.docs.map(d => d.data());

    const cycleMetrics = calculateCycleMetrics(periods, req.user);
    const latestSymptom = symptoms[0] || {};

    const evaluation = evaluateHealthAlerts({
      symptoms: latestSymptom.symptoms || [],
      painLevel: latestSymptom.painLevel || 0,
      flow: latestSymptom.flowInformation || 'none',
      notes: latestSymptom.notes || '',
      periodDuration: cycleMetrics.averagePeriodDuration,
      cycleMetrics
    });

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const newAlerts = [];

    for (const al of evaluation.alerts) {
      const existSnap = await db.collection('healthAlerts')
        .where('userId', '==', uid)
        .where('alertCode', '==', al.alertCode)
        .get();

      const recentExists = existSnap.docs.some(d => {
        const ts = d.data().createdAt;
        return ts && (ts.toDate ? ts.toDate().toISOString() : ts) > oneDayAgo;
      });

      if (!recentExists) {
        const alertData = {
          userId: uid, alertCode: al.alertCode, title: al.title,
          severity: al.severity, explanation: al.explanation,
          recommendedAction: al.recommendedAction, symptomsFlagged: al.symptomsFlagged,
          readStatus: false, createdAt: FieldValue.serverTimestamp()
        };
        const ref = await db.collection('healthAlerts').add(alertData);
        newAlerts.push({ id: ref.id, ...alertData });
      }
    }

    const allSnap = await db.collection('healthAlerts').where('userId', '==', uid).orderBy('createdAt', 'desc').get();
    const allAlerts = allSnap.docs.map(d => ({ id: d.id, _id: d.id, ...d.data() }));

    return res.status(200).json({
      success: true, message: 'Health alert evaluation completed.',
      newAlertsCount: newAlerts.length, alerts: allAlerts, evaluationSummary: evaluation
    });
  } catch (err) {
    next(err);
  }
};

exports.markAsRead = async (req, res, next) => {
  try {
    const uid = req.user.uid;
    const db = getFirestore();
    const docRef = db.collection('healthAlerts').doc(req.params.id);
    const doc = await docRef.get();
    if (!doc.exists || doc.data().userId !== uid) {
      return res.status(404).json({ success: false, error: 'Alert not found.' });
    }
    await docRef.update({ readStatus: true });
    return res.status(200).json({ success: true, alert: { id: doc.id, ...doc.data(), readStatus: true } });
  } catch (err) {
    next(err);
  }
};

exports.markAllRead = async (req, res, next) => {
  try {
    const uid = req.user.uid;
    const db = getFirestore();
    const snap = await db.collection('healthAlerts').where('userId', '==', uid).where('readStatus', '==', false).get();
    const batch = db.batch();
    snap.docs.forEach(d => batch.update(d.ref, { readStatus: true }));
    if (snap.docs.length > 0) await batch.commit();
    return res.status(200).json({ success: true, message: 'All alerts marked as read.' });
  } catch (err) {
    next(err);
  }
};
