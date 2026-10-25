/**
 * Cycle Service
 * Conservative and transparent menstrual cycle analysis and estimates.
 * NOTE: Cycle predictions are statistical estimates and not medical or contraceptive guarantees.
 */

function calculateCycleMetrics(periodRecords = [], userProfile = {}) {
  const defaultCycleLength = Number(userProfile.averageCycleLength) || 28;
  const defaultPeriodDuration = Number(userProfile.averagePeriodDuration) || 5;

  if (!periodRecords || periodRecords.length === 0) {
    const lastStartDate = userProfile.lastPeriodStartDate ? new Date(userProfile.lastPeriodStartDate) : null;
    let nextEstimatedStart = null;
    let currentCycleDay = null;
    let cyclePhase = 'Unknown';
    let phaseDescription = 'Record your first period to begin personalized cycle tracking.';

    if (lastStartDate && !isNaN(lastStartDate.getTime())) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((today - lastStartDate) / (1000 * 60 * 60 * 24));
      currentCycleDay = diffDays >= 0 ? diffDays + 1 : null;

      const nextDate = new Date(lastStartDate);
      nextDate.setDate(nextDate.getDate() + defaultCycleLength);
      nextEstimatedStart = nextDate;

      const phaseInfo = determinePhase(currentCycleDay, defaultPeriodDuration, defaultCycleLength);
      cyclePhase = phaseInfo.phase;
      phaseDescription = phaseInfo.description;
    }

    return {
      hasData: false,
      cycleCount: 0,
      averageCycleLength: defaultCycleLength,
      averagePeriodDuration: defaultPeriodDuration,
      isCycleLengthEstimated: true,
      isPeriodDurationEstimated: true,
      regularityStatus: 'insufficient_data',
      regularityText: 'Insufficient data recorded (minimum 3 cycles recommended)',
      historicalCycleLengths: [],
      lastPeriodStartDate: lastStartDate,
      nextEstimatedPeriodStart: nextEstimatedStart,
      daysUntilNextPeriod: nextEstimatedStart ? Math.ceil((nextEstimatedStart - new Date()) / (1000 * 60 * 60 * 24)) : null,
      currentCycleDay,
      cyclePhase,
      phaseDescription,
      disclaimer: 'Predictions are estimates based on baseline profile averages and not medical diagnoses.'
    };
  }

  // Sort chronological ascending
  const sorted = [...periodRecords].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

  // Calculate period durations
  const durations = [];
  sorted.forEach(rec => {
    if (rec.startDate && rec.endDate) {
      const start = new Date(rec.startDate);
      const end = new Date(rec.endDate);
      const durationDays = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1);
      if (durationDays > 0 && durationDays <= 20) {
        durations.push(durationDays);
      }
    }
  });

  // Calculate cycle lengths between successive period start dates
  const cycleLengths = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const currentStart = new Date(sorted[i].startDate);
    const nextStart = new Date(sorted[i + 1].startDate);
    const cycleDays = Math.round((nextStart - currentStart) / (1000 * 60 * 60 * 24));
    // Plausible human menstrual cycle interval filter
    if (cycleDays >= 15 && cycleDays <= 90) {
      cycleLengths.push(cycleDays);
    }
  }

  const avgPeriodDuration = durations.length > 0
    ? Math.round((durations.reduce((acc, v) => acc + v, 0) / durations.length) * 10) / 10
    : defaultPeriodDuration;

  const avgCycleLength = cycleLengths.length > 0
    ? Math.round((cycleLengths.reduce((acc, v) => acc + v, 0) / cycleLengths.length) * 10) / 10
    : defaultCycleLength;

  // Regularity assessment
  let regularityStatus = 'insufficient_data';
  let regularityText = 'Collecting historical records (minimum 3 completed cycles recommended)';
  if (cycleLengths.length >= 2) {
    const mean = avgCycleLength;
    const variance = cycleLengths.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / cycleLengths.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev <= 3.5) {
      regularityStatus = 'regular';
      regularityText = `Consistent cycle intervals (±${Math.round(stdDev)} days variation)`;
    } else if (stdDev <= 7) {
      regularityStatus = 'moderately_variable';
      regularityText = `Slight variability observed (±${Math.round(stdDev)} days variation)`;
    } else {
      regularityStatus = 'variable';
      regularityText = `Variable cycle lengths noted (±${Math.round(stdDev)} days variation)`;
    }
  }

  // Last period
  const mostRecentRecord = sorted[sorted.length - 1];
  const lastStartDate = new Date(mostRecentRecord.startDate);

  // Cycle day
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffTime = today - lastStartDate;
  const currentCycleDay = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

  // Next predicted period
  const nextEstimatedStart = new Date(lastStartDate);
  nextEstimatedStart.setDate(nextEstimatedStart.getDate() + Math.round(avgCycleLength));
  const daysUntilNextPeriod = Math.ceil((nextEstimatedStart - today) / (1000 * 60 * 60 * 24));

  const phaseInfo = determinePhase(currentCycleDay, Math.round(avgPeriodDuration), Math.round(avgCycleLength));

  return {
    hasData: true,
    recordCount: sorted.length,
    cycleCount: cycleLengths.length,
    averageCycleLength: avgCycleLength,
    averagePeriodDuration: avgPeriodDuration,
    isCycleLengthEstimated: cycleLengths.length === 0,
    isPeriodDurationEstimated: durations.length === 0,
    regularityStatus,
    regularityText,
    historicalCycleLengths: cycleLengths,
    lastPeriodStartDate: lastStartDate,
    nextEstimatedPeriodStart: nextEstimatedStart,
    daysUntilNextPeriod,
    currentCycleDay: currentCycleDay > 0 ? currentCycleDay : 1,
    cyclePhase: phaseInfo.phase,
    phaseDescription: phaseInfo.description,
    confidenceNote: cycleLengths.length >= 3 
      ? 'High confidence prediction based on multiple recorded cycles.' 
      : 'Preliminary estimate based on limited history. Accuracy improves with each recorded cycle.',
    disclaimer: 'Cycle predictions are mathematical estimates for educational tracking and planning, not a substitute for clinical diagnosis or contraception.'
  };
}

function determinePhase(cycleDay, periodDuration, cycleLength) {
  if (!cycleDay || cycleDay < 1) {
    return {
      phase: 'Unknown',
      description: 'Log your period start date to calculate your current cycle phase.'
    };
  }

  const ovulationDay = Math.max(periodDuration + 2, Math.round(cycleLength - 14));

  if (cycleDay <= periodDuration) {
    return {
      phase: 'Menstrual Phase',
      description: 'Your uterine lining is shedding. Rest, stay warm, hydrate, and nourish with iron-rich foods.'
    };
  } else if (cycleDay < ovulationDay - 1) {
    return {
      phase: 'Follicular Phase',
      description: 'Estrogen is steadily rising as follicles mature. Energy levels and focus typically increase.'
    };
  } else if (cycleDay >= ovulationDay - 1 && cycleDay <= ovulationDay + 1) {
    return {
      phase: 'Ovulatory Phase',
      description: 'Luteinizing hormone surge triggers egg release. Peak fertility window and heightened stamina.'
    };
  } else if (cycleDay <= cycleLength + 4) {
    return {
      phase: 'Luteal Phase',
      description: 'Progesterone prepares the body for potential pregnancy. You may experience PMS; gentle movement and balanced snacks are beneficial.'
    };
  } else {
    return {
      phase: 'Delayed / Extended Phase',
      description: 'Cycle is running longer than your average. Stress, travel, lifestyle, or hormonal shifts may cause temporary shifts.'
    };
  }
}

module.exports = {
  calculateCycleMetrics,
  determinePhase
};
