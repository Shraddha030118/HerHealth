/**
 * Health Alert Service
 * Conservative, evidence-informed rule evaluation for menstrual symptoms and red flags.
 * Educational only — not a substitute for clinical diagnosis or emergency triage.
 */

function evaluateHealthAlerts({ symptoms = [], painLevel = 0, flow = 'none', notes = '', periodDuration = 0, cycleMetrics = {} }) {
  const alerts = [];
  const normalizedSymptoms = (symptoms || []).map(s => s.toLowerCase());
  const combinedText = `${normalizedSymptoms.join(' ')} ${notes.toLowerCase()}`;

  // 1. URGENT: Dizziness, fainting, or severe shortness of breath during bleeding
  const hasDizzinessOrFainting = normalizedSymptoms.includes('dizziness') || 
    combinedText.includes('fainted') || 
    combinedText.includes('fainting') || 
    combinedText.includes('blackout') ||
    combinedText.includes('lightheaded');

  const isBleeding = flow === 'heavy' || flow === 'medium' || flow === 'light';

  if (hasDizzinessOrFainting && (isBleeding || flow === 'heavy')) {
    alerts.push({
      alertCode: 'URGENT_DIZZINESS_BLEEDING',
      title: 'Urgent: Dizziness or Fainting with Bleeding',
      severity: 'urgent',
      explanation: 'Experiencing significant dizziness, fainting, or severe lightheadedness in conjunction with menstrual bleeding can indicate acute blood loss or significant drop in blood pressure.',
      recommendedAction: 'Please seek urgent or emergency medical evaluation promptly. Do not drive yourself; rest with your legs elevated and inform a trusted person or emergency services.',
      symptomsFlagged: ['dizziness/fainting', `flow: ${flow}`]
    });
  }

  // 2. HIGH / URGENT: Severe Debilitating Pain
  if (painLevel >= 8) {
    alerts.push({
      alertCode: 'SEVERE_PELVIC_PAIN',
      title: 'High Alert: Severe Menstrual Pain (Score ' + painLevel + '/10)',
      severity: painLevel >= 9 ? 'urgent' : 'high',
      explanation: 'A pain score of 8 or above suggests pain that severely impacts your ability to perform daily tasks, rest, or sleep. Debilitating dysmenorrhea may be associated with conditions such as endometriosis, adenomyosis, or pelvic inflammatory issues.',
      recommendedAction: 'Consult a gynecologist or healthcare professional for a tailored pain management plan and pelvic examination. Seek immediate emergency care if pain is sudden, one-sided, accompanied by high fever or vomiting.',
      symptomsFlagged: [`pain level: ${painLevel}/10`]
    });
  }

  // 3. HIGH: Unusually Heavy Bleeding (Menorrhagia signs)
  if (flow === 'heavy' && (combinedText.includes('clots') || combinedText.includes('overflow') || combinedText.includes('hourly') || periodDuration > 7)) {
    alerts.push({
      alertCode: 'HEAVY_MENSTRUAL_BLEEDING',
      title: 'Caution: Unusually Heavy or Prolonged Bleeding',
      severity: 'high',
      explanation: 'Menstrual bleeding lasting longer than 7 consecutive days or soaking through menstrual products every 1 to 2 hours with large blood clots warrants clinical evaluation.',
      recommendedAction: 'Schedule a visit with a doctor. Keep a detailed log of pad/tampon usage counts, and request an evaluation for iron deficiency / anemia and hormonal health.',
      symptomsFlagged: ['heavy bleeding', periodDuration > 7 ? `${periodDuration} days duration` : 'clots/heavy soaking']
    });
  }

  // 4. MEDIUM: Nausea, Vomiting with Menstrual Cramps
  if (normalizedSymptoms.includes('nausea') && (normalizedSymptoms.includes('cramps') || painLevel >= 6)) {
    alerts.push({
      alertCode: 'MODERATE_NAUSEA_CRAMPS',
      title: 'Moderate Alert: Nausea Associated with Menstrual Cramps',
      severity: 'medium',
      explanation: 'High prostaglandin levels during menstruation can induce gastrointestinal distress, nausea, and cramping.',
      recommendedAction: 'Stay hydrated with electrolyte fluids and sip ginger or peppermint tea. If nausea prevents you from keeping fluids down for more than 12 hours, speak with a doctor.',
      symptomsFlagged: ['nausea', 'cramps']
    });
  }

  // 5. MEDIUM: Prolonged Cycle or Significant Delay
  if (cycleMetrics && cycleMetrics.currentCycleDay && cycleMetrics.currentCycleDay > 45) {
    alerts.push({
      alertCode: 'EXTENDED_CYCLE_ALERT',
      title: 'Notice: Extended Cycle Interval (Day ' + cycleMetrics.currentCycleDay + ')',
      severity: 'medium',
      explanation: 'Your current cycle length has exceeded 45 days. Delayed or skipped cycles (oligomenorrhea) can stem from acute stress, hormonal transitions, PCOS, thyroid variation, or dietary shifts.',
      recommendedAction: 'If pregnancy is possible, consider taking a home test. If cycles frequently exceed 38-45 days, consult your primary care doctor or gynecologist.',
      symptomsFlagged: [`cycle day: ${cycleMetrics.currentCycleDay}`]
    });
  }

  // 6. LOW: Multi-Symptom Discomfort
  if (normalizedSymptoms.length >= 4 && painLevel < 8 && alerts.length === 0) {
    alerts.push({
      alertCode: 'MILD_MULTIPLE_SYMPTOMS',
      title: 'General Well-Being Notice: Multiple Menstrual Symptoms',
      severity: 'low',
      explanation: 'You recorded several concurrent symptoms today (e.g. fatigue, bloating, mood changes, headache). These are common manifestations of premenstrual or menstrual hormonal fluctuations.',
      recommendedAction: 'Engage in gentle movement, prioritize 7-9 hours of restful sleep, reduce caffeine and excess sodium, and explore the Wellness module for relaxation practices.',
      symptomsFlagged: normalizedSymptoms.slice(0, 4)
    });
  }

  return {
    alertCount: alerts.length,
    alerts,
    disclaimer: 'Educational Alert Notice: HerHealth AI provides supportive observations based on documented guidelines and is NOT an automated diagnostic system. Always seek professional clinical guidance for concerning health symptoms.'
  };
}

module.exports = {
  evaluateHealthAlerts
};
