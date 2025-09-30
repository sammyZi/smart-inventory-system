import { UserRole } from '@prisma/client';
import { CacheService } from '../config/redis';
import { logger } from '../utils/logger';
import { generateId } from '../utils/helpers';

export interface SessionData {
  userId: string;
  email: string;
  role: UserRole;
  locationId?: string;
  loginTime: string;
  lastActivity: string;
  ipAddress: string;
  userAgent: string;
  rememberMe: boolean;
  deviceId?: string;
}

export interface ActiveSession {
  sessionId: string;
  userId: string;
  email: string;
  role: UserRole;
  loginTime: string;
  lastActivity: string;
  ipAddress: string;
  userAgent: string;
  isActive: boolean;
}

export class SessionService {
  // Create new session
  static async createSession(
    userId: string,
    email: string,
    role: UserRole,
    locationId: string | undefined,
    ipAddress: string,
    userAgent: string,
    rememberMe: boolean = false,
    deviceId?: string
  ): Promise<string> {
    const sessionId = generateId();
    const now = new Date().toISOString();

    const sessionData: SessionData = {
      userId,
      email,
      role,
      locationId,
      loginTime: now,
      lastActivity: now,
      ipAddress,
      userAgent,
      rememberMe,
      deviceId
    };

    // Store session data
    const sessionKey = `session:${sessionId}`;
    const userSessionsKey = `user_sessions:${userId}`;
    
    // Get session timeout based on role and remember me
    const timeout = this.getSessionTimeout(role, rememberMe);
    
    await Promise.all([
      // Store session data
      CacheService.set(sessionKey, JSON.stringify(sessionData), timeout),
      
      // Add to user's active sessions list
      this.addToUserSessions(userId, sessionId, timeout)
    ]);

    logger.info('Session created', {
      sessionId,
      userId,
      email,
      role,
      rememberMe,
      timeout: `${timeout}s`,
      ipAddress,
      deviceId
    });

    return sessionId;
  }

  // Get session data
  static async getSession(sessionId: string): Promise<SessionData | null> {
    try {
      const sessionKey = `session:${sessionId}`;
      const sessionDataStr = await CacheService.get(sessionKey);
      
      if (!sessionDataStr) {
        return null;
      }

      return JSON.parse(sessionDataStr) as SessionData;
    } catch (error) {
      logger.error('Failed to get session', { sessionId, error: error.message });
      return null;
    }
  }

  // Update session activity
  static async updateActivity(sessionId: string): Promise<void> {
    try {
      const sessionData = await this.getSession(sessionId);
      if (!sessionData) return;

      sessionData.lastActivity = new Date().toISOString();
      
      const sessionKey = `session:${sessionId}`;
      const timeout = this.getSessionTimeout(sessionData.role, sessionData.rememberMe);
      
      await CacheService.set(sessionKey, JSON.stringify(sessionData), timeout);
    } catch (error) {
      logger.error('Failed to update session activity', { sessionId, error: error.message });
    }
  }

  // Check if session is expired due to inactivity
  static isSessionExpiredByInactivity(sessionData: SessionData): boolean {
    const idleTimeout = parseInt(process.env.IDLE_TIMEOUT?.replace('m', '') || '30') * 60 * 1000; // Convert to ms
    const lastActivity = new Date(sessionData.lastActivity).getTime();
    const now = Date.now();
    
    return (now - lastActivity) > idleTimeout;
  }

  // Destroy session
  static async destroySession(sessionId: string): Promise<void> {
    try {
      const sessionData = await this.getSession(sessionId);
      if (!sessionData) return;

      const sessionKey = `session:${sessionId}`;
      const userSessionsKey = `user_sessions:${sessionData.userId}`;
      
      await Promise.all([
        CacheService.del(sessionKey),
        this.removeFromUserSessions(sessionData.userId, sessionId)
      ]);

      logger.info('Session destroyed', {
        sessionId,
        userId: sessionData.userId,
        email: sessionData.email
      });
    } catch (error) {
      logger.error('Failed to destroy session', { sessionId, error: error.message });
    }
  }

  // Destroy all user sessions (for logout from all devices)
  static async destroyAllUserSessions(userId: string): Promise<void> {
    try {
      const activeSessions = await this.getUserActiveSessions(userId);
      
      const destroyPromises = activeSessions.map(session => 
        this.destroySession(session.sessionId)
      );
      
      await Promise.all(destroyPromises);
      
      logger.info('All user sessions destroyed', { userId, count: activeSessions.length });
    } catch (error) {
      logger.error('Failed to destroy all user sessions', { userId, error: error.message });
    }
  }

  // Get user's active sessions
  static async getUserActiveSessions(userId: string): Promise<ActiveSession[]> {
    try {
      const userSessionsKey = `user_sessions:${userId}`;
      const sessionIdsStr = await CacheService.get(userSessionsKey);
      
      if (!sessionIdsStr) return [];
      
      const sessionIds: string[] = JSON.parse(sessionIdsStr);
      const sessions: ActiveSession[] = [];
      
      for (const sessionId of sessionIds) {
        const sessionData = await this.getSession(sessionId);
        if (sessionData) {
          sessions.push({
            sessionId,
            userId: sessionData.userId,
            email: sessionData.email,
            role: sessionData.role,
            loginTime: sessionData.loginTime,
            lastActivity: sessionData.lastActivity,
            ipAddress: sessionData.ipAddress,
            userAgent: sessionData.userAgent,
            isActive: !this.isSessionExpiredByInactivity(sessionData)
          });
        }
      }
      
      return sessions;
    } catch (error) {
      logger.error('Failed to get user active sessions', { userId, error: error.message });
      return [];
    }
  }

  // Clean up expired sessions
  static async cleanupExpiredSessions(): Promise<number> {
    try {
      // This would typically be run as a background job
      // For now, we'll rely on Redis TTL to handle cleanup
      logger.info('Session cleanup completed (handled by Redis TTL)');
      return 0;
    } catch (error) {
      logger.error('Session cleanup failed', { error: error.message });
      return 0;
    }
  }

  // Get session timeout in seconds based on role and remember me
  private static getSessionTimeout(role: UserRole, rememberMe: boolean): number {
    if (rememberMe) {
      return 30 * 24 * 60 * 60; // 30 days
    }

    switch (role) {
      case UserRole.ADMIN:
        return 8 * 60 * 60; // 8 hours
      case UserRole.MANAGER:
        return 12 * 60 * 60; // 12 hours
      case UserRole.STAFF:
        return 8 * 60 * 60; // 8 hours
      case UserRole.CUSTOMER:
        return 24 * 60 * 60; // 24 hours
      default:
        return 1 * 60 * 60; // 1 hour
    }
  }

  // Add session to user's sessions list
  private static async addToUserSessions(userId: string, sessionId: string, timeout: number): Promise<void> {
    try {
      const userSessionsKey = `user_sessions:${userId}`;
      const existingSessionsStr = await CacheService.get(userSessionsKey);
      
      let sessionIds: string[] = [];
      if (existingSessionsStr) {
        sessionIds = JSON.parse(existingSessionsStr);
      }
      
      // Add new session ID
      sessionIds.push(sessionId);
      
      // Keep only last 5 sessions per user
      if (sessionIds.length > 5) {
        const oldSessionIds = sessionIds.slice(0, -5);
        // Clean up old sessions
        for (const oldSessionId of oldSessionIds) {
          await CacheService.del(`session:${oldSessionId}`);
        }
        sessionIds = sessionIds.slice(-5);
      }
      
      await CacheService.set(userSessionsKey, JSON.stringify(sessionIds), timeout);
    } catch (error) {
      logger.error('Failed to add session to user sessions', { userId, sessionId, error: error.message });
    }
  }

  // Remove session from user's sessions list
  private static async removeFromUserSessions(userId: string, sessionId: string): Promise<void> {
    try {
      const userSessionsKey = `user_sessions:${userId}`;
      const existingSessionsStr = await CacheService.get(userSessionsKey);
      
      if (!existingSessionsStr) return;
      
      let sessionIds: string[] = JSON.parse(existingSessionsStr);
      sessionIds = sessionIds.filter(id => id !== sessionId);
      
      if (sessionIds.length > 0) {
        await CacheService.set(userSessionsKey, JSON.stringify(sessionIds), 30 * 24 * 60 * 60);
      } else {
        await CacheService.del(userSessionsKey);
      }
    } catch (error) {
      logger.error('Failed to remove session from user sessions', { userId, sessionId, error: error.message });
    }
  }
}