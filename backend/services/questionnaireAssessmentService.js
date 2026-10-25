/**
 * HerHealth AI — Medical Safety Assessment Engine
 * 
 * IMPORTANT CLINICAL & SAFETY SPECIFICATIONS:
 * 1. This engine uses conservative, deterministic safety rules that require clinical review.
 * 2. It does NOT diagnose diseases, prescribe medications, or replace clinical evaluations.
 * 3. It never interprets "Not sure" or "Prefer not to answer" as negative findings.
 * 4. Priority escalation: Level 4 (Emergency) > Level 3 (Urgent) > Level 2 (Consultation) > Level 1 (Wellness).
 * 5. Emergency dispatch: 112 (India / International standard) and local emergency services.
 */

const EMERGENCY_NUMBER = process.env.EMERGENCY_NUMBER || '112';
const YES_NO_UNSURE = ['Yes', 'No', 'Not sure', 'Prefer not to answer'];
const ENUMERATED_ANSWERS = {
  cycleRegularity: ['Regular', 'Irregular', 'Not sure', 'Prefer not to answer'],
  missedPeriod: YES_NO_UNSURE,
  recentCycleChanges: ['Yes', 'No', 'Not sure', 'Prefer not to answer'],
  experiencesPain: YES_NO_UNSURE,
  symptomTiming: ['Before period', 'During period', 'After period', 'Throughout cycle', 'Varies', 'Not sure', 'Prefer not to answer'],
  interferesWithDailyActivities: ['No', 'Sometimes', 'Yes, significantly', 'Not sure', 'Prefer not to answer'],
  symptomProgression: ['Usual for me', 'New', 'Worsening', 'Persistent across multiple cycles', 'Different from usual', 'Not sure', 'Prefer not to answer'],
  flowDescription: ['Light', 'Moderate', 'Heavy', 'Very heavy', 'Not sure', 'Prefer not to answer'],
  productChangeFrequency: ['Less often than every 3 hours', 'Every 2-3 hours', 'Every 1-2 hours', 'Every hour or more often for 2+ consecutive hours', 'Varies', 'Not sure', 'Prefer not to answer'],
  floodingOrClots: ['No', 'Flooding or leakage', 'Large clots', 'Flooding or leakage and large clots', 'Not sure', 'Prefer not to answer'],
  bleedingBetweenPeriods: YES_NO_UNSURE,
  prolongedBleeding: YES_NO_UNSURE,
  bleedingWithDizzinessOrSeverePain: ['Neither', 'Dizziness', 'Severe pain', 'Both', 'Not sure', 'Prefer not to answer'],
  faintingOrCollapse: YES_NO_UNSURE,
  isTypicalBleeding: ['Typical for me', 'Recent change', 'Not sure', 'Prefer not to answer'],
  pregnancyPossibility: ['Yes', 'No', 'Unsure', 'Prefer not to answer'],
  similarSymptomsBefore: YES_NO_UNSURE,
  consultedDoctor: YES_NO_UNSURE
};

const ALLOWED_SYMPTOMS = [
  'cramps',
  'severe_pelvic_pain',
  'back_pain',
  'headache',
  'breast_tenderness',
  'nausea_vomiting',
  'dizziness_fainting',
  'fatigue_weakness',
  'bloating',
  'fever',
  'breathlessness',
  'confusion',
  'other',
  'none'
];

function validateQuestionnaireAnswers(input) {
  const errors = [];
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { answers: {}, errors: ['Answers must be an object.'] };
  }

  const allowedFields = new Set([
    'lastPeriodStart', 'periodDuration', 'cycleLength', 'cycleRegularity', 'missedPeriod',
    'recentCycleChanges', 'experiencesPain', 'painLevel', 'painLocations', 'symptoms',
    'symptomTiming', 'interferesWithDailyActivities', 'symptomProgression', 'flowDescription',
    'productChangeFrequency', 'floodingOrClots', 'bleedingBetweenPeriods', 'prolongedBleeding',
    'bleedingWithDizzinessOrSeverePain', 'faintingOrCollapse', 'isTypicalBleeding',
    'moodDescription', 'emotionalChanges', 'sleepQuality', 'energyLevel',
    'wellbeingInterference', 'pregnancyPossibility', 'similarSymptomsBefore',
    'consultedDoctor', 'additionalInformation', 'personalNotes', 'otherSymptoms',
    'painLocationOther'
  ]);
  const answers = {};
  const source = { ...input };
  if (source.cycleLength === undefined && source.typicalCycleLength !== undefined) {
    source.cycleLength = source.typicalCycleLength;
  }
  if (source.painLevel === undefined && source.painSeverity !== undefined) {
    source.painLevel = source.painSeverity;
  }
  if (typeof source.cycleRegularity === 'string' && source.cycleRegularity.includes('(')) {
    source.cycleRegularity = source.cycleRegularity.toLowerCase().includes('irregular') ? 'Irregular' : 'Regular';
  }
  if (source.interferesWithDailyActivities === undefined && source.painInterference !== undefined) {
    const legacyInterference = String(source.painInterference);
    source.interferesWithDailyActivities = legacyInterference.startsWith('Severely')
      ? 'Yes, significantly'
      : legacyInterference.startsWith('Sometimes') ? 'Sometimes'
        : legacyInterference.startsWith('Rarely') || legacyInterference.startsWith('Never') ? 'No'
          : legacyInterference;
  }
  if (source.symptoms === undefined && Array.isArray(source.commonSymptoms)) {
    const legacySymptoms = {
      fatigue: 'fatigue_weakness',
      dizziness: 'dizziness_fainting',
      nausea: 'nausea_vomiting'
    };
    source.symptoms = source.commonSymptoms.map(symptom => legacySymptoms[symptom] || symptom);
  }
  if (source.flowDescription === undefined && typeof source.bleedingPattern === 'string') {
    const legacyFlow = source.bleedingPattern.toLowerCase();
    source.flowDescription = legacyFlow.includes('very heavy') ? 'Very heavy'
      : legacyFlow.includes('heavy') ? 'Heavy'
        : legacyFlow.includes('light') ? 'Light'
          : legacyFlow.includes('moderate') ? 'Moderate' : '';
  }
  if (source.moodDescription === undefined && source.moodPms !== undefined) {
    source.moodDescription = source.moodPms;
  }
  [
    'typicalCycleLength',
    'painSeverity',
    'painInterference',
    'commonSymptoms',
    'bleedingPattern',
    'moodPms'
  ].forEach(alias => delete source[alias]);

  for (const [field, value] of Object.entries(source)) {
    if (!allowedFields.has(field)) {
      errors.push(`Unknown answer field: ${field}.`);
      continue;
    }

    if (['periodDuration', 'cycleLength', 'painLevel'].includes(field)) {
      if (value === '' || value === null || value === undefined) continue;
      if (typeof value === 'string' && ['Not sure', 'Prefer not to answer'].includes(value)) {
        answers[field] = value;
        continue;
      }
      const number = Number(value);
      const max = field === 'painLevel' ? 10 : field === 'periodDuration' ? 30 : 100;
      const min = field === 'painLevel' ? 0 : 1;
      if (!Number.isInteger(number) || number < min || number > max) {
        errors.push(`${field} must be an integer between ${min} and ${max}, or left unanswered.`);
        continue;
      }
      answers[field] = number;
      continue;
    }

    if (field === 'symptoms' || field === 'painLocations') {
      if (!Array.isArray(value) || value.length > 20 || value.some(item => typeof item !== 'string')) {
        errors.push(`${field} must be a list of valid selections.`);
        continue;
      }
      const allowed = field === 'symptoms'
        ? ALLOWED_SYMPTOMS
        : ['Lower abdomen', 'Lower back', 'Pelvis', 'Shoulder tip', 'Other', 'Not sure', 'Prefer not to answer'];
      if (value.some(item => !allowed.includes(item))) {
        errors.push(`${field} contains an unsupported selection.`);
        continue;
      }
      if (field === 'symptoms' && value.includes('none') && value.length > 1) {
        errors.push('The "none" symptom selection cannot be combined with other symptoms.');
        continue;
      }
      answers[field] = [...new Set(value)];
      continue;
    }

    if (typeof value !== 'string') {
      errors.push(`${field} must be text.`);
      continue;
    }
    const normalized = value.trim();
    if (normalized.length > (['additionalInformation', 'personalNotes'].includes(field) ? 2000 : 500)) {
      errors.push(`${field} exceeds the maximum allowed length.`);
      continue;
    }
    if (ENUMERATED_ANSWERS[field] && normalized && !ENUMERATED_ANSWERS[field].includes(normalized)) {
      errors.push(`${field} has an unsupported answer.`);
      continue;
    }
    if (field === 'lastPeriodStart' && normalized && !/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
      errors.push('lastPeriodStart must use the YYYY-MM-DD date format.');
      continue;
    }
    if (field === 'lastPeriodStart' && normalized) {
      const parsedDate = new Date(`${normalized}T00:00:00Z`);
      if (
        Number.isNaN(parsedDate.getTime()) ||
        parsedDate.toISOString().slice(0, 10) !== normalized
      ) {
        errors.push('lastPeriodStart must be a valid calendar date.');
        continue;
      }
    }
    answers[field] = normalized;
  }

  return { answers, errors };
}

const ASSESSMENT_LEVELS = {
  LEVEL_4_EMERGENCY: {
    level: 4,
    levelName: 'Emergency Warning',
    colorCode: '#D32F2F', // Accessible Crimson Red
    badgeClass: 'badge-emergency',
    icon: '🚨',
    title: 'Level 4: Potential Medical Emergency',
    bannerText: 'Your reported symptoms may indicate a medical emergency.',
    actionHeader: 'Call Emergency Services (112) or Seek Immediate Hospital Care',
    urgencyStatement: `Call ${EMERGENCY_NUMBER} or your local emergency number, or go to the nearest emergency department now. Do not drive yourself if you feel faint, weak, or seriously unwell. Do not wait for this questionnaire or an AI response.`
  },
  LEVEL_3_URGENT: {
    level: 3,
    levelName: 'Seek Urgent Medical Assessment',
    colorCode: '#E65100', // Accessible Dark Amber/Orange
    badgeClass: 'badge-urgent',
    icon: '⚠️',
    title: 'Level 3: Seek Urgent Medical Assessment',
    bannerText: 'Your responses include symptoms that may need urgent medical assessment.',
    actionHeader: 'Prompt Clinical Medical Evaluation Recommended Today',
    urgencyStatement: 'Please seek urgent medical care now. Do not rely on this questionnaire to determine the cause. If symptoms rapidly intensify or you feel faint, escalate to emergency services.'
  },
  LEVEL_2_CONSULTATION: {
    level: 2,
    levelName: 'Schedule a Medical Consultation',
    colorCode: '#F57F17', // Accessible Yellow/Amber
    badgeClass: 'badge-consultation',
    icon: '🩺',
    title: 'Level 2: Medical Consultation Recommended',
    bannerText: 'Some of your responses suggest that a healthcare professional should evaluate your symptoms.',
    actionHeader: 'Arrange a Non-Emergency Medical Appointment',
    urgencyStatement: 'Please arrange a medical appointment, particularly if these symptoms are new, persistent, or worsening. This assessment cannot identify the underlying cause.'
  },
  LEVEL_1_WELLNESS: {
    level: 1,
    levelName: 'General Wellness',
    colorCode: '#2E7D32', // Accessible Deep Forest Green
    badgeClass: 'badge-wellness',
    icon: '🌱',
    title: 'Level 1: General Wellness Notice',
    bannerText: 'No urgent warning signs indicated by this assessment.',
    actionHeader: 'Continue Routine Self-Tracking & Holistic Care',
    urgencyStatement: 'Your responses do not indicate any of the warning signs covered by this questionnaire. This does not rule out a medical problem. Continue tracking your symptoms, and seek medical advice if you have concerns or your symptoms change.'
  }
};

/**
 * Evaluates questionnaire answers against the four conservative safety levels.
 * @param {Object} answers User-reported responses
 * @returns {Object} Comprehensive safety assessment
 */
function evaluateQuestionnaire(answers = {}) {
  const painLevel = Number.isFinite(Number(answers.painLevel)) ? Number(answers.painLevel) : null;
  const painLocations = Array.isArray(answers.painLocations) ? answers.painLocations : [];
  const symptoms = Array.isArray(answers.symptoms) ? answers.symptoms.map(s => String(s).toLowerCase()) : [];
  const flowDescription = answers.flowDescription || '';
  const productChangeFrequency = answers.productChangeFrequency || '';
  const floodingOrClots = answers.floodingOrClots || '';
  const bleedingBetweenPeriods = answers.bleedingBetweenPeriods || '';
  const prolongedBleeding = answers.prolongedBleeding || '';
  const bleedingWithDizzinessOrSeverePain = answers.bleedingWithDizzinessOrSeverePain || '';
  const interferesWithDailyActivities = answers.interferesWithDailyActivities || '';
  const symptomProgression = answers.symptomProgression || '';
  const pregnancyPossibility = answers.pregnancyPossibility || '';
  const parsedPeriodDuration = Number(answers.periodDuration);
  const periodDuration = Number.isFinite(parsedPeriodDuration) ? parsedPeriodDuration : null;
  const cycleRegularity = answers.cycleRegularity || '';
  const missedPeriod = answers.missedPeriod || '';
  const recentCycleChanges = answers.recentCycleChanges || '';
  const energyLevel = answers.energyLevel || '';
  const experiencesPain = answers.experiencesPain || '';

  const isPregnancyPossible = pregnancyPossibility === 'Yes' || pregnancyPossibility === 'Unsure';
  const hasDizzinessOrFainting = symptoms.includes('dizziness_fainting') ||
    ['Dizziness', 'Both'].includes(bleedingWithDizzinessOrSeverePain) ||
    answers.faintingOrCollapse === 'Yes';
  const hasFaintingOrCollapse = answers.faintingOrCollapse === 'Yes';
  const hasSeverePain = painLevel >= 8 || symptoms.includes('severe_pelvic_pain') ||
    ['Severe pain', 'Both'].includes(bleedingWithDizzinessOrSeverePain);
  const hasShoulderTipPain = painLocations.some(loc => loc.toLowerCase().includes('shoulder'));
  const isHeavyBleeding = flowDescription === 'Heavy' || flowDescription === 'Very heavy';
  const isEmergencyRateBleeding = productChangeFrequency === 'Every hour or more often for 2+ consecutive hours';

  const triggeredRules = [];
  const explanations = [];
  const recommendedNextSteps = [];
  const limitations = [];
  if (!Array.isArray(answers.symptoms) || answers.symptoms.length === 0) {
    limitations.push('No symptom selections were provided, so symptom-related warning signs may not have been fully assessed.');
  }
  if (painLevel === null) limitations.push('Pain severity was not provided, so pain-related warning signs could not be fully assessed.');
  if (!flowDescription || flowDescription === 'Not sure' || flowDescription === 'Prefer not to answer') {
    limitations.push('Bleeding amount was not established, so bleeding-related warning signs could not be fully assessed.');
  }
  if (!pregnancyPossibility || pregnancyPossibility === 'Unsure' || pregnancyPossibility === 'Prefer not to answer') {
    limitations.push('Pregnancy possibility was not established; seek medical advice promptly for severe pain or bleeding if pregnancy may be possible.');
  }

  // =========================================================================
  // LEVEL 4 RULES (EMERGENCY WARNING)
  // =========================================================================
  let isLevel4 = false;

  // Rule 4.1: Severe bleeding with acute volume loss (hourly soaking with dizziness/breathlessness)
  if (isEmergencyRateBleeding && (
    hasDizzinessOrFainting ||
    symptoms.includes('fatigue_weakness') ||
    symptoms.includes('breathlessness')
  )) {
    isLevel4 = true;
    triggeredRules.push('RULE_4_1_ACUTE_HEMORRHAGE_SIGNS');
    const accompanyingSymptoms = [];
    if (symptoms.includes('dizziness_fainting') || ['Dizziness', 'Both'].includes(bleedingWithDizzinessOrSeverePain)) {
      accompanyingSymptoms.push('dizziness');
    }
    if (hasFaintingOrCollapse) accompanyingSymptoms.push('fainting or collapse');
    if (symptoms.includes('fatigue_weakness')) accompanyingSymptoms.push('weakness');
    if (symptoms.includes('breathlessness')) accompanyingSymptoms.push('severe breathing difficulty');
    explanations.push(`You reported needing to change a menstrual product every hour or more often for two consecutive hours together with ${accompanyingSymptoms.join(' and ')}. Seek emergency assessment now.`);
  }

  // Rule 4.2: Fainting/collapse with severe pain or significant bleeding
  if (hasFaintingOrCollapse && (isHeavyBleeding || hasSeverePain)) {
    isLevel4 = true;
    triggeredRules.push('RULE_4_2_FAINTING_WITH_BLEEDING_OR_SEVERE_PAIN');
    const associatedSymptoms = [];
    if (isHeavyBleeding) associatedSymptoms.push('heavy bleeding');
    if (hasSeverePain) associatedSymptoms.push('severe pain');
    explanations.push(`You reported fainting or collapse together with ${associatedSymptoms.join(' and ')}. This combination needs emergency assessment.`);
  }

  // Rule 4.3: Possible pregnancy with severe pain plus fainting, shoulder-tip pain, or significant bleeding
  if (isPregnancyPossible && (hasSeverePain || hasShoulderTipPain) && (hasFaintingOrCollapse || hasShoulderTipPain || isHeavyBleeding)) {
    isLevel4 = true;
    triggeredRules.push('RULE_4_3_PREGNANCY_SEVERE_PAIN_FAINTING_RED_FLAG');
    const painSymptoms = [];
    const additionalSymptoms = [];
    if (hasSeverePain) painSymptoms.push('severe pain');
    if (hasShoulderTipPain) painSymptoms.push('shoulder-tip pain');
    if (hasFaintingOrCollapse) additionalSymptoms.push('fainting or collapse');
    if (symptoms.includes('dizziness_fainting') || ['Dizziness', 'Both'].includes(bleedingWithDizzinessOrSeverePain)) {
      additionalSymptoms.push('dizziness');
    }
    if (isHeavyBleeding) additionalSymptoms.push('heavy bleeding');
    const symptomCombination = additionalSymptoms.length
      ? `${painSymptoms.join(' and ')} with ${additionalSymptoms.join(' and ')}`
      : painSymptoms.join(' and ');
    explanations.push(`You reported possible pregnancy together with ${symptomCombination}. Seek emergency assessment now.`);
  }

  // Rule 4.4: Severe breathing difficulty
  if (symptoms.includes('breathlessness')) {
    isLevel4 = true;
    triggeredRules.push('RULE_4_4_SEVERE_BREATHING_DIFFICULTY');
    explanations.push('You reported severe difficulty breathing. Seek emergency assessment now.');
  }

  if (symptoms.includes('confusion')) {
    isLevel4 = true;
    triggeredRules.push('RULE_4_5_CONFUSION');
    explanations.push('You reported confusion, which can be a sign of a medical emergency. Seek emergency assessment now.');
  }

  if (isLevel4) {
    recommendedNextSteps.push(`Call ${EMERGENCY_NUMBER} or your local emergency number immediately.`);
    recommendedNextSteps.push('Go to the nearest emergency hospital department. Do not drive yourself.');
    recommendedNextSteps.push('Lie down with your legs elevated if you feel faint or lightheaded.');
    recommendedNextSteps.push('Inform someone nearby of your symptoms so you are not alone.');

    return buildAssessmentResult(ASSESSMENT_LEVELS.LEVEL_4_EMERGENCY, triggeredRules, explanations, recommendedNextSteps, limitations);
  }

  // =========================================================================
  // LEVEL 3 RULES (SEEK URGENT MEDICAL ASSESSMENT)
  // =========================================================================
  let isLevel3 = false;

  // Rule 3.1: Severe or rapidly worsening pelvic pain (Score >= 8)
  if (painLevel >= 8 || symptoms.includes('severe_pelvic_pain')) {
    isLevel3 = true;
    triggeredRules.push('RULE_3_1_SEVERE_PELVIC_PAIN');
    const reportedPain = [];
    if (painLevel >= 8) reportedPain.push(`pain rated ${painLevel}/10`);
    if (symptoms.includes('severe_pelvic_pain')) reportedPain.push('severe abdominal or pelvic pain');
    explanations.push(`You reported ${reportedPain.join(' and ')}. Please seek urgent medical assessment.`);
  }

  if (symptomProgression === 'Worsening' && painLevel >= 5) {
    isLevel3 = true;
    triggeredRules.push('RULE_3_7_WORSENING_PAIN');
    explanations.push('You reported worsening pain. Please seek urgent medical assessment, particularly if it continues to intensify.');
  }

  // Rule 3.2: Heavy bleeding accompanied by dizziness, marked weakness, or feeling faint
  if (isHeavyBleeding && (hasDizzinessOrFainting || symptoms.includes('fatigue_weakness'))) {
    isLevel3 = true;
    triggeredRules.push('RULE_3_2_HEAVY_BLEEDING_WITH_DIZZINESS');
    const accompanyingSymptoms = [];
    if (symptoms.includes('dizziness_fainting') || ['Dizziness', 'Both'].includes(bleedingWithDizzinessOrSeverePain)) {
      accompanyingSymptoms.push('dizziness or faintness');
    }
    if (hasFaintingOrCollapse) accompanyingSymptoms.push('fainting or collapse');
    if (symptoms.includes('fatigue_weakness')) accompanyingSymptoms.push('unusual fatigue or weakness');
    explanations.push(`You reported heavy bleeding together with ${accompanyingSymptoms.join(' and ')}. This combination warrants urgent medical assessment.`);
  }

  if (isEmergencyRateBleeding) {
    isLevel3 = true;
    triggeredRules.push('RULE_3_6_SUSTAINED_HOURLY_BLEEDING');
    explanations.push('You reported needing to change a menstrual product every hour or more often for at least two consecutive hours. Please seek urgent medical assessment.');
  }

  // Rule 3.3: Possible pregnancy with new or significant pelvic pain
  const hasNewOrWorseningPain = experiencesPain === 'Yes' &&
    ['New', 'Worsening', 'Different from usual'].includes(symptomProgression);
  if (isPregnancyPossible && (painLevel >= 6 || symptoms.includes('severe_pelvic_pain') || hasNewOrWorseningPain)) {
    isLevel3 = true;
    triggeredRules.push('RULE_3_3_PREGNANCY_WITH_SIGNIFICANT_PAIN');
    explanations.push('You reported possible pregnancy together with significant or new pain. Please seek urgent medical assessment.');
  }

  // Rule 3.4: Pelvic pain accompanied by fever or chills
  if (symptoms.includes('fever') && (symptoms.includes('cramps') || symptoms.includes('severe_pelvic_pain') || painLevel >= 5)) {
    isLevel3 = true;
    triggeredRules.push('RULE_3_4_PAIN_WITH_FEVER');
    const reportedPain = [];
    if (symptoms.includes('cramps')) reportedPain.push('abdominal cramps');
    if (symptoms.includes('severe_pelvic_pain')) reportedPain.push('severe abdominal or pelvic pain');
    if (painLevel >= 5) reportedPain.push(`pain rated ${painLevel}/10`);
    explanations.push(`You reported fever together with ${reportedPain.join(' and ')}. Please seek urgent medical assessment.`);
  }

  // Rule 3.5: Bleeding with acute illness (vomiting/unable to keep fluids)
  if ((isHeavyBleeding || prolongedBleeding === 'Yes') && symptoms.includes('nausea_vomiting') && painLevel >= 6) {
    isLevel3 = true;
    triggeredRules.push('RULE_3_5_BLEEDING_WITH_ACUTE_VOMITING');
    explanations.push('You reported significant bleeding with severe pain and nausea or vomiting. Please seek urgent medical assessment.');
  }

  if (isLevel3) {
    recommendedNextSteps.push('Contact an urgent care clinic, your gynecologist on call, or emergency department today.');
    recommendedNextSteps.push('Rest in a comfortable position and do not engage in strenuous physical tasks.');
    recommendedNextSteps.push('Monitor your temperature and keep a count of pad/tampon changes.');
    recommendedNextSteps.push('If pain escalates rapidly, bleeding increases to >1 pad/hour, or you faint, escalate immediately to emergency care (112).');

    return buildAssessmentResult(ASSESSMENT_LEVELS.LEVEL_3_URGENT, triggeredRules, explanations, recommendedNextSteps, limitations);
  }

  // =========================================================================
  // LEVEL 2 RULES (SCHEDULE A MEDICAL CONSULTATION)
  // =========================================================================
  let isLevel2 = false;

  // Rule 2.1: Menstrual pain repeatedly interfering with daily life
  if (interferesWithDailyActivities.includes('Severe') || interferesWithDailyActivities.includes('Moderate') || painLevel >= 6) {
    isLevel2 = true;
    triggeredRules.push('RULE_2_1_PAIN_INTERFERING_WITH_ACTIVITIES');
    if (interferesWithDailyActivities.includes('Severe') || interferesWithDailyActivities.includes('Moderate')) {
      explanations.push('You reported pain that interferes with daily activities. Arrange a medical consultation, especially if this is recurring.');
    }
    if (painLevel >= 6) {
      explanations.push(`You reported pain rated ${painLevel}/10. Arrange a medical consultation, especially if this is recurring.`);
    }
  }

  // Rule 2.2: Worsening, new, or persistent symptoms
  if (symptomProgression.includes('Worsening') || symptomProgression === 'New' || symptomProgression.includes('Persistent across multiple cycles') || symptomProgression === 'Different from usual') {
    isLevel2 = true;
    triggeredRules.push('RULE_2_2_WORSENING_OR_PERSISTENT_SYMPTOMS');
    explanations.push(
      'You noted that symptoms are worsening, new, or persisting across multiple cycles. A clinical consultation is helpful to understand the underlying causes.'
    );
  }

  // Rule 2.3: Unusually prolonged bleeding (> 7-8 days)
  if (prolongedBleeding === 'Yes' || (periodDuration !== null && periodDuration > 7)) {
    isLevel2 = true;
    triggeredRules.push('RULE_2_3_PROLONGED_BLEEDING');
    explanations.push(`You reported prolonged bleeding${periodDuration ? ` (${periodDuration} days)` : ''}. Arrange a medical consultation.`);
  }

  // Rule 2.4: Bleeding between periods or post-coital spotting
  if (bleedingBetweenPeriods === 'Yes') {
    isLevel2 = true;
    triggeredRules.push('RULE_2_4_INTERMENSTRUAL_BLEEDING');
    explanations.push('You reported bleeding between periods. Discuss this pattern with a healthcare professional.');
  }

  // Rule 2.5: Significant fatigue accompanying heavy periods (Anemia screening recommended)
  if (isHeavyBleeding && (symptoms.includes('fatigue_weakness') || energyLevel.includes('Significantly fatigued') || energyLevel.includes('Severe exhaustion'))) {
    isLevel2 = true;
    triggeredRules.push('RULE_2_5_HEAVY_FLOW_WITH_FATIGUE');
    explanations.push('You reported heavy bleeding together with fatigue or weakness. Arrange a medical consultation.');
  }

  // Rule 2.6: Frequent product changes with large clots
  if (productChangeFrequency.includes('Every 2-3 hours') && floodingOrClots.includes('Large clots')) {
    isLevel2 = true;
    triggeredRules.push('RULE_2_6_FREQUENT_CHANGES_WITH_CLOTS');
    explanations.push('You reported frequent product changes and large clots. Arrange a medical consultation.');
  }

  // Rule 2.7: Persistent cycle irregularity or unexpected missed period
  if ((cycleRegularity === 'Irregular' && recentCycleChanges === 'Yes') || (missedPeriod === 'Yes' && isPregnancyPossible)) {
    isLevel2 = true;
    triggeredRules.push('RULE_2_7_CYCLE_IRREGULARITY');
    explanations.push('You reported a missed period or recent cycle change. Discuss it with a healthcare professional if it persists or concerns you.');
  }

  // Rule 2.8: Persistent pain unreviewed by doctor
  if (experiencesPain === 'Yes' && painLevel >= 5 && answers.consultedDoctor === 'No') {
    isLevel2 = true;
    triggeredRules.push('RULE_2_8_UNEVALUATED_MODERATE_PAIN');
    explanations.push('You reported recurring pain that has not yet been reviewed by a healthcare professional.');
  }

  if (isLevel2) {
    recommendedNextSteps.push('Schedule an appointment with a primary care doctor or gynecologist.');
    recommendedNextSteps.push('Download and bring your HerHealth AI Doctor-Ready Report to your appointment.');
    recommendedNextSteps.push('Continue logging daily symptoms, pain scores, and pad/tampon counts in the Period Tracker.');
    recommendedNextSteps.push('Use supportive comfort measures such as a warm heating pad and staying hydrated.');

    return buildAssessmentResult(ASSESSMENT_LEVELS.LEVEL_2_CONSULTATION, triggeredRules, explanations, recommendedNextSteps, limitations);
  }

  // =========================================================================
  // LEVEL 1: GENERAL WELLNESS
  // =========================================================================
  triggeredRules.push('RULE_1_1_NO_CONCERNING_FLAGS');
  explanations.push(
    'Your responses do not indicate any of the specific clinical warning signs evaluated by this questionnaire.'
  );

  recommendedNextSteps.push('Continue tracking your cycle and daily symptoms in HerHealth AI.');
  recommendedNextSteps.push('Explore the Wellness tab for guided 4-7-8 breathing and restorative gentle movement.');
  recommendedNextSteps.push('Consider general comfort measures and drink fluids according to your needs and any healthcare advice.');
  recommendedNextSteps.push('Consult a doctor if your symptoms change, worsen, or cause you concern at any point.');

  return buildAssessmentResult(ASSESSMENT_LEVELS.LEVEL_1_WELLNESS, triggeredRules, explanations, recommendedNextSteps, limitations);
}

function buildAssessmentResult(levelMeta, triggeredRules, explanations, recommendedNextSteps, limitations = []) {
  return {
    level: levelMeta.level,
    levelName: levelMeta.levelName,
    colorCode: levelMeta.colorCode,
    badgeClass: levelMeta.badgeClass,
    icon: levelMeta.icon,
    title: levelMeta.title,
    bannerText: levelMeta.bannerText,
    actionHeader: levelMeta.actionHeader,
    urgencyStatement: levelMeta.urgencyStatement,
    triggeredRules,
    explanations,
    recommendedNextSteps,
    limitations,
    disclaimer: 'CLINICAL NOTICE: This assessment is an educational safety evaluation based on self-reported symptoms and conservative medical guidance. It does NOT diagnose medical conditions or rule out illness. Consult a licensed healthcare professional for all clinical concerns.',
    evaluatedAt: new Date().toISOString()
  };
}

module.exports = {
  evaluateQuestionnaire,
  validateQuestionnaireAnswers,
  ASSESSMENT_LEVELS,
  EMERGENCY_NUMBER
};
