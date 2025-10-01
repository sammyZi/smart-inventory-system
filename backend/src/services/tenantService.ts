import { UserRole } from '@prisma/client';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';
import { generateId } from '../utils/helpers';
import { getErrorMessage } from '../utils/errorHandler';

export interface CreateTenantData {
  email: string;
  firstName: string;
  lastName?: string;
  phone?: string;
  companyName: string;
  firebaseUid?: string;
}

export interface CreateLocationData {
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  phone?: string;
  email?: string;
  timezone?: string;
  currency?: string;
  taxRate?: number;
}

export interface CreateStaffData {
  email: string;
  firstName: string;
  lastName?: string;
  phone?: string;
  role: 'MANAGER' | 'STAFF';
  locationId: string;
}

export class TenantService {
  // Create new tenant (Admin signup)
  static async createTenant(tenantData: CreateTenantData) {
    const { email, firstName, lastName, phone, companyName, firebaseUid } = tenantData;

    try {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      });

      if (existingUser) {
        throw new AppError('User with this email already exists', 409, 'USER_EXISTS');
      }

      // Create admin user (tenant)
      const createData: any = {
        id: generateId(),
        email: email.toLowerCase(),
        firstName,
        role: UserRole.ADMIN,
        createdById: null, // Admins have no creator
        isActive: true
      };

      // Only add optional fields if they have values
      if (firebaseUid) createData.firebaseUid = firebaseUid;
      if (lastName) createData.lastName = lastName;
      if (phone) createData.phone = phone;

      const admin = await prisma.user.create({
        data: createData
      });

      // Create default location for the tenant
      const defaultLocation = await prisma.location.create({
        data: {
          id: generateId(),
          name: `${companyName} - Main Store`,
          adminId: admin.id,
          isActive: true
        }
      });

      // Update admin's default location
      await prisma.user.update({
        where: { id: admin.id },
        data: { locationId: defaultLocation.id }
      });

      logger.info('New tenant created', {
        adminId: admin.id,
        email: admin.email,
        companyName,
        locationId: defaultLocation.id
      });

      return {
        admin,
        defaultLocation
      };
    } catch (error) {
      logger.error('Tenant creation failed', { 
        email, 
        companyName, 
        error: getErrorMessage(error) 
      });
      throw error;
    }
  }

  // Create location for admin
  static async createLocation(adminId: string, locationData: CreateLocationData) {
    try {
      // Verify admin exists and is actually an admin
      const admin = await prisma.user.findUnique({
        where: { id: adminId }
      });

      if (!admin || admin.role !== UserRole.ADMIN) {
        throw new AppError('Only admins can create locations', 403, 'INSUFFICIENT_PERMISSIONS');
      }

      const location = await prisma.location.create({
        data: {
          id: generateId(),
          adminId,
          ...locationData,
          isActive: true
        }
      });

      logger.info('Location created', {
        adminId,
        locationId: location.id,
        locationName: location.name
      });

      return location;
    } catch (error) {
      logger.error('Location creation failed', { 
        adminId, 
        error: getErrorMessage(error) 
      });
      throw error;
    }
  }

  // Add staff/manager to admin's location
  static async createStaff(adminId: string, staffData: CreateStaffData) {
    const { email, firstName, lastName, phone, role, locationId } = staffData;

    try {
      // Verify admin owns the location
      const location = await prisma.location.findFirst({
        where: {
          id: locationId,
          adminId: adminId
        }
      });

      if (!location) {
        throw new AppError('Location not found or access denied', 404, 'LOCATION_NOT_FOUND');
      }

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      });

      if (existingUser) {
        throw new AppError('User with this email already exists', 409, 'USER_EXISTS');
      }

      // Create staff/manager
      const createData: any = {
        id: generateId(),
        email: email.toLowerCase(),
        firstName,
        role: role === 'MANAGER' ? UserRole.MANAGER : UserRole.STAFF,
        locationId,
        createdById: adminId, // Link to admin who created them
        isActive: true
      };

      // Only add optional fields if they have values
      if (lastName) createData.lastName = lastName;
      if (phone) createData.phone = phone;

      const staff = await prisma.user.create({
        data: createData
      });

      logger.info('Staff member created', {
        adminId,
        staffId: staff.id,
        email: staff.email,
        role: staff.role,
        locationId
      });

      return staff;
    } catch (error) {
      logger.error('Staff creation failed', { 
        adminId, 
        email, 
        error: getErrorMessage(error) 
      });
      throw error;
    }
  }

  // Get admin's locations
  static async getAdminLocations(adminId: string) {
    try {
      const locations = await prisma.location.findMany({
        where: {
          adminId,
          isActive: true
        },
        include: {
          users: {
            where: { isActive: true },
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
              isActive: true
            }
          },
          _count: {
            select: {
              users: true,
              transactions: true
            }
          }
        },
        orderBy: { createdAt: 'asc' }
      });

      return locations;
    } catch (error) {
      logger.error('Get admin locations failed', { 
        adminId, 
        error: getErrorMessage(error) 
      });
      throw error;
    }
  }

  // Get admin's staff across all locations
  static async getAdminStaff(adminId: string, locationId?: string) {
    try {
      const whereClause: any = {
        createdById: adminId,
        isActive: true,
        role: {
          in: [UserRole.MANAGER, UserRole.STAFF]
        }
      };

      if (locationId) {
        whereClause.locationId = locationId;
      }

      const staff = await prisma.user.findMany({
        where: whereClause,
        include: {
          location: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: [
          { role: 'asc' }, // Managers first
          { firstName: 'asc' }
        ]
      });

      return staff;
    } catch (error) {
      logger.error('Get admin staff failed', { 
        adminId, 
        error: getErrorMessage(error) 
      });
      throw error;
    }
  }

  // Check if user has access to location (multi-tenant security)
  static async checkLocationAccess(userId: string, locationId: string): Promise<boolean> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { location: true }
      });

      if (!user) return false;

      // Admin can access their own locations
      if (user.role === UserRole.ADMIN) {
        const location = await prisma.location.findFirst({
          where: {
            id: locationId,
            adminId: userId
          }
        });
        return !!location;
      }

      // Staff/Manager can access their assigned location
      return user.locationId === locationId;
    } catch (error) {
      logger.error('Location access check failed', { 
        userId, 
        locationId, 
        error: getErrorMessage(error) 
      });
      return false;
    }
  }

  // Get tenant info (admin's business overview)
  static async getTenantInfo(adminId: string) {
    try {
      const admin = await prisma.user.findUnique({
        where: { id: adminId },
        include: {
          ownedLocations: {
            where: { isActive: true },
            include: {
              _count: {
                select: {
                  users: true,
                  transactions: true
                }
              }
            }
          },
          subUsers: {
            where: { isActive: true },
            select: {
              id: true,
              role: true,
              locationId: true
            }
          }
        }
      });

      if (!admin || admin.role !== UserRole.ADMIN) {
        throw new AppError('Admin not found', 404, 'ADMIN_NOT_FOUND');
      }

      // Calculate summary stats
      const totalLocations = admin.ownedLocations.length;
      const totalStaff = admin.subUsers.length;
      const totalTransactions = admin.ownedLocations.reduce(
        (sum, location) => sum + location._count.transactions, 
        0
      );

      const staffByRole = admin.subUsers.reduce((acc, user) => {
        acc[user.role] = (acc[user.role] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        admin: {
          id: admin.id,
          email: admin.email,
          firstName: admin.firstName,
          lastName: admin.lastName,
          createdAt: admin.createdAt
        },
        summary: {
          totalLocations,
          totalStaff,
          totalTransactions,
          staffByRole
        },
        locations: admin.ownedLocations,
        recentStaff: admin.subUsers.slice(0, 5)
      };
    } catch (error) {
      logger.error('Get tenant info failed', { 
        adminId, 
        error: getErrorMessage(error) 
      });
      throw error;
    }
  }

  // Update location
  static async updateLocation(adminId: string, locationId: string, updateData: Partial<CreateLocationData>) {
    try {
      // Verify admin owns the location
      const location = await prisma.location.findFirst({
        where: {
          id: locationId,
          adminId: adminId
        }
      });

      if (!location) {
        throw new AppError('Location not found or access denied', 404, 'LOCATION_NOT_FOUND');
      }

      const updatedLocation = await prisma.location.update({
        where: { id: locationId },
        data: updateData
      });

      logger.info('Location updated', {
        adminId,
        locationId,
        updateData
      });

      return updatedLocation;
    } catch (error) {
      logger.error('Location update failed', { 
        adminId, 
        locationId, 
        error: getErrorMessage(error) 
      });
      throw error;
    }
  }

  // Deactivate staff (soft delete)
  static async deactivateStaff(adminId: string, staffId: string) {
    try {
      // Verify admin created this staff member
      const staff = await prisma.user.findFirst({
        where: {
          id: staffId,
          createdById: adminId
        }
      });

      if (!staff) {
        throw new AppError('Staff member not found or access denied', 404, 'STAFF_NOT_FOUND');
      }

      const updatedStaff = await prisma.user.update({
        where: { id: staffId },
        data: { isActive: false }
      });

      logger.info('Staff member deactivated', {
        adminId,
        staffId,
        email: staff.email
      });

      return updatedStaff;
    } catch (error) {
      logger.error('Staff deactivation failed', { 
        adminId, 
        staffId, 
        error: getErrorMessage(error) 
      });
      throw error;
    }
  }
}