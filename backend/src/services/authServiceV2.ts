import bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';
import { prisma } from '../config/database';
import { FirebaseAuthService } from '../config/firebase';
import { generateTokenPair, TokenPair } from '../utils/jwt';
import { SessionService } from './sessionService';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';
import { generateId } from '../utils/helpers';

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
  deviceId?: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  role?: UserRole;
  locationId?: string;
}

export interface AuthResult {
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    role: UserRole;
    locationId?: string;
    isActive: boolean;
  };
  tokens: TokenPair;
  sessionId: string;
  expiresAt: string;
  sessionInfo: {
    rememberMe: boolean;
    deviceId?: string;
    maxInactiveTime: string;
  };
}

export class AuthServiceV2 {
  // Enhanced login with session management
  static async login(
    credentials: LoginCredentials, 
    ipAddress?: string, 
    userAgent?: string
  ): Promise<AuthResult> {
    const { email, password, rememberMe = false, deviceId } = credentials;

    try {
      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        include: { location: true }
      });

      if (!user) {
        throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
      }

      if (!user.isActive) {
        throw new AppError('Account is deactivated', 401, 'ACCOUNT_DEACTIVATED');
      }

      // Generate tokens with enhanced settings
      const tokens = generateTokenPair(
        user.id,
        user.firebaseUid,
        user.email,
        user.role,
        user.locationId || undefined,
        0,
        rememberMe
      );

      // Create enhanced session
      const sessionId = await SessionService.createSession(
        user.id,
        user.email,
        user.role,
        user.locationId || undefined,
        ipAddress || 'unknown',
        userAgent || 'unknown',
        rememberMe,
        deviceId
      );

      // Calculate expiration time based on role and remember me
      const getExpirationTime = (role: UserRole, rememberMe: boolean): Date => {
        if (rememberMe) {
          return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
        }
        
        const hours = {
          [UserRole.ADMIN]: 8,
          [UserRole.MANAGER]: 12,
          [UserRole.STAFF]: 8,
          [UserRole.CUSTOMER]: 24
        }[role] || 1;
        
        return new Date(Date.now() + hours * 60 * 60 * 1000);
      };

      const expiresAt = getExpirationTime(user.role, rememberMe);

      logger.info('Enhanced user login successful', {
        userId: user.id,
        email: user.email,
        role: user.role,
        locationId: user.locationId,
        rememberMe,
        deviceId,
        sessionId,
        expiresAt: expiresAt.toISOString(),
        ipAddress,
        userAgent
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName || undefined,
          lastName: user.lastName || undefined,
          role: user.role,
          locationId: user.locationId || undefined,
          isActive: user.isActive
        },
        tokens,
        sessionId,
        expiresAt: expiresAt.toISOString(),
        sessionInfo: {
          rememberMe,
          deviceId,
          maxInactiveTime: process.env.IDLE_TIMEOUT || '30m'
        }
      };
    } catch (error) {
      logger.error('Enhanced login failed', { email, error: error.message, ipAddress });
      throw error;
    }
  }

  // Enhanced Firebase login
  static async loginWithFirebase(
    idToken: string, 
    rememberMe: boolean = false,
    deviceId?: string,
    ipAddress?: string, 
    userAgent?: string
  ): Promise<AuthResult> {
    try {
      // Verify Firebase ID token
      const decodedToken = await FirebaseAuthService.verifyIdToken(idToken);

      // Find or create user
      let user = await prisma.user.findUnique({
        where: { firebaseUid: decodedToken.uid },
        include: { location: true }
      });

      if (!user) {
        // Create new user from Firebase token
        user = await prisma.user.create({
          data: {
            id: generateId(),
            firebaseUid: decodedToken.uid,
            email: decodedToken.email!,
            firstName: decodedToken.name?.split(' ')[0],
            lastName: decodedToken.name?.split(' ').slice(1).join(' '),
            role: UserRole.CUSTOMER,
            isActive: true
          },
          include: { location: true }
        });

        logger.info('New Firebase user created', {
          userId: user.id,
          email: user.email,
          firebaseUid: user.firebaseUid
        });
      }

      if (!user.isActive) {
        throw new AppError('Account is deactivated', 401, 'ACCOUNT_DEACTIVATED');
      }

      // Generate tokens
      const tokens = generateTokenPair(
        user.id,
        user.firebaseUid,
        user.email,
        user.role,
        user.locationId || undefined,
        0,
        rememberMe
      );

      // Create session
      const sessionId = await SessionService.createSession(
        user.id,
        user.email,
        user.role,
        user.locationId || undefined,
        ipAddress || 'unknown',
        userAgent || 'unknown',
        rememberMe,
        deviceId
      );

      const expirationHours = rememberMe ? 24 * 30 : 24;
      const expiresAt = new Date(Date.now() + expirationHours * 60 * 60 * 1000);

      logger.info('Enhanced Firebase login successful', {
        userId: user.id,
        email: user.email,
        role: user.role,
        rememberMe,
        sessionId
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName || undefined,
          lastName: user.lastName || undefined,
          role: user.role,
          locationId: user.locationId || undefined,
          isActive: user.isActive
        },
        tokens,
        sessionId,
        expiresAt: expiresAt.toISOString(),
        sessionInfo: {
          rememberMe,
          deviceId,
          maxInactiveTime: process.env.IDLE_TIMEOUT || '30m'
        }
      };
    } catch (error) {
      logger.error('Enhanced Firebase login failed', { error: error.message });
      throw new AppError('Firebase authentication failed', 401, 'FIREBASE_AUTH_FAILED');
    }
  }

  // Enhanced logout with session cleanup
  static async logout(userId: string, sessionId?: string): Promise<void> {
    try {
      if (sessionId) {
        // Destroy specific session
        await SessionService.destroySession(sessionId);
      } else {
        // Destroy all user sessions
        await SessionService.destroyAllUserSessions(userId);
      }

      logger.info('Enhanced logout successful', { userId, sessionId });
    } catch (error) {
      logger.error('Enhanced logout failed', { userId, sessionId, error: error.message });
      throw error;
    }
  }

  // Logout from all devices
  static async logoutFromAllDevices(userId: string): Promise<void> {
    try {
      await SessionService.destroyAllUserSessions(userId);
      logger.info('Logout from all devices successful', { userId });
    } catch (error) {
      logger.error('Logout from all devices failed', { userId, error: error.message });
      throw error;
    }
  }

  // Get active sessions
  static async getActiveSessions(userId: string) {
    try {
      const sessions = await SessionService.getUserActiveSessions(userId);
      return sessions;
    } catch (error) {
      logger.error('Get active sessions failed', { userId, error: error.message });
      throw error;
    }
  }

  // Refresh token with session validation
  static async refreshToken(refreshToken: string, sessionId?: string): Promise<TokenPair> {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as any;
      
      // Get user
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId }
      });

      if (!user || !user.isActive) {
        throw new AppError('User not found or inactive', 401, 'USER_NOT_FOUND');
      }

      // Validate session if provided
      if (sessionId) {
        const sessionData = await SessionService.getSession(sessionId);
        if (!sessionData || sessionData.userId !== user.id) {
          throw new AppError('Invalid session', 401, 'INVALID_SESSION');
        }

        // Check for inactivity
        if (SessionService.isSessionExpiredByInactivity(sessionData)) {
          await SessionService.destroySession(sessionId);
          throw new AppError('Session expired due to inactivity', 401, 'SESSION_EXPIRED');
        }

        // Update session activity
        await SessionService.updateActivity(sessionId);
      }

      // Generate new tokens
      const tokens = generateTokenPair(
        user.id,
        user.firebaseUid,
        user.email,
        user.role,
        user.locationId || undefined,
        decoded.tokenVersion || 0,
        decoded.rememberMe || false
      );

      logger.info('Token refreshed successfully', { userId: user.id, sessionId });

      return tokens;
    } catch (error) {
      logger.error('Token refresh failed', { error: error.message });
      throw error;
    }
  }

  // Validate session and update activity
  static async validateSession(sessionId: string): Promise<boolean> {
    try {
      const sessionData = await SessionService.getSession(sessionId);
      if (!sessionData) return false;

      // Check for inactivity
      if (SessionService.isSessionExpiredByInactivity(sessionData)) {
        await SessionService.destroySession(sessionId);
        return false;
      }

      // Update activity
      await SessionService.updateActivity(sessionId);
      return true;
    } catch (error) {
      logger.error('Session validation failed', { sessionId, error: error.message });
      return false;
    }
  }
}

// Import jwt for refresh token verification
import jwt from 'jsonwebtoken';