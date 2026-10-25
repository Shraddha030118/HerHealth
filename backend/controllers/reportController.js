const PeriodRecord = require('../models/PeriodRecord');
const SymptomLog = require('../models/SymptomLog');
const HealthAlert = require('../models/HealthAlert');
const User = require('../models/User');
const { calculateCycleMetrics } = require('../services/cycleService');
const { generateReportData, buildPDFReport } = require('../services/reportService');

exports.previewReport = async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const { startDate, endDate, personalNotes } = req.body;

    const user = await User.findById(userId);
    const periods = await PeriodRecord.find({ userId }).sort({ startDate: -1 });
    const symptoms = await SymptomLog.find({ userId }).sort({ date: -1 });
    const alerts = await HealthAlert.find({ userId }).sort({ createdAt: -1 });

    const cycleMetrics = calculateCycleMetrics(periods, user);

    const reportData = generateReportData({
      user,
      periods,
      symptoms,
      cycleMetrics,
      alerts,
      options: { startDate, endDate, personalNotes }
    });

    return res.status(200).json({
      success: true,
      report: reportData
    });
  } catch (err) {
    next(err);
  }
};

exports.downloadPDF = async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const { startDate, endDate, personalNotes } = req.query;

    const user = await User.findById(userId);
    const periods = await PeriodRecord.find({ userId }).sort({ startDate: -1 });
    const symptoms = await SymptomLog.find({ userId }).sort({ date: -1 });
    const alerts = await HealthAlert.find({ userId }).sort({ createdAt: -1 });

    const cycleMetrics = calculateCycleMetrics(periods, user);

    const reportData = generateReportData({
      user,
      periods,
      symptoms,
      cycleMetrics,
      alerts,
      options: { startDate, endDate, personalNotes }
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=HerHealth_Report_${user.name.replace(/\s+/g, '_')}.pdf`);

    await buildPDFReport(reportData, res);
  } catch (err) {
    next(err);
  }
};
