const test = require('node:test');
const assert = require('node:assert/strict');
const { generateReportData } = require('../services/reportService');

test('doctor report includes questionnaire responses, date, pain trend, and reported bleeding changes', () => {
  const report = generateReportData({
    user: { name: 'Synthetic User', age: 30, email: 'synthetic@example.test' },
    questionnaireHistory: [
      {
        completionStatus: 'completed',
        submittedAt: new Date('2026-02-01T12:00:00Z'),
        answers: {
          cycleLength: 28,
          periodDuration: 5,
          cycleRegularity: 'Regular',
          painLevel: 4,
          symptoms: ['cramps'],
          flowDescription: 'Moderate',
          productChangeFrequency: 'Less often than every 3 hours',
          floodingOrClots: 'No',
          bleedingBetweenPeriods: 'No',
          prolongedBleeding: 'No'
        },
        assessment: { level: 1, levelName: 'General Wellness' }
      },
      {
        completionStatus: 'completed',
        submittedAt: new Date('2026-03-01T12:00:00Z'),
        answers: {
          cycleLength: 30,
          periodDuration: 6,
          cycleRegularity: 'Regular',
          painLevel: 7,
          symptoms: ['cramps', 'fatigue_weakness'],
          flowDescription: 'Heavy',
          productChangeFrequency: 'Every 2-3 hours',
          floodingOrClots: 'Large clots',
          bleedingBetweenPeriods: 'No',
          prolongedBleeding: 'No'
        },
        assessment: { level: 2, levelName: 'Schedule a Medical Consultation' }
      }
    ]
  });

  const summary = report.questionnaireSummary;
  assert.equal(summary.submissionCount, 2);
  assert.equal(summary.latest.painLevel, 7);
  assert.equal(summary.latest.assessment.levelName, 'Schedule a Medical Consultation');
  assert.equal(summary.painTrend.length, 2);
  assert.ok(summary.reportedBleedingChanges.some(change => change.field === 'flow' && change.from === 'Moderate' && change.to === 'Heavy'));
  assert.match(summary.guidanceNotice, /not a diagnosis/i);
});
