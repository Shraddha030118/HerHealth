/**
 * HerHealth AI — Health Questionnaire & Summary Controller
 */

let currentStep = 1;
const TOTAL_STEPS = 5;

document.addEventListener('DOMContentLoaded', async () => {
  const user = await checkAuthAndInitUI();
  if (!user) return;

  setupStepperEvents();
  await loadExistingAssessment();
});

function setupStepperEvents() {
  const nextBtn = document.getElementById('step-next-btn');
  const backBtn = document.getElementById('step-back-btn');
  const draftBtn = document.getElementById('save-draft-btn');
  const painSlider = document.getElementById('q-pain-slider');
  const painVal = document.getElementById('q-pain-val');

  painSlider?.addEventListener('input', (e) => {
    painVal.textContent = `${e.target.value} / 10`;
  });

  backBtn?.addEventListener('click', () => {
    if (currentStep > 1) {
      goToStep(currentStep - 1);
    }
  });

  nextBtn?.addEventListener('click', async () => {
    if (!validateStep(currentStep)) return;

    if (currentStep < TOTAL_STEPS) {
      if (currentStep === TOTAL_STEPS - 1) {
        // Prepare summary before step 5
        compileSummaryPreview();
      }
      goToStep(currentStep + 1);
    } else {
      // Final submission
      await submitFinalAssessment();
    }
  });

  draftBtn?.addEventListener('click', async () => {
    await saveAssessmentData('in_progress');
    showToast('Assessment draft saved securely! 💾', 'success');
  });
}

function goToStep(step) {
  currentStep = step;

  // Panes
  document.querySelectorAll('.step-content-pane').forEach(p => {
    const s = Number(p.getAttribute('data-step'));
    p.classList.toggle('active', s === currentStep);
  });

  // Progress Bar
  const fill = document.getElementById('step-progress-fill');
  const text = document.getElementById('step-indicator-text');
  const backBtn = document.getElementById('step-back-btn');
  const nextBtn = document.getElementById('step-next-btn');

  const stepTitles = [
    'Cycle Regularity & Length',
    'Pain & Discomfort Severity',
    'Symptoms & Flow Patterns',
    'Mood, Rest & Energy',
    'Review & Clinical Summary'
  ];

  if (fill) fill.style.width = `${(currentStep / TOTAL_STEPS) * 100}%`;
  if (text) text.textContent = `Step ${currentStep} of ${TOTAL_STEPS}: ${stepTitles[currentStep - 1]}`;

  if (backBtn) backBtn.style.visibility = currentStep === 1 ? 'hidden' : 'visible';
  if (nextBtn) nextBtn.textContent = currentStep === TOTAL_STEPS ? '✓ Complete & Save Assessment' : 'Next Step →';
}

function validateStep(step) {
  if (step === 1) {
    const len = document.getElementById('q-cycle-length').value;
    const dur = document.getElementById('q-period-duration').value;
    const reg = document.querySelector('input[name="cycleRegularity"]:checked');
    if (!len || !dur || !reg) {
      showToast('Please fill in your cycle length, duration, and regularity.', 'error');
      return false;
    }
  } else if (step === 2) {
    const interf = document.querySelector('input[name="painInterference"]:checked');
    if (!interf) {
      showToast('Please select how pain impacts your daily activities.', 'error');
      return false;
    }
  } else if (step === 4) {
    const mood = document.querySelector('input[name="moodPms"]:checked');
    if (!mood) {
      showToast('Please select an option for mood patterns.', 'error');
      return false;
    }
  }
  return true;
}

function collectFormData() {
  const checkedSymptoms = Array.from(document.querySelectorAll('input[name="q_sym"]:checked')).map(cb => cb.value);

  return {
    typicalCycleLength: document.getElementById('q-cycle-length')?.value || '',
    periodDuration: document.getElementById('q-period-duration')?.value || '',
    cycleRegularity: document.querySelector('input[name="cycleRegularity"]:checked')?.value || '',
    painSeverity: document.getElementById('q-pain-slider')?.value || '5',
    painInterference: document.querySelector('input[name="painInterference"]:checked')?.value || '',
    commonSymptoms: checkedSymptoms,
    bleedingPattern: document.getElementById('q-bleeding-pattern')?.value || '',
    sleepQuality: document.getElementById('q-sleep')?.value || '',
    moodPms: document.querySelector('input[name="moodPms"]:checked')?.value || '',
    personalNotes: document.getElementById('q-personal-notes')?.value || ''
  };
}

async function saveAssessmentData(status = 'in_progress') {
  const answers = collectFormData();
  try {
    const res = await apiFetch('/api/assessments', {
      method: 'POST',
      body: {
        answers,
        completionStatus: status,
        currentStep
      }
    });

    // Sync to Cloud Firestore
    if (window.HerHealthFirebaseService) {
      window.HerHealthFirebaseService.firestoreSaveAssessment(answers, status);
    }

    return res;
  } catch (err) {
    showToast('Failed to save assessment: ' + err.message, 'error');
    throw err;
  }
}

async function submitFinalAssessment() {
  const nextBtn = document.getElementById('step-next-btn');
  nextBtn.disabled = true;

  try {
    const res = await saveAssessmentData('completed');
    const badge = document.getElementById('completion-status-badge');
    if (badge) {
      badge.textContent = 'Completed';
      badge.className = 'badge badge-low';
    }
    showToast('Health assessment completed & saved! 🌸', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    nextBtn.disabled = false;
  }
}

function compileSummaryPreview() {
  const answers = collectFormData();
  const summaryBox = document.getElementById('assessment-summary-view');
  if (!summaryBox) return;

  const symList = answers.commonSymptoms.length > 0 ? answers.commonSymptoms.join(', ') : 'None selected';

  summaryBox.innerHTML = `
    <h4 style="font-size:1.05rem; margin-bottom:12px; color:var(--primary-700);">Synthesized Profile Overview</h4>
    <div style="font-size:0.9rem; line-height:1.7;">
      <div>• <strong>Cycle Interval:</strong> ${answers.typicalCycleLength || '--'} days (${escapeHtml(answers.cycleRegularity)})</div>
      <div>• <strong>Bleeding Duration:</strong> ${answers.periodDuration || '--'} days</div>
      <div>• <strong>Pain Rating:</strong> ${answers.painSeverity}/10 — <em>${escapeHtml(answers.painInterference)}</em></div>
      <div>• <strong>Recurring Symptoms:</strong> ${escapeHtml(symList)}</div>
      <div>• <strong>Bleeding Characteristic:</strong> ${escapeHtml(answers.bleedingPattern)}</div>
      <div>• <strong>Sleep Pattern:</strong> ${escapeHtml(answers.sleepQuality)}</div>
      <div>• <strong>Luteal / PMS Mood:</strong> ${escapeHtml(answers.moodPms)}</div>
    </div>
    <div style="margin-top:14px; font-size:0.78rem; color:var(--text-light); border-top:1px solid var(--border-color); padding-top:8px;">
      ℹ️ This questionnaire summary is organized for your personal records and to bring to doctor appointments. It is not an automated medical diagnosis.
    </div>
  `;
}

async function loadExistingAssessment() {
  try {
    const data = await apiFetch('/api/assessments');
    if (!data.assessment || !data.assessment.answers) return;

    const a = data.assessment.answers;
    if (a.typicalCycleLength) document.getElementById('q-cycle-length').value = a.typicalCycleLength;
    if (a.periodDuration) document.getElementById('q-period-duration').value = a.periodDuration;

    if (a.cycleRegularity) {
      const radio = document.querySelector(`input[name="cycleRegularity"][value="${a.cycleRegularity}"]`);
      if (radio) radio.checked = true;
    }

    if (a.painSeverity !== undefined) {
      const slider = document.getElementById('q-pain-slider');
      const val = document.getElementById('q-pain-val');
      if (slider) slider.value = a.painSeverity;
      if (val) val.textContent = `${a.painSeverity} / 10`;
    }

    if (a.painInterference) {
      const radio = document.querySelector(`input[name="painInterference"][value="${a.painInterference}"]`);
      if (radio) radio.checked = true;
    }

    if (a.commonSymptoms && Array.isArray(a.commonSymptoms)) {
      a.commonSymptoms.forEach(sym => {
        const cb = document.querySelector(`input[name="q_sym"][value="${sym}"]`);
        if (cb) cb.checked = true;
      });
    }

    if (a.bleedingPattern) document.getElementById('q-bleeding-pattern').value = a.bleedingPattern;
    if (a.sleepQuality) document.getElementById('q-sleep').value = a.sleepQuality;

    if (a.moodPms) {
      const radio = document.querySelector(`input[name="moodPms"][value="${a.moodPms}"]`);
      if (radio) radio.checked = true;
    }

    if (a.personalNotes) document.getElementById('q-personal-notes').value = a.personalNotes;

    const badge = document.getElementById('completion-status-badge');
    if (data.assessment.completionStatus === 'completed') {
      badge.textContent = 'Completed';
      badge.className = 'badge badge-low';
    }

    // Resume saved step
    if (data.assessment.currentStep && data.assessment.currentStep > 1) {
      goToStep(data.assessment.currentStep);
    }
  } catch (err) {
    console.error('Error loading existing assessment:', err);
  }
}
