/**
 * HerHealth AI — Notifications & Preferences Controller
 */

let allNotifications = [];

document.addEventListener('DOMContentLoaded', async () => {
  const user = await checkAuthAndInitUI();
  if (!user) return;

  setupNotificationControls();
  await loadNotifications();
});

async function loadNotifications() {
  try {
    const data = await apiFetch('/api/notifications');
    allNotifications = data.notifications || [];
    renderNotificationsList();
    populatePreferences(data.preferences);
  } catch (err) {
    showToast('Failed to load notifications: ' + err.message, 'error');
  }
}

function setupNotificationControls() {
  const markAllBtn = document.getElementById('notif-mark-all-read');
  const clearAllBtn = document.getElementById('notif-clear-all');
  const savePrefBtn = document.getElementById('save-preferences-btn');

  markAllBtn?.addEventListener('click', async () => {
    try {
      await apiFetch('/api/notifications/read-all', { method: 'PATCH' });
      allNotifications.forEach(n => n.readStatus = true);
      renderNotificationsList();
      loadNotificationCount();
      showToast('All notifications marked as read.', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  clearAllBtn?.addEventListener('click', async () => {
    const confirmed = await confirmAction({
      title: 'Clear Notifications',
      message: 'Are you sure you want to delete all notification records?',
      confirmText: 'Clear All',
      isDanger: true
    });

    if (confirmed) {
      try {
        await apiFetch('/api/notifications', { method: 'DELETE' });
        allNotifications = [];
        renderNotificationsList();
        loadNotificationCount();
        showToast('Notification history cleared.', 'success');
      } catch (err) {
        showToast(err.message, 'error');
      }
    }
  });

  savePrefBtn?.addEventListener('click', async () => {
    savePrefBtn.disabled = true;
    const preferences = {
      periodReminder: document.getElementById('pref-period-reminder').checked,
      symptomReminder: document.getElementById('pref-symptom-reminder').checked,
      wellnessReminder: document.getElementById('pref-wellness-reminder').checked,
      healthAlerts: document.getElementById('pref-health-alerts').checked
    };

    try {
      await apiFetch('/api/notifications/preferences', {
        method: 'PATCH',
        body: { preferences }
      });
      showToast('Reminder preferences updated! 🌸', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      savePrefBtn.disabled = false;
    }
  });
}

function populatePreferences(preferences = {}) {
  if (preferences.periodReminder !== undefined) {
    document.getElementById('pref-period-reminder').checked = preferences.periodReminder;
  }
  if (preferences.symptomReminder !== undefined) {
    document.getElementById('pref-symptom-reminder').checked = preferences.symptomReminder;
  }
  if (preferences.wellnessReminder !== undefined) {
    document.getElementById('pref-wellness-reminder').checked = preferences.wellnessReminder;
  }
  if (preferences.healthAlerts !== undefined) {
    document.getElementById('pref-health-alerts').checked = preferences.healthAlerts;
  }
}

function renderNotificationsList() {
  const container = document.getElementById('notifications-inbox-container');
  if (!container) return;

  container.innerHTML = '';

  if (allNotifications.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔔</div>
        <div class="empty-state-title">No Notifications</div>
        <div class="empty-state-desc">You are all caught up on period estimates and reminders.</div>
      </div>
    `;
    return;
  }

  allNotifications.forEach(n => {
    const card = document.createElement('div');
    card.className = `notif-card-item ${!n.readStatus ? 'unread' : ''}`;

    const dateStr = new Date(n.createdAt).toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    let icon = '🌸';
    if (n.type === 'period_estimate') icon = '🩸';
    else if (n.type === 'health_alert') icon = '⚠️';
    else if (n.type === 'wellness_reminder') icon = '🧘';

    card.innerHTML = `
      <div style="display:flex; align-items:flex-start; gap:14px; flex:1;">
        <span style="font-size:1.5rem;">${icon}</span>
        <div>
          <div style="display:flex; align-items:center; gap:8px;">
            <strong style="font-size:0.95rem;">${escapeHtml(n.title)}</strong>
            ${!n.readStatus ? '<span class="badge badge-lavender" style="font-size:0.68rem;">New</span>' : ''}
          </div>
          <p style="font-size:0.86rem; color:var(--text-muted); margin:4px 0;">${escapeHtml(n.message)}</p>
          <div style="font-size:0.75rem; color:var(--text-light);">${dateStr}</div>
        </div>
      </div>

      <div style="display:flex; align-items:center; gap:8px;">
        ${!n.readStatus ? `<button class="btn btn-secondary btn-sm notif-read-btn" data-id="${n._id}" style="font-size:0.75rem;">Mark Read</button>` : ''}
        ${n.link ? `<a href="${n.link}" class="btn btn-primary btn-sm" style="font-size:0.75rem;">View</a>` : ''}
        <button class="btn btn-secondary btn-sm notif-del-btn" data-id="${n._id}" style="padding:6px 10px; font-size:0.75rem;">🗑️</button>
      </div>
    `;

    container.appendChild(card);
  });

  // Attach event handlers
  document.querySelectorAll('.notif-read-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.getAttribute('data-id');
      try {
        await apiFetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
        const target = allNotifications.find(x => x._id === id);
        if (target) target.readStatus = true;
        renderNotificationsList();
        loadNotificationCount();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  });

  document.querySelectorAll('.notif-del-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.getAttribute('data-id');
      try {
        await apiFetch(`/api/notifications/${id}`, { method: 'DELETE' });
        allNotifications = allNotifications.filter(x => x._id !== id);
        renderNotificationsList();
        loadNotificationCount();
        showToast('Notification removed.', 'info');
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  });
}
