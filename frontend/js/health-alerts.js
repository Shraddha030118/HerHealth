/**
 * HerHealth AI — Health Alerts Frontend Controller
 */

let allAlerts = [];
let currentFilter = 'all';

document.addEventListener('DOMContentLoaded', async () => {
  const user = await checkAuthAndInitUI();
  if (!user) return;

  setupAlertControls();
  await loadAlerts();
});

async function loadAlerts() {
  try {
    const data = await apiFetch('/api/alerts');
    allAlerts = data.alerts || [];
    renderAlertsList();
  } catch (err) {
    showToast('Failed to load health alerts: ' + err.message, 'error');
  }
}

function setupAlertControls() {
  const reEvaluateBtn = document.getElementById('re-evaluate-btn');
  const markAllBtn = document.getElementById('mark-all-read-btn');
  const filterAllBtn = document.getElementById('filter-all-btn');
  const filterUnreadBtn = document.getElementById('filter-unread-btn');

  reEvaluateBtn?.addEventListener('click', async () => {
    reEvaluateBtn.disabled = true;
    try {
      const res = await apiFetch('/api/alerts/evaluate', { method: 'POST' });
      allAlerts = res.alerts || [];
      showToast(`Evaluation completed. ${res.newAlertsCount} new alerts detected.`, 'info');
      renderAlertsList();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      reEvaluateBtn.disabled = false;
    }
  });

  markAllBtn?.addEventListener('click', async () => {
    try {
      await apiFetch('/api/alerts/read-all', { method: 'PATCH' });
      allAlerts.forEach(a => a.readStatus = true);
      renderAlertsList();
      showToast('All alerts marked as read.', 'success');
      loadNotificationCount();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  filterAllBtn?.addEventListener('click', () => {
    currentFilter = 'all';
    filterAllBtn.classList.add('active');
    filterUnreadBtn.classList.remove('active');
    renderAlertsList();
  });

  filterUnreadBtn?.addEventListener('click', () => {
    currentFilter = 'unread';
    filterUnreadBtn.classList.add('active');
    filterAllBtn.classList.remove('active');
    renderAlertsList();
  });
}

function renderAlertsList() {
  const container = document.getElementById('alerts-list-container');
  const heading = document.getElementById('alerts-count-heading');
  const sidebarBadge = document.getElementById('sidebar-alert-badge');
  if (!container) return;

  const filtered = currentFilter === 'unread'
    ? allAlerts.filter(a => !a.readStatus)
    : allAlerts;

  const unreadCount = allAlerts.filter(a => !a.readStatus).length;
  heading.textContent = `Recorded Alerts (${unreadCount} unread / ${allAlerts.length} total)`;

  if (sidebarBadge) {
    if (unreadCount > 0) {
      sidebarBadge.textContent = unreadCount;
      sidebarBadge.style.display = 'inline-flex';
    } else {
      sidebarBadge.style.display = 'none';
    }
  }

  container.innerHTML = '';

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">✨</div>
        <div class="empty-state-title">${currentFilter === 'unread' ? 'No Unread Alerts' : 'No Health Alerts Recorded'}</div>
        <div class="empty-state-desc">Your recorded periods and symptoms do not currently flag any red-flag medical concerns.</div>
      </div>
    `;
    return;
  }

  filtered.forEach(al => {
    const card = document.createElement('div');
    card.className = `alert-card-item ${al.severity} ${al.readStatus ? 'is-read' : ''}`;

    const dateStr = new Date(al.createdAt).toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const isUrgent = al.severity === 'urgent';

    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
        <div style="display:flex; align-items:center; gap:10px;">
          <span style="font-size:1.4rem;">${isUrgent ? '🚨' : al.severity === 'high' ? '⚠️' : 'ℹ️'}</span>
          <div>
            <h3 style="font-size:1.15rem; color:${isUrgent ? 'var(--status-urgent)' : 'var(--text-main)'};">
              ${escapeHtml(al.title)}
            </h3>
            <div style="font-size:0.75rem; color:var(--text-light);">${dateStr}</div>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <span class="badge ${al.severity === 'urgent' ? 'badge-urgent' : al.severity === 'high' ? 'badge-high' : 'badge-low'}">
            ${al.severity} Severity
          </span>
          ${!al.readStatus ? `<button class="btn btn-secondary btn-sm mark-read-btn" data-id="${al._id}" style="font-size:0.75rem;">Mark Read</button>` : '<span style="font-size:0.8rem; color:var(--text-light);">✓ Read</span>'}
        </div>
      </div>

      <p style="font-size:0.92rem; line-height:1.6; color:var(--text-main); margin-bottom:8px;">
        ${escapeHtml(al.explanation)}
      </p>

      <div class="alert-step-box">
        <div style="font-weight:700; font-size:0.85rem; color:var(--primary-700); margin-bottom:4px;">
          🩺 Recommended Clinical Action:
        </div>
        <div style="font-size:0.88rem; color:var(--text-main); line-height:1.5;">
          ${escapeHtml(al.recommendedAction)}
        </div>
      </div>

      ${al.symptomsFlagged && al.symptomsFlagged.length > 0 ? `
        <div style="margin-top:12px; font-size:0.78rem; color:var(--text-muted);">
          Triggered by parameters: <strong>${al.symptomsFlagged.join(', ')}</strong>
        </div>
      ` : ''}
    `;

    container.appendChild(card);
  });

  // Attach mark read event listeners
  document.querySelectorAll('.mark-read-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.getAttribute('data-id');
      try {
        await apiFetch(`/api/alerts/${id}/read`, { method: 'PATCH' });
        const target = allAlerts.find(a => a._id === id);
        if (target) target.readStatus = true;
        renderAlertsList();
        loadNotificationCount();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  });
}
