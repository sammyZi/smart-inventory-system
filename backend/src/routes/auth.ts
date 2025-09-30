import express from 'express';
import { AuthServiceV2 } from '../services/authServiceV2';
import { authenticateJWT } from '../middleware/auth';
import { validate } from '../utils/validation';
import { asyncHandler } from '../middleware/errorHandler';
import { createResponse } from '../utils/helpers';
import { logger } from '../utils/logger';
import { loginRateLimit, registerRateLimit, passwordResetRateLimit } from '../middleware/rateLimiter';
import { handleTokenRefresh } from '../middleware/tokenRefresh';
import { auditAuth } from '../middleware/auditLogger';
import Joi from 'joi';
import { AuthenticatedRequest } from '../types';
import { AuthService } from '../services/authService';
import { AuthService } from '../services/authService';
import { AuthService } from '../services/authService';
import { AuthService } from '../services/authService';
import { AuthService } from '../services/authService';
import { AuthService } from '../services/authService';

const router = express.Router();

// Validation schemas
const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  rememberMe: Joi.boolean().default(false),
  deviceId: Joi.string().optional()
});

const firebaseLoginSchema = Joi.object({
  idToken: Joi.string().required(),
  rememberMe: Joi.boolean().default(false),
  deviceId: Joi.string().optional()
});

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  firstName: Joi.string().min(1).max(50),
  lastName: Joi.string().min(1).max(50),
  phone: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/),
  role: Joi.string().valid('ADMIN', 'MANAGER', 'STAFF', 'CUSTOMER').default('STAFF'),
  locationId: Joi.string()
});

const updateProfileSchema = Joi.object({
  firstName: Joi.string().min(1).max(50),
  lastName: Joi.string().min(1).max(50),
  phone: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/)
});

const changePasswordSchema = Joi.object({
  newPassword: Joi.string().min(6).required()
});

// POST /api/v1/auth/login - Enhanced login with rate limiting
router.post('/login', 
  loginRateLimit,
  auditAuth('LOGIN'),
  validate(loginSchema), 
  asyncHandler(async (req, res) => {
    const { email, password, rememberMe, deviceId } = req.body;

    logger.info('Enhanced login attempt', { 
      email, 
      ip: req.ip, 
      rememberMe, 
      deviceId,
      userAgent: req.get('User-Agent')
    });

    const result = await AuthServiceV2.login(
      { email, password, rememberMe, deviceId },
      req.ip,
      req.get('User-Agent')
    );

  // Set HTTP-only cookie for refresh token (optional)
  res.cookie('refreshToken', result.tokens.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  res.json(createResponse({
    user: result.user,
    accessToken: result.tokens.accessToken,
    sessionId: result.sessionId,
    expiresAt: result.expiresAt,
    sessionInfo: result.sessionInfo
  }, 'Enhanced login successful'));
}));

// POST /api/v1/auth/firebase-login - Login with Firebase ID token
router.post('/firebase-login', validate(firebaseLoginSchema), asyncHandler(async (req, res) => {
  const { idToken } = req.body;

  logger.info('Firebase login attempt', { ip: req.ip });

  const result = await AuthService.loginWithFirebase(idToken);

  // Set HTTP-only cookie for refresh token (optional)
  res.cookie('refreshToken', result.tokens.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  res.json(createResponse({
    user: result.user,
    accessToken: result.tokens.accessToken
  }, 'Firebase login successful'));
}));

// POST /api/v1/auth/register - Register new user
router.post('/register', validate(registerSchema), asyncHandler(async (req, res) => {
  const userData = req.body;

  logger.info('Registration attempt', { email: userData.email, ip: req.ip });

  const result = await AuthService.register(userData);

  // Set HTTP-only cookie for refresh token (optional)
  res.cookie('refreshToken', result.tokens.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  res.status(201).json(createResponse({
    user: result.user,
    accessToken: result.tokens.accessToken
  }, 'Registration successful'));
}));

// POST /api/v1/auth/logout - Logout user
router.post('/logout', authenticateJWT, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const accessToken = req.headers.authorization!.substring(7);

  await AuthService.logout(userId, accessToken);

  // Clear refresh token cookie
  res.clearCookie('refreshToken');

  res.json(createResponse(null, 'Logout successful'));
}));

// POST /api/v1/auth/refresh - Enhanced token refresh
router.post('/refresh', handleTokenRefresh);

// GET /api/v1/auth/profile - Get user profile
router.get('/profile', authenticateJWT, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;

  const profile = await AuthService.getProfile(userId);

  res.json(createResponse(profile, 'Profile retrieved successfully'));
}));

// PUT /api/v1/auth/profile - Update user profile
router.put('/profile', authenticateJWT, validate(updateProfileSchema), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const updateData = req.body;

  const updatedProfile = await AuthService.updateProfile(userId, updateData);

  res.json(createResponse(updatedProfile, 'Profile updated successfully'));
}));

// POST /api/v1/auth/change-password - Change user password
router.post('/change-password', authenticateJWT, validate(changePasswordSchema), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id;
  const { newPassword } = req.body;

  await AuthService.changePassword(userId, newPassword);

  res.json(createResponse(null, 'Password changed successfully'));
}));

// GET /api/v1/auth/verify - Verify token validity
router.get('/verify', authenticateJWT, asyncHandler(async (req: AuthenticatedRequest, res) => {
  res.json(createResponse({
    valid: true,
    user: {
      id: req.user!.id,
      email: req.user!.email,
      role: req.user!.role,
      locationId: req.user!.locationId
    }
  }, 'Token is valid'));
}));

// GET /api/v1/auth/me - Get current user info (alternative to profile)
router.get('/me', authenticateJWT, asyncHandler(async (req: AuthenticatedRequest, res) => {
  res.json(createResponse({
    id: req.user!.id,
    email: req.user!.email,
    role: req.user!.role,
    locationId: req.user!.locationId
  }, 'Current user info'));
}));

export default router;