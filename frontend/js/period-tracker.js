/**
 * HerHealth AI — Period Tracker Interactive Calendar & Record Management
 */

let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let periodRecords = [];
let cycleMetrics = {};

document.addEventListener('DOMContentLoaded', async () => {
  const user = await checkAuthAndInitUI();
  if (!user) return;

  setupCalendarControls();
  setupEditModal();
  await loadTrackerData();
});

async function loadTrackerData() {
  try {
    const data = await apiFetch('/api/periods');
    periodRecords = data.records || [];
    cycleMetrics = data.metrics || {};

    renderCalendar(currentMonth, currentYear);
    renderCycleStats(cycleMetrics);
    renderRecordsTable(periodRecords);
  } catch (err) {
    showToast('Failed to load period data: ' + err.message, 'error');
  }
}

function setupCalendarControls() {
  document.getElementById('cal-prev-btn')?.addEventListener('click', () => {
    currentMonth--;
    if (currentMonth < 0) {
      currentMonth = 11;
      currentYear--;
    }
    renderCalendar(currentMonth, currentYear);
  });

  document.getElementById('cal-next-btn')?.addEventListener('click', () => {
    currentMonth++;
    if (currentMonth > 11) {
      currentMonth = 0;
      currentYear++;
    }
    renderCalendar(currentMonth, currentYear);
  });

  document.getElementById('cal-today-btn')?.addEventListener('click', () => {
    const now = new Date();
    currentMonth = now.getMonth();
    currentYear = now.getFullYear();
    renderCalendar(currentMonth, currentYear);
  });
}

function renderCalendar(month, year) {
  const titleEl = document.getElementById('cal-month-title');
  const container = document.getElementById('calendar-days-container');
  if (!container) return;

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  titleEl.textContent = `${monthNames[month]} ${year}`;

  container.innerHTML = '';

  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // Previous month trailing days
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const dayNum = prevMonthDays - i;
    const cell = document.createElement('div');
    cell.className = 'calendar-day-cell other-month';
    cell.textContent = dayNum;
    container.appendChild(cell);
  }

  // Current month active days
  for (let d = 1; d <= daysInCurrentMonth; d++) {
    const cell = document.createElement('div');
    cell.className = 'calendar-day-cell';
    cell.textContent = d;

    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const cellDate = new Date(year, month, d);

    if (dateStr === todayStr) {
      cell.classList.add('today');
    }

    // Check if within recorded periods
    let isPeriodDay = false;
    let flowType = '';
    for (const rec of periodRecords) {
      const s = new Date(rec.startDate);
      s.setHours(0, 0, 0, 0);
      const e = rec.endDate ? new Date(rec.endDate) : new Date(s);
      e.setHours(23, 59, 59, 999);

      if (cellDate >= s && cellDate <= e) {
        isPeriodDay = true;
        flowType = rec.flowIntensity;
        break;
      }
    }

    if (isPeriodDay) {
      if (flowType === 'spotting') {
        cell.classList.add('spotting-recorded');
      } else {
        cell.classList.add('period-recorded');
      }
    }

    // Check predicted upcoming period dates
    if (cycleMetrics && cycleMetrics.nextEstimatedPeriodStart) {
      const predStart = new Date(cycleMetrics.nextEstimatedPeriodStart);
      predStart.setHours(0, 0, 0, 0);
      const avgDuration = Math.round(cycleMetrics.averagePeriodDuration || 5);
      const predEnd = new Date(predStart);
      predEnd.setDate(predEnd.getDate() + (avgDuration - 1));
      predEnd.setHours(23, 59, 59, 999);

      if (cellDate >= predStart && cellDate <= predEnd && !isPeriodDay) {
        cell.classList.add('predicted-period');
      }
    }

    // Clicking date opens quick record modal with this date
    cell.addEventListener('click', () => {
      openRecordModal(dateStr);
    });

    container.appendChild(cell);
  }

  // Next month leading days to complete grid
  const totalCells = firstDayIndex + daysInCurrentMonth;
  const remainingCells = 42 - totalCells; // Standard 6-week calendar grid
  if (remainingCells < 7) {
    for (let j = 1; j <= remainingCells; j++) {
      const cell = document.createElement('div');
      cell.className = 'calendar-day-cell other-month';
      cell.textContent = j;
      container.appendChild(cell);
    }
  }
}

function renderCycleStats(metrics) {
  if (!metrics) return;

  const currentDayEl = document.getElementById('stat-current-day');
  const phaseEl = document.getElementById('stat-cycle-phase');
  const avgCycleEl = document.getElementById('stat-avg-cycle');
  const avgDurationEl = document.getElementById('stat-avg-duration');
  const regularityEl = document.getElementById('stat-regularity');
  const nextStartEl = document.getElementById('stat-next-start');
  const statusBadge = document.getElementById('stats-data-status');

  currentDayEl.textContent = metrics.currentCycleDay ? `Day ${metrics.currentCycleDay}` : 'Not started';
  phaseEl.textContent = metrics.cyclePhase || 'Unknown';
  avgCycleEl.textContent = `${metrics.averageCycleLength} Days ${metrics.isCycleLengthEstimated ? '(Est.)' : ''}`;
  avgDurationEl.textContent = `${metrics.averagePeriodDuration} Days ${metrics.isPeriodDurationEstimated ? '(Est.)' : ''}`;
  regularityEl.textContent = metrics.regularityText || 'Regular';

  if (metrics.nextEstimatedPeriodStart) {
    const nextDate = new Date(metrics.nextEstimatedPeriodStart);
    nextStartEl.textContent = nextDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } else {
    nextStartEl.textContent = 'Insufficient data';
  }

  if (metrics.recordCount > 0) {
    statusBadge.textContent = `${metrics.recordCount} Cycles Tracked`;
  }
}

function renderRecordsTable(records) {
  const tbody = document.getElementById('period-history-tbody');
  const countEl = document.getElementById('period-history-count');
  if (!tbody) return;

  countEl.textContent = `${records.length} Record${records.length === 1 ? '' : 's'}`;
  tbody.innerHTML = '';

  if (records.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="padding:32px; text-align:center; color:var(--text-muted);">
          No menstrual records found. Click <strong>+ Record Period</strong> above to log your first cycle.
        </td>
      </tr>
    `;
    return;
  }

  records.forEach(rec => {
    const sDate = new Date(rec.startDate);
    const sStr = sDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

    let eStr = 'Ongoing';
    let durationStr = 'Ongoing';
    if (rec.endDate) {
      const eDate = new Date(rec.endDate);
      eStr = eDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
      const days = Math.round((eDate - sDate) / (1000 * 60 * 60 * 24)) + 1;
      durationStr = `${days} Day${days === 1 ? '' : 's'}`;
    }

    const tr = document.createElement('tr');
    tr.style.borderBottom = '1px solid var(--border-color)';
    tr.innerHTML = `
      <td style="padding:14px; font-weight:700;">${sStr}</td>
      <td style="padding:14px;">${eStr}</td>
      <td style="padding:14px;">${durationStr}</td>
      <td style="padding:14px;"><span class="badge ${rec.flowIntensity === 'heavy' ? 'badge-urgent' : 'badge-lavender'}">${rec.flowIntensity}</span></td>
      <td style="padding:14px; color:var(--text-muted); max-width:200px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(rec.notes || '-')}</td>
      <td style="padding:14px; text-align:right;">
        <button class="btn btn-secondary btn-sm edit-period-action-btn" data-id="${rec._id}" style="margin-right:6px;">Edit</button>
        <button class="btn btn-danger btn-sm delete-period-action-btn" data-id="${rec._id}">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Attach Edit and Delete handlers
  document.querySelectorAll('.edit-period-action-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.getAttribute('data-id');
      const record = records.find(r => r._id === id);
      if (record) openRecordModal(null, record);
    });
  });

  document.querySelectorAll('.delete-period-action-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.getAttribute('data-id');
      const confirmed = await confirmAction({
        title: 'Delete Period Record',
        message: 'Are you sure you want to delete this recorded cycle entry? This will update your cycle analytics.',
        confirmText: 'Delete Record',
        isDanger: true
      });

      if (confirmed) {
        try {
          await apiFetch(`/api/periods/${id}`, { method: 'DELETE' });
          showToast('Period record deleted.', 'success');
          await loadTrackerData();
        } catch (err) {
          showToast(err.message, 'error');
        }
      }
    });
  });
}

function setupEditModal() {
  const modal = document.getElementById('period-edit-modal');
  const form = document.getElementById('period-edit-form');
  const openBtn = document.getElementById('open-record-period-btn');
  const closeBtn = document.getElementById('close-edit-modal');
  const cancelBtn = document.getElementById('cancel-edit-modal');

  openBtn?.addEventListener('click', () => openRecordModal());
  closeBtn?.addEventListener('click', () => modal.classList.remove('active'));
  cancelBtn?.addEventListener('click', () => modal.classList.remove('active'));

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-period-id').value;
    const startDate = document.getElementById('edit-start-date').value;
    const endDate = document.getElementById('edit-end-date').value || undefined;
    const flowIntensity = document.getElementById('edit-flow').value;
    const notes = document.getElementById('edit-notes').value;

    const saveBtn = document.getElementById('save-edit-btn');
    saveBtn.disabled = true;

    try {
      if (id) {
        // Edit existing
        await apiFetch(`/api/periods/${id}`, {
          method: 'PATCH',
          body: { startDate, endDate, flowIntensity, notes }
        });
        showToast('Period record updated successfully! 🌸', 'success');
      } else {
        // Create new
        await apiFetch('/api/periods', {
          method: 'POST',
          body: { startDate, endDate, flowIntensity, notes }
        });

        // Sync to Cloud Firestore
        if (window.HerHealthFirebaseService) {
          window.HerHealthFirebaseService.firestoreSavePeriod({ startDate, endDate, flowIntensity, notes });
        }

        showToast('New period recorded! 🌸', 'success');
      }

      modal.classList.remove('active');
      form.reset();
      await loadTrackerData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      saveBtn.disabled = false;
    }
  });
}

function openRecordModal(prefillDate = null, recordToEdit = null) {
  const modal = document.getElementById('period-edit-modal');
  const title = document.getElementById('period-modal-title');
  const idInput = document.getElementById('edit-period-id');
  const startInput = document.getElementById('edit-start-date');
  const endInput = document.getElementById('edit-end-date');
  const flowInput = document.getElementById('edit-flow');
  const notesInput = document.getElementById('edit-notes');

  if (recordToEdit) {
    title.textContent = 'Edit Menstrual Period Record';
    idInput.value = recordToEdit._id;
    startInput.value = new Date(recordToEdit.startDate).toISOString().split('T')[0];
    endInput.value = recordToEdit.endDate ? new Date(recordToEdit.endDate).toISOString().split('T')[0] : '';
    flowInput.value = recordToEdit.flowIntensity || 'medium';
    notesInput.value = recordToEdit.notes || '';
  } else {
    title.textContent = 'Record Menstrual Period';
    idInput.value = '';
    startInput.value = prefillDate || new Date().toISOString().split('T')[0];
    endInput.value = '';
    flowInput.value = 'medium';
    notesInput.value = '';
  }

  modal.classList.add('active');
}
