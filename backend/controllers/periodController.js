const PeriodRecord = require('../models/PeriodRecord');
const User = require('../models/User');
const { calculateCycleMetrics } = require('../services/cycleService');

exports.getAllPeriods = async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const records = await PeriodRecord.find({ userId }).sort({ startDate: -1 });
    const user = await User.findById(userId);

    const metrics = calculateCycleMetrics(records, user);

    return res.status(200).json({
      success: true,
      count: records.length,
      records,
      metrics
    });
  } catch (err) {
    next(err);
  }
};

exports.createPeriod = async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const { startDate, endDate, flowIntensity, notes } = req.body;

    if (!startDate) {
      return res.status(400).json({
        success: false,
        error: 'Period start date is required.'
      });
    }

    const sDate = new Date(startDate);
    const eDate = endDate ? new Date(endDate) : undefined;

    if (isNaN(sDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid start date format.'
      });
    }

    if (eDate && eDate < sDate) {
      return res.status(400).json({
        success: false,
        error: 'End date cannot precede the start date.'
      });
    }

    const record = await PeriodRecord.create({
      userId,
      startDate: sDate,
      endDate: eDate,
      flowIntensity: flowIntensity || 'medium',
      notes: notes ? notes.trim() : ''
    });

    // Update user's lastPeriodStartDate if this is more recent
    const user = await User.findById(userId);
    if (!user.lastPeriodStartDate || sDate > new Date(user.lastPeriodStartDate)) {
      user.lastPeriodStartDate = sDate;
      await user.save();
    }

    // Recalculate metrics
    const allRecords = await PeriodRecord.find({ userId }).sort({ startDate: -1 });
    const metrics = calculateCycleMetrics(allRecords, user);

    return res.status(201).json({
      success: true,
      message: 'Period record created successfully.',
      record,
      metrics
    });
  } catch (err) {
    next(err);
  }
};

exports.getPeriodById = async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const record = await PeriodRecord.findOne({ _id: req.params.id, userId });

    if (!record) {
      return res.status(404).json({
        success: false,
        error: 'Period record not found.'
      });
    }

    return res.status(200).json({
      success: true,
      record
    });
  } catch (err) {
    next(err);
  }
};

exports.updatePeriod = async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const { startDate, endDate, flowIntensity, notes } = req.body;

    const record = await PeriodRecord.findOne({ _id: req.params.id, userId });
    if (!record) {
      return res.status(404).json({
        success: false,
        error: 'Period record not found.'
      });
    }

    if (startDate) {
      const sDate = new Date(startDate);
      if (isNaN(sDate.getTime())) {
        return res.status(400).json({ success: false, error: 'Invalid start date.' });
      }
      record.startDate = sDate;
    }

    if (endDate !== undefined) {
      if (endDate) {
        const eDate = new Date(endDate);
        if (eDate < record.startDate) {
          return res.status(400).json({ success: false, error: 'End date cannot precede start date.' });
        }
        record.endDate = eDate;
      } else {
        record.endDate = undefined;
      }
    }

    if (flowIntensity) record.flowIntensity = flowIntensity;
    if (notes !== undefined) record.notes = notes.trim();

    await record.save();

    return res.status(200).json({
      success: true,
      message: 'Period record updated successfully.',
      record
    });
  } catch (err) {
    next(err);
  }
};

exports.deletePeriod = async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const record = await PeriodRecord.findOneAndDelete({ _id: req.params.id, userId });

    if (!record) {
      return res.status(404).json({
        success: false,
        error: 'Period record not found.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Period record deleted successfully.'
    });
  } catch (err) {
    next(err);
  }
};
