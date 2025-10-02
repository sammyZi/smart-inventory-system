import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { TenantService } from '../services/tenantService';
import { SaaSService } from '../services/saasService';
import { logger } from '../utils/logger';
import { AppError } from './errorHandler';
import { AuthenticatedRequest } from '../types';

// Middleware to ensure user is an admin (tenant owner)
export const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new AppError('Authentication required', 401, 'NOT_AUTHENTICATED'));
  }

  if (req.user.role !== UserRole.ADMIN) {
    logger.warn('Non-admin attempted admin action', {
      userId: req.user.id,
      userRole: req.user.role,
      endpoint: req.path,
      ip: req.ip
    });
    
    return next(new AppError('Admin access required', 403, 'ADMIN_REQUIRED'));
  }

  next();
};

// Middleware to check location access (multi-tenant security)
export const requireLocationAccess = async (
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
) => {
  if (!req.user) {
    return next(new AppError('Authentication required', 401, 'NOT_AUTHENTICATED'));
  }

  // Get location ID from params, query, or body
  const locationId = req.params.locationId || req.query.locationId || req.body.locationId;

  if (!locationId) {
    return next(new AppError('Location ID required', 400, 'LOCATION_ID_REQUIRED'));
  }

  try {
    const hasAccess = await TenantService.checkLocationAccess(req.user.id, locationId as string);
    
    if (!hasAccess) {
      logger.warn('Unauthorized location access attempt', {
        userId: req.user.id,
        userRole: req.user.role,
        requestedLocationId: locationId,
        userLocationId: req.user.locationId,
        endpoint: req.path,
        ip: req.ip
      });
      
      return next(new AppError('Access denied for this location', 403, 'LOCATION_ACCESS_DENIED'));
    }

    next();
  } catch (error) {
    logger.error('Location access check failed', {
      userId: req.user.id,
      locationId,
      error: error.message
    });
    
    next(new AppError('Failed to verify location access', 500, 'ACCESS_CHECK_FAILED'));
  }
};

// Middleware to ensure user can only access their own tenant data
export const requireTenantAccess = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new AppError('Authentication required', 401, 'NOT_AUTHENTICATED'));
  }

  // Get target user ID from params
  const targetUserId = req.params.userId || req.params.staffId;
  
  if (targetUserId) {
    // Admin can access their own data or their staff's data
    if (req.user.role === UserRole.ADMIN) {
      // Admin accessing their own data
      if (targetUserId === req.user.id) {
        return next();
      }
      
      // Admin accessing staff data - will be verified in the service layer
      return next();
    }
    
    // Non-admin can only access their own data
    if (targetUserId !== req.user.id) {
      logger.warn('Unauthorized user data access attempt', {
        userId: req.user.id,
        targetUserId,
        userRole: req.user.role,
        endpoint: req.path,
        ip: req.ip
      });
      
      return next(new AppError('Access denied', 403, 'ACCESS_DENIED'));
    }
  }

  next();
};

// Middleware to filter data by tenant (for list endpoints)
export const addTenantFilter = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new AppError('Authentication required', 401, 'NOT_AUTHENTICATED'));
  }

  // Add tenant filtering to request context
  (req as any).tenantFilter = {
    userId: req.user.id,
    role: req.user.role,
    locationId: req.user.locationId
  };

  next();
};

// Middleware to ensure staff can only access their assigned location
export const requireOwnLocation = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new AppError('Authentication required', 401, 'NOT_AUTHENTICATED'));
  }

  // Admins can access any of their locations
  if (req.user.role === UserRole.ADMIN) {
    return next();
  }

  // Staff/Manager must have a location assigned
  if (!req.user.locationId) {
    return next(new AppError('No location assigned', 403, 'NO_LOCATION_ASSIGNED'));
  }

  // Get requested location ID
  const requestedLocationId = req.params.locationId || req.query.locationId || req.body.locationId;

  // If location is specified, it must match user's location
  if (requestedLocationId && requestedLocationId !== req.user.locationId) {
    logger.warn('Staff attempted to access different location', {
      userId: req.user.id,
      userRole: req.user.role,
      userLocationId: req.user.locationId,
      requestedLocationId,
      endpoint: req.path,
      ip: req.ip
    });
    
    return next(new AppError('Access denied for this location', 403, 'LOCATION_ACCESS_DENIED'));
  }

  next();
};

// Middleware to enforce tenant isolation
export const enforceTenantIsolation = async (
  req: AuthenticatedRequest, 
  res: Response, 
  next: NextFunction
) => {
  if (!req.user) {
    return next(new AppError('Authentication required', 401, 'NOT_AUTHENTICATED'));
  }

  try {
    // Add tenant context to request
    const adminId = SaaSService.getAdminIdFromUser(req.user);
    req.tenantId = adminId;
    req.isAdmin = req.user.role === UserRole.ADMIN;

    // If accessing another user's data, verify tenant access
    const targetUserId = req.params.userId || req.params.staffId || req.body.userId;
    if (targetUserId && targetUserId !== req.user.id) {
      const hasAccess = await SaaSService.verifyTenantAccess(req.user.id, targetUserId);
      if (!hasAccess) {
        logger.warn('Cross-tenant access attempt blocked', {
          requestingUserId: req.user.id,
          targetUserId,
          endpoint: req.path,
          ip: req.ip
        });
        return next(new AppError('Access denied - tenant isolation', 403, 'TENANT_ISOLATION_VIOLATION'));
      }
    }

    next();

  } catch (error) {
    logger.error('Tenant isolation check failed:', error);
    return next(new AppError('Tenant verification failed', 500, 'TENANT_CHECK_ERROR'));
  }
};

// Combined middleware for common tenant operations
export const tenantAuth = {
  admin: requireAdmin,
  location: requireLocationAccess,
  tenant: requireTenantAccess,
  ownLocation: requireOwnLocation,
  filter: addTenantFilter,
  isolate: enforceTenantIsolation
};