/**
 * Database Configuration and Connection Management
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

// Global Prisma instance
declare global {
  var __prisma: PrismaClient | undefined;
}

// Prisma client configuration
const prismaConfig = {
  log: [
    { level: 'query' as const, emit: 'event' as const },
    { level: 'error' as const, emit: 'event' as const },
    { level: 'info' as const, emit: 'event' as const },
    { level: 'warn' as const, emit: 'event' as const },
  ],
  errorFormat: 'pretty' as const,
};

// Create Prisma client instance
function createPrismaClient(): PrismaClient {
  const prisma = new PrismaClient(prismaConfig);

  // Log database queries in development
  if (process.env.NODE_ENV === 'development') {
    prisma.$on('query', (e) => {
      logger.debug('Database Query:', {
        query: e.query,
        params: e.params,
        duration: `${e.duration}ms`,
      });
    });
  }

  // Log database errors
  prisma.$on('error', (e) => {
    logger.error('Database Error:', {
      message: e.message,
      target: e.target,
    });
  });

  // Log database info
  prisma.$on('info', (e) => {
    logger.info('Database Info:', {
      message: e.message,
      target: e.target,
    });
  });

  // Log database warnings
  prisma.$on('warn', (e) => {
    logger.warn('Database Warning:', {
      message: e.message,
      target: e.target,
    });
  });

  return prisma;
}

// Use global instance in development to prevent multiple connections
export const prisma = globalThis.__prisma || createPrismaClient();

if (process.env.NODE_ENV === 'development') {
  globalThis.__prisma = prisma;
}

/**
 * Database connection health check
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    logger.info('Database connection successful');
    return true;
  } catch (error) {
    logger.error('Database connection failed:', error);
    return false;
  }
}

/**
 * Graceful database disconnection
 */
export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
    logger.info('Database disconnected successfully');
  } catch (error) {
    logger.error('Error disconnecting from database:', error);
  }
}

/**
 * Database transaction wrapper with retry logic
 */
export async function withTransaction<T>(
  operation: (tx: PrismaClient) => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
        return await operation(tx);
      });
    } catch (error) {
      lastError = error as Error;
      
      // Check if error is retryable
      if (isRetryableError(error) && attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        logger.warn(`Transaction attempt ${attempt} failed, retrying in ${delay}ms:`, error);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // If not retryable or max retries reached, throw the error
      throw error;
    }
  }

  throw lastError!;
}

/**
 * Check if database error is retryable
 */
function isRetryableError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const errorObj = error as any;
  
  // Prisma specific retryable errors
  const retryableCodes = [
    'P2034', // Transaction failed due to a write conflict or a deadlock
    'P2028', // Transaction API error
    'P2024', // Timed out fetching a new connection from the connection pool
  ];

  if (errorObj.code && retryableCodes.includes(errorObj.code)) {
    return true;
  }

  // PostgreSQL specific retryable errors
  const retryablePostgresErrors = [
    '40001', // serialization_failure
    '40P01', // deadlock_detected
    '53300', // too_many_connections
  ];

  if (errorObj.meta?.code && retryablePostgresErrors.includes(errorObj.meta.code)) {
    return true;
  }

  return false;
}

/**
 * Database migration utilities
 */
export class DatabaseMigration {
  /**
   * Run pending migrations
   */
  static async runMigrations(): Promise<void> {
    try {
      logger.info('Running database migrations...');
      
      // In production, migrations should be run separately
      if (process.env.NODE_ENV === 'production') {
        logger.warn('Skipping automatic migrations in production');
        return;
      }

      // For development, we can use Prisma's migration commands
      const { execSync } = require('child_process');
      execSync('npx prisma migrate deploy', { stdio: 'inherit' });
      
      logger.info('Database migrations completed successfully');
    } catch (error) {
      logger.error('Database migration failed:', error);
      throw error;
    }
  }

  /**
   * Reset database (development only)
   */
  static async resetDatabase(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Database reset is not allowed in production');
    }

    try {
      logger.info('Resetting database...');
      
      const { execSync } = require('child_process');
      execSync('npx prisma migrate reset --force', { stdio: 'inherit' });
      
      logger.info('Database reset completed successfully');
    } catch (error) {
      logger.error('Database reset failed:', error);
      throw error;
    }
  }

  /**
   * Seed database with initial data
   */
  static async seedDatabase(): Promise<void> {
    try {
      logger.info('Seeding database...');
      
      const { execSync } = require('child_process');
      execSync('npx prisma db seed', { stdio: 'inherit' });
      
      logger.info('Database seeding completed successfully');
    } catch (error) {
      logger.error('Database seeding failed:', error);
      throw error;
    }
  }
}

/**
 * Database performance monitoring
 */
export class DatabaseMonitor {
  private static queryCount = 0;
  private static slowQueryThreshold = 1000; // 1 second

  /**
   * Track query performance
   */
  static trackQuery(query: string, duration: number): void {
    this.queryCount++;

    if (duration > this.slowQueryThreshold) {
      logger.warn('Slow query detected:', {
        query,
        duration: `${duration}ms`,
        threshold: `${this.slowQueryThreshold}ms`,
      });
    }

    // Log query stats every 100 queries
    if (this.queryCount % 100 === 0) {
      logger.info(`Database query count: ${this.queryCount}`);
    }
  }

  /**
   * Get database statistics
   */
  static async getDatabaseStats(): Promise<{
    connectionCount: number;
    queryCount: number;
    uptime: string;
  }> {
    try {
      // Get connection count
      const connectionResult = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT count(*) as count FROM pg_stat_activity WHERE state = 'active'
      `;
      
      const connectionCount = Number(connectionResult[0]?.count || 0);

      // Get database uptime
      const uptimeResult = await prisma.$queryRaw<Array<{ uptime: string }>>`
        SELECT EXTRACT(EPOCH FROM (now() - pg_postmaster_start_time())) as uptime
      `;
      
      const uptime = uptimeResult[0]?.uptime || '0';

      return {
        connectionCount,
        queryCount: this.queryCount,
        uptime: `${Math.floor(Number(uptime) / 3600)}h ${Math.floor((Number(uptime) % 3600) / 60)}m`,
      };
    } catch (error) {
      logger.error('Failed to get database stats:', error);
      return {
        connectionCount: 0,
        queryCount: this.queryCount,
        uptime: 'unknown',
      };
    }
  }
}

// Initialize database monitoring
if (process.env.NODE_ENV === 'development') {
  prisma.$use(async (params, next) => {
    const start = Date.now();
    const result = await next(params);
    const duration = Date.now() - start;
    
    DatabaseMonitor.trackQuery(
      `${params.model}.${params.action}`,
      duration
    );
    
    return result;
  });
}

export default prisma;