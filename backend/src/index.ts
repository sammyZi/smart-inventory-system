import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cookieParser from 'cookie-parser';

import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import { autoTokenRefresh } from './middleware/tokenRefresh';
import { applySecurity } from './middleware/security';
import { apiRateLimit } from './middleware/rateLimiter';
import { checkDatabaseConnection } from './config/database';
import { connectRedis } from './config/redis';
import { initializeFirebase } from './config/firebase';
import { RealtimeService } from './services/realtimeService';
import { EmailService } from './services/emailService';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:3000",
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Apply security middleware
app.use(applySecurity);

// Rate limiting
app.use('/api/', apiRateLimit);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving for uploads
app.use('/uploads', express.static('uploads'));

// Cookie parsing middleware (for refresh tokens)
app.use(cookieParser());

// Auto token refresh middleware
app.use('/api/', autoTokenRefresh);

// Request logging
app.use(requestLogger);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Import routes
import authRoutes from './routes/auth';
import tenantRoutes from './routes/tenant';
import testRoutes from './routes/test';
import productRoutes from './routes/products';
import saasRoutes from './routes/saas';
import inventoryRoutes from './routes/inventory';

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/tenant', tenantRoutes);
app.use('/api/v1/test', testRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/saas', saasRoutes);
app.use('/api/v1/inventory', inventoryRoutes);

// API info endpoint
app.get('/api/v1', (req, res) => {
  res.json({
    message: 'Smart Inventory & Billing Management System API',
    version: '1.0.0',
    status: 'active',
    endpoints: {
      auth: '/api/v1/auth',
      tenant: '/api/v1/tenant',
      products: '/api/v1/products',
      inventory: '/api/v1/inventory',
      saas: '/api/v1/saas',
      test: '/api/v1/test',
      health: '/health'
    }
  });
});

// Initialize real-time service
RealtimeService.initialize(io);

// Error handling middleware (must be last)
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'The requested resource was not found',
      timestamp: new Date().toISOString(),
      path: req.originalUrl
    }
  });
});

// Initialize services and start server
async function startServer() {
  try {
    // Initialize database connections
    await checkDatabaseConnection();
    await connectRedis();
    
    // Initialize Firebase
    await initializeFirebase();
    
    // Initialize Email Service
    try {
      await EmailService.initialize();
    } catch (error) {
      logger.warn('Email service initialization failed:', error);
    }
    
    // Start server
    server.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🔗 CORS enabled for: ${process.env.CORS_ORIGIN || 'http://localhost:3000'}`);
    });
    
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

startServer();

export { io };