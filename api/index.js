/**
 * HerHealth AI — Vercel Serverless Entry Point
 * Wraps the Express app for Vercel's serverless function runtime.
 */
const app = require('../backend/app');
const connectDB = require('../backend/config/db');

let isConnected = false;

module.exports = async (req, res) => {
  if (!isConnected) {
    await connectDB();
    isConnected = true;
  }
  return app(req, res);
};
