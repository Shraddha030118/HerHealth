/**
 * HerHealth AI — Auth Middleware
 * Verifies Firebase ID Tokens from the Authorization header or session fallback.
 * Replaces express-session based auth.
 */
const { getAuth, getFirestore } = require('../config/firebase');

const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const tokenFromHeader = authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null;
    // Also allow token passed as cookie for backwards compat with older frontend pages
    const token = tokenFromHeader || req.cookies?.firebaseToken;

    if (!token || token === 'null' || token === 'undefined') {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please log in to access this resource.'
      });
    }

    const decodedToken = await getAuth().verifyIdToken(token);
    const uid = decodedToken.uid;

    // Attach user info to request
    req.user = {
      _id: uid,
      uid,
      email: decodedToken.email,
      name: decodedToken.name || decodedToken.email
    };

    // Optionally enrich with Firestore profile data (cached via req.user)
    try {
      const db = getFirestore();
      const userDoc = await db.collection('users').doc(uid).get();
      if (userDoc.exists) {
        req.user = { ...req.user, ...userDoc.data(), _id: uid, uid };
      }
    } catch (e) {
      // Non-fatal: proceed with token data only
    }

    next();
  } catch (err) {
    console.warn('[requireAuth Error]:', err.message);
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired session. Please log in again.'
    });
  }
};

module.exports = { requireAuth };
