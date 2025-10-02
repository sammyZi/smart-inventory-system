import express from 'express';
import { TenantService } from '../services/tenantService';
import { authenticateJWT } from '../middleware/auth';
import { tenantAuth } from '../middleware/tenantAuth';
import { validate } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import { createResponse } from '../utils/helpers';
import { auditCustomAction } from '../middleware/auditLogger';
import Joi from 'joi';
import { AuthenticatedRequest } from '../types';

const router = express.Router();

// Validation schemas
const createLocationSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  address: Joi.string().max(200),
  city: Joi.string().max(100),
  state: Joi.string().max(100),
  zipCode: Joi.string().max(20),
  country: Joi.string().max(100),
  phone: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/),
  email: Joi.string().email(),
  timezone: Joi.string().default('UTC'),
  currency: Joi.string().length(3).default('USD'),
  taxRate: Joi.number().min(0).max(1).precision(4).default(0)
});

const createStaffSchema = Joi.object({
  email: Joi.string().email().required(),
  firstName: Joi.string().min(1).max(50).required(),
  lastName: Joi.string().min(1).max(50),
  phone: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/),
  role: Joi.string().valid('MANAGER', 'STAFF').required(),
  locationId: Joi.string().required()
});

const updateLocationSchema = Joi.object({
  name: Joi.string().min(1).max(100),
  address: Joi.string().max(200),
  city: Joi.string().max(100),
  state: Joi.string().max(100),
  zipCode: Joi.string().max(20),
  country: Joi.string().max(100),
  phone: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/),
  email: Joi.string().email(),
  timezone: Joi.string(),
  currency: Joi.string().length(3),
  taxRate: Joi.number().min(0).max(1).precision(4)
});

// GET /api/v1/tenant/info - Get tenant overview
router.get('/info', 
  authenticateJWT,
  tenantAuth.admin,
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const adminId = req.user!.id;
    
    const tenantInfo = await TenantService.getTenantInfo(adminId);
    
    res.json(createResponse(tenantInfo, 'Tenant info retrieved successfully'));
  })
);

// GET /api/v1/tenant/locations - Get admin's locations
router.get('/locations',
  authenticateJWT,
  tenantAuth.admin,
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const adminId = req.user!.id;
    
    const locations = await TenantService.getAdminLocations(adminId);
    
    res.json(createResponse(locations, 'Locations retrieved successfully'));
  })
);

// POST /api/v1/tenant/locations - Create new location
router.post('/locations',
  authenticateJWT,
  tenantAuth.admin,
  auditCustomAction('CREATE_LOCATION', 'LOCATION'),
  validate(createLocationSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const adminId = req.user!.id;
    const locationData = req.body;
    
    const location = await TenantService.createLocation(adminId, locationData);
    
    res.status(201).json(createResponse(location, 'Location created successfully'));
  })
);

// PUT /api/v1/tenant/locations/:locationId - Update location
router.put('/locations/:locationId',
  authenticateJWT,
  tenantAuth.admin,
  auditCustomAction('UPDATE_LOCATION', 'LOCATION', (req) => req.params.locationId),
  validate(updateLocationSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const adminId = req.user!.id;
    const locationId = req.params.locationId;
    const updateData = req.body;
    
    const location = await TenantService.updateLocation(adminId, locationId, updateData);
    
    res.json(createResponse(location, 'Location updated successfully'));
  })
);

// GET /api/v1/tenant/staff - Get admin's staff
router.get('/staff',
  authenticateJWT,
  tenantAuth.admin,
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const adminId = req.user!.id;
    const locationId = req.query.locationId as string;
    
    const staff = await TenantService.getAdminStaff(adminId, locationId);
    
    res.json(createResponse(staff, 'Staff retrieved successfully'));
  })
);

// POST /api/v1/tenant/staff - Add staff member
router.post('/staff',
  authenticateJWT,
  tenantAuth.admin,
  auditCustomAction('CREATE_STAFF', 'USER'),
  validate(createStaffSchema),
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const adminId = req.user!.id;
    const staffData = req.body;
    
    const staff = await TenantService.createStaff(adminId, staffData);
    
    res.status(201).json(createResponse(staff, 'Staff member created successfully'));
  })
);

// DELETE /api/v1/tenant/staff/:staffId - Deactivate staff member
router.delete('/staff/:staffId',
  authenticateJWT,
  tenantAuth.admin,
  auditCustomAction('DEACTIVATE_STAFF', 'USER', (req) => req.params.staffId),
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const adminId = req.user!.id;
    const staffId = req.params.staffId;
    
    await TenantService.deactivateStaff(adminId, staffId);
    
    res.json(createResponse(null, 'Staff member deactivated successfully'));
  })
);

// GET /api/v1/tenant/locations/:locationId/access - Check location access
router.get('/locations/:locationId/access',
  authenticateJWT,
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const userId = req.user!.id;
    const locationId = req.params.locationId;
    
    const hasAccess = await TenantService.checkLocationAccess(userId, locationId);
    
    res.json(createResponse({ 
      hasAccess,
      locationId,
      userId 
    }, 'Location access checked'));
  })
);

// GET /api/v1/tenant/dashboard - Admin dashboard data
router.get('/dashboard',
  authenticateJWT,
  tenantAuth.admin,
  asyncHandler(async (req: AuthenticatedRequest, res: express.Response) => {
    const adminId = req.user!.id;
    
    // Get comprehensive dashboard data
    const [tenantInfo, locations, staff] = await Promise.all([
      TenantService.getTenantInfo(adminId),
      TenantService.getAdminLocations(adminId),
      TenantService.getAdminStaff(adminId)
    ]);
    
    const dashboardData = {
      overview: tenantInfo.summary,
      locations: locations.slice(0, 5), // Recent 5 locations
      staff: staff.slice(0, 10), // Recent 10 staff members
      recentActivity: {
        locationsCount: locations.length,
        staffCount: staff.length,
        activeLocations: locations.filter(l => l.isActive).length
      }
    };
    
    res.json(createResponse(dashboardData, 'Dashboard data retrieved successfully'));
  })
);

export default router;