/**
 * HerHealth AI — Firebase Service Layer
 * Authentication & Cloud Firestore Database Integration
 * Project: herhealth-b2950
 */

// Helper to wait until Firebase module is initialized
function waitForFirebase() {
  return new Promise((resolve) => {
    if (window.HerHealthFirebase) {
      return resolve(window.HerHealthFirebase);
    }
    window.addEventListener('herhealth-firebase-ready', (e) => {
      resolve(e.detail);
    }, { once: true });

    // Fallback polling up to 5 seconds
    let attempts = 0;
    const interval = setInterval(() => {
      if (window.HerHealthFirebase) {
        clearInterval(interval);
        resolve(window.HerHealthFirebase);
      } else if (++attempts > 50) {
        clearInterval(interval);
        console.error('Firebase initialization timeout.');
        resolve(null);
      }
    }, 100);
  });
}

// ==========================================
// 1. Firebase Authentication
// ==========================================

async function firebaseRegister({ email, password, name, age }) {
  const fb = await waitForFirebase();
  if (!fb) throw new Error('Firebase SDK not available.');

  // Create Firebase Auth user
  const userCredential = await fb.createUserWithEmailAndPassword(fb.auth, email, password);
  const user = userCredential.user;

  // Set display name in Firebase Auth
  if (name) {
    try {
      await fb.updateProfile(user, { displayName: name });
    } catch (e) {
      console.warn('Could not update Firebase display name:', e);
    }
  }

  // Persist User Profile document in Cloud Firestore
  try {
    const userDocRef = fb.doc(fb.db, 'users', user.uid);
    await fb.setDoc(userDocRef, {
      uid: user.uid,
      name: name || user.displayName || 'User',
      email: user.email,
      age: age ? Number(age) : null,
      averageCycleLength: 28,
      averagePeriodDuration: 5,
      notificationPreferences: {
        periodReminder: true,
        symptomReminder: true,
        wellnessReminder: true,
        healthAlerts: true
      },
      createdAt: fb.serverTimestamp(),
      updatedAt: fb.serverTimestamp()
    });
    console.log('[Firestore] User document created in collection "users":', user.uid);
  } catch (err) {
    console.warn('[Firestore] Could not save user profile doc (check security rules):', err.message);
  }

  // Also sync with backend session so PDF generation & AI endpoints work simultaneously
  try {
    await apiFetch('/api/auth/register', {
      method: 'POST',
      body: { name, email, password, age, privacyConsent: true }
    });
  } catch (e) {
    // If backend already has account or session established, continue
  }

  return user;
}

async function firebaseLogin(email, password) {
  const fb = await waitForFirebase();
  if (!fb) throw new Error('Firebase SDK not available.');

  const userCredential = await fb.signInWithEmailAndPassword(fb.auth, email, password);
  const user = userCredential.user;

  // Ensure Firestore user document exists
  try {
    const userDocRef = fb.doc(fb.db, 'users', user.uid);
    const snap = await fb.getDoc(userDocRef);
    if (!snap.exists()) {
      await fb.setDoc(userDocRef, {
        uid: user.uid,
        name: user.displayName || 'User',
        email: user.email,
        createdAt: fb.serverTimestamp()
      }, { merge: true });
    }
  } catch (e) {
    console.warn('[Firestore] Profile check notice:', e.message);
  }

  // Sync backend session
  try {
    await apiFetch('/api/auth/login', {
      method: 'POST',
      body: { email, password }
    });
  } catch (e) {
    // Fallback: create backend session if newly registered in Firebase
    try {
      await apiFetch('/api/auth/register', {
        method: 'POST',
        body: { name: user.displayName || 'User', email, password, privacyConsent: true }
      });
    } catch (regErr) {}
  }

  return user;
}

async function firebaseGoogleSignIn() {
  const fb = await waitForFirebase();
  if (!fb) throw new Error('Firebase SDK not available.');

  const provider = new fb.GoogleAuthProvider();
  const result = await fb.signInWithPopup(fb.auth, provider);
  const user = result.user;

  // Persist in Firestore
  try {
    const userDocRef = fb.doc(fb.db, 'users', user.uid);
    await fb.setDoc(userDocRef, {
      uid: user.uid,
      name: user.displayName || 'Google User',
      email: user.email,
      profileImage: user.photoURL || '',
      updatedAt: fb.serverTimestamp()
    }, { merge: true });
  } catch (e) {
    console.warn('[Firestore] Google user doc warning:', e.message);
  }

  // Establish backend session
  try {
    await apiFetch('/api/auth/login', {
      method: 'POST',
      body: { email: user.email, password: 'GoogleOAuthUser2026!' }
    });
  } catch (e) {
    try {
      await apiFetch('/api/auth/register', {
        method: 'POST',
        body: {
          name: user.displayName || 'Google User',
          email: user.email,
          password: 'GoogleOAuthUser2026!',
          privacyConsent: true
        }
      });
    } catch (err) {}
  }

  return user;
}

async function firebaseLogout() {
  const fb = await waitForFirebase();
  if (fb && fb.auth) {
    try {
      await fb.signOut(fb.auth);
    } catch (e) {
      console.warn('Firebase signout:', e);
    }
  }
}

// ==========================================
// 2. Cloud Firestore Database Handlers
// ==========================================

// Save a Menstrual Period Record to Firestore
async function firestoreSavePeriod(periodData) {
  const fb = await waitForFirebase();
  if (!fb || !fb.auth.currentUser) return null;

  try {
    const colRef = fb.collection(fb.db, 'periods');
    const docRef = await fb.addDoc(colRef, {
      userId: fb.auth.currentUser.uid,
      startDate: periodData.startDate,
      endDate: periodData.endDate || null,
      flowIntensity: periodData.flowIntensity || 'medium',
      notes: periodData.notes || '',
      createdAt: fb.serverTimestamp()
    });
    console.log('[Firestore] Period record saved in collection "periods":', docRef.id);
    return docRef.id;
  } catch (err) {
    console.warn('[Firestore] Period save error (check Firestore rules):', err.message);
    return null;
  }
}

// Save Daily Symptoms Log to Firestore
async function firestoreSaveSymptom(symptomData) {
  const fb = await waitForFirebase();
  if (!fb || !fb.auth.currentUser) return null;

  try {
    const colRef = fb.collection(fb.db, 'symptoms');
    const docRef = await fb.addDoc(colRef, {
      userId: fb.auth.currentUser.uid,
      date: symptomData.date,
      symptoms: symptomData.symptoms || [],
      painLevel: Number(symptomData.painLevel) || 0,
      mood: symptomData.mood || 'neutral',
      flowInformation: symptomData.flowInformation || 'none',
      notes: symptomData.notes || '',
      createdAt: fb.serverTimestamp()
    });
    console.log('[Firestore] Symptom log saved in collection "symptoms":', docRef.id);
    return docRef.id;
  } catch (err) {
    console.warn('[Firestore] Symptom save error:', err.message);
    return null;
  }
}

// Save Daily Hydration Record to Firestore
async function firestoreSaveHydration(amountMl, glasses) {
  const fb = await waitForFirebase();
  if (!fb || !fb.auth.currentUser) return null;

  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const docId = `${fb.auth.currentUser.uid}_${todayStr}`;
    const docRef = fb.doc(fb.db, 'hydration', docId);

    await fb.setDoc(docRef, {
      userId: fb.auth.currentUser.uid,
      dateString: todayStr,
      amountMl: Number(amountMl),
      glasses: Number(glasses),
      goalMl: 2000,
      updatedAt: fb.serverTimestamp()
    }, { merge: true });

    console.log('[Firestore] Hydration saved to "hydration":', docId);
  } catch (err) {
    console.warn('[Firestore] Hydration save error:', err.message);
  }
}

// Save Completed Wellness Activity to Firestore
async function firestoreSaveWellness(activity) {
  const fb = await waitForFirebase();
  if (!fb || !fb.auth.currentUser) return null;

  try {
    const colRef = fb.collection(fb.db, 'wellness');
    const docRef = await fb.addDoc(colRef, {
      userId: fb.auth.currentUser.uid,
      activityType: activity.activityType,
      activityName: activity.activityName,
      duration: activity.duration,
      notes: activity.notes || '',
      completedAt: fb.serverTimestamp()
    });
    console.log('[Firestore] Wellness activity saved in "wellness":', docRef.id);
  } catch (err) {
    console.warn('[Firestore] Wellness save error:', err.message);
  }
}

// Save Health Assessment Questionnaire to Firestore
async function firestoreSaveAssessment(answers, status) {
  const fb = await waitForFirebase();
  if (!fb || !fb.auth.currentUser) return null;

  try {
    const docRef = fb.doc(fb.db, 'assessments', fb.auth.currentUser.uid);
    await fb.setDoc(docRef, {
      userId: fb.auth.currentUser.uid,
      answers: answers || {},
      completionStatus: status || 'in_progress',
      updatedAt: fb.serverTimestamp()
    }, { merge: true });
    console.log('[Firestore] Questionnaire saved in "assessments":', fb.auth.currentUser.uid);
  } catch (err) {
    console.warn('[Firestore] Assessment save error:', err.message);
  }
}

window.HerHealthFirebaseService = {
  waitForFirebase,
  firebaseRegister,
  firebaseLogin,
  firebaseGoogleSignIn,
  firebaseLogout,
  firestoreSavePeriod,
  firestoreSaveSymptom,
  firestoreSaveHydration,
  firestoreSaveWellness,
  firestoreSaveAssessment
};
