import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';

import { ENV } from './config/env.js';
import { connectDB } from './config/db.js';
import { errorHandler } from './middleware/errorHandler.js';
import { handleSocketConnections } from './sockets/socketHandler.js';
import { autoSeedDefaults } from './seedDefaults.js';

import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import playerRoutes from './routes/playerRoutes.js';
import podiumRoutes from './routes/podiumRoutes.js';
import managerRoutes from './routes/managerRoutes.js';
import configRoutes from './routes/configRoutes.js';
import matchRoutes from './routes/matchRoutes.js';
import phaseRoutes from './routes/phaseRoutes.js';

const app = express();
const httpServer = createServer(app);

// Socket.IO Setup
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Connect Database
connectDB().then(async () => {
  // Ensure base platform config (sessions, positions, categories, bidding tiers)
  // exists on every boot — critical so a fresh production DB (Vercel) is not blank.
  await autoSeedDefaults();
});

// Attach Socket.IO instance to app so controllers can emit events via req.app.get('io')
app.set('io', io);

// Security Middlewares
app.use(helmet({ crossOriginResourcePolicy: false }));
// CORS: use credentials only for same-origin or explicit origins.
// Since auth uses Bearer tokens in headers (not cookies), we don't need
// credentials: true with origin '*. In production, set specific origins.
if (process.env.NODE_ENV === 'development') {
  app.use(cors({ origin: '*', credentials: true }));
} else {
  // Production: allow the Vercel frontend domain; adjust VITE_BACKEND_URL as needed
  const allowedOrigins = process.env.VERCEL_URL
    ? [process.env.VERCEL_URL]
    : [process.env.VITE_BACKEND_URL || 'http://localhost:5173'];
  app.use(cors({ origin: allowedOrigins, credentials: true }));
}
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { success: false, message: 'Too many requests from this IP, please try again later.' }
});
app.use('/api', apiLimiter);

// Serve static uploaded files
app.use('/uploads', express.static(path.join(process.cwd(), 'public', 'uploads')));

// Health Check
app.get('/health', (req, res) => {
  res.json({ success: true, status: 'Platform API & WebSocket Engine Running', timestamp: new Date() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/podium', podiumRoutes);
app.use('/api/manager', managerRoutes);
app.use('/api/config', configRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/phase', phaseRoutes);

// Socket Handler Initialization
handleSocketConnections(io);

// Global Error Handler
app.use(errorHandler);

// Start Server
const PORT = ENV.PORT;
httpServer.listen(PORT, () => {
  console.log(`\n=============================================================`);
  console.log(`🚀 ENTERPRISE AUCTION PLATFORM BACKEND STARTED ON PORT ${PORT}`);
  console.log(`📡 WebSocket Server Active (Socket.IO Ready)`);
  console.log(`=============================================================\n`);
});
