const User = require('../models/User');

const requireAuth = async (req, res, next) => {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please log in to access this resource.'
      });
    }

    // Verify user still exists in database
    const user = await User.findById(req.session.userId);
    if (!user) {
      req.session.destroy();
      return res.status(401).json({
        success: false,
        error: 'User session invalid or user no longer exists.'
      });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Session authorization error.'
    });
  }
};

module.exports = {
  requireAuth
};
