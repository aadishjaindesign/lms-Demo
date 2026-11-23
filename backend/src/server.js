// Load environment variables before any other module reads process.env
import './config/env.js';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectToDatabase from './config/database.js';
import { assertRequiredSecrets } from './config/secrets.js';

import authRoutes from './routes/authRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import studentPortalRoutes from './routes/studentPortalRoutes.js';
import courseRoutes from './routes/courseRoutes.js';
import videoRoutes from './routes/videoRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { startVideoCleanupScheduler } from './services/videoCleanupService.js';
import { startKeepAlive } from './services/keepAliveService.js';
import { testErpBridgeConnection } from './services/erp/httpAdapter.js';

// Auto-start background workers
import './workers/videoWorker.js';

dotenv.config({ quiet: true });

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cookieParser());
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
  'https://lms-demo-mauve.vercel.app',
  'https://frontend-rose-five-24.vercel.app',
  'https://frontend-rmvw.vercel.app',
  'https://lms.jainscomputer.com',
  'https://www.lms.jainscomputer.com',
  'https://student.jainscomputer.com',
  'https://admin.jainscomputer.com',
  'https://kreach.in',
  'https://www.kreach.in',
  // Extra origins without a code change: ALLOWED_ORIGINS=https://a.vercel.app,https://b.com
  ...(process.env.ALLOWED_ORIGINS || '').split(',').map((o) => o.trim().replace(/\/$/, '')),
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    // In local dev, also allow phones/laptops on the same Wi-Fi (http://192.168.x.x:3000 etc.)
    const isLanDevOrigin = process.env.NODE_ENV !== 'production' &&
      /^http:\/\/(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)[\d.]+(:\d+)?$/.test(origin || '');
    if (!origin || allowedOrigins.includes(origin) || isLanDevOrigin) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Rejected origin: ${origin}`);
      // Don't throw: an Error makes Express return a 500 without CORS headers
      callback(null, false);
    }
  },
  credentials: true,
}));

app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/student', studentPortalRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api', videoRoutes);
app.use('/api/admin', adminRoutes);

// Cross-domain ERP Bridge Diagnostic Route
app.get('/api/bridge/diagnostic', async (req, res) => {
  const result = await testErpBridgeConnection();
  res.status(200).json({
    success: true,
    diagnostic: result,
    erpConfig: {
      ERP_MODE: process.env.ERP_MODE || 'http',
      ERP_BASE_URL: process.env.ERP_BASE_URL || 'https://erp.jainscomputer.com/api/bridge',
      ERP_API_KEY_CONFIGURED: Boolean(process.env.ERP_API_KEY),
    },
  });
});

app.get('/', (req, res) => {
  res.send('LMS Backend API is running');
});

// Lightweight endpoint for keep-alive pings (Render free plan sleeps after 15 min idle)
app.get('/api/health', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ ok: true, db: mongoose.connection.readyState === 1, uptime: Math.round(process.uptime()) });
});

export { app };

const startServer = async () => {
  try {
    assertRequiredSecrets();
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
  await connectToDatabase();
  
  // Start the video cleanup scheduler
  startVideoCleanupScheduler();
  
  // Start keep-alive service to prevent Render from sleeping
  startKeepAlive();
  
  // Test ERP cross-domain bridge connection on startup
  testErpBridgeConnection().then((diag) => {
    if (diag.ok && diag.status === 200) {
      console.log(`[ERP_BRIDGE] ✓ Cross-Domain Bridge CONNECTED (200 OK): ${diag.testedUrl}`);
    } else if (diag.status) {
      console.log(`[ERP_BRIDGE] ℹ Cross-Domain Bridge Status: HTTP ${diag.status} (${diag.contentType}) on ${diag.testedUrl}`);
      console.log(`[ERP_BRIDGE] ℹ Details: ${diag.details}`);
    } else {
      console.warn(`[ERP_BRIDGE] ⚠ Bridge connection test warning: ${diag.error || 'Failed to reach ERP server'}`);
    }
  }).catch((err) => {
    console.warn(`[ERP_BRIDGE] ⚠ Bridge test caught error: ${err.message}`);
  });

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Allowing CORS for frontend: ${FRONTEND_URL}`);
  });
};

if (process.env.NODE_ENV !== 'test') {
  startServer();
}
