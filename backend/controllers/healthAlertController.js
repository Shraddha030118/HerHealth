const HealthAlert = require('../models/HealthAlert');
const PeriodRecord = require('../models/PeriodRecord');
const SymptomLog = require('../models/SymptomLog');
const User = require('../models/User');
const { calculateCycleMetrics } = require('../services/cycleService');
const { evaluateHealthAlerts } = require('../services/healthAlertService');

exports.getAlerts = async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const alerts = await HealthAlert.find({ userId }).sort({ createdAt: -1 });
    const unreadCount = alerts.filter(a => !a.readStatus).length;

    return res.status(200).json({
      success: true,
      count: alerts.length,
      unreadCount,
      alerts,
      disclaimer: 'Educational Alert Notice: HerHealth AI provides supportive observations based on documented guidelines and is NOT an automated diagnostic system.'
    });
  } catch (err) {
    next(err);
  }
};

exports.evaluateAll = async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const user = await User.findById(userId);
    const periods = await PeriodRecord.find({ userId }).sort({ startDate: -1 });
    const symptoms = await SymptomLog.find({ userId }).sort({ date: -1 }).limit(14);

    const cycleMetrics = calculateCycleMetrics(periods, user);

    // Evaluate against most recent symptom log and cycle state
    const latestSymptom = symptoms[0] || {};
    const evaluation = evaluateHealthAlerts({
      symptoms: latestSymptom.symptoms || [],
      painLevel: latestSymptom.painLevel || 0,
      flow: latestSymptom.flowInformation || 'none',
      notes: latestSymptom.notes || '',
      periodDuration: cycleMetrics.averagePeriodDuration,
      cycleMetrics
    });

    const newAlerts = [];
    for (const al of evaluation.alerts) {
      // Check if alert of this code was already created in last 24 hours to prevent spam
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const existing = await HealthAlert.findOne({
        userId,
        alertCode: al.alertCode,
        createdAt: { $gte: oneDayAgo }
      });

      if (!existing) {
        const created = await HealthAlert.create({
          userId,
          alertCode: al.alertCode,
          title: al.title,
          severity: al.severity,
          explanation: al.explanation,
          recommendedAction: al.recommendedAction,
          symptomsFlagged: al.symptomsFlagged
        });
        newAlerts.push(created);
      }
    }

    const allAlerts = await HealthAlert.find({ userId }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: 'Health alert evaluation completed.',
      newAlertsCount: newAlerts.length,
      alerts: allAlerts,
      evaluationSummary: evaluation
    });
  } catch (err) {
    next(err);
  }
};

exports.markAsRead = async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const alert = await HealthAlert.findOneAndUpdate(
      { _id: req.params.id, userId },
      { readStatus: true },
      { new: true }
    );

    if (!alert) {
      return res.status(404).json({ success: false, error: 'Alert not found.' });
    }

    return res.status(200).json({ success: true, alert });
  } catch (err) {
    next(err);
  }
};

exports.markAllRead = async (req, res, next) => {
  try {
    const userId = req.session.userId;
    await HealthAlert.updateMany({ userId, readStatus: false }, { readStatus: true });
    return res.status(200).json({ success: true, message: 'All alerts marked as read.' });
  } catch (err) {
    next(err);
  }
};
