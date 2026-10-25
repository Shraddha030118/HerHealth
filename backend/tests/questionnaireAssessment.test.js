const test = require('node:test');
const assert = require('node:assert/strict');
const {
  evaluateQuestionnaire,
  validateQuestionnaireAnswers
} = require('../services/questionnaireAssessmentService');

test('no concerning reported symptoms returns non-diagnostic wellness guidance', () => {
  const result = evaluateQuestionnaire({
    painLevel: 0,
    symptoms: [],
    flowDescription: 'Moderate',
    pregnancyPossibility: 'No'
  });

  assert.equal(result.level, 1);
  assert.match(result.urgencyStatement, /does not rule out a medical problem/i);
  assert.doesNotMatch(result.urgencyStatement, /healthy|no medical condition/i);
});

test('recurring pain that interferes with daily activities recommends consultation', () => {
  const result = evaluateQuestionnaire({
    painLevel: 6,
    experiencesPain: 'Yes',
    interferesWithDailyActivities: 'Yes, significantly',
    symptoms: ['cramps'],
    flowDescription: 'Moderate',
    pregnancyPossibility: 'No'
  });

  assert.equal(result.level, 2);
});

test('prolonged and persistently heavy bleeding recommends consultation', () => {
  const result = evaluateQuestionnaire({
    periodDuration: 9,
    prolongedBleeding: 'Yes',
    flowDescription: 'Heavy',
    pregnancyPossibility: 'No'
  });

  assert.equal(result.level, 2);
  assert.ok(result.triggeredRules.includes('RULE_2_3_PROLONGED_BLEEDING'));
});

test('heavy bleeding with dizziness is urgent', () => {
  const result = evaluateQuestionnaire({
    flowDescription: 'Heavy',
    symptoms: ['dizziness_fainting'],
    pregnancyPossibility: 'No'
  });

  assert.equal(result.level, 3);
  assert.ok(result.triggeredRules.includes('RULE_3_2_HEAVY_BLEEDING_WITH_DIZZINESS'));
});

test('severe pelvic pain is urgent without requiring other selections', () => {
  const result = evaluateQuestionnaire({
    painLevel: 8,
    symptoms: [],
    pregnancyPossibility: 'No'
  });

  assert.equal(result.level, 3);
});

test('possible pregnancy and severe pelvic pain is urgent', () => {
  const result = evaluateQuestionnaire({
    pregnancyPossibility: 'Yes',
    painLevel: 8,
    flowDescription: 'Light'
  });

  assert.equal(result.level, 3);
});

test('possible pregnancy, severe pain, and fainting escalates to emergency', () => {
  const result = evaluateQuestionnaire({
    pregnancyPossibility: 'Yes',
    painLevel: 8,
    faintingOrCollapse: 'Yes',
    symptoms: ['severe_pelvic_pain']
  });

  assert.equal(result.level, 4);
  assert.match(result.urgencyStatement, /local emergency number/i);
  const explanation = result.explanations.join(' ');
  assert.match(explanation, /severe pain/i);
  assert.match(explanation, /fainting or collapse/i);
  assert.doesNotMatch(explanation, /heavy bleeding|dizziness/i);
});

test('sustained hourly bleeding with weakness escalates to emergency', () => {
  const result = evaluateQuestionnaire({
    flowDescription: 'Very heavy',
    productChangeFrequency: 'Every hour or more often for 2+ consecutive hours',
    symptoms: ['fatigue_weakness']
  });

  assert.equal(result.level, 4);
});

test('sustained hourly bleeding without another reported symptom remains urgent', () => {
  const result = evaluateQuestionnaire({
    productChangeFrequency: 'Every hour or more often for 2+ consecutive hours'
  });

  assert.equal(result.level, 3);
});

test('severe breathing difficulty or confusion immediately returns emergency guidance', () => {
  for (const symptom of ['breathlessness', 'confusion']) {
    assert.equal(evaluateQuestionnaire({ symptoms: [symptom] }).level, 4);
  }
});

test('"Not sure" and omitted answers are reported as assessment limitations', () => {
  const result = evaluateQuestionnaire({
    flowDescription: 'Not sure',
    pregnancyPossibility: 'Unsure'
  });

  assert.equal(result.level, 1);
  assert.ok(result.limitations.some(item => /bleeding amount/i.test(item)));
  assert.ok(result.limitations.some(item => /pregnancy possibility/i.test(item)));
});

test('legacy uncertain answers remain uncertain during compatibility normalization', () => {
  const result = validateQuestionnaireAnswers({
    painInterference: 'Prefer not to answer',
    pregnancyPossibility: 'Prefer not to answer'
  });

  assert.deepEqual(result.errors, []);
  assert.equal(result.answers.interferesWithDailyActivities, 'Prefer not to answer');
  assert.equal(result.answers.pregnancyPossibility, 'Prefer not to answer');
});

test('the highest matching assessment level is returned', () => {
  const result = evaluateQuestionnaire({
    pregnancyPossibility: 'Yes',
    painLevel: 9,
    faintingOrCollapse: 'Yes',
    flowDescription: 'Very heavy',
    symptoms: ['fatigue_weakness']
  });

  assert.equal(result.level, 4);
});

test('answer validation rejects missing, malformed, and unsupported data', () => {
  assert.ok(validateQuestionnaireAnswers(undefined).errors.length > 0);

  const invalid = validateQuestionnaireAnswers({
    painLevel: 12,
    symptoms: ['diagnose-me'],
    pregnancyPossibility: 'Definitely not pregnant',
    unexpectedField: 'value'
  });

  assert.equal(invalid.errors.length, 4);
});

test('answer validation preserves uncertainty rather than converting it to a negative answer', () => {
  const result = validateQuestionnaireAnswers({
    pregnancyPossibility: 'Unsure',
    bleedingBetweenPeriods: 'Not sure',
    periodDuration: 'Not sure'
  });

  assert.deepEqual(result.errors, []);
  assert.equal(result.answers.pregnancyPossibility, 'Unsure');
  assert.equal(result.answers.bleedingBetweenPeriods, 'Not sure');
  assert.equal(result.answers.periodDuration, 'Not sure');
});
