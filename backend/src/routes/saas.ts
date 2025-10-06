/**
 * SaaS Multi-Tenant Routes
 * Handles admin registration and tenant-scoped user management
 */

import express, { Request, Response } from 'express';
import { SaaSService } from '../services/saasService';
import { authenticateJWT } from '../middleware/auth';
import { requireAdmin } from '../middleware/tenantAuth';
import { validate } from '../middleware/validation';
import { auditCustomAction } from '../middleware/auditLogger';
import { apiRateLimit } from '../middleware/rateLimiter';
import { logger } from '../utils/logger';
import Joi from 'joi';
import { AuthenticatedRequest } from '../types';

const router = express.Router();

// Validation schemas
const adminSignupSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  firstName: Joi.string().min(1).max(50).required(),
  lastName: Joi.string().min(1).max(50).required(),
  phone: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/).optional(),
  companyName: Joi.string().min(1).max(100).required(),
  businessType: Joi.string().max(50).optional(),
  timezone: Joi.string().default('UTC'),
  currency: Joi.string().length(3).default('USD')
});

const createStaffSchema = Joi.object({
  email: Joi.string().email().required(),
  firstName: Joi.string().min(1).max(50).required(),
  lastName: Joi.string().min(1).max(50).required(),
  phone: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/).optional(),
  role: Joi.string().valid('MANAGER', 'STAFF').required(),
  locationId: Joi.string().required(),
  permissions: Joi.array().items(Joi.string()).optional()
});

const createLocationSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  address: Joi.string().max(200).optional(),
  city: Joi.string().max(100).optional(),
  state: Joi.string().max(100).optional(),
  zipCode: Joi.string().max(20).optional(),
  country: Joi.string().max(100).optional(),
  phone: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/).optional(),
  email: Joi.string().email().optional(),
  timezone: Joi.string().default('UTC'),
  currency: Joi.string().length(3).default('USD'),
  taxRate: Joi.number().min(0).max(1).precision(4).default(0)
});

/**
 * POST /api/v1/saas/admin/signup
 * Register a new admin account (independent tenant)
 * This creates a completely separate tenant with their own data scope
 */
router.post('/admin/signup',
  apiRateLimit,
  validate(adminSignupSchema),
  auditCustomAction('CREATE', 'ADMIN_SIGNUP'),
  async (req: Request, res: Response) => {
    try {
      const adminData = req.body;

      // Create new admin tenant
      const result = await SaaSService.createAdminTenant(adminData);

      logger.info('New admin tenant created:', {
        adminId: result.admin.id,
        email: result.admin.email,
        companyName: adminData.companyName
      });

      return res.status(201).json({
        success: true,
        message: 'Admin account created successfully',
        data: {
          admin: {
            id: result.admin.id,
            email: result.admin.email,
            firstName: result.admin.firstName,
            lastName: result.admin.lastName,
            role: result.admin.role
          },
          mainLocation: {
            id: result.mainLocation.id,
            name: result.mainLocation.name
          },
          accessToken: result.accessToken,
          refreshToken: result.refreshToken
        }
      });

    } catch (error) {
      logger.error('Admin signup failed:', error);

      if (error instanceof Error && error.message.includes('already exists')) {
        return res.status(409).json({
          success: false,
          error: 'Account already exists',
          message: 'An account with this email already exists'
        });
      }

      return res.status(500).json({
        success: false,
        error: 'Signup failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * POST /api/v1/saas/locations
 * Create a new location/store under the admin's tenant
 * Only accessible by authenticated admins
 */
router.post('/locations',
  authenticateJWT,
  requireAdmin,
  validate(createLocationSchema),
  auditCustomAction('CREATE', 'LOCATION'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const locationData = req.body;
      const adminId = req.user!.id;

      const location = await SaaSService.createLocation(adminId, locationData);

      logger.info('New location created:', {
        locationId: location.id,
        adminId,
        locationName: location.name
      });

      res.status(201).json({
        success: true,
        message: 'Location created successfully',
        data: location
      });

    } catch (error) {
      logger.error('Location creation failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create location',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * POST /api/v1/saas/staff
 * Create staff/manager under the admin's tenant
 * Staff is always linked to both the admin and a specific location
 */
router.post('/staff',
  authenticateJWT,
  requireAdmin,
  validate(createStaffSchema),
  auditCustomAction('CREATE', 'STAFF'),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const staffData = req.body;
      const adminId = req.user!.id;

      // Verify the location belongs to this admin
      const locationExists = await SaaSService.verifyLocationOwnership(adminId, staffData.locationId);
      if (!locationExists) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          message: 'Location not found or access denied'
        });
      }

      const staff = await SaaSService.createStaffUser(adminId, staffData);

      logger.info('New staff user created:', {
        staffId: staff.id,
        adminId,
        locationId: staffData.locationId,
        role: staffData.role
      });

      res.status(201).json({
        success: true,
        message: 'Staff user created successfully',
        data: {
          id: staff.id,
          email: staff.email,
          firstName: staff.firstName,
          lastName: staff.lastName,
          role: staff.role,
          locationId: staff.locationId,
          isActive: staff.isActive
        }
      });

    } catch (error) {
      logger.error('Staff creation failed:', error);

      if (error instanceof Error && error.message.includes('already exists')) {
        return res.status(409).json({
          success: false,
          error: 'User already exists',
          message: 'A user with this email already exists'
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to create staff user',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * GET /api/v1/saas/locations
 * Get all locations owned by the authenticated admin
 */
router.get('/locations',
  authenticateJWT,
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const adminId = req.user!.id;
      const locations = await SaaSService.getAdminLocations(adminId);

      res.json({
        success: true,
        data: locations
      });

    } catch (error) {
      logger.error('Failed to fetch locations:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch locations',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * GET /api/v1/saas/staff
 * Get all staff users under the admin's tenant
 */
router.get('/staff',
  authenticateJWT,
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const adminId = req.user!.id;
      const locationId = req.query.locationId as string;

      const staff = await SaaSService.getAdminStaff(adminId, locationId);

      res.json({
        success: true,
        data: staff
      });

    } catch (error) {
      logger.error('Failed to fetch staff:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch staff',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * GET /api/v1/saas/tenant/info
 * Get tenant information for the authenticated admin
 */
router.get('/tenant/info',
  authenticateJWT,
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const adminId = req.user!.id;
      const tenantInfo = await SaaSService.getTenantInfo(adminId);

      res.json({
        success: true,
        data: tenantInfo
      });

    } catch (error) {
      logger.error('Failed to fetch tenant info:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch tenant information',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * GET /api/v1/saas/analytics
 * Get advanced analytics for the tenant
 */
router.get('/analytics',
  authenticateJWT,
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const period = (req.query.period as 'day' | 'week' | 'month' | 'year') || 'month';

      // Mock analytics data - implement actual method in AnalyticsService
      const analytics = {
        period,
        tenantCount: 10,
        activeUsers: 150,
        revenue: 25000,
        growth: 15.5
      };

      res.json({
        success: true,
        data: analytics
      });

    } catch (error) {
      logger.error('Failed to fetch analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch analytics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * GET /api/v1/saas/security/report
 * Get security report for the tenant
 */
router.get('/security/report',
  authenticateJWT,
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Mock security report - implement actual method in SecurityService
      const securityReport = {
        threatLevel: 'LOW',
        activeThreats: 0,
        blockedAttempts: 25,
        lastScan: new Date(),
        recommendations: ['Enable 2FA for all users', 'Update security policies']
      };

      res.json({
        success: true,
        data: securityReport
      });

    } catch (error) {
      logger.error('Failed to fetch security report:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch security report',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * PUT /api/v1/saas/staff/:staffId
 * Update staff user (admin can only update their own staff)
 */
router.put('/staff/:staffId',
  authenticateJWT,
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { staffId } = req.params;
      const adminId = req.user!.id;
      const updateData = req.body;

      // Verify staff belongs to this admin
      const staffExists = await SaaSService.verifyStaffOwnership(adminId, staffId);
      if (!staffExists) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          message: 'Staff user not found or access denied'
        });
      }

      const updatedStaff = await SaaSService.updateStaffUser(staffId, updateData);

      res.json({
        success: true,
        message: 'Staff user updated successfully',
        data: updatedStaff
      });

    } catch (error) {
      logger.error('Staff update failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update staff user',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * DELETE /api/v1/saas/staff/:staffId
 * Deactivate staff user (soft delete)
 */
router.delete('/staff/:staffId',
  authenticateJWT,
  requireAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { staffId } = req.params;
      const adminId = req.user!.id;

      // Verify staff belongs to this admin
      const staffExists = await SaaSService.verifyStaffOwnership(adminId, staffId);
      if (!staffExists) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          message: 'Staff user not found or access denied'
        });
      }

      await SaaSService.deactivateStaffUser(staffId);

      res.json({
        success: true,
        message: 'Staff user deactivated successfully'
      });

    } catch (error) {
      logger.error('Staff deactivation failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to deactivate staff user',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

export default router;