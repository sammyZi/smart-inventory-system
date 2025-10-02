/**
 * SaaS Multi-Tenant Service
 * Handles tenant creation, user management, and data isolation
 */

import { PrismaClient, User, Location, UserRole } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';
import { AuditService } from './auditService';
import { generateId } from '../utils/helpers';
import { EmailService } from './emailService';

const prisma = new PrismaClient();

export interface AdminTenantData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  companyName: string;
  businessType?: string;
  timezone?: string;
  currency?: string;
}

export interface StaffUserData {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: 'MANAGER' | 'STAFF';
  locationId: string;
  permissions?: string[];
}

export interface LocationData {
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

export interface TenantCreationResult {
  admin: User;
  mainLocation: Location;
  accessToken: string;
  refreshToken: string;
}

export class SaaSService {
  /**
   * Create a new admin tenant (independent business)
   * This creates a completely isolated tenant with their own data scope
   */
  static async createAdminTenant(data: AdminTenantData): Promise<TenantCreationResult> {
    try {
      // Check if email already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email }
      });

      if (existingUser) {
        throw new Error('An account with this email already exists');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(data.password, 12);

      // Start transaction to create admin and main location
      const result = await prisma.$transaction(async (tx) => {
        // Create admin user
        const admin = await tx.user.create({
          data: {
            email: data.email,
            firstName: data.firstName,
            lastName: data.lastName,
            phone: data.phone,
            role: UserRole.ADMIN,
            isActive: true,
            // Admin is not created by anyone (they are the root of their tenant)
            createdById: null,
            // Will be set after location is created
            locationId: null
          }
        });

        // Create main location for the admin
        const mainLocation = await tx.location.create({
          data: {
            name: `${data.companyName} - Main Location`,
            adminId: admin.id,
            timezone: data.timezone || 'UTC',
            currency: data.currency || 'USD',
            taxRate: 0.0,
            isActive: true
          }
        });

        // Update admin to link to main location
        const updatedAdmin = await tx.user.update({
          where: { id: admin.id },
          data: { locationId: mainLocation.id }
        });

        // Create system config for this tenant
        await tx.systemConfig.createMany({
          data: [
            {
              key: `tenant_${admin.id}_company_name`,
              value: data.companyName,
              category: 'tenant',
              description: 'Company name for this tenant'
            },
            {
              key: `tenant_${admin.id}_business_type`,
              value: data.businessType || 'retail',
              category: 'tenant',
              description: 'Business type for this tenant'
            },
            {
              key: `tenant_${admin.id}_created_at`,
              value: new Date().toISOString(),
              category: 'tenant',
              description: 'Tenant creation timestamp'
            }
          ]
        });

        return { admin: updatedAdmin, mainLocation };
      });

      // Generate JWT tokens
      const accessToken = this.generateAccessToken(result.admin);
      const refreshToken = this.generateRefreshToken(result.admin);

      // Log tenant creation
      await AuditService.logAction({
        userId: result.admin.id,
        action: 'CREATE',
        resource: 'tenant',
        resourceId: result.admin.id,
        newValues: {
          adminId: result.admin.id,
          companyName: data.companyName,
          mainLocationId: result.mainLocation.id
        }
      });

      logger.info('New admin tenant created successfully:', {
        adminId: result.admin.id,
        email: result.admin.email,
        companyName: data.companyName,
        mainLocationId: result.mainLocation.id
      });

      return {
        admin: result.admin,
        mainLocation: result.mainLocation,
        accessToken,
        refreshToken
      };

    } catch (error) {
      logger.error('Failed to create admin tenant:', error);
      throw error;
    }
  }

  /**
   * Create a new location under an admin's tenant
   */
  static async createLocation(adminId: string, data: LocationData): Promise<Location> {
    try {
      // Verify admin exists and is active
      const admin = await prisma.user.findFirst({
        where: {
          id: adminId,
          role: UserRole.ADMIN,
          isActive: true
        }
      });

      if (!admin) {
        throw new Error('Admin not found or inactive');
      }

      const location = await prisma.location.create({
        data: {
          ...data,
          adminId,
          isActive: true
        }
      });

      // Log location creation
      await AuditService.logAction({
        userId: adminId,
        action: 'CREATE',
        resource: 'location',
        resourceId: location.id,
        newValues: location
      });

      logger.info('Location created for admin:', {
        locationId: location.id,
        adminId,
        locationName: location.name
      });

      return location;

    } catch (error) {
      logger.error('Failed to create location:', error);
      throw error;
    }
  }

  /**
   * Create staff user under an admin's tenant
   * Staff is always linked to both admin and location
   */
  static async createStaffUser(adminId: string, data: StaffUserData): Promise<User> {
    try {
      // Verify admin exists and owns the location
      const admin = await prisma.user.findFirst({
        where: {
          id: adminId,
          role: UserRole.ADMIN,
          isActive: true
        }
      });

      if (!admin) {
        throw new Error('Admin not found or inactive');
      }

      // Verify location belongs to this admin
      const location = await prisma.location.findFirst({
        where: {
          id: data.locationId,
          adminId,
          isActive: true
        }
      });

      if (!location) {
        throw new Error('Location not found or access denied');
      }

      // Check if email already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email }
      });

      if (existingUser) {
        throw new Error('A user with this email already exists');
      }

      // Generate temporary password (should be sent via email in production)
      const tempPassword = this.generateTempPassword();
      const hashedPassword = await bcrypt.hash(tempPassword, 12);

      const staff = await prisma.user.create({
        data: {
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          role: data.role as UserRole,
          locationId: data.locationId,
          createdById: adminId, // Link to admin who created this user
          isActive: true
        }
      });

      // Log staff creation
      await AuditService.logAction({
        userId: adminId,
        action: 'CREATE',
        resource: 'staff_user',
        resourceId: staff.id,
        newValues: {
          staffId: staff.id,
          email: staff.email,
          role: staff.role,
          locationId: staff.locationId
        }
      });

      logger.info('Staff user created:', {
        staffId: staff.id,
        adminId,
        locationId: data.locationId,
        role: data.role,
        tempPassword // In production, this should be sent via email
      });

      return staff;

    } catch (error) {
      logger.error('Failed to create staff user:', error);
      throw error;
    }
  }

  /**
   * Get all locations owned by an admin
   */
  static async getAdminLocations(adminId: string): Promise<Location[]> {
    try {
      const locations = await prisma.location.findMany({
        where: {
          adminId,
          isActive: true
        },
        orderBy: { name: 'asc' }
      });

      return locations;

    } catch (error) {
      logger.error('Failed to fetch admin locations:', error);
      throw error;
    }
  }

  /**
   * Get all staff users under an admin's tenant
   */
  static async getAdminStaff(adminId: string, locationId?: string): Promise<User[]> {
    try {
      const whereClause: any = {
        createdById: adminId,
        isActive: true,
        role: { in: [UserRole.MANAGER, UserRole.STAFF] }
      };

      if (locationId) {
        // Verify location belongs to this admin first
        const locationExists = await this.verifyLocationOwnership(adminId, locationId);
        if (!locationExists) {
          throw new Error('Location not found or access denied');
        }
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
          { role: 'asc' },
          { firstName: 'asc' }
        ]
      });

      return staff;

    } catch (error) {
      logger.error('Failed to fetch admin staff:', error);
      throw error;
    }
  }

  /**
   * Get tenant information for an admin
   */
  static async getTenantInfo(adminId: string): Promise<{
    admin: User;
    locations: Location[];
    staffCount: number;
    companyName: string;
    businessType: string;
    createdAt: string;
  }> {
    try {
      const admin = await prisma.user.findUnique({
        where: { id: adminId }
      });

      if (!admin) {
        throw new Error('Admin not found');
      }

      const [locations, staffCount, configs] = await Promise.all([
        this.getAdminLocations(adminId),
        prisma.user.count({
          where: {
            createdById: adminId,
            isActive: true
          }
        }),
        prisma.systemConfig.findMany({
          where: {
            key: {
              in: [
                `tenant_${adminId}_company_name`,
                `tenant_${adminId}_business_type`,
                `tenant_${adminId}_created_at`
              ]
            }
          }
        })
      ]);

      const configMap = configs.reduce((acc, config) => {
        const key = config.key.split('_').pop();
        if (key) acc[key] = config.value;
        return acc;
      }, {} as Record<string, string>);

      return {
        admin,
        locations,
        staffCount,
        companyName: configMap.name || 'Unknown Company',
        businessType: configMap.type || 'retail',
        createdAt: configMap.at || admin.createdAt.toISOString()
      };

    } catch (error) {
      logger.error('Failed to fetch tenant info:', error);
      throw error;
    }
  }

  /**
   * Verify that a location belongs to an admin
   */
  static async verifyLocationOwnership(adminId: string, locationId: string): Promise<boolean> {
    try {
      const location = await prisma.location.findFirst({
        where: {
          id: locationId,
          adminId,
          isActive: true
        }
      });

      return !!location;

    } catch (error) {
      logger.error('Failed to verify location ownership:', error);
      return false;
    }
  }

  /**
   * Verify that a staff user belongs to an admin
   */
  static async verifyStaffOwnership(adminId: string, staffId: string): Promise<boolean> {
    try {
      const staff = await prisma.user.findFirst({
        where: {
          id: staffId,
          createdById: adminId,
          isActive: true
        }
      });

      return !!staff;

    } catch (error) {
      logger.error('Failed to verify staff ownership:', error);
      return false;
    }
  }

  /**
   * Update staff user (admin can only update their own staff)
   */
  static async updateStaffUser(staffId: string, updateData: Partial<StaffUserData>): Promise<User> {
    try {
      const updatedStaff = await prisma.user.update({
        where: { id: staffId },
        data: {
          firstName: updateData.firstName,
          lastName: updateData.lastName,
          phone: updateData.phone,
          role: updateData.role as UserRole,
          locationId: updateData.locationId,
          updatedAt: new Date()
        }
      });

      logger.info('Staff user updated:', { staffId, updateData });
      return updatedStaff;

    } catch (error) {
      logger.error('Failed to update staff user:', error);
      throw error;
    }
  }

  /**
   * Deactivate staff user (soft delete)
   */
  static async deactivateStaffUser(staffId: string): Promise<void> {
    try {
      await prisma.user.update({
        where: { id: staffId },
        data: {
          isActive: false,
          updatedAt: new Date()
        }
      });

      logger.info('Staff user deactivated:', { staffId });

    } catch (error) {
      logger.error('Failed to deactivate staff user:', error);
      throw error;
    }
  }

  /**
   * Generate access token
   */
  private static generateAccessToken(user: User): string {
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      locationId: user.locationId,
      createdById: user.createdById // Important for tenant isolation
    };

    return jwt.sign(payload, process.env.JWT_SECRET!, {
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
      issuer: 'smart-inventory-api',
      audience: 'smart-inventory-client'
    });
  }

  /**
   * Generate refresh token
   */
  private static generateRefreshToken(user: User): string {
    const payload = {
      userId: user.id,
      type: 'refresh'
    };

    return jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
      expiresIn: '30d',
      issuer: 'smart-inventory-api',
      audience: 'smart-inventory-client'
    });
  }

  /**
   * Generate temporary password for new staff
   */
  private static generateTempPassword(): string {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  /**
   * Get admin ID from user (for tenant isolation)
   */
  static getAdminIdFromUser(user: User): string {
    // If user is admin, return their own ID
    if (user.role === UserRole.ADMIN) {
      return user.id;
    }
    // If user is staff/manager, return their creator's ID (the admin)
    return user.createdById!;
  }

  /**
   * Verify user belongs to the same tenant as the requesting user
   */
  static async verifyTenantAccess(requestingUserId: string, targetUserId: string): Promise<boolean> {
    try {
      const [requestingUser, targetUser] = await Promise.all([
        prisma.user.findUnique({ where: { id: requestingUserId } }),
        prisma.user.findUnique({ where: { id: targetUserId } })
      ]);

      if (!requestingUser || !targetUser) {
        return false;
      }

      const requestingAdminId = this.getAdminIdFromUser(requestingUser);
      const targetAdminId = this.getAdminIdFromUser(targetUser);

      return requestingAdminId === targetAdminId;

    } catch (error) {
      logger.error('Failed to verify tenant access:', error);
      return false;
    }
  }
}