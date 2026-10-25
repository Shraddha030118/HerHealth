const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Notification = require('../models/Notification');

exports.register = async (req, res, next) => {
  try {
    const { name, email, password, age, privacyConsent } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Name, email, and password are required.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long.'
      });
    }

    if (!privacyConsent) {
      return res.status(400).json({
        success: false,
        error: 'You must consent to the privacy notice to create an account.'
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'An account with this email address is already registered.'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      age: age ? Number(age) : undefined,
      privacyConsent: true
    });

    // Establish session
    req.session.userId = newUser._id;

    // Create a welcoming in-app notification
    await Notification.create({
      userId: newUser._id,
      type: 'system',
      title: 'Welcome to HerHealth AI! 🌸',
      message: 'Your personal menstrual health companion is ready. Start by logging your last period or exploring wellness activities.',
      severity: 'info'
    });

    return res.status(201).json({
      success: true,
      message: 'Registration successful.',
      user: newUser.toSafeObject()
    });
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide both email and password.'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.'
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password.'
      });
    }

    req.session.userId = user._id;

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      user: user.toSafeObject()
    });
  } catch (err) {
    next(err);
  }
};

exports.logout = (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({
        success: false,
        error: 'Could not log out at this moment.'
      });
    }
    res.clearCookie('connect.sid');
    return res.status(200).json({
      success: true,
      message: 'Logged out successfully.'
    });
  });
};

exports.getMe = async (req, res, next) => {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated.'
      });
    }

    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found.'
      });
    }

    return res.status(200).json({
      success: true,
      user: user.toSafeObject()
    });
  } catch (err) {
    next(err);
  }
};
