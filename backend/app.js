const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const dotenv = require('dotenv');

dotenv.config();

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

// Security headers with permissive CSP for Chart.js and Google Fonts
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com", "https://www.gstatic.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com", "data:"],
        imgSrc: ["'self'", "data:", "blob:", "https:"],
        connectSrc: ["'self'", "https:", "http:", "https://*.googleapis.com", "https://*.firebaseio.com", "https://identitytoolkit.googleapis.com", "https://firestore.googleapis.com"],
        mediaSrc: ["'self'", "blob:", "data:"],
        objectSrc: ["'none'"]
      }
    },
    crossOriginEmbedderPolicy: false
  })
);

// CORS configuration for local development and split servers
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5000',
  'http://127.0.0.1:5000',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:3000'
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true); // Permissive in dev mode to prevent frontend CORS blocking
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  })
);

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session configuration
const sessionSecret = process.env.SESSION_SECRET || 'herhealth_session_secret_dev_key';
const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/herhealth_db';

const sessionConfig = {
  name: 'herhealth.sid',
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: mongoUri,
    collectionName: 'sessions',
    ttl: 14 * 24 * 60 * 60 // 14 days
  }),
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 14 * 24 * 60 * 60 * 1000 // 14 days
  }
};

app.use(session(sessionConfig));

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
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    appName: 'HerHealth AI',
    timestamp: new Date().toISOString(),
    aiProvider: process.env.AI_API_KEY ? 'active-external-llm' : 'educational-demo-mode'
  });
});

// Serve frontend static assets directly from express server
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

// Explicit route fallbacks for SPA navigation
app.get('/', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Centralized error handler
app.use(errorHandler);

module.exports = app;
