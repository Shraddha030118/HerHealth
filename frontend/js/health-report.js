/**
 * HerHealth AI — Doctor-Ready Clinical Report Controller
 */

document.addEventListener('DOMContentLoaded', async () => {
  const user = await checkAuthAndInitUI();
  if (!user) return;

  setupReportControls();
  await loadReportPreview();
});

function setupReportControls() {
  const updateBtn = document.getElementById('update-report-preview-btn');
  const downloadBtn = document.getElementById('download-pdf-btn');

  updateBtn?.addEventListener('click', async () => {
    await loadReportPreview();
    showToast('Report preview refreshed.', 'info');
  });

  downloadBtn?.addEventListener('click', async () => {
    downloadBtn.disabled = true;
    const origText = downloadBtn.innerHTML;
    downloadBtn.innerHTML = '<span>⏳</span> Generating PDF...';

    const startDate = document.getElementById('report-start-filter').value;
    const endDate = document.getElementById('report-end-filter').value;
    const personalNotes = document.getElementById('report-personal-notes-input').value;

    const queryParams = new URLSearchParams();
    if (startDate) queryParams.set('startDate', startDate);
    if (endDate) queryParams.set('endDate', endDate);
    if (personalNotes) queryParams.set('personalNotes', personalNotes);

    try {
      const blob = await apiFetch(`/api/reports/download?${queryParams.toString()}`);
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `HerHealth_Clinical_Summary.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
      showToast('Doctor-ready PDF downloaded successfully! 📄', 'success');
    } catch (err) {
      showToast('PDF download failed: ' + err.message, 'error');
    } finally {
      downloadBtn.disabled = false;
      downloadBtn.innerHTML = origText;
    }
  });
}

async function loadReportPreview() {
  const startDate = document.getElementById('report-start-filter').value;
  const endDate = document.getElementById('report-end-filter').value;
  const personalNotes = document.getElementById('report-personal-notes-input').value;

  try {
    const res = await apiFetch('/api/reports/generate', {
      method: 'POST',
      body: { startDate, endDate, personalNotes }
    });

    renderReport(res.report);
  } catch (err) {
    showToast('Failed to compile report: ' + err.message, 'error');
  }
}

function renderReport(report) {
  if (!report) return;

  // Header & Patient
  document.getElementById('report-generated-timestamp').textContent =
    `Generated: ${new Date(report.generatedAt).toLocaleString()} | Confidential Document`;

  document.getElementById('rep-patient-name').textContent = report.patient.name;
  document.getElementById('rep-patient-age').textContent = report.patient.age;
  document.getElementById('rep-patient-email').textContent = report.patient.email;

  // Cycle Metrics
  const c = report.cycleSummary;
  document.getElementById('rep-stat-periods').textContent = c.totalPeriodsLogged;
  document.getElementById('rep-stat-avg-cycle').textContent = `${c.averageCycleLength}d ${c.isCycleLengthEstimated ? '(Est)' : ''}`;
  document.getElementById('rep-stat-avg-duration').textContent = `${c.averagePeriodDuration}d ${c.isPeriodDurationEstimated ? '(Est)' : ''}`;
  document.getElementById('rep-stat-regularity').textContent = c.regularityStatus.replace('_', ' ');

  // Symptoms & Pain
  const s = report.symptomSummary;
  document.getElementById('rep-symptom-logs-count').textContent = s.totalLogs;
  document.getElementById('rep-avg-pain').textContent = `${s.averagePainScore} / 10`;
  document.getElementById('rep-peak-pain').textContent = `${s.peakPainScore} / 10`;

  const topSymEl = document.getElementById('rep-top-symptoms-text');
  if (s.topSymptoms && s.topSymptoms.length > 0) {
    const listStr = s.topSymptoms.map(item => `<strong>${item.name}</strong> (${item.count}x)`).join(', ');
    topSymEl.innerHTML = `Most frequent recurring symptoms: ${listStr}`;
  } else {
    topSymEl.textContent = 'No recurring symptoms logged in selected date range.';
  }

  // Periods Table
  const tbody = document.getElementById('rep-periods-tbody');
  tbody.innerHTML = '';
  if (report.periods.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="padding:16px; text-align:center; color:#888;">No period dates recorded in this range.</td></tr>`;
  } else {
    report.periods.forEach(p => {
      const tr = document.createElement('tr');
      tr.style.borderBottom = '1px solid #eee';
      tr.innerHTML = `
        <td style="padding:10px;">${new Date(p.startDate).toLocaleDateString()}</td>
        <td style="padding:10px;">${p.endDate ? new Date(p.endDate).toLocaleDateString() : 'Ongoing / unrecorded'}</td>
        <td style="padding:10px;"><span class="badge ${p.flowIntensity === 'heavy' ? 'badge-urgent' : 'badge-lavender'}">${p.flowIntensity}</span></td>
        <td style="padding:10px; color:#555;">${escapeHtml(p.notes || '-')}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  renderQuestionnaireSummary(report.questionnaireSummary);

  // Alerts
  const alertsCont = document.getElementById('rep-alerts-container');
  alertsCont.innerHTML = '';
  if (report.recentAlerts.length === 0) {
    alertsCont.textContent = 'No separate symptom-log alerts are recorded. See the questionnaire summary above for its rule-based guidance.';
  } else {
    report.recentAlerts.forEach(al => {
      const box = document.createElement('div');
      box.style.cssText = 'padding:10px 14px; background:#fff3e0; border:1px solid #ffe0b2; border-radius:6px; margin-bottom:8px;';
      box.innerHTML = `
        <strong style="color:#e65100;">[${al.severity.toUpperCase()}] ${escapeHtml(al.title)}</strong>
        <div style="font-size:0.85rem; color:#555; margin-top:2px;">${escapeHtml(al.explanation)}</div>
      `;
      alertsCont.appendChild(box);
    });
  }

  // Doctor Questions Checklist
  const qList = document.getElementById('rep-questions-list');
  qList.innerHTML = '';
  report.suggestedQuestions.forEach(q => {
    const li = document.createElement('li');
    li.style.marginBottom = '6px';
    li.innerHTML = `[  ] ${escapeHtml(q)}`;
    qList.appendChild(li);
  });

  // Personal Notes
  const notesEl = document.getElementById('rep-patient-notes-display');
  notesEl.textContent = report.patientNotes || 'None provided.';
}

function renderQuestionnaireSummary(summary) {
  const section = document.getElementById('rep-questionnaire-section');
  const details = document.getElementById('rep-questionnaire-details');
  const trendList = document.getElementById('rep-questionnaire-trends');
  const trendsTitle = document.getElementById('rep-questionnaire-trends-title');
  details.replaceChildren();
  trendList.replaceChildren();

  if (!summary || !summary.latest) {
    section.hidden = true;
    return;
  }

  section.hidden = false;
  const latest = summary.latest;
  document.getElementById('rep-questionnaire-date').textContent =
    `Latest completed questionnaire: ${new Date(latest.submittedAt).toLocaleDateString()} (${summary.submissionCount} completed submission${summary.submissionCount === 1 ? '' : 's'}).`;

  const entries = [
    ['Cycle information', `Last period: ${latest.cycle.lastPeriodStart || 'Not provided'}; usual cycle: ${latest.cycle.cycleLength === null ? 'Not provided' : `${latest.cycle.cycleLength} days`}; usual period: ${latest.cycle.periodDuration === null ? 'Not provided' : `${latest.cycle.periodDuration} days`}; regularity: ${latest.cycle.regularity || 'Not provided'}`],
    ['Reported symptoms', latest.symptoms.length ? latest.symptoms.map(formatQuestionnaireSymptom).join(', ') : 'None selected or not provided'],
    ['Reported pain', latest.painLevel === null ? 'Not provided' : `${latest.painLevel}/10`],
    ['Reported bleeding', `Flow: ${latest.bleeding.flow || 'Not provided'}; product changes: ${latest.bleeding.productChangeFrequency || 'Not provided'}; flooding/clots: ${latest.bleeding.floodingOrClots || 'Not provided'}; between periods: ${latest.bleeding.betweenPeriods || 'Not provided'}`],
    ['Guidance level', latest.assessment ? `${latest.assessment.levelName} (not a diagnosis)` : 'Not available']
  ];
  entries.forEach(([label, value]) => {
    const term = document.createElement('dt');
    term.textContent = label;
    const description = document.createElement('dd');
    description.textContent = value;
    details.append(term, description);
  });

  const trendItems = [];
  if (summary.painTrend.length >= 2) {
    trendItems.push(`Reported pain across questionnaire submissions: ${summary.painTrend
      .map(item => `${new Date(item.date).toLocaleDateString()} — ${item.painLevel}/10`)
      .join('; ')}`);
  }
  (summary.reportedBleedingChanges || []).forEach(change => {
    trendItems.push(`${new Date(change.date).toLocaleDateString()}: reported ${change.field} changed from "${change.from}" to "${change.to}".`);
  });
  trendsTitle.hidden = trendItems.length === 0;
  trendItems.forEach(text => {
    const item = document.createElement('li');
    item.textContent = text;
    trendList.appendChild(item);
  });
  document.getElementById('rep-questionnaire-guidance').textContent = summary.guidanceNotice;
}

function formatQuestionnaireSymptom(symptom) {
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
