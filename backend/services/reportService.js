const PDFDocument = require('pdfkit');
const QUESTIONNAIRE_SYMPTOM_LABELS = {
  cramps: 'Abdominal cramps',
  severe_pelvic_pain: 'Severe abdominal or pelvic pain',
  back_pain: 'Back pain',
  headache: 'Headache',
  nausea_vomiting: 'Nausea or vomiting',
  dizziness_fainting: 'Dizziness or fainting',
  fatigue_weakness: 'Unusual fatigue or weakness',
  bloating: 'Bloating',
  fever: 'Fever',
  breathlessness: 'Severe difficulty breathing',
  confusion: 'Confusion',
  breast_tenderness: 'Breast tenderness',
  other: 'Other symptoms',
  none: 'None of these'
};

/**
 * Report Service
 * Compiles patient health metrics and generates downloadable doctor-ready PDF reports.
 */

function getQuestionnaireSummary(history) {
  const optionalAnswer = value => value === '' || value === undefined ? null : value;
  const entries = history
    .filter(item => item && item.completionStatus === 'completed')
    .map(item => {
      const answers = item.answers || {};
      return {
        submittedAt: item.submittedAt || item.createdAt,
        cycle: {
          lastPeriodStart: optionalAnswer(answers.lastPeriodStart),
          cycleLength: optionalAnswer(answers.cycleLength),
          periodDuration: optionalAnswer(answers.periodDuration),
          regularity: optionalAnswer(answers.cycleRegularity),
          recentChangesReported: optionalAnswer(answers.recentCycleChanges)
        },
        symptoms: Array.isArray(answers.symptoms)
          ? answers.symptoms.map(symptom => QUESTIONNAIRE_SYMPTOM_LABELS[symptom] || symptom)
          : [],
        painLevel: Number.isInteger(answers.painLevel) ? answers.painLevel : null,
        bleeding: {
          flow: answers.flowDescription || null,
          productChangeFrequency: answers.productChangeFrequency || null,
          floodingOrClots: answers.floodingOrClots || null,
          betweenPeriods: answers.bleedingBetweenPeriods || null,
          prolonged: answers.prolongedBleeding || null,
          patternTypicality: answers.isTypicalBleeding || null
        },
        assessment: item.assessment ? {
          level: item.assessment.level,
          levelName: item.assessment.levelName
        } : null
      };
    })
    .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

  const ordered = entries.slice().reverse();
  const reportedBleedingChanges = [];
  for (let index = 1; index < ordered.length; index += 1) {
    const previous = ordered[index - 1];
    const current = ordered[index];
    ['flow', 'productChangeFrequency', 'floodingOrClots', 'betweenPeriods', 'prolonged'].forEach(field => {
      const from = previous.bleeding[field];
      const to = current.bleeding[field];
      if (from && to && from !== to) {
        reportedBleedingChanges.push({
          date: current.submittedAt,
          field,
          from,
          to
        });
      }
    });
  }

  const painEntries = entries.filter(item => item.painLevel !== null);
  return {
    submissionCount: entries.length,
    latest: entries[0] || null,
    painTrend: painEntries.length >= 2
      ? painEntries.slice().reverse().map(item => ({
        date: item.submittedAt,
        painLevel: item.painLevel
      }))
      : [],
    reportedBleedingChanges,
    guidanceNotice: 'Questionnaire responses and the rule-based guidance level are self-reported support information, not a diagnosis.'
  };
}

function generateReportData({ user, periods = [], symptoms = [], cycleMetrics = {}, alerts = [], questionnaireHistory = [], questionnaire, options = {} }) {
  const startDate = options.startDate ? new Date(options.startDate) : null;
  const endDate = options.endDate ? new Date(options.endDate) : null;

  // Filter periods by date range if provided
  let filteredPeriods = periods;
  if (startDate) {
    filteredPeriods = filteredPeriods.filter(p => new Date(p.startDate) >= startDate);
  }
  if (endDate) {
    filteredPeriods = filteredPeriods.filter(p => new Date(p.startDate) <= endDate);
  }

  // Filter symptoms by date range if provided
  let filteredSymptoms = symptoms;
  if (startDate) {
    filteredSymptoms = filteredSymptoms.filter(s => new Date(s.date) >= startDate);
  }
  if (endDate) {
    filteredSymptoms = filteredSymptoms.filter(s => new Date(s.date) <= endDate);
  }

  // Calculate symptom frequencies
  const symptomCounts = {};
  let totalPain = 0;
  let maxPain = 0;
  filteredSymptoms.forEach(s => {
    (s.symptoms || []).forEach(sym => {
      symptomCounts[sym] = (symptomCounts[sym] || 0) + 1;
    });
    const p = Number(s.painLevel) || 0;
    totalPain += p;
    if (p > maxPain) maxPain = p;
  });

  const avgPain = filteredSymptoms.length > 0
    ? Math.round((totalPain / filteredSymptoms.length) * 10) / 10
    : 0;

  const topSymptoms = Object.entries(symptomCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));
  const questionnaireRecords = questionnaireHistory.length
    ? questionnaireHistory
    : questionnaire ? [questionnaire] : [];
  const questionnaireSummary = getQuestionnaireSummary(questionnaireRecords.filter(item => {
    const submittedAt = new Date(item.submittedAt || item.createdAt);
    if (startDate && submittedAt < startDate) return false;
    if (endDate && submittedAt > endDate) return false;
    return true;
  }));

  // Recommended questions for doctor
  const suggestedQuestions = [
    'Are my cycle lengths and regularity within normal expectations for my age and health profile?',
    'Could my recorded symptom patterns indicate hormonal imbalances or dysmenorrhea?',
    'What lifestyle, nutritional, or clinical options would you recommend for my pain levels?',
    'Are there specific diagnostic tests (such as pelvic ultrasound or iron/hormone blood panels) you recommend?'
  ];

  if (maxPain >= 7) {
    suggestedQuestions.unshift('My reported pain levels reach ' + maxPain + '/10. Could we evaluate for conditions like endometriosis or fibroids?');
  }

  return {
    generatedAt: new Date().toISOString(),
    patient: {
      name: user.name,
      age: user.age || 'Not specified',
      email: user.email
    },
    cycleSummary: {
      totalRecordedCycles: cycleMetrics.cycleCount || 0,
      totalPeriodsLogged: filteredPeriods.length,
      averageCycleLength: cycleMetrics.averageCycleLength,
      isCycleLengthEstimated: cycleMetrics.isCycleLengthEstimated,
      averagePeriodDuration: cycleMetrics.averagePeriodDuration,
      isPeriodDurationEstimated: cycleMetrics.isPeriodDurationEstimated,
      regularityStatus: cycleMetrics.regularityStatus,
      regularityDescription: cycleMetrics.regularityText
    },
    symptomSummary: {
      totalLogs: filteredSymptoms.length,
      averagePainScore: avgPain,
      peakPainScore: maxPain,
      topSymptoms
    },
    questionnaireSummary,
    periods: filteredPeriods.map(p => ({
      startDate: p.startDate,
      endDate: p.endDate,
      flowIntensity: p.flowIntensity,
      notes: p.notes
    })),
    recentAlerts: alerts.map(a => ({
      title: a.title,
      severity: a.severity,
      explanation: a.explanation,
      createdAt: a.createdAt
    })),
    suggestedQuestions,
    patientNotes: options.personalNotes || '',
    disclaimer: 'CONFIDENTIAL HEALTH REPORT: Prepared using user-recorded data in HerHealth AI for clinical consultation support. This document is not a medical diagnosis.'
  };
}

function buildPDFReport(reportData, writeStream) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
        info: {
          Title: `HerHealth_Report_${reportData.patient.name}`,
          Author: 'HerHealth AI',
          Subject: 'Menstrual Health Clinical Summary'
        }
      });

      doc.pipe(writeStream);

      // Header Banner
      doc.rect(40, 40, 515, 65).fill('#7C5CFC');
      doc.fillColor('#FFFFFF').fontSize(20).font('Helvetica-Bold').text('HerHealth AI — Clinical Health Summary', 55, 52);
      doc.fontSize(10).font('Helvetica').text('Prepared for healthcare professional consultation & personal health review', 55, 76);
      doc.text(`Generated on: ${new Date(reportData.generatedAt).toLocaleDateString()} | Confidential Document`, 55, 90);

      let y = 120;

      // Section 1: Patient Profile & Cycle Overview
      doc.fillColor('#2D1A47').fontSize(14).font('Helvetica-Bold').text('1. Patient Information & Cycle Profile', 40, y);
      y += 20;

      doc.fontSize(10).font('Helvetica').fillColor('#4A4A4A');
      doc.text(`Patient Name: ${reportData.patient.name}`, 40, y);
      doc.text(`Age: ${reportData.patient.age}`, 220, y);
      doc.text(`Reported Periods Logged: ${reportData.cycleSummary.totalPeriodsLogged}`, 360, y);
      y += 16;

      const cycleLenText = `${reportData.cycleSummary.averageCycleLength} days ${reportData.cycleSummary.isCycleLengthEstimated ? '(baseline estimate)' : '(historical mean)'}`;
      const durText = `${reportData.cycleSummary.averagePeriodDuration} days ${reportData.cycleSummary.isPeriodDurationEstimated ? '(baseline estimate)' : '(historical mean)'}`;
      doc.text(`Avg Cycle Interval: ${cycleLenText}`, 40, y);
      y += 16;
      doc.text(`Avg Period Flow Duration: ${durText}`, 40, y);
      y += 16;
      doc.text(`Cycle Regularity: ${reportData.cycleSummary.regularityDescription}`, 40, y);
      y += 25;

      // Section 2: Symptoms & Pain Analysis
      doc.fillColor('#2D1A47').fontSize(14).font('Helvetica-Bold').text('2. Symptom Trends & Pain Intensity', 40, y);
      y += 20;

      doc.fontSize(10).font('Helvetica').fillColor('#4A4A4A');
      doc.text(`Daily Symptom Logs Recorded: ${reportData.symptomSummary.totalLogs}`, 40, y);
      doc.text(`Average Pain Rating: ${reportData.symptomSummary.averagePainScore} / 10`, 220, y);
      doc.text(`Peak Pain Rating: ${reportData.symptomSummary.peakPainScore} / 10`, 380, y);
      y += 18;

      if (reportData.symptomSummary.topSymptoms.length > 0) {
        const topList = reportData.symptomSummary.topSymptoms
          .map(s => `${s.name} (${s.count} times)`)
          .join(', ');
        doc.text(`Most Frequent Symptoms: ${topList}`, 40, y, { width: 515 });
        y += 24;
      } else {
        doc.text('No symptoms logged for this period.', 40, y);
        y += 20;
      }

      // Section 3: Period History Table
      doc.fillColor('#2D1A47').fontSize(14).font('Helvetica-Bold').text('3. Recorded Menstrual Cycles', 40, y);
      y += 18;

      // Table header
      doc.rect(40, y, 515, 20).fill('#F3EEFC');
      doc.fillColor('#6440D6').fontSize(9).font('Helvetica-Bold');
      doc.text('Start Date', 50, y + 5);
      doc.text('End Date', 140, y + 5);
      doc.text('Flow Intensity', 230, y + 5);
      doc.text('Notes / Observations', 330, y + 5);
      y += 22;

      doc.font('Helvetica').fontSize(9).fillColor('#333333');
      if (reportData.periods.length === 0) {
        doc.text('No period records logged yet.', 50, y);
        y += 18;
      } else {
        reportData.periods.slice(0, 7).forEach(p => {
          const sDate = new Date(p.startDate).toLocaleDateString();
          const eDate = p.endDate ? new Date(p.endDate).toLocaleDateString() : 'Ongoing / unrecorded';
          doc.text(sDate, 50, y);
          doc.text(eDate, 140, y);
          doc.text(p.flowIntensity || 'medium', 230, y);
          doc.text((p.notes || '-').substring(0, 35), 330, y);
          y += 16;
        });
      }
      y += 15;

      if (reportData.questionnaireSummary.latest) {
        if (y > 640) {
          doc.addPage();
          y = 50;
        }
        const summary = reportData.questionnaireSummary;
        const latest = summary.latest;
        doc.fillColor('#2D1A47').fontSize(13).font('Helvetica-Bold').text('4. Health Questionnaire Summary', 40, y);
        y += 18;
        doc.fontSize(9).font('Helvetica').fillColor('#4A4A4A');
        doc.text(`Completed: ${new Date(latest.submittedAt).toLocaleDateString()} | Completed questionnaires: ${summary.submissionCount}`, 40, y);
        y += 14;
        doc.text(`Reported cycle: ${latest.cycle.cycleLength ?? 'Not provided'} days; period duration: ${latest.cycle.periodDuration ?? 'Not provided'} days; regularity: ${latest.cycle.regularity ?? 'Not provided'}`, 40, y, { width: 515 });
        y = doc.y + 4;
        doc.text(`Reported symptoms: ${latest.symptoms.length ? latest.symptoms.join(', ') : 'None selected or not provided'} | Pain: ${latest.painLevel === null ? 'Not provided' : `${latest.painLevel}/10`}`, 40, y, { width: 515 });
        y = doc.y + 4;
        doc.text(`Reported bleeding: ${latest.bleeding.flow || 'Not provided'}; changes: ${latest.bleeding.patternTypicality || 'Not provided'}; between periods: ${latest.bleeding.betweenPeriods || 'Not provided'}`, 40, y, { width: 515 });
        y = doc.y + 4;
        if (summary.painTrend.length >= 2) {
          const painTrend = summary.painTrend.slice(-6)
            .map(item => `${new Date(item.date).toLocaleDateString()}: ${item.painLevel}/10`)
            .join('; ');
          doc.text(`Reported pain trend: ${painTrend}`, 40, y, { width: 515 });
          y = doc.y + 4;
        }
        if (summary.reportedBleedingChanges.length) {
          const changeText = summary.reportedBleedingChanges.slice(-3)
            .map(change => `${change.field}: ${change.from} → ${change.to}`)
            .join('; ');
          doc.text(`Reported bleeding changes across submissions: ${changeText}`, 40, y, { width: 515 });
          y = doc.y + 4;
        }
        if (latest.assessment) {
          doc.text(`Questionnaire guidance level: ${latest.assessment.levelName} (not a diagnosis).`, 40, y, { width: 515 });
          y = doc.y + 4;
        }
        doc.fontSize(8).fillColor('#777777').text(summary.guidanceNotice, 40, y, { width: 515 });
        y = doc.y + 16;
      }

      // Section 5: Flagged Alerts & Discussion Points
      if (reportData.recentAlerts.length > 0) {
        doc.fillColor('#D81B60').fontSize(13).font('Helvetica-Bold').text('4. Notable Health Observations / Alerts', 40, y);
        y += 16;
        reportData.recentAlerts.slice(0, 3).forEach(al => {
          doc.fontSize(9).font('Helvetica-Bold').fillColor('#C2185B').text(`• [${al.severity.toUpperCase()}] ${al.title}`, 45, y);
          y += 12;
          doc.font('Helvetica').fillColor('#555555').text(al.explanation, 55, y, { width: 490 });
          y += 22;
        });
      }

      // Section 5: Doctor Consultation Questions
      doc.fillColor('#2D1A47').fontSize(13).font('Helvetica-Bold').text('Recommended Consultation Discussion Points', 40, y);
      y += 16;
      doc.fontSize(9).font('Helvetica').fillColor('#4A4A4A');
      reportData.suggestedQuestions.slice(0, 4).forEach(q => {
        doc.text(`[  ]  ${q}`, 45, y, { width: 500 });
        y += 16;
      });
      y += 10;

      // Section 6: Patient Notes
      if (reportData.patientNotes) {
        doc.fillColor('#2D1A47').fontSize(12).font('Helvetica-Bold').text('Patient Personal Notes:', 40, y);
        y += 14;
        doc.fontSize(9).font('Helvetica').fillColor('#444444').text(reportData.patientNotes, 40, y, { width: 515 });
        y += 20;
      }

      // Footer Disclaimer
      doc.rect(40, 770, 515, 45).fill('#FAFAFA');
      doc.fillColor('#777777').fontSize(8).font('Helvetica')
        .text('CLINICAL DISCLAIMER: HerHealth AI is an educational self-tracking tool. This report is compiled from self-reported data and mathematical estimates. It does not constitute medical diagnosis, clinical pathology, or treatment advice. Consult a licensed physician for all clinical concerns.', 50, 775, { width: 495 });

      doc.end();

      writeStream.on('finish', () => resolve());
      writeStream.on('error', err => reject(err));
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  generateReportData,
  buildPDFReport
};
