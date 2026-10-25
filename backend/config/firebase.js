/**
 * HerHealth AI — Firebase Admin SDK Initialization
 * Replaces MongoDB/Mongoose with Cloud Firestore as the backend data store.
 * Auth uses Firebase ID Tokens instead of express-session.
 */
const admin = require('firebase-admin');
const { getAuth: getAdminAuth } = require('firebase-admin/auth');
const { getFirestore: getAdminFirestore } = require('firebase-admin/firestore');

let initialized = false;

function initFirebaseAdmin() {
  if (initialized) return admin;

  // Check if already initialized on default app
  if (admin.apps && admin.apps.length > 0) {
    initialized = true;
    return admin;
  }

  // On Vercel, use environment variable for service account JSON
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id
      });
    } catch (e) {
      console.warn('[Firebase Admin] Error parsing FIREBASE_SERVICE_ACCOUNT, using project ID fallback:', e.message);
      admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID || 'herhealth-b2950'
      });
    }
  } else {
    // Fallback: use project ID
    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || 'herhealth-b2950'
    });
  }

  initialized = true;
  console.log('[Firebase Admin] Initialized for project:', process.env.FIREBASE_PROJECT_ID || 'herhealth-b2950');
  return admin;
}

function getFirestore() {
  if (!initialized) initFirebaseAdmin();
  return getAdminFirestore();
}

function getAuth() {
  if (!initialized) initFirebaseAdmin();
  return getAdminAuth();
}

module.exports = { initFirebaseAdmin, getFirestore, getAuth };
