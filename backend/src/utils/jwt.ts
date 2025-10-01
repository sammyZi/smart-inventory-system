import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import { JWTPayload } from '../types';
import { logger } from './logger';
import { getErrorMessage } from './errorHandler';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface RefreshTokenPayload {
  userId: string;
  tokenVersion: number;
  iat: number;
  exp: number;
}

// Get role-based session timeout
const getRoleBasedTimeout = (role: UserRole, rememberMe: boolean = false): string => {
  if (rememberMe) {
    return process.env.REMEMBER_ME_DURATION || '30d';
  }

  switch (role) {
    case UserRole.ADMIN:
      return process.env.SESSION_TIMEOUT_ADMIN || '8h';
    case UserRole.MANAGER:
      return process.env.SESSION_TIMEOUT_MANAGER || '12h';
    case UserRole.STAFF:
      return process.env.SESSION_TIMEOUT_STAFF || '8h';
    case UserRole.CUSTOMER:
      return process.env.SESSION_TIMEOUT_CUSTOMER || '24h';
    default:
      return '1h';
  }
};

// Generate JWT access token with role-based expiration
export const generateAccessToken = (
  userId: string,
  firebaseUid: string,
  email: string,
  role: UserRole,
  locationId?: string,
  rememberMe: boolean = false
): string => {
  const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
    userId,
    firebaseUid,
    email,
    role,
    locationId: locationId ?? undefined
  };

  // Short-lived access tokens for security
  const expiresIn = rememberMe ? '1h' : (process.env.JWT_ACCESS_EXPIRES_IN || '15m');

  return jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn,
    issuer: 'smart-inventory-api',
    audience: 'smart-inventory-client'
  } as jwt.SignOptions);
};

// Generate JWT refresh token with role-based expiration
export const generateRefreshToken = (
  userId: string, 
  role: UserRole,
  tokenVersion: number = 0,
  rememberMe: boolean = false
): string => {
  const payload = {
    userId,
    tokenVersion,
    role
  };

  const expiresIn = getRoleBasedTimeout(role, rememberMe);

  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
    expiresIn,
    issuer: 'smart-inventory-api',
    audience: 'smart-inventory-client'
  } as jwt.SignOptions);
};

// Generate both access and refresh tokens
export const generateTokenPair = (
  userId: string,
  firebaseUid: string,
  email: string,
  role: UserRole,
  locationId?: string,
  tokenVersion: number = 0,
  rememberMe: boolean = false
): TokenPair => {
  const accessToken = generateAccessToken(userId, firebaseUid, email, role, locationId, rememberMe);
  const refreshToken = generateRefreshToken(userId, role, tokenVersion, rememberMe);

  logger.info('Token pair generated', {
    userId,
    email,
    role,
    locationId,
    rememberMe,
    accessTokenExpiry: rememberMe ? '1h' : '15m',
    refreshTokenExpiry: getRoleBasedTimeout(role, rememberMe)
  });

  return {
    accessToken,
    refreshToken
  };
};

// Verify access token
export const verifyAccessToken = (token: string): JWTPayload => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET!, {
      issuer: 'smart-inventory-api',
      audience: 'smart-inventory-client'
    }) as JWTPayload;
  } catch (error) {
    logger.error('Access token verification failed:', getErrorMessage(error));
    throw error;
  }
};

// Verify refresh token
export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET!, {
      issuer: 'smart-inventory-api',
      audience: 'smart-inventory-client'
    }) as RefreshTokenPayload;
  } catch (error) {
    logger.error('Refresh token verification failed:', getErrorMessage(error));
    throw error;
  }
};

// Decode token without verification (for debugging)
export const decodeToken = (token: string): any => {
  return jwt.decode(token);
};

// Get token expiration time
export const getTokenExpiration = (token: string): Date | null => {
  try {
    const decoded = jwt.decode(token) as any;
    if (decoded && decoded.exp) {
      return new Date(decoded.exp * 1000);
    }
    return null;
  } catch (error) {
    return null;
  }
};

// Check if token is expired
export const isTokenExpired = (token: string): boolean => {
  const expiration = getTokenExpiration(token);
  if (!expiration) return true;
  return expiration < new Date();
};

// Extract user ID from token without verification
export const extractUserIdFromToken = (token: string): string | null => {
  try {
    const decoded = jwt.decode(token) as any;
    return decoded?.userId || null;
  } catch (error) {
    return null;
  }
};

// Token blacklist utilities (for logout)
const tokenBlacklist = new Set<string>();

export const blacklistToken = (token: string): void => {
  tokenBlacklist.add(token);
  
  // Clean up expired tokens periodically
  setTimeout(() => {
    if (isTokenExpired(token)) {
      tokenBlacklist.delete(token);
    }
  }, 24 * 60 * 60 * 1000); // Clean up after 24 hours
};

export const isTokenBlacklisted = (token: string): boolean => {
  return tokenBlacklist.has(token);
};

// Validate token format
export const isValidTokenFormat = (token: string): boolean => {
  // JWT tokens have 3 parts separated by dots
  const parts = token.split('.');
  return parts.length === 3;
};