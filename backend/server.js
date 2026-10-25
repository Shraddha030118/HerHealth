/**
 * HerHealth AI — Server Entry Point (Firebase Edition)
 * No MongoDB connection needed — data is stored in Firebase Firestore.
 */
const app = require('./app');

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log('====================================================');
  console.log(`🌸 HerHealth AI Server is running on port ${PORT}`);
  console.log(`🌸 Local URL: http://localhost:${PORT}`);
  console.log(`🌸 Database: Firebase Firestore`);
  console.log(`🌸 AI Integration: ${process.env.AI_API_KEY ? 'Configured API' : 'Educational Demo Mode'}`);
  console.log('====================================================');
});

const shutdown = async () => {
  console.log('\n[HerHealth AI] Gracefully shutting down...');
  server.close(() => {
    console.log('[HerHealth AI] Server stopped.');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

process.on('uncaughtException', (err) => {
  console.error('[HerHealth Uncaught Exception]:', err.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('[HerHealth Unhandled Rejection]:', reason?.message || reason);
});
