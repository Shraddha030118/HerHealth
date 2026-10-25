/**
 * HerHealth AI — Dashboard Frontend Controller
 */

let painChartInstance = null;
let symptomChartInstance = null;

document.addEventListener('DOMContentLoaded', async () => {
  const user = await checkAuthAndInitUI();
  if (!user) return;

  setupGreeting(user);
  setupDateDisplay();
  setupModals();
  await loadDashboardData(user);
});

function setupGreeting(user) {
  const greetingEl = document.getElementById('greeting-text');
  const hour = new Date().getHours();
  let timeOfDay = 'Hello';
  if (hour < 12) timeOfDay = 'Good morning';
  else if (hour < 18) timeOfDay = 'Good afternoon';
  else timeOfDay = 'Good evening';

  const firstName = user.name ? user.name.split(' ')[0] : 'Friend';
  greetingEl.textContent = `${timeOfDay}, ${firstName} 🌸`;
}

function setupDateDisplay() {
  const dateEl = document.getElementById('dashboard-date-display');
  const now = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  dateEl.textContent = `Today is ${now.toLocaleDateString(undefined, options)}`;

  // Default date inputs to today
  const todayStr = now.toISOString().split('T')[0];
  const sDateInput = document.getElementById('symptom-date');
  const pStartInput = document.getElementById('period-start-date');
  if (sDateInput) sDateInput.value = todayStr;
  if (pStartInput) pStartInput.value = todayStr;
}

async function loadDashboardData(user = {}) {
  // 1. Fetch Periods and Cycle Analytics
  try {
    const periodData = await apiFetch('/api/periods');
    if (periodData && periodData.metrics) {
      renderCycleMetrics(periodData.metrics);
      renderPeriodsList(periodData.records || []);
    } else {
      renderDefaultCycleMetrics(user);
    }
  } catch (err) {
    console.warn('[Dashboard] Periods fetch note:', err.message);
    renderDefaultCycleMetrics(user);
  }

  // 2. Fetch Symptoms and Trends
  try {
    const symptomData = await apiFetch('/api/symptoms?limit=14');
    if (symptomData) {
      renderSymptomsList(symptomData.logs || []);
      renderCharts(symptomData.trends);
    }
  } catch (err) {
    console.warn('[Dashboard] Symptoms fetch note:', err.message);
  }

  // 3. Fetch Alerts
  try {
    const alertData = await apiFetch('/api/alerts');
    if (alertData && alertData.alerts) {
      renderAlerts(alertData.alerts);
    }
  } catch (err) {
    console.warn('[Dashboard] Alerts fetch note:', err.message);
  }

  // 4. Fetch Hydration
  try {
    const hydData = await apiFetch('/api/wellness/hydration');
    if (hydData && hydData.success && hydData.hydration) {
      const hydEl = document.getElementById('metric-hydration');
      if (hydEl) hydEl.textContent = `${hydData.hydration.glasses || 0} / 8`;
    }
  } catch (err) {
    console.warn('[Dashboard] Hydration fetch note:', err.message);
  }
}

function renderDefaultCycleMetrics(user) {
  renderCycleMetrics({
    currentCycleDay: null,
    cyclePhase: 'Cycle Tracking',
    phaseDescription: 'Log your period records to get personalized cycle phase insights and estimates.',
    averageCycleLength: user?.averageCycleLength || 28,
    averagePeriodDuration: user?.averagePeriodDuration || 5,
    daysUntilNextPeriod: null,
    isCycleLengthEstimated: true
  });
}

function renderCycleMetrics(metrics) {
  if (!metrics) return;

  const cycleDayEl = document.getElementById('metric-cycle-day');
  const phaseNameEl = document.getElementById('metric-phase-name');
  const nextPeriodEl = document.getElementById('metric-next-period');
  const avgCycleEl = document.getElementById('metric-avg-cycle');
  const regNoteEl = document.getElementById('metric-regularity-note');
  const phaseTitleEl = document.getElementById('cycle-phase-title');
  const phaseDescEl = document.getElementById('cycle-phase-description');
  const phaseIconEl = document.getElementById('phase-icon');

  if (metrics.currentCycleDay) {
    cycleDayEl.textContent = `Day ${metrics.currentCycleDay}`;
  } else {
    cycleDayEl.textContent = 'Day --';
  }

  phaseNameEl.textContent = metrics.cyclePhase || 'Cycle Phase';
  phaseTitleEl.textContent = `${metrics.cyclePhase || 'Cycle Tracking'}`;
  phaseDescEl.textContent = metrics.phaseDescription || 'Log your period records to get personalized cycle phase insights.';

  // Phase icons
  if (metrics.cyclePhase?.includes('Menstrual')) phaseIconEl.textContent = '🩸';
  else if (metrics.cyclePhase?.includes('Follicular')) phaseIconEl.textContent = '🌱';
  else if (metrics.cyclePhase?.includes('Ovulatory')) phaseIconEl.textContent = '✨';
  else if (metrics.cyclePhase?.includes('Luteal')) phaseIconEl.textContent = '🌙';
  else phaseIconEl.textContent = '🌸';

  if (metrics.daysUntilNextPeriod !== null && metrics.daysUntilNextPeriod !== undefined) {
    if (metrics.daysUntilNextPeriod === 0) {
      nextPeriodEl.textContent = 'Due Today';
    } else if (metrics.daysUntilNextPeriod > 0) {
      nextPeriodEl.textContent = `In ${metrics.daysUntilNextPeriod} Days`;
    } else {
      nextPeriodEl.textContent = `${Math.abs(metrics.daysUntilNextPeriod)} Days Ago`;
    }
  } else {
    nextPeriodEl.textContent = '-- Days';
  }

  avgCycleEl.textContent = `${metrics.averageCycleLength} Days`;
  regNoteEl.textContent = metrics.isCycleLengthEstimated ? 'Baseline Estimate' : 'Historical Mean';
}

function renderPeriodsList(records) {
  const container = document.getElementById('dashboard-periods-container');
  if (!records || records.length === 0) return; // Keep empty state

  container.innerHTML = '';
  records.slice(0, 3).forEach(p => {
    const sDate = new Date(p.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    const eDate = p.endDate ? new Date(p.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Ongoing';

    const item = document.createElement('div');
    item.className = 'history-list-item';
    item.innerHTML = `
      <div class="history-item-left">
        <span style="font-size:1.3rem;">🩸</span>
        <div>
          <div class="history-item-date">${sDate} – ${eDate}</div>
          <div class="history-item-meta">Flow: <strong>${p.flowIntensity}</strong> ${p.notes ? `• ${escapeHtml(p.notes)}` : ''}</div>
        </div>
      </div>
      <span class="badge badge-lavender">Logged</span>
    `;
    container.appendChild(item);
  });
}

function renderSymptomsList(logs) {
  const container = document.getElementById('dashboard-symptoms-container');
  if (!logs || logs.length === 0) return;

  container.innerHTML = '';
  logs.slice(0, 3).forEach(log => {
    const dStr = new Date(log.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const symList = (log.symptoms && log.symptoms.length > 0) ? log.symptoms.join(', ') : 'No specific symptoms';

    const item = document.createElement('div');
    item.className = 'history-list-item';
    item.innerHTML = `
      <div class="history-item-left">
        <span style="font-size:1.3rem;">📝</span>
        <div>
          <div class="history-item-date">${dStr} — Pain ${log.painLevel}/10</div>
          <div class="history-item-meta">${escapeHtml(symList)} • Mood: ${log.mood}</div>
        </div>
      </div>
      <span class="badge ${log.painLevel >= 7 ? 'badge-urgent' : log.painLevel >= 4 ? 'badge-high' : 'badge-low'}">
        Score ${log.painLevel}
      </span>
    `;
    container.appendChild(item);
  });
}

function renderAlerts(alerts) {
  const container = document.getElementById('dashboard-alerts-container');
  const sidebarBadge = document.getElementById('sidebar-alert-badge');

  if (!alerts || alerts.length === 0) {
    if (sidebarBadge) sidebarBadge.style.display = 'none';
    return;
  }

  const unreadAlerts = alerts.filter(a => !a.readStatus);
  if (sidebarBadge) {
    if (unreadAlerts.length > 0) {
      sidebarBadge.textContent = unreadAlerts.length;
      sidebarBadge.style.display = 'inline-flex';
    } else {
      sidebarBadge.style.display = 'none';
    }
  }

  container.innerHTML = '';
  alerts.slice(0, 2).forEach(al => {
    const alertBox = document.createElement('div');
    alertBox.style.cssText = `
      padding: 14px;
      border-radius: var(--radius-md);
      margin-bottom: 10px;
      background: ${al.severity === 'urgent' ? '#ffebee' : '#fff3e0'};
      border: 1px solid ${al.severity === 'urgent' ? '#ffcdd2' : '#ffe0b2'};
    `;
    alertBox.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
        <strong style="color:${al.severity === 'urgent' ? 'var(--status-urgent)' : 'var(--status-warning)'}; font-size:0.92rem;">
          ${al.severity === 'urgent' ? '🚨' : '⚠️'} ${escapeHtml(al.title)}
        </strong>
        <span class="badge ${al.severity === 'urgent' ? 'badge-urgent' : 'badge-high'}">${al.severity}</span>
      </div>
      <p style="font-size:0.82rem; color:var(--text-main); margin-bottom:0; line-height:1.45;">
        ${escapeHtml(al.explanation.substring(0, 110))}...
      </p>
    `;
    container.appendChild(alertBox);
  });
}

function renderCharts(trends) {
  if (!trends) return;

  // 1. Pain Chart
  const painCtx = document.getElementById('painChart')?.getContext('2d');
  if (painCtx) {
    if (painChartInstance) painChartInstance.destroy();

    const labels = (trends.painTrends || []).map(pt =>
      new Date(pt.date).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })
    );
    const dataPoints = (trends.painTrends || []).map(pt => pt.painLevel);

    painChartInstance = new Chart(painCtx, {
      type: 'line',
      data: {
        labels: labels.length > 0 ? labels : ['No Data'],
        datasets: [{
          label: 'Pain Level (0-10)',
          data: dataPoints.length > 0 ? dataPoints : [0],
          borderColor: '#e0447c',
          backgroundColor: 'rgba(224, 68, 124, 0.1)',
          fill: true,
          tension: 0.35,
          pointBackgroundColor: '#e0447c',
          pointRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { min: 0, max: 10, ticks: { stepSize: 2 } },
          x: { grid: { display: false } }
        },
        plugins: {
          legend: { display: false }
        }
      }
    });
  }

  // 2. Symptom Frequency Chart
  const symCtx = document.getElementById('symptomChart')?.getContext('2d');
  if (symCtx) {
    if (symptomChartInstance) symptomChartInstance.destroy();

    const freqEntries = Object.entries(trends.frequency || {}).slice(0, 6);
    const symLabels = freqEntries.map(e => e[0].replace('_', ' '));
    const symCounts = freqEntries.map(e => e[1]);

    symptomChartInstance = new Chart(symCtx, {
      type: 'bar',
      data: {
        labels: symLabels.length > 0 ? symLabels : ['None Logged'],
        datasets: [{
          label: 'Occurrences',
          data: symCounts.length > 0 ? symCounts : [0],
          backgroundColor: 'rgba(124, 71, 217, 0.75)',
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1 } },
          x: { grid: { display: false } }
        },
        plugins: {
          legend: { display: false }
        }
      }
    });
  }
}

// Setup Dialog Modals for Period & Symptoms
function setupModals() {
  const periodModal = document.getElementById('period-modal');
  const symptomsModal = document.getElementById('symptoms-modal');

  // Open buttons
  document.getElementById('open-log-period-btn')?.addEventListener('click', () => {
    periodModal.classList.add('active');
  });

  document.getElementById('open-log-symptoms-btn')?.addEventListener('click', () => {
    symptomsModal.classList.add('active');
  });

  // Close buttons
  document.getElementById('close-period-modal')?.addEventListener('click', () => {
    periodModal.classList.remove('active');
  });
  document.getElementById('cancel-period-modal')?.addEventListener('click', () => {
    periodModal.classList.remove('active');
  });

  document.getElementById('close-symptoms-modal')?.addEventListener('click', () => {
    symptomsModal.classList.remove('active');
  });
  document.getElementById('cancel-symptoms-modal')?.addEventListener('click', () => {
    symptomsModal.classList.remove('active');
  });

  // Pain range slider value label
  const painRange = document.getElementById('symptom-pain-range');
  const painLabel = document.getElementById('pain-level-label');
  painRange?.addEventListener('input', (e) => {
    const val = Number(e.target.value);
    let desc = 'None';
    if (val >= 8) desc = 'Severe / Debilitating';
    else if (val >= 5) desc = 'Moderate';
    else if (val >= 1) desc = 'Mild';
    painLabel.textContent = `${val} / 10 (${desc})`;
    painLabel.style.color = val >= 8 ? 'var(--status-urgent)' : val >= 5 ? 'var(--status-warning)' : 'var(--primary-600)';
  });

  // Handle Record Period Form
  const periodForm = document.getElementById('period-record-form');
  periodForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const startDate = document.getElementById('period-start-date').value;
    const endDate = document.getElementById('period-end-date').value || undefined;
    const flowIntensity = document.getElementById('period-flow').value;
    const notes = document.getElementById('period-notes').value;

    const saveBtn = document.getElementById('save-period-btn');
    saveBtn.disabled = true;

    try {
      await apiFetch('/api/periods', {
        method: 'POST',
        body: { startDate, endDate, flowIntensity, notes }
      });

      // Synchronize with Firebase Firestore
      if (window.HerHealthFirebaseService) {
        window.HerHealthFirebaseService.firestoreSavePeriod({ startDate, endDate, flowIntensity, notes });
      }

      showToast('Period record saved successfully! 🌸', 'success');
      periodModal.classList.remove('active');
      periodForm.reset();
      await loadDashboardData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      saveBtn.disabled = false;
    }
  });

  // Handle Log Symptoms Form
  const symptomForm = document.getElementById('symptom-log-form');
  symptomForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const date = document.getElementById('symptom-date').value;
    const painLevel = document.getElementById('symptom-pain-range').value;
    const mood = document.getElementById('symptom-mood').value;
    const flowInformation = document.getElementById('symptom-flow').value;
    const notes = document.getElementById('symptom-notes').value;

    const checkedBoxes = document.querySelectorAll('input[name="symptom"]:checked');
    const symptoms = Array.from(checkedBoxes).map(cb => cb.value);

    const saveBtn = document.getElementById('save-symptoms-btn');
    saveBtn.disabled = true;

    try {
      const res = await apiFetch('/api/symptoms', {
        method: 'POST',
        body: { date, symptoms, painLevel, mood, flowInformation, notes }
      });

      // Synchronize with Firebase Firestore
      if (window.HerHealthFirebaseService) {
        window.HerHealthFirebaseService.firestoreSaveSymptom({ date, symptoms, painLevel, mood, flowInformation, notes });
      }

      showToast('Symptom entry saved! 🌸', 'success');
      if (res.triggeredAlerts && res.triggeredAlerts.length > 0) {
        showToast(`⚠️ Health notice: ${res.triggeredAlerts[0].title}`, 'error');
      }

      symptomsModal.classList.remove('active');
      symptomForm.reset();
      await loadDashboardData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      saveBtn.disabled = false;
    }
  });
}
