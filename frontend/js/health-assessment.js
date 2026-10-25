const TOTAL_STEPS = 6;
const STEP_TITLES = [
  'Cycle information',
  'Symptoms and pain',
  'Bleeding patterns',
  'Mood and well-being',
  'Relevant health information',
  'Review your answers'
];

let currentStep = 1;
let previewTimer;

document.addEventListener('DOMContentLoaded', async () => {
  const user = await checkAuthAndInitUI();
  if (!user) return;

  setupQuestionnaire();
  await Promise.all([loadExistingQuestionnaire(), loadQuestionnaireHistory()]);
});

function setupQuestionnaire() {
  document.getElementById('legacy-assessment-template')?.remove();
  const form = document.getElementById('questionnaire-form');
  form.querySelectorAll('h3').forEach(heading => heading.tabIndex = -1);
  document.getElementById('step-next-btn').addEventListener('click', handleNext);
  document.getElementById('step-back-btn').addEventListener('click', () => {
    if (currentStep > 1) goToStep(currentStep - 1);
  });
  document.getElementById('save-draft-btn').addEventListener('click', saveDraft);
  form.addEventListener('input', scheduleAssessmentPreview);
  form.addEventListener('change', event => {
    const uncertaintySelect = event.target.closest('[data-uncertainty-for]');
    if (uncertaintySelect) {
      const numberInput = form.elements[uncertaintySelect.dataset.uncertaintyFor];
      if (uncertaintySelect.value) numberInput.value = '';
      numberInput.disabled = Boolean(uncertaintySelect.value);
    } else if (event.target.name === 'symptoms') {
      const selected = [...form.querySelectorAll('input[name="symptoms"]:checked')];
      const noneCheckbox = form.querySelector('input[name="symptoms"][value="none"]');
      if (event.target.value === 'none' && event.target.checked) {
        selected.forEach(item => {
          if (item !== noneCheckbox) item.checked = false;
        });
      } else if (event.target.checked && noneCheckbox.checked) {
        noneCheckbox.checked = false;
      }
    }
    scheduleAssessmentPreview();
  });
  form.addEventListener('submit', event => event.preventDefault());
  goToStep(1);
}

function collectAnswers() {
  const form = document.getElementById('questionnaire-form');
  const answers = {};
  for (const [key, value] of new FormData(form).entries()) {
    if (value === '') continue;
    if (key === 'symptoms' || key === 'painLocations') {
      answers[key] = answers[key] || [];
      answers[key].push(value);
    } else {
      answers[key] = value;
    }
  }

  for (const select of form.querySelectorAll('[data-uncertainty-for]')) {
    if (select.value) answers[select.dataset.uncertaintyFor] = select.value;
  }
  return answers;
}

function goToStep(step) {
  currentStep = step;
  document.querySelectorAll('#questionnaire-form .step-content-pane').forEach(pane => {
    pane.classList.toggle('active', Number(pane.dataset.step) === step);
  });

  const progress = document.querySelector('[role="progressbar"]');
  document.getElementById('step-progress-fill').style.width = `${(step / TOTAL_STEPS) * 100}%`;
  document.getElementById('step-indicator-text').textContent =
    `Step ${step} of ${TOTAL_STEPS}: ${STEP_TITLES[step - 1]}`;
  progress.setAttribute('aria-valuenow', String(step));

  const backButton = document.getElementById('step-back-btn');
  backButton.disabled = step === 1;
  const nextButton = document.getElementById('step-next-btn');
  nextButton.textContent = step === TOTAL_STEPS ? 'Submit questionnaire' : 'Next';

  if (step === TOTAL_STEPS) renderReviewSummary();
  document.querySelector(`#questionnaire-form [data-step="${step}"] h3`).focus?.();
}

async function handleNext() {
  const currentPane = document.querySelector(`#questionnaire-form [data-step="${currentStep}"]`);
  const invalid = [...currentPane.querySelectorAll('input, select, textarea')]
    .find(control => !control.checkValidity());
  if (invalid) {
    invalid.reportValidity();
    return;
  }

  if (currentStep < TOTAL_STEPS) {
    goToStep(currentStep + 1);
    return;
  }
  await submitQuestionnaire();
}

function scheduleAssessmentPreview() {
  window.clearTimeout(previewTimer);
  previewTimer = window.setTimeout(updateAssessmentPreview, 180);
}

async function updateAssessmentPreview() {
  const warning = document.getElementById('urgent-warning');
  try {
    const response = await apiFetch('/api/questionnaires/preview', {
      method: 'POST',
      body: { answers: collectAnswers() }
    });
    renderUrgentWarning(response.assessment);
  } catch (error) {
    warning.hidden = false;
    warning.className = 'questionnaire-warning questionnaire-warning-error';
    warning.textContent = 'The safety check could not be completed. If you have severe or rapidly worsening symptoms, fainting, heavy bleeding, or difficulty breathing, seek urgent medical care now.';
    console.error('Questionnaire safety preview failed:', error.message);
  }
}

function renderUrgentWarning(assessment) {
  const warning = document.getElementById('urgent-warning');
  if (!assessment || assessment.level < 3) {
    warning.hidden = true;
    warning.textContent = '';
    return;
  }
  warning.hidden = false;
  warning.className = `questionnaire-warning questionnaire-warning-level-${assessment.level}`;
  warning.textContent = `${assessment.title}. ${assessment.urgencyStatement}`;
}

async function saveDraft() {
  const button = document.getElementById('save-draft-btn');
  button.disabled = true;
  try {
    await apiFetch('/api/questionnaires/draft', {
      method: 'POST',
      body: { answers: collectAnswers(), currentStep }
    });
    document.getElementById('completion-status-badge').textContent = 'Draft saved';
    showToast('Your questionnaire draft was saved.', 'success');
  } catch (error) {
    showToast(`Could not save your draft: ${error.message}`, 'error');
  } finally {
    button.disabled = false;
  }
}

async function submitQuestionnaire() {
  const button = document.getElementById('step-next-btn');
  button.disabled = true;
  try {
    const response = await apiFetch('/api/questionnaires', {
      method: 'POST',
      body: {
        answers: collectAnswers(),
        currentStep,
        completionStatus: 'completed'
      }
    });
    const assessment = response.assessment;
    document.getElementById('completion-status-badge').textContent = 'Submitted';
    renderUrgentWarning(assessment);
    renderAssessmentResults(assessment);
    await loadQuestionnaireHistory();
    showToast('Your questionnaire was submitted and assessed.', 'success');
  } catch (error) {
    showToast(`Could not submit your questionnaire: ${error.message}`, 'error');
  } finally {
    button.disabled = false;
  }
}

function renderReviewSummary() {
  const answers = collectAnswers();
  const summary = document.getElementById('assessment-summary-view');
  const labels = {
    lastPeriodStart: 'Last period start',
    periodDuration: 'Usual period duration (days)',
    cycleLength: 'Usual cycle length (days)',
    cycleRegularity: 'Cycle regularity',
    missedPeriod: 'Unexpected missed period',
    recentCycleChanges: 'Recent cycle changes',
    experiencesPain: 'Menstrual pain or cramps',
    painLevel: 'Pain rating',
    painLocations: 'Pain locations',
    symptoms: 'Symptoms',
    symptomTiming: 'Symptom timing',
    interferesWithDailyActivities: 'Effect on daily activities',
    symptomProgression: 'Symptom changes',
    flowDescription: 'Menstrual flow',
    productChangeFrequency: 'Product change frequency',
    floodingOrClots: 'Flooding, leakage, or clots',
    bleedingBetweenPeriods: 'Bleeding between periods',
    prolongedBleeding: 'Prolonged bleeding',
    bleedingWithDizzinessOrSeverePain: 'Bleeding with dizziness or severe pain',
    faintingOrCollapse: 'Fainting or collapse',
    isTypicalBleeding: 'Usual bleeding pattern',
    moodDescription: 'Mood',
    emotionalChanges: 'Emotional changes',
    sleepQuality: 'Sleep',
    energyLevel: 'Energy',
    wellbeingInterference: 'Well-being impact',
    pregnancyPossibility: 'Pregnancy possibility',
    similarSymptomsBefore: 'Similar symptoms before',
    consultedDoctor: 'Consulted a professional',
    otherSymptoms: 'Other symptoms',
    painLocationOther: 'Other pain location',
    additionalInformation: 'Additional information',
    personalNotes: 'Personal notes'
  };

  const list = document.createElement('dl');
  Object.entries(labels).forEach(([field, label]) => {
    if (answers[field] === undefined) return;
    const term = document.createElement('dt');
    term.textContent = label;
    const description = document.createElement('dd');
    description.textContent = Array.isArray(answers[field])
      ? answers[field].map(value => field === 'symptoms' ? formatSymptomName(value) : value).join(', ')
      : answers[field];
    list.append(term, description);
  });
  if (list.childElementCount === 0) {
    const note = document.createElement('p');
    note.textContent = 'No answers entered. You can still submit, but the assessment will have limited information.';
    list.appendChild(note);
  }
  summary.replaceChildren(list);
}

function renderAssessmentResults(assessment) {
  const results = document.getElementById('assessment-results');
  results.hidden = false;
  results.dataset.level = String(assessment.level);
  renderReviewSummary();
  document.getElementById('assessment-response-summary').replaceChildren(
    document.getElementById('assessment-summary-view').cloneNode(true)
  );
  document.getElementById('assessment-result-title').textContent =
    `${assessment.icon} ${assessment.title}`;
  document.getElementById('assessment-result-message').textContent = assessment.bannerText;
  document.getElementById('assessment-result-action').textContent =
    `${assessment.actionHeader}. ${assessment.urgencyStatement}`;

  renderList('assessment-explanations', 'What informed this assessment', assessment.explanations);
  renderList('assessment-next-steps', 'Recommended next steps', assessment.recommendedNextSteps);
  document.getElementById('assessment-limitations').textContent =
    assessment.limitations && assessment.limitations.length
      ? `Assessment limitations: ${assessment.limitations.join(' ')}`
      : '';
  results.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderList(id, heading, values) {
  const list = document.getElementById(id);
  list.replaceChildren();
  const label = document.createElement('li');
  label.className = 'questionnaire-list-heading';
  label.textContent = heading;
  list.appendChild(label);
  (values || []).forEach(value => {
    const item = document.createElement('li');
    item.textContent = value;
    list.appendChild(item);
  });
}

async function loadExistingQuestionnaire() {
  try {
    const response = await apiFetch('/api/questionnaires/latest');
    const submission = response.submission;
    if (!submission) {
      scheduleAssessmentPreview();
      return;
    }

    populateAnswers(submission.answers || {});
    if (submission.completionStatus === 'completed') {
      document.getElementById('completion-status-badge').textContent = 'Previously submitted';
      const assessment = response.assessment;
      renderUrgentWarning(assessment);
      renderReviewSummary();
      renderAssessmentResults(assessment);
      return;
    }

    document.getElementById('completion-status-badge').textContent = 'Draft in progress';
    goToStep(Math.min(Math.max(Number(submission.currentStep) || 1, 1), TOTAL_STEPS));
    scheduleAssessmentPreview();
  } catch (error) {
    showToast(`Could not load your saved questionnaire: ${error.message}`, 'error');
  }
}

async function loadQuestionnaireHistory() {
  try {
    const response = await apiFetch('/api/questionnaires/history');
    renderQuestionnaireHistory(response.history || []);
  } catch (error) {
    showToast(`Could not load questionnaire history: ${error.message}`, 'error');
  }
}

function renderQuestionnaireHistory(history) {
  const list = document.getElementById('questionnaire-history-list');
  list.replaceChildren();
  if (!history.length) {
    const empty = document.createElement('li');
    empty.textContent = 'No completed questionnaire submissions yet.';
    list.appendChild(empty);
    return;
  }

  history.forEach((submission, index) => {
    const item = document.createElement('li');
    const answers = submission.answers || {};
    const date = new Date(submission.submittedAt || submission.createdAt);
    const heading = document.createElement('h4');
    heading.textContent = `Completed ${date.toLocaleDateString()}`;
    const reported = document.createElement('p');
    const symptomNames = Array.isArray(answers.symptoms)
      ? answers.symptoms.map(formatSymptomName).join(', ')
      : '';
    const pain = Number.isInteger(answers.painLevel) ? `${answers.painLevel}/10` : 'Not provided';
    reported.textContent = `Reported by you — symptoms: ${symptomNames || 'none selected or not provided'}; pain: ${pain}; flow: ${answers.flowDescription || 'not provided'}.`;
    const guidance = document.createElement('p');
    guidance.textContent = `System-generated guidance — ${submission.assessment?.levelName || 'not available'}; this is not a diagnosis.`;
    item.append(heading, reported, guidance);

    const older = history[index + 1];
    if (older) {
      const previousAnswers = older.answers || {};
      const changes = [];
      if (Number.isInteger(answers.painLevel) && Number.isInteger(previousAnswers.painLevel) && answers.painLevel !== previousAnswers.painLevel) {
        changes.push(`reported pain changed from ${previousAnswers.painLevel}/10 to ${answers.painLevel}/10`);
      }
      if (answers.flowDescription && previousAnswers.flowDescription && answers.flowDescription !== previousAnswers.flowDescription) {
        changes.push(`reported flow changed from ${previousAnswers.flowDescription} to ${answers.flowDescription}`);
      }
      if (changes.length) {
        const changeNote = document.createElement('p');
        changeNote.textContent = `Change since previous questionnaire: ${changes.join('; ')}.`;
        item.appendChild(changeNote);
      }
    }
    list.appendChild(item);
  });
}

function formatSymptomName(symptom) {
  const labels = {
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
  return labels[symptom] || symptom;
}

function populateAnswers(answers) {
  const form = document.getElementById('questionnaire-form');
  Object.entries(answers).forEach(([name, value]) => {
    if (value === undefined || value === null) return;
    if (Array.isArray(value)) {
      value.forEach(item => {
        const control = [...form.querySelectorAll(`[name="${name}"]`)]
          .find(candidate => candidate.value === String(item));
        if (control) control.checked = true;
      });
      return;
    }
    const control = form.elements[name];
    if (!control) return;

    const uncertainty = form.querySelector(`[data-uncertainty-for="${name}"]`);
    if (uncertainty && typeof value === 'string' && !/^\d+$/.test(value)) {
      uncertainty.value = value;
      control.disabled = true;
    } else {
      control.value = value;
    }
  });
}
