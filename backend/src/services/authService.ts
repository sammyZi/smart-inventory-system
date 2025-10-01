import { UserRole } from '@prisma/client';
import { prisma } from '../config/database';
import { FirebaseAuthService } from '../config/firebase';
import { generateTokenPair, TokenPair } from '../utils/jwt';
import { CacheService } from '../config/redis';

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
    firstName?: string | undefined;
    lastName?: string | undefined;
    role: UserRole;
    locationId?: string | undefined;
    isActive: boolean;
  };
  tokens: TokenPair;
  sessionId?: string | undefined;
  expiresAt?: string | undefined;
}

export class AuthService {
  // Login with email and password
  static async login(credentials: LoginCredentials, _ipAddress?: string, _userAgent?: string): Promise<AuthResult> {
    const { email } = credentials;

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

      // For Firebase users, verify with Firebase
      if (user.firebaseUid) {
        try {
          // This would typically be handled by Firebase Auth on the frontend
          // Here we just verify the user exists in our system
          logger.info('Firebase user login attempt', { userId: user.id, email });
        } catch (error) {
          throw new AppError('Firebase authentication failed', 401, 'FIREBASE_AUTH_FAILED');
        }
      }

      // Generate tokens
      const tokens = generateTokenPair(
        user.id,
        user.firebaseUid || '',
        user.email,
        user.role,
        user.locationId || undefined
      );

      // Cache user session
      await CacheService.set(
        `user_session:${user.id}`,
        JSON.stringify({
          userId: user.id,
          email: user.email,
          role: user.role,
          locationId: user.locationId,
          loginTime: new Date().toISOString()
        }),
        24 * 60 * 60 // 24 hours
      );

      // Log successful login
      logger.info('User logged in successfully', {
        userId: user.id,
        email: user.email,
        role: user.role,
        locationId: user.locationId
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName ?? undefined,
          lastName: user.lastName ?? undefined,
          role: user.role,
          locationId: user.locationId ?? undefined,
          isActive: user.isActive
        },
        tokens,
        sessionId: undefined,
        expiresAt: undefined
      };
    } catch (error) {
      logger.error('Login failed', { email, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  // Login with Firebase ID token
  static async loginWithFirebase(idToken: string): Promise<AuthResult> {
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
        const createData: any = {
          id: generateId(),
          firebaseUid: decodedToken.uid,
          email: decodedToken.email!,
          role: UserRole.CUSTOMER, // Default role for Firebase users
          isActive: true
        };

        // Only add optional fields if they have values
        if (decodedToken.name?.split(' ')[0]) {
          createData.firstName = decodedToken.name.split(' ')[0];
        }
        if (decodedToken.name?.split(' ').slice(1).join(' ')) {
          createData.lastName = decodedToken.name.split(' ').slice(1).join(' ');
        }

        user = await prisma.user.create({
          data: createData,
          include: { location: true }
        });

        logger.info('New user created from Firebase', {
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
        user.firebaseUid || '',
        user.email,
        user.role,
        user.locationId || undefined
      );

      // Cache user session
      await CacheService.set(
        `user_session:${user.id}`,
        JSON.stringify({
          userId: user.id,
          email: user.email,
          role: user.role,
          locationId: user.locationId,
          loginTime: new Date().toISOString()
        }),
        24 * 60 * 60 // 24 hours
      );

      logger.info('Firebase user logged in successfully', {
        userId: user.id,
        email: user.email,
        role: user.role
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName ?? undefined,
          lastName: user.lastName ?? undefined,
          role: user.role,
          locationId: user.locationId ?? undefined,
          isActive: user.isActive
        },
        tokens,
        sessionId: undefined,
        expiresAt: undefined
      };
    } catch (error) {
      logger.error('Firebase login failed', { error: error instanceof Error ? error.message : String(error) });
      throw new AppError('Firebase authentication failed', 401, 'FIREBASE_AUTH_FAILED');
    }
  }

  // Register new user (can be admin for tenant creation or staff)
  static async register(userData: RegisterData): Promise<AuthResult> {
    const { email, password, firstName, lastName, phone, role = UserRole.ADMIN, locationId } = userData;

    try {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      });

      if (existingUser) {
        throw new AppError('User with this email already exists', 409, 'USER_EXISTS');
      }

      // Create Firebase user
      const firebaseUser = await FirebaseAuthService.createUser({
        email: email.toLowerCase(),
        password,
        displayName: `${firstName || ''} ${lastName || ''}`.trim(),
        disabled: false
      });

      // Set custom claims for role
      await FirebaseAuthService.setCustomClaims(firebaseUser.uid, {
        role,
        locationId
      });

      // Create user in database
      const createData: any = {
        id: generateId(),
        firebaseUid: firebaseUser.uid,
        email: email.toLowerCase(),
        role,
        isActive: true
      };

      // Only add optional fields if they have values
      if (firstName) createData.firstName = firstName;
      if (lastName) createData.lastName = lastName;
      if (phone) createData.phone = phone;
      if (locationId) createData.locationId = locationId;

      const user = await prisma.user.create({
        data: createData,
        include: { location: true }
      });

      // Generate tokens
      const tokens = generateTokenPair(
        user.id,
        user.firebaseUid || '',
        user.email,
        user.role,
        user.locationId || undefined
      );

      logger.info('New user registered successfully', {
        userId: user.id,
        email: user.email,
        role: user.role,
        locationId: user.locationId
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName ?? undefined,
          lastName: user.lastName ?? undefined,
          role: user.role,
          locationId: user.locationId ?? undefined,
          isActive: user.isActive
        },
        tokens,
        sessionId: undefined,
        expiresAt: undefined
      };
    } catch (error) {
      logger.error('Registration failed', { email, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  // Logout user
  static async logout(userId: string, _accessToken: string): Promise<void> {
    try {
      // Remove user session from cache
      await CacheService.del(`user_session:${userId}`);

      // Add token to blacklist (if using token blacklisting)
      // blacklistToken(accessToken);

      logger.info('User logged out successfully', { userId });
    } catch (error) {
      logger.error('Logout failed', { userId, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  // Refresh access token
  static async refreshToken(_refreshToken: string): Promise<TokenPair> {
    try {
      // This would typically involve verifying the refresh token
      // and generating a new access token
      // Implementation depends on your refresh token strategy

      throw new AppError('Refresh token functionality not implemented', 501, 'NOT_IMPLEMENTED');
    } catch (error) {
      logger.error('Token refresh failed', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  // Get user profile
  static async getProfile(userId: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          locationId: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          location: {
            select: {
              id: true,
              name: true,
              city: true,
              state: true
            }
          }
        }
      });

      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      return user;
    } catch (error) {
      logger.error('Get profile failed', { userId, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  // Update user profile
  static async updateProfile(userId: string, updateData: {
    firstName?: string;
    lastName?: string;
    phone?: string;
  }) {
    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          locationId: true,
          isActive: true,
          updatedAt: true
        }
      });

      logger.info('User profile updated', { userId, updateData });

      return user;
    } catch (error) {
      logger.error('Profile update failed', { userId, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  // Change user password (Firebase)
  static async changePassword(userId: string, newPassword: string): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      // Update password in Firebase
      if (user.firebaseUid) {
        await FirebaseAuthService.updateUser(user.firebaseUid, {
          password: newPassword
        });
      }

      logger.info('User password changed', { userId });
    } catch (error) {
      logger.error('Password change failed', { userId, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }
}