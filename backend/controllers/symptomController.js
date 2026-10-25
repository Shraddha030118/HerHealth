const SymptomLog = require('../models/SymptomLog');
const HealthAlert = require('../models/HealthAlert');
const Notification = require('../models/Notification');
const { evaluateHealthAlerts } = require('../services/healthAlertService');

exports.getAllSymptoms = async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const { startDate, endDate, limit = 50 } = req.query;

    const filter = { userId };
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const logs = await SymptomLog.find(filter)
      .sort({ date: -1 })
      .limit(Number(limit));

    // Calculate aggregated trends
    const frequency = {};
    const painTrends = [];
    const moodDistribution = {};

    // In chronological order for chart display
    const chronological = [...logs].reverse();
    chronological.forEach(log => {
      painTrends.push({
        date: log.date,
        painLevel: log.painLevel,
        mood: log.mood
      });

      (log.symptoms || []).forEach(sym => {
        frequency[sym] = (frequency[sym] || 0) + 1;
      });

      if (log.mood) {
        moodDistribution[log.mood] = (moodDistribution[log.mood] || 0) + 1;
      }
    });

    return res.status(200).json({
      success: true,
      count: logs.length,
      logs,
      trends: {
        painTrends,
        frequency,
        moodDistribution
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.createSymptom = async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const { date, symptoms, painLevel, mood, flowInformation, notes } = req.body;

    const logDate = date ? new Date(date) : new Date();
    if (isNaN(logDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid log date.'
      });
    }

    const log = await SymptomLog.create({
      userId,
      date: logDate,
      symptoms: Array.isArray(symptoms) ? symptoms : [],
      painLevel: painLevel !== undefined ? Number(painLevel) : 0,
      mood: mood || 'neutral',
      flowInformation: flowInformation || 'none',
      notes: notes ? notes.trim() : ''
    });

    // Check for conservative health alerts triggered by this entry
    const evaluation = evaluateHealthAlerts({
      symptoms: log.symptoms,
      painLevel: log.painLevel,
      flow: log.flowInformation,
      notes: log.notes
    });

    const createdAlerts = [];
    if (evaluation.alerts && evaluation.alerts.length > 0) {
      for (const alertData of evaluation.alerts) {
        const alertDoc = await HealthAlert.create({
          userId,
          alertCode: alertData.alertCode,
          title: alertData.title,
          severity: alertData.severity,
          explanation: alertData.explanation,
          recommendedAction: alertData.recommendedAction,
          symptomsFlagged: alertData.symptomsFlagged
        });
        createdAlerts.push(alertDoc);

        // Also trigger in-app notification if urgent or high
        if (alertData.severity === 'urgent' || alertData.severity === 'high') {
          await Notification.create({
            userId,
            type: 'health_alert',
            title: `⚠️ ${alertData.title}`,
            message: alertData.explanation.substring(0, 140) + '...',
            severity: alertData.severity,
            link: '/pages/health-alerts.html'
          });
        }
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Symptom log recorded successfully.',
      log,
      triggeredAlerts: createdAlerts
    });
  } catch (err) {
    next(err);
  }
};

exports.getSymptomById = async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const log = await SymptomLog.findOne({ _id: req.params.id, userId });

    if (!log) {
      return res.status(404).json({
        success: false,
        error: 'Symptom log not found.'
      });
    }

    return res.status(200).json({
      success: true,
      log
    });
  } catch (err) {
    next(err);
  }
};

exports.updateSymptom = async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const { date, symptoms, painLevel, mood, flowInformation, notes } = req.body;

    const log = await SymptomLog.findOne({ _id: req.params.id, userId });
    if (!log) {
      return res.status(404).json({
        success: false,
        error: 'Symptom log not found.'
      });
    }

    if (date) {
      const d = new Date(date);
      if (isNaN(d.getTime())) return res.status(400).json({ success: false, error: 'Invalid date.' });
      log.date = d;
    }
    if (symptoms !== undefined) log.symptoms = Array.isArray(symptoms) ? symptoms : [];
    if (painLevel !== undefined) log.painLevel = Number(painLevel);
    if (mood !== undefined) log.mood = mood;
    if (flowInformation !== undefined) log.flowInformation = flowInformation;
    if (notes !== undefined) log.notes = notes.trim();

    await log.save();

    return res.status(200).json({
      success: true,
      message: 'Symptom log updated.',
      log
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteSymptom = async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const log = await SymptomLog.findOneAndDelete({ _id: req.params.id, userId });

    if (!log) {
      return res.status(404).json({
        success: false,
        error: 'Symptom log not found.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Symptom log deleted.'
    });
  } catch (err) {
    next(err);
  }
};
