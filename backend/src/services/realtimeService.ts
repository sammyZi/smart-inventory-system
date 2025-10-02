/**
 * Real-Time Service for SaaS Multi-Tenant System
 * Handles real-time updates, notifications, and live dashboards
 */

import { Server as SocketIOServer } from 'socket.io';
import { logger } from '../utils/logger';
import { SaaSService } from './saasService';

export interface TenantMetrics {
  tenantId: string;
  activeUsers: number;
  totalProducts: number;
  totalLocations: number;
  todayTransactions: number;
  todayRevenue: number;
  lowStockAlerts: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
}

export interface RealTimeEvent {
  type: 'inventory_update' | 'new_transaction' | 'user_activity' | 'system_alert' | 'tenant_activity';
  tenantId: string;
  data: any;
  timestamp: Date;
  userId?: string;
  locationId?: string;
}

export class RealtimeService {
  private static io: SocketIOServer | null = null;
  private static tenantConnections: Map<string, Set<string>> = new Map();
  private static userSessions: Map<string, { tenantId: string; userId: string; socketId: string }> = new Map();

  /**
   * Initialize real-time service
   */
  static initialize(io: SocketIOServer): void {
    this.io = io;
    this.setupSocketHandlers();
    this.startMetricsUpdater();
    logger.info('Real-time service initialized');
  }

  /**
   * Setup Socket.IO event handlers
   */
  private static setupSocketHandlers(): void {
    if (!this.io) return;

    this.io.on('connection', (socket) => {
      logger.debug(`Client connected: ${socket.id}`);

      // Handle tenant room joining
      socket.on('join-tenant', async (data: { tenantId: string; userId: string; token: string }) => {
        try {
          // Verify user belongs to tenant (simplified for demo)
          const { tenantId, userId } = data;
          
          // Join tenant-specific room
          socket.join(`tenant-${tenantId}`);
          
          // Track connection
          if (!this.tenantConnections.has(tenantId)) {
            this.tenantConnections.set(tenantId, new Set());
          }
          this.tenantConnections.get(tenantId)!.add(socket.id);
          
          // Track user session
          this.userSessions.set(socket.id, { tenantId, userId, socketId: socket.id });
          
          // Send initial tenant metrics
          const metrics = await this.getTenantMetrics(tenantId);
          socket.emit('tenant-metrics', metrics);
          
          // Notify other users in tenant about new connection
          socket.to(`tenant-${tenantId}`).emit('user-connected', {
            userId,
            timestamp: new Date()
          });
          
          logger.debug(`User ${userId} joined tenant ${tenantId} room`);
          
        } catch (error) {
          logger.error('Error joining tenant room:', error);
          socket.emit('error', { message: 'Failed to join tenant room' });
        }
      });

      // Handle location-specific room joining
      socket.on('join-location', (data: { locationId: string; tenantId: string }) => {
        const { locationId, tenantId } = data;
        socket.join(`location-${locationId}`);
        socket.join(`tenant-${tenantId}-location-${locationId}`);
        logger.debug(`Client joined location ${locationId} room`);
      });

      // Handle real-time inventory updates
      socket.on('inventory-update', (data: { productId: string; locationId: string; newQuantity: number }) => {
        const session = this.userSessions.get(socket.id);
        if (session) {
          this.broadcastToTenant(session.tenantId, 'inventory-updated', {
            ...data,
            updatedBy: session.userId,
            timestamp: new Date()
          });
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        const session = this.userSessions.get(socket.id);
        if (session) {
          // Remove from tenant connections
          const tenantConnections = this.tenantConnections.get(session.tenantId);
          if (tenantConnections) {
            tenantConnections.delete(socket.id);
            if (tenantConnections.size === 0) {
              this.tenantConnections.delete(session.tenantId);
            }
          }
          
          // Notify other users in tenant
          socket.to(`tenant-${session.tenantId}`).emit('user-disconnected', {
            userId: session.userId,
            timestamp: new Date()
          });
          
          // Remove user session
          this.userSessions.delete(socket.id);
        }
        
        logger.debug(`Client disconnected: ${socket.id}`);
      });
    });
  }

  /**
   * Broadcast event to all users in a tenant
   */
  static broadcastToTenant(tenantId: string, event: string, data: any): void {
    if (!this.io) return;
    
    this.io.to(`tenant-${tenantId}`).emit(event, {
      ...data,
      tenantId,
      timestamp: new Date()
    });
  }

  /**
   * Broadcast event to specific location
   */
  static broadcastToLocation(tenantId: string, locationId: string, event: string, data: any): void {
    if (!this.io) return;
    
    this.io.to(`tenant-${tenantId}-location-${locationId}`).emit(event, {
      ...data,
      tenantId,
      locationId,
      timestamp: new Date()
    });
  }

  /**
   * Send notification to specific user
   */
  static sendToUser(userId: string, event: string, data: any): void {
    if (!this.io) return;
    
    // Find user's socket
    for (const [socketId, session] of this.userSessions.entries()) {
      if (session.userId === userId) {
        this.io.to(socketId).emit(event, {
          ...data,
          timestamp: new Date()
        });
        break;
      }
    }
  }

  /**
   * Get real-time tenant metrics
   */
  private static async getTenantMetrics(tenantId: string): Promise<TenantMetrics> {
    try {
      // This would normally query the database
      // For demo purposes, returning mock data with some real calculations
      const activeConnections = this.tenantConnections.get(tenantId)?.size || 0;
      
      return {
        tenantId,
        activeUsers: activeConnections,
        totalProducts: Math.floor(Math.random() * 1000) + 100,
        totalLocations: Math.floor(Math.random() * 5) + 1,
        todayTransactions: Math.floor(Math.random() * 50) + 10,
        todayRevenue: Math.floor(Math.random() * 10000) + 1000,
        lowStockAlerts: Math.floor(Math.random() * 10),
        systemHealth: activeConnections > 0 ? 'healthy' : 'warning'
      };
    } catch (error) {
      logger.error('Error getting tenant metrics:', error);
      return {
        tenantId,
        activeUsers: 0,
        totalProducts: 0,
        totalLocations: 0,
        todayTransactions: 0,
        todayRevenue: 0,
        lowStockAlerts: 0,
        systemHealth: 'critical'
      };
    }
  }

  /**
   * Start periodic metrics updates
   */
  private static startMetricsUpdater(): void {
    setInterval(async () => {
      for (const tenantId of this.tenantConnections.keys()) {
        try {
          const metrics = await this.getTenantMetrics(tenantId);
          this.broadcastToTenant(tenantId, 'metrics-update', metrics);
        } catch (error) {
          logger.error(`Error updating metrics for tenant ${tenantId}:`, error);
        }
      }
    }, 30000); // Update every 30 seconds
  }

  /**
   * Emit real-time event
   */
  static emitEvent(event: RealTimeEvent): void {
    switch (event.type) {
      case 'inventory_update':
        this.broadcastToTenant(event.tenantId, 'inventory-update', event.data);
        break;
      case 'new_transaction':
        this.broadcastToTenant(event.tenantId, 'new-transaction', event.data);
        break;
      case 'user_activity':
        this.broadcastToTenant(event.tenantId, 'user-activity', event.data);
        break;
      case 'system_alert':
        this.broadcastToTenant(event.tenantId, 'system-alert', event.data);
        break;
      case 'tenant_activity':
        this.broadcastToTenant(event.tenantId, 'tenant-activity', event.data);
        break;
    }
  }

  /**
   * Get connected users count for tenant
   */
  static getConnectedUsersCount(tenantId: string): number {
    return this.tenantConnections.get(tenantId)?.size || 0;
  }

  /**
   * Get all connected tenants
   */
  static getConnectedTenants(): string[] {
    return Array.from(this.tenantConnections.keys());
  }

  /**
   * Get system-wide statistics
   */
  static getSystemStats(): {
    totalConnections: number;
    activeTenants: number;
    averageConnectionsPerTenant: number;
  } {
    const totalConnections = Array.from(this.tenantConnections.values())
      .reduce((sum, connections) => sum + connections.size, 0);
    
    const activeTenants = this.tenantConnections.size;
    
    return {
      totalConnections,
      activeTenants,
      averageConnectionsPerTenant: activeTenants > 0 ? totalConnections / activeTenants : 0
    };
  }
}