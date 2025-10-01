import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import { prisma } from '../config/database';
import { FirebaseAuthService } from '../config/firebase';
import { logger } from '../utils/logger';
import { AppError } from './errorHandler';
import { AuthenticatedRequest, JWTPayload } from '../types';

// JWT Authentication Middleware
export const authenticateJWT = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new AppError('Authentication token required', 401, 'MISSING_TOKEN');
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;

        // Get user from database
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            include: { location: true }
        });

        if (!user || !user.isActive) {
            throw new AppError('User not found or inactive', 401, 'USER_NOT_FOUND');
        }

        // Attach user to request
        req.user = {
            id: user.id,
            firebaseUid: user.firebaseUid || '',
            email: user.email,
            role: user.role,
            locationId: user.locationId ?? undefined
        };

        logger.info('User authenticated', {
            userId: user.id,
            email: user.email,
            role: user.role,
            ip: req.ip
        });

        next();
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            return next(new AppError('Invalid authentication token', 401, 'INVALID_TOKEN'));
        }
        if (error instanceof jwt.TokenExpiredError) {
            return next(new AppError('Authentication token expired', 401, 'TOKEN_EXPIRED'));
        }
        next(error);
    }
};

// Firebase Authentication Middleware (Alternative)
export const authenticateFirebase = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new AppError('Authentication token required', 401, 'MISSING_TOKEN');
        }

        const idToken = authHeader.substring(7);

        // Verify Firebase ID token
        const decodedToken = await FirebaseAuthService.verifyIdToken(idToken);

        // Get user from database
        const user = await prisma.user.findUnique({
            where: { firebaseUid: decodedToken.uid },
            include: { location: true }
        });

        if (!user || !user.isActive) {
            throw new AppError('User not found or inactive', 401, 'USER_NOT_FOUND');
        }

        // Attach user to request
        req.user = {
            id: user.id,
            firebaseUid: user.firebaseUid || '',
            email: user.email,
            role: user.role,
            locationId: user.locationId ?? undefined
        };

        logger.info('User authenticated via Firebase', {
            userId: user.id,
            email: user.email,
            role: user.role,
            ip: req.ip
        });

        next();
    } catch (error) {
        logger.error('Firebase authentication failed:', error);
        next(new AppError('Invalid authentication token', 401, 'INVALID_TOKEN'));
    }
};

// Role-based Authorization Middleware
export const authorize = (...allowedRoles: UserRole[]) => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return next(new AppError('Authentication required', 401, 'NOT_AUTHENTICATED'));
        }

        if (!allowedRoles.includes(req.user.role)) {
            logger.warn('Unauthorized access attempt', {
                userId: req.user.id,
                userRole: req.user.role,
                requiredRoles: allowedRoles,
                endpoint: req.path,
                ip: req.ip
            });

            return next(new AppError('Insufficient permissions', 403, 'INSUFFICIENT_PERMISSIONS'));
        }

        next();
    };
};

// Location-based Authorization Middleware
export const authorizeLocation = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
        return next(new AppError('Authentication required', 401, 'NOT_AUTHENTICATED'));
    }

    // Admin can access all locations
    if (req.user.role === UserRole.ADMIN) {
        return next();
    }

    // Get location ID from request (params, query, or body)
    const requestedLocationId = req.params.locationId || req.query.locationId || req.body.locationId;

    // If no location specified and user has a location, allow
    if (!requestedLocationId && req.user.locationId) {
        return next();
    }

    // Check if user can access the requested location
    if (requestedLocationId && req.user.locationId !== requestedLocationId) {
        logger.warn('Location access denied', {
            userId: req.user.id,
            userLocation: req.user.locationId,
            requestedLocation: requestedLocationId,
            endpoint: req.path,
            ip: req.ip
        });

        return next(new AppError('Access denied for this location', 403, 'LOCATION_ACCESS_DENIED'));
    }

    next();
};

// Optional Authentication Middleware (for public endpoints with optional auth)
export const optionalAuth = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next(); // Continue without authentication
        }

        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;

        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            include: { location: true }
        });

        if (user && user.isActive) {
            req.user = {
                id: user.id,
                firebaseUid: user.firebaseUid || '',
                email: user.email,
                role: user.role,
                locationId: user.locationId ?? undefined
            };
        }

        next();
    } catch (error) {
        // Ignore authentication errors for optional auth
        next();
    }
};

// Admin Only Middleware
export const adminOnly = authorize(UserRole.ADMIN);

// Manager and Admin Middleware
export const managerOrAdmin = authorize(UserRole.MANAGER, UserRole.ADMIN);

// Staff and above Middleware
export const staffAndAbove = authorize(UserRole.STAFF, UserRole.MANAGER, UserRole.ADMIN);