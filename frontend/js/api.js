/**
 * HerHealth AI — Centralized API Client & Frontend Utilities
 * Uses Firebase ID Tokens (Bearer auth) instead of session cookies.
 */

const API_BASE = ''; // Relative path — works on same origin (Vercel)

// Get the current Firebase user's ID token for API authorization
async function getFirebaseToken() {
  try {
    const fb = window.HerHealthFirebase;
    if (!fb || !fb.auth || !fb.auth.currentUser) return null;
    return await fb.auth.currentUser.getIdToken(/* forceRefresh */ false);
  } catch (e) {
    console.warn('[API] Could not get Firebase token:', e.message);
    return null;
  }
}

// Generic Fetch wrapper with Firebase token auth and error handling
async function apiFetch(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;

  // Attach Firebase ID token to Authorization header
  const token = await getFirebaseToken();
  const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};

  const config = {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...(options.headers || {})
    },
    ...options
  };

  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    config.body = JSON.stringify(options.body);
  }

  try {
    const res = await fetch(url, config);
    const contentType = res.headers.get('content-type');

    if (contentType && contentType.includes('application/pdf')) {
      if (!res.ok) throw new Error('PDF generation failed');
      return await res.blob();
    }

    let data;
    if (contentType && contentType.includes('application/json')) {
      data = await res.json();
    } else {
      const text = await res.text();
      data = { message: text };
    }

    if (!res.ok) {
      if (res.status === 401) {
        const currentPath = window.location.pathname;
        const publicPages = ['/', '/index.html', '/pages/login.html', '/pages/register.html'];
        const isPublic = publicPages.some(p => currentPath.endsWith(p));

        if (!isPublic) {
          sessionStorage.setItem('redirect_after_login', window.location.pathname);
          showToast('Session expired. Please log in again.', 'error');
          setTimeout(() => {
            window.location.href = '/pages/login.html';
          }, 800);
          throw new Error('Authentication required');
        }
      }
      throw new Error(data.error || data.message || `Request failed with status ${res.status}`);
    }

    return data;
  } catch (err) {
    console.error(`[API Error] ${endpoint}:`, err.message);
    throw err;
  }
}

// Toast notification helper
function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const icon = type === 'success' ? '✓' : type === 'error' ? '⚠️' : 'ℹ️';
  toast.innerHTML = `<span style="font-size:1.15rem;">${icon}</span><span>${escapeHtml(message)}</span>`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px) scale(0.95)';
    setTimeout(() => toast.remove(), 250);
  }, 4000);
}

// Global Confirmation Modal
function confirmAction({ title = 'Confirm Action', message = 'Are you sure?', confirmText = 'Confirm', isDanger = false }) {
  return new Promise((resolve) => {
    let backdrop = document.getElementById('global-confirm-modal');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'global-confirm-modal';
      backdrop.className = 'modal-backdrop';
      backdrop.innerHTML = `
        <div class="modal-dialog">
          <div class="modal-header">
            <h3 class="modal-title" id="confirm-modal-title">Confirm Action</h3>
            <button class="modal-close-btn" id="confirm-modal-close">&times;</button>
          </div>
          <div class="modal-body">
            <p id="confirm-modal-msg" style="color:var(--text-muted);"></p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" id="confirm-modal-cancel">Cancel</button>
            <button class="btn btn-primary" id="confirm-modal-submit">Confirm</button>
          </div>
        </div>
      `;
      document.body.appendChild(backdrop);
    }

    const titleEl = document.getElementById('confirm-modal-title');
    const msgEl = document.getElementById('confirm-modal-msg');
    const submitBtn = document.getElementById('confirm-modal-submit');
    const cancelBtn = document.getElementById('confirm-modal-cancel');
    const closeBtn = document.getElementById('confirm-modal-close');

    titleEl.textContent = title;
    msgEl.textContent = message;
    submitBtn.textContent = confirmText;
    submitBtn.className = isDanger ? 'btn btn-danger' : 'btn btn-primary';

    backdrop.classList.add('active');

    const cleanUp = (result) => {
      backdrop.classList.remove('active');
      submitBtn.onclick = null;
      cancelBtn.onclick = null;
      closeBtn.onclick = null;
      resolve(result);
    };

    submitBtn.onclick = () => cleanUp(true);
    cancelBtn.onclick = () => cleanUp(false);
    closeBtn.onclick = () => cleanUp(false);
  });
}

// Check current user session and setup header/sidebar
async function checkAuthAndInitUI() {
  try {
    const data = await apiFetch('/api/auth/me');
    if (data.success && data.user) {
      renderUserElements(data.user);
      loadNotificationCount();
      return data.user;
    }
  } catch (err) {
    const currentPath = window.location.pathname;
    const publicPages = ['/', '/index.html', '/pages/login.html', '/pages/register.html'];
    const isPublic = publicPages.some(p => currentPath.endsWith(p));
    if (!isPublic) {
      window.location.href = '/pages/login.html';
    }
    return null;
  }
}

function renderUserElements(user) {
  // Update user name in sidebar & topbar
  document.querySelectorAll('.user-name-display').forEach(el => {
    el.textContent = user.name;
  });

  document.querySelectorAll('.user-avatar-display').forEach(el => {
    if (user.profileImage) {
      el.innerHTML = `<img src="${user.profileImage}" alt="${user.name}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
    } else {
      const initials = user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
      el.textContent = initials || 'H';
    }
  });
}

// Fetch unread notification counts
async function loadNotificationCount() {
  try {
    const data = await apiFetch('/api/notifications');
    if (data.success && data.unreadCount > 0) {
      document.querySelectorAll('.notification-badge-count').forEach(badge => {
        badge.textContent = data.unreadCount;
        badge.style.display = 'inline-flex';
      });
    } else {
      document.querySelectorAll('.notification-badge-count').forEach(badge => {
        badge.style.display = 'none';
      });
    }
  } catch (e) {
    // silently catch badge error
  }
}

// Logout user
async function logoutUser() {
  const confirmed = await confirmAction({
    title: 'Sign Out',
    message: 'Are you sure you want to sign out of HerHealth AI?',
    confirmText: 'Sign Out'
  });

  if (!confirmed) return;

  try {
    if (window.HerHealthFirebaseService) {
      await window.HerHealthFirebaseService.firebaseLogout();
    }
    await apiFetch('/api/auth/logout', { method: 'POST' });
    showToast('Signed out successfully.', 'success');
    setTimeout(() => {
      window.location.href = '/pages/login.html';
    }, 400);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Mobile sidebar toggle setup
function setupMobileMenu() {
  const toggleBtn = document.querySelector('.menu-toggle-btn');
  const sidebar = document.querySelector('.app-sidebar');

  if (toggleBtn && sidebar) {
    let overlay = document.querySelector('.sidebar-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'sidebar-overlay';
      document.body.appendChild(overlay);
    }

    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('active');
    });

    overlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('active');
    });
  }

  // Highlight active sidebar navigation link
  const currentPath = window.location.pathname;
  document.querySelectorAll('.nav-link').forEach(link => {
    const href = link.getAttribute('href');
    if (href && currentPath.includes(href)) {
      link.classList.add('active');
    }
  });
}

// Utility: safe HTML escaping
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

document.addEventListener('DOMContentLoaded', () => {
  setupMobileMenu();
});
