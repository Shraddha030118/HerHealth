/**
 * HerHealth AI — Vercel Serverless Entry Point (Firebase Edition)
 * Firebase Admin is initialized inside app.js - no async DB connection needed.
 */
const app = require('../backend/app');

module.exports = (req, res) => {
  return app(req, res);
};
