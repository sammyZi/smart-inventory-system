import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { generateId } from '../utils/helpers';

export interface AuditLogData {
  userId?: string;
  locationId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  oldValues?: any;
  newValues?: any;
  ipAddress?: string;
  userAgent?: string;
}

export class AuditService {
  // Log user action
  static async log(data: AuditLogData): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          id: generateId(),
          userId: data.userId,
          locationId: data.locationId,
          action: data.action,
          resource: data.resource,
          resourceId: data.resourceId,
          oldValues: data.oldValues ? JSON.stringify(data.oldValues) : null,
          newValues: data.newValues ? JSON.stringify(data.newValues) : null,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          timestamp: new Date()
        }
      });

      logger.info('Audit log created', {
        userId: data.userId,
        action: data.action,
        resource: data.resource,
        resourceId: data.resourceId
      });
    } catch (error) {
      logger.error('Failed to create audit log', {
        error: error.message,
        data
      });
      // Don't throw error to avoid breaking the main operation
    }
  }

  // Log authentication events
  static async logAuth(
    action: 'LOGIN' | 'LOGOUT' | 'REGISTER' | 'PASSWORD_CHANGE' | 'PROFILE_UPDATE',
    userId?: string,
    email?: string,
    ipAddress?: string,
    userAgent?: string,
    additionalData?: any
  ): Promise<void> {
    await this.log({
      userId,
      action,
      resource: 'USER_AUTH',
      resourceId: userId,
      newValues: {
        email,
        ...additionalData
      },
      ipAddress,
      userAgent
    });
  }

  // Log inventory events
  static async logInventory(
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'STOCK_UPDATE' | 'TRANSFER',
    userId: string,
    locationId: string,
    resourceType: 'PRODUCT' | 'STOCK' | 'TRANSFER',
    resourceId: string,
    oldValues?: any,
    newValues?: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      userId,
      locationId,
      action: `INVENTORY_${action}`,
      resource: resourceType,
      resourceId,
      oldValues,
      newValues,
      ipAddress,
      userAgent
    });
  }

  // Log transaction events
  static async logTransaction(
    action: 'CREATE' | 'UPDATE' | 'CANCEL' | 'REFUND',
    userId: string,
    locationId: string,
    transactionId: string,
    oldValues?: any,
    newValues?: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      userId,
      locationId,
      action: `TRANSACTION_${action}`,
      resource: 'TRANSACTION',
      resourceId: transactionId,
      oldValues,
      newValues,
      ipAddress,
      userAgent
    });
  }

  // Log system events
  static async logSystem(
    action: string,
    userId?: string,
    locationId?: string,
    details?: any,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.log({
      userId,
      locationId,
      action: `SYSTEM_${action}`,
      resource: 'SYSTEM',
      newValues: details,
      ipAddress,
      userAgent
    });
  }

  // Get audit logs with filtering
  static async getLogs(filters: {
    userId?: string;
    locationId?: string;
    action?: string;
    resource?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const {
      userId,
      locationId,
      action,
      resource,
      startDate,
      endDate,
      page = 1,
      limit = 50
    } = filters;

    const where: any = {};

    if (userId) where.userId = userId;
    if (locationId) where.locationId = locationId;
    if (action) where.action = { contains: action, mode: 'insensitive' };
    if (resource) where.resource = { contains: resource, mode: 'insensitive' };
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = startDate;
      if (endDate) where.timestamp.lte = endDate;
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true
            }
          },
          location: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: { timestamp: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.auditLog.count({ where })
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  // Get user activity summary
  static async getUserActivity(userId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const logs = await prisma.auditLog.findMany({
      where: {
        userId,
        timestamp: {
          gte: startDate
        }
      },
      orderBy: { timestamp: 'desc' },
      take: 100
    });

    // Group by action type
    const actionCounts = logs.reduce((acc, log) => {
      acc[log.action] = (acc[log.action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Group by date
    const dailyActivity = logs.reduce((acc, log) => {
      const date = log.timestamp.toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalActions: logs.length,
      actionCounts,
      dailyActivity,
      recentActions: logs.slice(0, 10)
    };
  }

  // Clean up old audit logs (for maintenance)
  static async cleanupOldLogs(daysToKeep: number = 365): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await prisma.auditLog.deleteMany({
      where: {
        timestamp: {
          lt: cutoffDate
        }
      }
    });

    logger.info('Audit logs cleanup completed', {
      deletedCount: result.count,
      cutoffDate: cutoffDate.toISOString()
    });

    return result.count;
  }
}