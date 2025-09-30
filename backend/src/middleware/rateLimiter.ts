import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { CacheService } from '../config/redis';

// Create custom rate limiter with Redis store
const createRateLimiter = (options: {
  windowMs: number;
  max: number;
  message: string;
  skipSuccessfulRequests?: boolean;
  keyGenerator?: (req: Request) => string;
}) => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: {
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: options.message,
        timestamp: new Date().toISOString()
      }
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: options.skipSuccessfulRequests || false,
    keyGenerator: options.keyGenerator || ((req: Request) => req.ip),
    onLimitReached: (req: Request, res: Response) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        path: req.path,
        method: req.method,
        userAgent: req.get('User-Agent')
      });
    }
  });
};

// Authentication rate limiters
export const loginRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 minutes
  message: 'Too many login attempts, please try again in 15 minutes',
  skipSuccessfulRequests: true,
  keyGenerator: (req: Request) => `login:${req.ip}:${req.body.email || 'unknown'}`
});

export const registerRateLimit = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 registrations per hour per IP
  message: 'Too many registration attempts, please try again in 1 hour'
});

export const passwordResetRateLimit = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 password reset attempts per hour
  message: 'Too many password reset attempts, please try again in 1 hour',
  keyGenerator: (req: Request) => `password-reset:${req.ip}:${req.body.email || 'unknown'}`
});

// API rate limiters
export const apiRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per 15 minutes
  message: 'Too many API requests, please try again later'
});

export const strictApiRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes for sensitive endpoints
  message: 'Too many requests to sensitive endpoint, please try again later'
});

// Transaction rate limiter (for POS)
export const transactionRateLimit = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 transactions per minute per user
  message: 'Too many transactions, please wait a moment',
  keyGenerator: (req: Request) => {
    const userId = (req as any).user?.id || req.ip;
    return `transaction:${userId}`;
  }
});

// Inventory update rate limiter
export const inventoryUpdateRateLimit = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 inventory updates per minute per user
  message: 'Too many inventory updates, please slow down',
  keyGenerator: (req: Request) => {
    const userId = (req as any).user?.id || req.ip;
    return `inventory:${userId}`;
  }
});

// Report generation rate limiter
export const reportRateLimit = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // 10 reports per 5 minutes
  message: 'Too many report requests, please wait before generating another report',
  keyGenerator: (req: Request) => {
    const userId = (req as any).user?.id || req.ip;
    return `report:${userId}`;
  }
});

// Advanced rate limiter with Redis-based sliding window
export class AdvancedRateLimiter {
  private windowMs: number;
  private maxRequests: number;
  private keyPrefix: string;

  constructor(windowMs: number, maxRequests: number, keyPrefix: string) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.keyPrefix = keyPrefix;
  }

  async isAllowed(identifier: string): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const key = `${this.keyPrefix}:${identifier}`;
    const now = Date.now();
    const windowStart = now - this.windowMs;

    try {
      // Get current count (this would require Redis with sorted sets for precise sliding window)
      const currentCount = await this.getCurrentCount(key, windowStart, now);
      
      if (currentCount >= this.maxRequests) {
        return {
          allowed: false,
          remaining: 0,
          resetTime: now + this.windowMs
        };
      }

      // Record this request
      await this.recordRequest(key, now);
      
      return {
        allowed: true,
        remaining: this.maxRequests - currentCount - 1,
        resetTime: now + this.windowMs
      };
    } catch (error) {
      logger.error('Rate limiter error', { error: error.message, key });
      // Fail open - allow request if rate limiter fails
      return {
        allowed: true,
        remaining: this.maxRequests,
        resetTime: now + this.windowMs
      };
    }
  }

  private async getCurrentCount(key: string, windowStart: number, now: number): Promise<number> {
    // This is a simplified version - in production, use Redis sorted sets
    const countStr = await CacheService.get(key);
    return countStr ? parseInt(countStr) : 0;
  }

  private async recordRequest(key: string, timestamp: number): Promise<void> {
    // Simplified version - increment counter
    const current = await CacheService.get(key);
    const count = current ? parseInt(current) + 1 : 1;
    await CacheService.set(key, count.toString(), Math.ceil(this.windowMs / 1000));
  }
}

// Create advanced rate limiters for specific use cases
export const advancedLoginLimiter = new AdvancedRateLimiter(
  15 * 60 * 1000, // 15 minutes
  5, // 5 attempts
  'advanced_login'
);

export const advancedApiLimiter = new AdvancedRateLimiter(
  60 * 1000, // 1 minute
  100, // 100 requests
  'advanced_api'
);