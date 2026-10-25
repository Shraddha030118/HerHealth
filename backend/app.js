/**
 * HerHealth AI — Express App (Firebase Edition)
 * Replaced MongoDB/express-session with Firebase Admin + ID Token auth.
 */
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');

dotenv.config();

// Initialize Firebase Admin on startup
const { initFirebaseAdmin } = require('./config/firebase');
initFirebaseAdmin();

const errorHandler = require('./middleware/errorHandler');

// Routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const periodRoutes = require('./routes/periodRoutes');
const symptomRoutes = require('./routes/symptomRoutes');
const aiRoutes = require('./routes/aiRoutes');
const healthAlertRoutes = require('./routes/healthAlertRoutes');
const wellnessRoutes = require('./routes/wellnessRoutes');
const nutritionRoutes = require('./routes/nutritionRoutes');
const assessmentRoutes = require('./routes/assessmentRoutes');
const reportRoutes = require('./routes/reportRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com", "https://www.gstatic.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com", "data:"],
        imgSrc: ["'self'", "data:", "blob:", "https:"],
        connectSrc: ["'self'", "https:", "http:", "https://*.googleapis.com", "https://*.firebaseio.com", "https://identitytoolkit.googleapis.com", "https://firestore.googleapis.com", "https://securetoken.googleapis.com"],
        mediaSrc: ["'self'", "blob:", "data:"],
        objectSrc: ["'none'"]
      }
    },
    crossOriginEmbedderPolicy: false
  })
);

// CORS
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5000',
  'http://127.0.0.1:5000',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:3000'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => callback(null, !origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')),
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/periods', periodRoutes);
app.use('/api/symptoms', symptomRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/alerts', healthAlertRoutes);
app.use('/api/wellness', wellnessRoutes);
app.use('/api/nutrition', nutritionRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/questionnaires', assessmentRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    appName: 'HerHealth AI',
    timestamp: new Date().toISOString(),
    database: 'Firebase Firestore',
    aiProvider: process.env.AI_API_KEY ? 'active-external-llm' : 'educational-demo-mode'
  });
});

// Serve frontend static assets
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

app.get('/', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Centralized error handler
app.use(errorHandler);

module.exports = app;
