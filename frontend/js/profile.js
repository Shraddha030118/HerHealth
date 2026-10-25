/**
 * HerHealth AI — User Profile & Settings Controller
 */

document.addEventListener('DOMContentLoaded', async () => {
  const user = await checkAuthAndInitUI();
  if (!user) return;

  setupProfileForm();
  await loadProfile();
});

async function loadProfile() {
  try {
    const data = await apiFetch('/api/users/profile');
    const u = data.user;
    if (!u) return;

    document.getElementById('profile-name').value = u.name || '';
    document.getElementById('profile-email').value = u.email || '';
    document.getElementById('profile-age').value = u.age || '';
    document.getElementById('profile-cycle-len').value = u.averageCycleLength || 28;
    document.getElementById('profile-period-dur').value = u.averagePeriodDuration || 5;

    if (u.lastPeriodStartDate) {
      document.getElementById('profile-last-period').value = new Date(u.lastPeriodStartDate).toISOString().split('T')[0];
    }

    if (u.profileImage) {
      document.getElementById('profile-image-input').value = u.profileImage;
    }
  } catch (err) {
    showToast('Failed to load user profile: ' + err.message, 'error');
  }
}

function setupProfileForm() {
  const form = document.getElementById('profile-form');
  const deleteBtn = document.getElementById('delete-account-btn');
  const saveBtn = document.getElementById('save-profile-btn');

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    saveBtn.disabled = true;

    const name = document.getElementById('profile-name').value.trim();
    const age = document.getElementById('profile-age').value;
    const averageCycleLength = document.getElementById('profile-cycle-len').value;
    const averagePeriodDuration = document.getElementById('profile-period-dur').value;
    const lastPeriodStartDate = document.getElementById('profile-last-period').value;
    const profileImage = document.getElementById('profile-image-input').value.trim();

    try {
      const res = await apiFetch('/api/users/profile', {
        method: 'PATCH',
        body: {
          name,
          age: age ? Number(age) : undefined,
          averageCycleLength: Number(averageCycleLength),
          averagePeriodDuration: Number(averagePeriodDuration),
          lastPeriodStartDate: lastPeriodStartDate || null,
          profileImage
        }
      });

      showToast('Profile updated successfully! 🌸', 'success');
      renderUserElements(res.user);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      saveBtn.disabled = false;
    }
  });

  // Danger Zone: Account Deletion
  deleteBtn?.addEventListener('click', async () => {
    const confirmed = await confirmAction({
      title: 'Permanent Account & Data Purge',
      message: 'Are you absolutely sure you want to permanently delete your HerHealth AI account? All your recorded menstrual cycles, symptoms, health alerts, and personal summaries will be erased forever.',
      confirmText: 'Permanently Delete Account',
      isDanger: true
    });

    if (confirmed) {
      try {
        await apiFetch('/api/users/account', { method: 'DELETE' });
        showToast('Your account and records have been permanently deleted.', 'info');
        setTimeout(() => {
          window.location.href = '/';
        }, 800);
      } catch (err) {
        showToast(err.message, 'error');
      }
    }
  });
}
