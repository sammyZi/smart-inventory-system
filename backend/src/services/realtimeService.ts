/**
 * Enhanced Real-Time Synchronization Service for SaaS Multi-Tenant System
 * Handles tenant-aware real-time updates, conflict resolution, and offline queue management
 */

import { Server as SocketIOServer } from 'socket.io';
import { logger } from '../utils/logger';
import { SaaSService } from './saasService';
import { prisma } from '../config/database';
import { AuditService } from './auditService';

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
  type: 'inventory_update' | 'new_transaction' | 'user_activity' | 'system_alert' | 'tenant_activity' | 'sync_conflict' | 'offline_queue';
  tenantId: string;
  data: any;
  timestamp: Date;
  userId?: string;
  locationId?: string;
  eventId?: string;
  version?: number;
}

export interface SyncConflict {
  id: string;
  tenantId: string;
  resourceType: 'stock_level' | 'product' | 'transaction';
  resourceId: string;
  conflictType: 'concurrent_update' | 'version_mismatch' | 'data_inconsistency';
  localVersion: any;
  serverVersion: any;
  timestamp: Date;
  userId: string;
  locationId?: string;
}

export interface OfflineQueueItem {
  id: string;
  tenantId: string;
  userId: string;
  locationId?: string;
  operation: 'create' | 'update' | 'delete';
  resourceType: string;
  resourceId?: string;
  data: any;
  timestamp: Date;
  retryCount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface TenantSyncState {
  tenantId: string;
  lastSyncTimestamp: Date;
  pendingOperations: number;
  conflictCount: number;
  onlineUsers: number;
  locations: Map<string, LocationSyncState>;
}

export interface LocationSyncState {
  locationId: string;
  lastUpdate: Date;
  activeUsers: number;
  pendingSync: boolean;
}

export class RealtimeService {
  private static io: SocketIOServer | null = null;
  private static tenantConnections: Map<string, Set<string>> = new Map();
  private static userSessions: Map<string, { tenantId: string; userId: string; socketId: string; locationId?: string; isOnline: boolean }> = new Map();
  private static offlineQueues: Map<string, OfflineQueueItem[]> = new Map();
  private static syncConflicts: Map<string, SyncConflict[]> = new Map();
  private static tenantSyncStates: Map<string, TenantSyncState> = new Map();

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

      // Handle tenant room joining with enhanced sync
      socket.on('join-tenant', async (data: { tenantId: string; userId: string; token: string; locationId?: string }) => {
        try {
          const { tenantId, userId, locationId } = data;
          
          // Verify user belongs to tenant
          const hasAccess = await SaaSService.verifyUserTenantAccess(userId, tenantId);
          if (!hasAccess) {
            socket.emit('error', { message: 'Access denied to tenant' });
            return;
          }
          
          // Join tenant-specific room
          socket.join(`tenant-${tenantId}`);
          if (locationId) {
            socket.join(`tenant-${tenantId}-location-${locationId}`);
          }
          
          // Track connection
          if (!this.tenantConnections.has(tenantId)) {
            this.tenantConnections.set(tenantId, new Set());
          }
          this.tenantConnections.get(tenantId)!.add(socket.id);
          
          // Track user session with enhanced data
          this.userSessions.set(socket.id, { 
            tenantId, 
            userId, 
            socketId: socket.id, 
            locationId,
            isOnline: true 
          });
          
          // Initialize or update tenant sync state
          await this.updateTenantSyncState(tenantId);
          
          // Send initial sync data
          const syncData = await this.getInitialSyncData(tenantId, locationId);
          socket.emit('initial-sync', syncData);
          
          // Process any pending offline queue items
          await this.processPendingOfflineQueue(tenantId, userId);
          
          // Send pending conflicts for resolution
          const conflicts = this.getPendingConflicts(tenantId, userId);
          if (conflicts.length > 0) {
            socket.emit('sync-conflicts', conflicts);
          }
          
          // Notify other users in tenant about new connection
          socket.to(`tenant-${tenantId}`).emit('user-connected', {
            userId,
            locationId,
            timestamp: new Date()
          });
          
          logger.info(`User ${userId} joined tenant ${tenantId} room with enhanced sync`);
          
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

      // Handle real-time inventory updates with conflict resolution
      socket.on('inventory-update', async (data: { 
        productId: string; 
        locationId: string; 
        newQuantity: number; 
        version?: number;
        eventId?: string;
      }) => {
        const session = this.userSessions.get(socket.id);
        if (!session) return;

        try {
          // Check for conflicts
          const conflict = await this.checkForConflicts(session.tenantId, data);
          
          if (conflict) {
            // Send conflict back to user for resolution
            socket.emit('sync-conflict', conflict);
            return;
          }

          // Process the update
          const updateResult = await this.processInventoryUpdate(session.tenantId, session.userId, data);
          
          // Broadcast to all users in tenant except sender
          socket.to(`tenant-${session.tenantId}`).emit('inventory-updated', {
            ...updateResult,
            updatedBy: session.userId,
            timestamp: new Date()
          });

          // Send confirmation to sender
          socket.emit('update-confirmed', {
            eventId: data.eventId,
            newVersion: updateResult.version,
            timestamp: new Date()
          });

          // Update tenant sync state
          await this.updateTenantSyncState(session.tenantId);

        } catch (error) {
          logger.error('Error processing inventory update:', error);
          socket.emit('update-failed', {
            eventId: data.eventId,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      });

      // Handle offline queue synchronization
      socket.on('sync-offline-queue', async (queueItems: OfflineQueueItem[]) => {
        const session = this.userSessions.get(socket.id);
        if (!session) return;

        try {
          const results = await this.processOfflineQueue(session.tenantId, session.userId, queueItems);
          socket.emit('offline-sync-results', results);
        } catch (error) {
          logger.error('Error processing offline queue:', error);
          socket.emit('offline-sync-failed', { error: error instanceof Error ? error.message : 'Unknown error' });
        }
      });

      // Handle conflict resolution
      socket.on('resolve-conflict', async (resolution: { 
        conflictId: string; 
        resolution: 'accept_local' | 'accept_server' | 'merge'; 
        mergedData?: any 
      }) => {
        const session = this.userSessions.get(socket.id);
        if (!session) return;

        try {
          const result = await this.resolveConflict(session.tenantId, session.userId, resolution);
          socket.emit('conflict-resolved', result);
          
          // Broadcast resolution to other users
          socket.to(`tenant-${session.tenantId}`).emit('conflict-resolution-broadcast', {
            conflictId: resolution.conflictId,
            resolvedBy: session.userId,
            timestamp: new Date()
          });
        } catch (error) {
          logger.error('Error resolving conflict:', error);
          socket.emit('conflict-resolution-failed', { 
            conflictId: resolution.conflictId,
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
      });

      // Handle network status changes
      socket.on('network-status', (status: { isOnline: boolean }) => {
        const session = this.userSessions.get(socket.id);
        if (session) {
          session.isOnline = status.isOnline;
          
          if (status.isOnline) {
            // User came back online, process pending queue
            this.processPendingOfflineQueue(session.tenantId, session.userId);
          }
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

  /**
   * Check for synchronization conflicts
   */
  private static async checkForConflicts(tenantId: string, updateData: any): Promise<SyncConflict | null> {
    try {
      // Get current version from database
      const currentStock = await prisma.stockLevel.findFirst({
        where: {
          productId: updateData.productId,
          locationId: updateData.locationId
        }
      });

      if (!currentStock) return null;

      // Check version mismatch
      if (updateData.version && currentStock.updatedAt.getTime() !== updateData.version) {
        const conflict: SyncConflict = {
          id: `conflict_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
          tenantId,
          resourceType: 'stock_level',
          resourceId: currentStock.id,
          conflictType: 'version_mismatch',
          localVersion: updateData,
          serverVersion: currentStock,
          timestamp: new Date(),
          userId: updateData.userId || 'unknown',
          locationId: updateData.locationId
        };

        // Store conflict for resolution
        if (!this.syncConflicts.has(tenantId)) {
          this.syncConflicts.set(tenantId, []);
        }
        this.syncConflicts.get(tenantId)!.push(conflict);

        return conflict;
      }

      return null;
    } catch (error) {
      logger.error('Error checking for conflicts:', error);
      return null;
    }
  }

  /**
   * Process inventory update with version control
   */
  private static async processInventoryUpdate(tenantId: string, userId: string, updateData: any): Promise<any> {
    try {
      // Update stock level with new version
      const updatedStock = await prisma.stockLevel.update({
        where: {
          productId_locationId: {
            productId: updateData.productId,
            locationId: updateData.locationId
          }
        },
        data: {
          quantity: updateData.newQuantity,
          lastUpdated: new Date()
        }
      });

      // Create movement record
      await prisma.stockMovement.create({
        data: {
          productId: updateData.productId,
          locationId: updateData.locationId,
          movementType: 'ADJUSTMENT',
          quantity: updateData.newQuantity - (updateData.previousQuantity || 0),
          previousQty: updateData.previousQuantity || 0,
          newQty: updateData.newQuantity,
          reason: 'Real-time sync update',
          performedBy: userId
        }
      });

      // Log audit trail
      await AuditService.log({
        userId,
        action: 'REALTIME_UPDATE',
        resource: 'stock_level',
        resourceId: updatedStock.id,
        newValues: { quantity: updateData.newQuantity },
        locationId: updateData.locationId
      });

      return {
        ...updateData,
        version: updatedStock.updatedAt.getTime(),
        success: true
      };
    } catch (error) {
      logger.error('Error processing inventory update:', error);
      throw error;
    }
  }

  /**
   * Process offline queue items
   */
  private static async processOfflineQueue(tenantId: string, userId: string, queueItems: OfflineQueueItem[]): Promise<any[]> {
    const results: any[] = [];

    for (const item of queueItems) {
      try {
        // Validate tenant access
        if (item.tenantId !== tenantId) {
          results.push({
            id: item.id,
            success: false,
            error: 'Tenant access denied'
          });
          continue;
        }

        // Process based on operation type
        let result;
        switch (item.operation) {
          case 'update':
            result = await this.processInventoryUpdate(tenantId, userId, item.data);
            break;
          case 'create':
            // Handle create operations
            result = await this.processCreateOperation(tenantId, userId, item);
            break;
          case 'delete':
            // Handle delete operations
            result = await this.processDeleteOperation(tenantId, userId, item);
            break;
          default:
            throw new Error(`Unknown operation type: ${item.operation}`);
        }

        results.push({
          id: item.id,
          success: true,
          result
        });

        // Broadcast to other users
        this.broadcastToTenant(tenantId, 'offline-sync-update', {
          operation: item.operation,
          resourceType: item.resourceType,
          data: result,
          syncedBy: userId
        });

      } catch (error) {
        results.push({
          id: item.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }

  /**
   * Resolve synchronization conflict
   */
  private static async resolveConflict(tenantId: string, userId: string, resolution: any): Promise<any> {
    try {
      const conflicts = this.syncConflicts.get(tenantId) || [];
      const conflictIndex = conflicts.findIndex(c => c.id === resolution.conflictId);
      
      if (conflictIndex === -1) {
        throw new Error('Conflict not found');
      }

      const conflict = conflicts[conflictIndex];
      let resolvedData;

      switch (resolution.resolution) {
        case 'accept_local':
          resolvedData = await this.processInventoryUpdate(tenantId, userId, conflict.localVersion);
          break;
        case 'accept_server':
          resolvedData = conflict.serverVersion;
          break;
        case 'merge':
          resolvedData = await this.processInventoryUpdate(tenantId, userId, resolution.mergedData);
          break;
        default:
          throw new Error('Invalid resolution type');
      }

      // Remove resolved conflict
      conflicts.splice(conflictIndex, 1);

      // Log resolution
      await AuditService.log({
        userId,
        action: 'CONFLICT_RESOLVED',
        resource: 'sync_conflict',
        resourceId: conflict.id,
        newValues: {
          resolution: resolution.resolution,
          resolvedData
        }
      });

      return {
        conflictId: resolution.conflictId,
        resolution: resolution.resolution,
        resolvedData,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Error resolving conflict:', error);
      throw error;
    }
  }

  /**
   * Get initial synchronization data for tenant
   */
  private static async getInitialSyncData(tenantId: string, locationId?: string): Promise<any> {
    try {
      // Get tenant locations
      const locations = await SaaSService.getAdminLocations(tenantId);
      const locationIds = locationId ? [locationId] : locations.map(l => l.id);

      // Get current stock levels
      const stockLevels = await prisma.stockLevel.findMany({
        where: {
          locationId: { in: locationIds }
        },
        include: {
          product: {
            select: {
              id: true,
              sku: true,
              name: true,
              price: true
            }
          }
        }
      });

      // Get recent movements
      const recentMovements = await prisma.stockMovement.findMany({
        where: {
          locationId: { in: locationIds },
          timestamp: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        },
        orderBy: { timestamp: 'desc' },
        take: 50
      });

      return {
        stockLevels,
        recentMovements,
        syncTimestamp: new Date(),
        tenantId,
        locationId
      };
    } catch (error) {
      logger.error('Error getting initial sync data:', error);
      return {
        stockLevels: [],
        recentMovements: [],
        syncTimestamp: new Date(),
        tenantId,
        locationId
      };
    }
  }

  /**
   * Update tenant synchronization state
   */
  private static async updateTenantSyncState(tenantId: string): Promise<void> {
    try {
      const connections = this.tenantConnections.get(tenantId);
      const onlineUsers = connections ? connections.size : 0;
      const pendingQueue = this.offlineQueues.get(tenantId) || [];
      const conflicts = this.syncConflicts.get(tenantId) || [];

      const syncState: TenantSyncState = {
        tenantId,
        lastSyncTimestamp: new Date(),
        pendingOperations: pendingQueue.length,
        conflictCount: conflicts.length,
        onlineUsers,
        locations: new Map()
      };

      this.tenantSyncStates.set(tenantId, syncState);

      // Broadcast sync state update
      this.broadcastToTenant(tenantId, 'sync-state-update', syncState);
    } catch (error) {
      logger.error('Error updating tenant sync state:', error);
    }
  }

  /**
   * Get pending conflicts for user
   */
  private static getPendingConflicts(tenantId: string, userId: string): SyncConflict[] {
    const conflicts = this.syncConflicts.get(tenantId) || [];
    return conflicts.filter(c => c.userId === userId);
  }

  /**
   * Process pending offline queue for user
   */
  private static async processPendingOfflineQueue(tenantId: string, userId: string): Promise<void> {
    try {
      const queue = this.offlineQueues.get(tenantId) || [];
      const userQueue = queue.filter(item => item.userId === userId && item.status === 'pending');

      if (userQueue.length > 0) {
        const results = await this.processOfflineQueue(tenantId, userId, userQueue);
        
        // Remove processed items from queue
        const remainingQueue = queue.filter(item => 
          !(item.userId === userId && item.status === 'pending')
        );
        this.offlineQueues.set(tenantId, remainingQueue);

        // Send results to user
        const session = Array.from(this.userSessions.values())
          .find(s => s.userId === userId && s.tenantId === tenantId);
        
        if (session) {
          this.io?.to(session.socketId).emit('offline-queue-processed', results);
        }
      }
    } catch (error) {
      logger.error('Error processing pending offline queue:', error);
    }
  }

  /**
   * Helper methods for different operation types
   */
  private static async processCreateOperation(tenantId: string, userId: string, item: OfflineQueueItem): Promise<any> {
    // Implementation for create operations
    logger.info(`Processing create operation for tenant ${tenantId}`);
    return { success: true, operation: 'create', data: item.data };
  }

  private static async processDeleteOperation(tenantId: string, userId: string, item: OfflineQueueItem): Promise<any> {
    // Implementation for delete operations
    logger.info(`Processing delete operation for tenant ${tenantId}`);
    return { success: true, operation: 'delete', resourceId: item.resourceId };
  }

  /**
   * Add item to offline queue
   */
  static addToOfflineQueue(tenantId: string, queueItem: OfflineQueueItem): void {
    if (!this.offlineQueues.has(tenantId)) {
      this.offlineQueues.set(tenantId, []);
    }
    this.offlineQueues.get(tenantId)!.push(queueItem);
  }

  /**
   * Get tenant synchronization state
   */
  static getTenantSyncState(tenantId: string): TenantSyncState | null {
    return this.tenantSyncStates.get(tenantId) || null;
  }

  /**
   * Broadcast synchronization event with filtering
   */
  static broadcastSyncEvent(tenantId: string, event: RealTimeEvent, locationFilter?: string): void {
    if (!this.io) return;

    const room = locationFilter ? `tenant-${tenantId}-location-${locationFilter}` : `tenant-${tenantId}`;
    
    this.io.to(room).emit('sync-event', {
      ...event,
      timestamp: new Date()
    });
  }
}