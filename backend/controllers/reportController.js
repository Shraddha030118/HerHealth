/**
 * HerHealth AI — Report Controller (Firebase Firestore)
 */
const { getFirestore } = require('../config/firebase');
const { calculateCycleMetrics } = require('../services/cycleService');
const { generateReportData, buildPDFReport } = require('../services/reportService');

exports.previewReport = async (req, res, next) => {
  try {
    const uid = req.user.uid;
    const { startDate, endDate, personalNotes } = req.body;
    const db = getFirestore();

    const [periodsSnap, symptomsSnap, alertsSnap, questSnap] = await Promise.all([
      db.collection('periods').where('userId', '==', uid).orderBy('startDate', 'desc').get(),
      db.collection('symptoms').where('userId', '==', uid).orderBy('date', 'desc').get(),
      db.collection('healthAlerts').where('userId', '==', uid).orderBy('createdAt', 'desc').get(),
      db.collection('questionnaires').where('userId', '==', uid).where('completionStatus', '==', 'completed').orderBy('updatedAt', 'desc').limit(30).get()
    ]);

    const periods = periodsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const symptoms = symptomsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const alerts = alertsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const questionnaireHistory = questSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const cycleMetrics = calculateCycleMetrics(periods, req.user);

    const reportData = generateReportData({
      user: req.user, periods, symptoms, cycleMetrics, alerts, questionnaireHistory,
      options: { startDate, endDate, personalNotes }
    });

    return res.status(200).json({ success: true, report: reportData });
  } catch (err) {
    next(err);
  }
};

exports.downloadPDF = async (req, res, next) => {
  try {
    const uid = req.user.uid;
    const { startDate, endDate, personalNotes } = req.query;
    const db = getFirestore();

    const [periodsSnap, symptomsSnap, alertsSnap, questSnap] = await Promise.all([
      db.collection('periods').where('userId', '==', uid).orderBy('startDate', 'desc').get(),
      db.collection('symptoms').where('userId', '==', uid).orderBy('date', 'desc').get(),
      db.collection('healthAlerts').where('userId', '==', uid).orderBy('createdAt', 'desc').get(),
      db.collection('questionnaires').where('userId', '==', uid).where('completionStatus', '==', 'completed').orderBy('updatedAt', 'desc').limit(30).get()
    ]);

    const periods = periodsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const symptoms = symptomsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const alerts = alertsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const questionnaireHistory = questSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const cycleMetrics = calculateCycleMetrics(periods, req.user);

    const reportData = generateReportData({
      user: req.user, periods, symptoms, cycleMetrics, alerts, questionnaireHistory,
      options: { startDate, endDate, personalNotes }
    });

    const userName = (req.user.name || 'User').replace(/\s+/g, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=HerHealth_Report_${userName}.pdf`);

    await buildPDFReport(reportData, res);
  } catch (err) {
    next(err);
  }
};
