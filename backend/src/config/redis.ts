import { createClient, RedisClientType } from 'redis';
import { logger } from '../utils/logger';

let redisClient: RedisClientType;

export async function connectRedis() {
  try {
    const redisUrl = process.env.REDIS_URL;
    
    // Skip Redis if URL is not provided
    if (!redisUrl || redisUrl.trim() === '') {
      logger.info('⚠️ Redis URL not provided - running without Redis cache');
      return;
    }

    redisClient = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            logger.error('Redis reconnection failed after 10 attempts');
            return new Error('Redis reconnection failed');
          }
          return Math.min(retries * 50, 1000);
        }
      }
    });

    redisClient.on('error', (error) => {
      logger.error('Redis Client Error:', error);
    });

    redisClient.on('connect', () => {
      logger.info('✅ Connected to Redis');
    });

    redisClient.on('reconnecting', () => {
      logger.info('🔄 Reconnecting to Redis...');
    });

    redisClient.on('ready', () => {
      logger.info('✅ Redis client ready');
    });

    await redisClient.connect();
    
    // Test the connection
    await redisClient.ping();
    logger.info('✅ Redis connection test successful');
    
  } catch (error) {
    logger.error('❌ Failed to connect to Redis:', error);
    // Don't throw error - Redis is optional for basic functionality
    logger.warn('⚠️ Continuing without Redis cache');
  }
}

export function getRedisClient(): RedisClientType | null {
  return redisClient || null;
}

export async function disconnectRedis() {
  try {
    if (redisClient) {
      await redisClient.quit();
      logger.info('✅ Disconnected from Redis');
    }
  } catch (error) {
    logger.error('❌ Error disconnecting from Redis:', error);
  }
}

// Cache utility functions
export class CacheService {
  private static client = () => getRedisClient();

  static async get(key: string): Promise<string | null> {
    try {
      const client = this.client();
      if (!client) return null;
      
      return await client.get(key);
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  static async set(key: string, value: string, ttlSeconds?: number): Promise<boolean> {
    try {
      const client = this.client();
      if (!client) return false;
      
      if (ttlSeconds) {
        await client.setEx(key, ttlSeconds, value);
      } else {
        await client.set(key, value);
      }
      return true;
    } catch (error) {
      logger.error('Cache set error:', error);
      return false;
    }
  }

  static async del(key: string): Promise<boolean> {
    try {
      const client = this.client();
      if (!client) return false;
      
      await client.del(key);
      return true;
    } catch (error) {
      logger.error('Cache delete error:', error);
      return false;
    }
  }

  static async exists(key: string): Promise<boolean> {
    try {
      const client = this.client();
      if (!client) return false;
      
      const result = await client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Cache exists error:', error);
      return false;
    }
  }

  static async flushAll(): Promise<boolean> {
    try {
      const client = this.client();
      if (!client) return false;
      
      await client.flushAll();
      return true;
    } catch (error) {
      logger.error('Cache flush error:', error);
      return false;
    }
  }
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await disconnectRedis();
});