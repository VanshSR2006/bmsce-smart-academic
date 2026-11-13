import express from 'express';
import http from 'http';
import cors from 'cors';
import morgan from 'morgan';
import { Server as SocketIOServer } from 'socket.io';
import { config } from './config/env.js';
import { authMiddleware } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
import { initRedis, closeRedis } from './config/redis.js';

import { authRouter } from './modules/auth/auth.router.js';
import { timetablesRouter } from './modules/timetables/timetables.router.js';
import { dashboardRouter } from './modules/dashboard/dashboard.router.js';
import { solverRouter } from './modules/solver/solver.router.js';
import { conflictsRouter } from './modules/conflicts/conflicts.router.js';
import { repairsRouter } from './modules/repairs/repairs.router.js';
import { communicationRouter } from './modules/communication/communication.router.js';
import { examinationsRouter } from './modules/examinations/examinations.router.js';
import { academicsRouter } from './modules/academics/academics.router.js';
import { reportsRouter } from './modules/reports/reports.router.js';

const app = express();
const server = http.createServer(app);

// Initialize Redis with fallback
initRedis();

// Setup Socket.IO for realtime communications & updates
export const io = new SocketIOServer(server, {
  cors: {
    origin: config.isProduction ? config.corsOrigin : '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);

  socket.on('join_chamber', (chamberId) => {
    socket.join(`chamber:${chamberId}`);
    console.log(`[Socket.IO] Client ${socket.id} joined chamber:${chamberId}`);
  });

  socket.on('send_chamber_message', (payload) => {
    io.to(`chamber:${payload.chamberId}`).emit('new_chamber_message', payload);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});

// Middleware with environment-specific CORS protection
app.use(
  cors({
    origin: config.isProduction ? config.corsOrigin : '*',
    credentials: true,
  })
);
app.use(express.json());
app.use(morgan('dev'));
app.use(authMiddleware);

// Health check endpoint
app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'HEALTHY',
    service: 'BMSCE Smart Academic API',
    version: '1.0.0',
    mode: config.isDemo ? 'SYNTHETIC_DEMO' : 'PRODUCTION',
    timestamp: new Date().toISOString(),
  });
});

// Mount modular routers
app.use('/api/v1/auth', authRouter);
app.use('/api/v1', timetablesRouter);
app.use('/api/v1', dashboardRouter);
app.use('/api/v1/solver', solverRouter);
app.use('/api/v1/conflicts', conflictsRouter);
app.use('/api/v1/repairs', repairsRouter);
app.use('/api/v1/class-sessions', communicationRouter);
app.use('/api/v1/examinations', examinationsRouter);
app.use('/api/v1', academicsRouter);
app.use('/api/v1/reports', reportsRouter);

// Central error handler
app.use(errorHandler);

// Graceful shutdown handling
async function handleGracefulShutdown(signal: string) {
  console.log(`[API] Received ${signal}. Commencing graceful shutdown...`);
  server.close(async () => {
    console.log('[API] HTTP and WebSocket server closed.');
    await closeRedis();
    console.log('[API] Teardown complete. Exiting process.');
    process.exit(0);
  });
}

process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));
process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));

// Start server
if (process.env.NODE_ENV !== 'test') {
  server.listen(config.port, '0.0.0.0', () => {
    console.log(`🚀 BMSCE Smart Academic API listening on 0.0.0.0:${config.port}`);
    console.log(`📡 Socket.IO server ready on port ${config.port}`);
  });
}

export { app, server };
