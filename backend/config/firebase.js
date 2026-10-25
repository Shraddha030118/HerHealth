/**
 * HerHealth AI — Firebase Admin SDK Initialization
 * Replaces MongoDB/Mongoose with Cloud Firestore as the backend data store.
 * Auth uses Firebase ID Tokens instead of express-session.
 */
const admin = require('firebase-admin');

let initialized = false;

function initFirebaseAdmin() {
  if (initialized) return admin;

  // On Vercel, use environment variable for service account JSON
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id
    });
  } else {
    // Fallback: use application default credentials (works locally if `gcloud auth` is set)
    // OR initialize with just the project ID for emulator / dev use
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
  return admin.firestore();
}

function getAuth() {
  if (!initialized) initFirebaseAdmin();
  return admin.auth();
}

module.exports = { initFirebaseAdmin, getFirestore, getAuth };
