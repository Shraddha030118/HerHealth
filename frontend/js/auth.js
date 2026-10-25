/**
 * HerHealth AI — Authentication Controller (Frontend)
 * Powered by Firebase Auth (Project: herhealth-b2950)
 */

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const errorBanner = document.getElementById('auth-error-banner');
  const quickDemoBtn = document.getElementById('quick-demo-account-btn');
  const googleLoginBtn = document.getElementById('google-login-btn');
  const googleRegisterBtn = document.getElementById('google-register-btn');

  function showError(msg) {
    if (errorBanner) {
      errorBanner.textContent = msg;
      errorBanner.style.display = 'block';
    } else {
      showToast(msg, 'error');
    }
  }

  function hideError() {
    if (errorBanner) errorBanner.style.display = 'none';
  }

  function mapFirebaseError(err) {
    const code = err.code || '';
    if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
      return 'Invalid email or password.';
    }
    if (code === 'auth/email-already-in-use') {
      return 'An account with this email address is already registered.';
    }
    if (code === 'auth/weak-password') {
      return 'Password should be at least 6 characters.';
    }
    if (code === 'auth/popup-closed-by-user') {
      return 'Google sign-in popup was cancelled.';
    }
    if (code === 'auth/operation-not-allowed') {
      return 'Please ensure Email/Password or Google sign-in is enabled in your Firebase Console under Authentication > Sign-in method.';
    }
    return err.message || 'Authentication failed. Please verify your details.';
  }

  // Handle Login via Firebase
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideError();

      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      const submitBtn = document.getElementById('login-submit-btn');
      const btnText = document.getElementById('login-btn-text');
      const spinner = document.getElementById('login-spinner');

      submitBtn.disabled = true;
      btnText.style.display = 'none';
      spinner.style.display = 'inline-block';

      try {
        if (window.HerHealthFirebaseService) {
          // 1. Firebase Authentication
          const fbUser = await window.HerHealthFirebaseService.firebaseLogin(email, password);
          showToast(`Welcome back, ${fbUser.displayName || 'Friend'}! 🌸 (Firebase Auth)`, 'success');
        } else {
          // Fallback backend login
          const data = await apiFetch('/api/auth/login', {
            method: 'POST',
            body: { email, password }
          });
          showToast(`Welcome back, ${data.user.name}! 🌸`, 'success');
        }

        const redirect = sessionStorage.getItem('redirect_after_login') || '/pages/dashboard.html';
        sessionStorage.removeItem('redirect_after_login');

        setTimeout(() => {
          window.location.href = redirect;
        }, 500);
      } catch (err) {
        showError(mapFirebaseError(err));
        submitBtn.disabled = false;
        btnText.style.display = 'inline-block';
        spinner.style.display = 'none';
      }
    });

    // Handle Google Sign-in on Login page
    if (googleLoginBtn) {
      googleLoginBtn.addEventListener('click', async () => {
        hideError();
        try {
          if (window.HerHealthFirebaseService) {
            const user = await window.HerHealthFirebaseService.firebaseGoogleSignIn();
            showToast(`Signed in with Google as ${user.displayName || user.email}! 🌸`, 'success');
            setTimeout(() => { window.location.href = '/pages/dashboard.html'; }, 500);
          } else {
            showToast('Firebase not ready yet, please retry in a moment.', 'info');
          }
        } catch (err) {
          showError(mapFirebaseError(err));
        }
      });
    }

    // Quick Demo Account feature
    if (quickDemoBtn) {
      quickDemoBtn.addEventListener('click', async () => {
        document.getElementById('login-email').value = 'demo@herhealth.ai';
        document.getElementById('login-password').value = 'HerHealthDemo2026!';

        hideError();
        try {
          if (window.HerHealthFirebaseService) {
            try {
              await window.HerHealthFirebaseService.firebaseLogin('demo@herhealth.ai', 'HerHealthDemo2026!');
            } catch (fbLoginErr) {
              await window.HerHealthFirebaseService.firebaseRegister({
                email: 'demo@herhealth.ai',
                password: 'HerHealthDemo2026!',
                name: 'Sofia Rose',
                age: 26
              });
            }
          }

          // Ensure backend demo session
          try {
            await apiFetch('/api/auth/login', {
              method: 'POST',
              body: { email: 'demo@herhealth.ai', password: 'HerHealthDemo2026!' }
            });
          } catch (e) {
            await apiFetch('/api/auth/register', {
              method: 'POST',
              body: { name: 'Sofia Rose', email: 'demo@herhealth.ai', password: 'HerHealthDemo2026!', age: 26, privacyConsent: true }
            });
          }

          showToast('Signed in with Demo Account! 🌸', 'success');
          setTimeout(() => { window.location.href = '/pages/dashboard.html'; }, 400);
        } catch (err) {
          showError('Demo sign in error: ' + err.message);
        }
      });
    }
  }

  // Handle Registration via Firebase
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideError();

      const name = document.getElementById('reg-name').value.trim();
      const email = document.getElementById('reg-email').value.trim();
      const password = document.getElementById('reg-password').value;
      const age = document.getElementById('reg-age').value;
      const consent = document.getElementById('reg-consent').checked;

      const submitBtn = document.getElementById('register-submit-btn');
      const btnText = document.getElementById('register-btn-text');
      const spinner = document.getElementById('register-spinner');

      if (!consent) {
        showError('You must check the consent box to proceed.');
        return;
      }

      submitBtn.disabled = true;
      btnText.style.display = 'none';
      spinner.style.display = 'inline-block';

      try {
        if (window.HerHealthFirebaseService) {
          // Register in Firebase Auth & Firestore
          await window.HerHealthFirebaseService.firebaseRegister({
            email,
            password,
            name,
            age: age ? Number(age) : undefined
          });
          showToast('Account created in Firebase! Welcome to HerHealth AI 🌸', 'success');
        } else {
          await apiFetch('/api/auth/register', {
            method: 'POST',
            body: { name, email, password, age: age ? Number(age) : undefined, privacyConsent: true }
          });
          showToast('Registration successful! Welcome to HerHealth AI 🌸', 'success');
        }

        setTimeout(() => {
          window.location.href = '/pages/dashboard.html';
        }, 500);
      } catch (err) {
        showError(mapFirebaseError(err));
        submitBtn.disabled = false;
        btnText.style.display = 'inline-block';
        spinner.style.display = 'none';
      }
    });

    // Handle Google Sign-in on Register page
    if (googleRegisterBtn) {
      googleRegisterBtn.addEventListener('click', async () => {
        hideError();
        try {
          if (window.HerHealthFirebaseService) {
            const user = await window.HerHealthFirebaseService.firebaseGoogleSignIn();
            showToast(`Welcome, ${user.displayName || user.email}! 🌸`, 'success');
            setTimeout(() => { window.location.href = '/pages/dashboard.html'; }, 500);
          } else {
            showToast('Firebase not ready yet, please retry in a moment.', 'info');
          }
        } catch (err) {
          showError(mapFirebaseError(err));
        }
      });
    }
  }
});
