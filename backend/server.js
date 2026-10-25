const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    console.log('[HerHealth AI] Connecting to MongoDB...');
    await connectDB();

    const server = app.listen(PORT, () => {
      console.log('====================================================');
      console.log(`🌸 HerHealth AI Server is running on port ${PORT}`);
      console.log(`🌸 Local URL: http://localhost:${PORT}`);
      console.log(`🌸 AI Integration: ${process.env.AI_API_KEY ? 'Configured API' : 'Honest Educational Demo Mode'}`);
      console.log('====================================================');
    });

    const shutdown = async () => {
      console.log('\n[HerHealth AI] Gracefully shutting down server...');
      server.close(() => {
        console.log('[HerHealth AI] Server stopped.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (err) {
    console.error('[HerHealth AI Fatal Startup Error]:', err.message);
    process.exit(1);
  }
}

startServer();
