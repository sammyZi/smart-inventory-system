import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

// Global Prisma instance
declare global {
  var __prisma: PrismaClient | undefined;
}

// Create Prisma client with logging
export const prisma = globalThis.__prisma || new PrismaClient({
  log: [
    { level: 'query', emit: 'event' },
    { level: 'error', emit: 'event' },
    { level: 'info', emit: 'event' },
    { level: 'warn', emit: 'event' },
  ],
});

// Log database queries in development
if (process.env.NODE_ENV === 'development') {
  prisma.$on('query', (e) => {
    logger.debug('Database Query:', {
      query: e.query,
      params: e.params,
      duration: `${e.duration}ms`,
      timestamp: e.timestamp
    });
  });
}

// Log database errors
prisma.$on('error', (e) => {
  logger.error('Database Error:', {
    message: e.message,
    target: e.target,
    timestamp: e.timestamp
  });
});

// Prevent multiple instances in development
if (process.env.NODE_ENV === 'development') {
  globalThis.__prisma = prisma;
}

export async function connectDatabase() {
  try {
    await prisma.$connect();
    logger.info('✅ Connected to PostgreSQL database');
    
    // Test the connection
    await prisma.$queryRaw`SELECT 1`;
    logger.info('✅ Database connection test successful');
    
  } catch (error) {
    logger.error('❌ Failed to connect to database:', error);
    throw error;
  }
}

export async function disconnectDatabase() {
  try {
    await prisma.$disconnect();
    logger.info('✅ Disconnected from database');
  } catch (error) {
    logger.error('❌ Error disconnecting from database:', error);
    throw error;
  }
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await disconnectDatabase();
});