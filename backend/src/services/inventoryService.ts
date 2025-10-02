/**
 * Enhanced Inventory Management Service with Tenant Isolation
 * Handles stock levels, movements, transfers, and monitoring within tenant boundaries
 */

import { PrismaClient, StockLevel, StockMovement, StockTransfer, MovementType, TransferStatus } from '@prisma/client';
import { logger } from '../utils/logger';
import { AuditService } from './auditService';
import { SaaSService } from './saasService';
import { RealtimeService } from './realtimeService';

const prisma = new PrismaClient();

export interface StockUpdateData {
  productId: string;
  locationId: string;
  quantity: number;
  reason?: string;
  reference?: string;
}

export interface StockTransferData {
  fromLocationId: string;
  toLocationId: string;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
  notes?: string;
}

export interface InventoryAlert {
  id: string;
  tenantId: string;
  type: 'low_stock' | 'out_of_stock' | 'overstock' | 'threshold_breach';
  productId: string;
  locationId: string;
  currentQuantity: number;
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  createdAt: Date;
  resolved: boolean;
}

export class InventoryService {
  /**
   * Get stock levels for tenant with optional filtering
   */
  static async getTenantStockLevels(
    tenantId: string,
    filters?: {
      locationId?: string;
      productId?: string;
      lowStock?: boolean;
      outOfStock?: boolean;
    }
  ): Promise<StockLevel[]> {
    try {
      // Verify tenant access and get locations
      const locations = await SaaSService.getAdminLocations(tenantId);
      const locationIds = locations.map(l => l.id);

      if (locationIds.length === 0) {
        return [];
      }

      const whereClause: any = {
        locationId: { in: locationIds }
      };

      // Apply filters
      if (filters?.locationId) {
        // Verify location belongs to tenant
        if (!locationIds.includes(filters.locationId)) {
          throw new Error('Location access denied');
        }
        whereClause.locationId = filters.locationId;
      }

      if (filters?.productId) {
        whereClause.productId = filters.productId;
      }

      if (filters?.lowStock) {
        whereClause.quantity = { lte: prisma.stockLevel.fields.minThreshold };
      }

      if (filters?.outOfStock) {
        whereClause.quantity = 0;
      }

      const stockLevels = await prisma.stockLevel.findMany({
        where: whereClause,
        include: {
          product: {
            select: {
              id: true,
              sku: true,
              name: true,
              category: true,
              price: true
            }
          },
          location: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: [
          { quantity: 'asc' },
          { product: { name: 'asc' } }
        ]
      });

      return stockLevels;

    } catch (error) {
      logger.error(`Error fetching stock levels for tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Update stock level with tenant validation
   */
  static async updateStockLevel(
    tenantId: string,
    data: StockUpdateData,
    userId: string
  ): Promise<StockLevel> {
    try {
      // Verify location belongs to tenant
      const hasAccess = await SaaSService.verifyLocationOwnership(tenantId, data.locationId);
      if (!hasAccess) {
        throw new Error('Location access denied');
      }

      // Get current stock level
      const currentStock = await prisma.stockLevel.findFirst({
        where: {
          productId: data.productId,
          locationId: data.locationId
        }
      });

      if (!currentStock) {
        throw new Error('Stock level not found');
      }

      const previousQuantity = currentStock.quantity;
      const newQuantity = data.quantity;
      const quantityChange = newQuantity - previousQuantity;

      // Update stock level
      const updatedStock = await prisma.$transaction(async (tx) => {
        // Update stock level
        const updated = await tx.stockLevel.update({
          where: { id: currentStock.id },
          data: {
            quantity: newQuantity,
            lastUpdated: new Date()
          },
          include: {
            product: true,
            location: true
          }
        });

        // Create stock movement record
        await tx.stockMovement.create({
          data: {
            productId: data.productId,
            locationId: data.locationId,
            movementType: quantityChange > 0 ? MovementType.ADJUSTMENT : MovementType.ADJUSTMENT,
            quantity: quantityChange,
            previousQty: previousQuantity,
            newQty: newQuantity,
            reason: data.reason || 'Manual adjustment',
            reference: data.reference,
            performedBy: userId
          }
        });

        return updated;
      });

      // Check for alerts
      await this.checkStockAlerts(tenantId, updatedStock);

      // Real-time notification
      RealtimeService.broadcastToTenant(tenantId, 'inventory-update', {
        type: 'stock_update',
        productId: data.productId,
        locationId: data.locationId,
        previousQuantity,
        newQuantity,
        updatedBy: userId
      });

      // Audit log
      await AuditService.logAction({
        userId,
        action: 'UPDATE',
        resource: 'stock_level',
        resourceId: updatedStock.id,
        oldValues: { quantity: previousQuantity },
        newValues: { quantity: newQuantity },
        locationId: data.locationId
      });

      logger.info(`Stock updated for tenant ${tenantId}:`, {
        productId: data.productId,
        locationId: data.locationId,
        change: quantityChange
      });

      return updatedStock;

    } catch (error) {
      logger.error(`Error updating stock for tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Create stock transfer between tenant locations
   */
  static async createStockTransfer(
    tenantId: string,
    data: StockTransferData,
    userId: string
  ): Promise<StockTransfer> {
    try {
      // Verify both locations belong to tenant
      const [fromAccess, toAccess] = await Promise.all([
        SaaSService.verifyLocationOwnership(tenantId, data.fromLocationId),
        SaaSService.verifyLocationOwnership(tenantId, data.toLocationId)
      ]);

      if (!fromAccess || !toAccess) {
        throw new Error('Location access denied');
      }

      // Validate stock availability
      for (const item of data.items) {
        const stockLevel = await prisma.stockLevel.findFirst({
          where: {
            productId: item.productId,
            locationId: data.fromLocationId
          }
        });

        if (!stockLevel || stockLevel.quantity < item.quantity) {
          throw new Error(`Insufficient stock for product ${item.productId}`);
        }
      }

      // Create transfer
      const transfer = await prisma.$transaction(async (tx) => {
        // Generate transfer number
        const transferNo = `TXF-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

        // Create transfer record
        const newTransfer = await tx.stockTransfer.create({
          data: {
            transferNo,
            fromLocationId: data.fromLocationId,
            toLocationId: data.toLocationId,
            status: TransferStatus.PENDING,
            requestedBy: userId,
            notes: data.notes,
            items: {
              create: data.items.map(item => ({
                productId: item.productId,
                requestedQty: item.quantity,
                approvedQty: item.quantity // Auto-approve for same tenant
              }))
            }
          },
          include: {
            items: true,
            fromLocation: true,
            toLocation: true
          }
        });

        return newTransfer;
      });

      // Real-time notification
      RealtimeService.broadcastToTenant(tenantId, 'inventory-transfer', {
        type: 'transfer_created',
        transferId: transfer.id,
        fromLocationId: data.fromLocationId,
        toLocationId: data.toLocationId,
        itemCount: data.items.length,
        createdBy: userId
      });

      // Audit log
      await AuditService.logAction({
        userId,
        action: 'CREATE',
        resource: 'stock_transfer',
        resourceId: transfer.id,
        newValues: {
          fromLocationId: data.fromLocationId,
          toLocationId: data.toLocationId,
          itemCount: data.items.length
        }
      });

      logger.info(`Stock transfer created for tenant ${tenantId}:`, {
        transferId: transfer.id,
        fromLocation: data.fromLocationId,
        toLocation: data.toLocationId
      });

      return transfer;

    } catch (error) {
      logger.error(`Error creating stock transfer for tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Process stock transfer (approve and execute)
   */
  static async processStockTransfer(
    tenantId: string,
    transferId: string,
    userId: string,
    action: 'approve' | 'reject'
  ): Promise<StockTransfer> {
    try {
      const transfer = await prisma.stockTransfer.findUnique({
        where: { id: transferId },
        include: {
          items: true,
          fromLocation: true,
          toLocation: true
        }
      });

      if (!transfer) {
        throw new Error('Transfer not found');
      }

      // Verify locations belong to tenant
      const [fromAccess, toAccess] = await Promise.all([
        SaaSService.verifyLocationOwnership(tenantId, transfer.fromLocationId),
        SaaSService.verifyLocationOwnership(tenantId, transfer.toLocationId)
      ]);

      if (!fromAccess || !toAccess) {
        throw new Error('Transfer access denied');
      }

      if (action === 'reject') {
        const updatedTransfer = await prisma.stockTransfer.update({
          where: { id: transferId },
          data: {
            status: TransferStatus.REJECTED,
            approvedBy: userId,
            approvedAt: new Date()
          },
          include: {
            items: true,
            fromLocation: true,
            toLocation: true
          }
        });

        return updatedTransfer;
      }

      // Process approval and execute transfer
      const processedTransfer = await prisma.$transaction(async (tx) => {
        // Update transfer status
        const updated = await tx.stockTransfer.update({
          where: { id: transferId },
          data: {
            status: TransferStatus.COMPLETED,
            approvedBy: userId,
            approvedAt: new Date(),
            completedAt: new Date()
          },
          include: {
            items: true,
            fromLocation: true,
            toLocation: true
          }
        });

        // Process each item
        for (const item of transfer.items) {
          const quantity = item.approvedQty || item.requestedQty;

          // Reduce stock at source location
          await this.updateStockInTransaction(tx, {
            productId: item.productId,
            locationId: transfer.fromLocationId,
            quantityChange: -quantity,
            movementType: MovementType.TRANSFER_OUT,
            reference: transferId,
            performedBy: userId
          });

          // Increase stock at destination location
          await this.updateStockInTransaction(tx, {
            productId: item.productId,
            locationId: transfer.toLocationId,
            quantityChange: quantity,
            movementType: MovementType.TRANSFER_IN,
            reference: transferId,
            performedBy: userId
          });
        }

        return updated;
      });

      // Real-time notification
      RealtimeService.broadcastToTenant(tenantId, 'inventory-transfer', {
        type: 'transfer_completed',
        transferId: transfer.id,
        fromLocationId: transfer.fromLocationId,
        toLocationId: transfer.toLocationId,
        processedBy: userId
      });

      logger.info(`Stock transfer processed for tenant ${tenantId}:`, {
        transferId,
        action,
        processedBy: userId
      });

      return processedTransfer;

    } catch (error) {
      logger.error(`Error processing stock transfer for tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Get stock movement history for tenant
   */
  static async getStockMovements(
    tenantId: string,
    filters?: {
      locationId?: string;
      productId?: string;
      movementType?: MovementType;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    }
  ): Promise<StockMovement[]> {
    try {
      // Get tenant locations
      const locations = await SaaSService.getAdminLocations(tenantId);
      const locationIds = locations.map(l => l.id);

      if (locationIds.length === 0) {
        return [];
      }

      const whereClause: any = {
        locationId: { in: locationIds }
      };

      // Apply filters
      if (filters?.locationId) {
        if (!locationIds.includes(filters.locationId)) {
          throw new Error('Location access denied');
        }
        whereClause.locationId = filters.locationId;
      }

      if (filters?.productId) {
        whereClause.productId = filters.productId;
      }

      if (filters?.movementType) {
        whereClause.movementType = filters.movementType;
      }

      if (filters?.startDate || filters?.endDate) {
        whereClause.timestamp = {};
        if (filters.startDate) whereClause.timestamp.gte = filters.startDate;
        if (filters.endDate) whereClause.timestamp.lte = filters.endDate;
      }

      const movements = await prisma.stockMovement.findMany({
        where: whereClause,
        include: {
          product: {
            select: {
              id: true,
              sku: true,
              name: true
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
        take: filters?.limit || 100
      });

      return movements;

    } catch (error) {
      logger.error(`Error fetching stock movements for tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Get inventory alerts for tenant
   */
  static async getInventoryAlerts(tenantId: string): Promise<InventoryAlert[]> {
    try {
      const stockLevels = await this.getTenantStockLevels(tenantId, { lowStock: true });
      
      const alerts: InventoryAlert[] = stockLevels.map(stock => {
        let type: InventoryAlert['type'] = 'low_stock';
        let severity: InventoryAlert['severity'] = 'medium';

        if (stock.quantity === 0) {
          type = 'out_of_stock';
          severity = 'critical';
        } else if (stock.quantity <= stock.minThreshold * 0.5) {
          severity = 'high';
        }

        return {
          id: `alert_${stock.id}`,
          tenantId,
          type,
          productId: stock.productId,
          locationId: stock.locationId,
          currentQuantity: stock.quantity,
          threshold: stock.minThreshold,
          severity,
          message: `${(stock as any).product?.name} is ${type === 'out_of_stock' ? 'out of stock' : 'running low'} at ${(stock as any).location?.name}`,
          createdAt: new Date(),
          resolved: false
        };
      });

      return alerts;

    } catch (error) {
      logger.error(`Error fetching inventory alerts for tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  private static async updateStockInTransaction(
    tx: any,
    data: {
      productId: string;
      locationId: string;
      quantityChange: number;
      movementType: MovementType;
      reference?: string;
      performedBy: string;
    }
  ): Promise<void> {
    // Get current stock
    const currentStock = await tx.stockLevel.findFirst({
      where: {
        productId: data.productId,
        locationId: data.locationId
      }
    });

    if (!currentStock) {
      // Create new stock level if doesn't exist
      await tx.stockLevel.create({
        data: {
          productId: data.productId,
          locationId: data.locationId,
          quantity: Math.max(0, data.quantityChange),
          reservedQuantity: 0,
          minThreshold: 10,
          lastUpdated: new Date()
        }
      });
    } else {
      // Update existing stock level
      const newQuantity = Math.max(0, currentStock.quantity + data.quantityChange);
      
      await tx.stockLevel.update({
        where: { id: currentStock.id },
        data: {
          quantity: newQuantity,
          lastUpdated: new Date()
        }
      });
    }

    // Create movement record
    await tx.stockMovement.create({
      data: {
        productId: data.productId,
        locationId: data.locationId,
        movementType: data.movementType,
        quantity: data.quantityChange,
        previousQty: currentStock?.quantity || 0,
        newQty: Math.max(0, (currentStock?.quantity || 0) + data.quantityChange),
        reference: data.reference,
        performedBy: data.performedBy
      }
    });
  }

  private static async checkStockAlerts(tenantId: string, stockLevel: any): Promise<void> {
    try {
      // Check for low stock
      if (stockLevel.quantity <= stockLevel.minThreshold) {
        RealtimeService.broadcastToTenant(tenantId, 'inventory-alert', {
          type: stockLevel.quantity === 0 ? 'out_of_stock' : 'low_stock',
          productId: stockLevel.productId,
          locationId: stockLevel.locationId,
          currentQuantity: stockLevel.quantity,
          threshold: stockLevel.minThreshold,
          productName: stockLevel.product?.name,
          locationName: stockLevel.location?.name
        });
      }

      // Check for overstock
      if (stockLevel.maxThreshold && stockLevel.quantity > stockLevel.maxThreshold) {
        RealtimeService.broadcastToTenant(tenantId, 'inventory-alert', {
          type: 'overstock',
          productId: stockLevel.productId,
          locationId: stockLevel.locationId,
          currentQuantity: stockLevel.quantity,
          threshold: stockLevel.maxThreshold,
          productName: stockLevel.product?.name,
          locationName: stockLevel.location?.name
        });
      }

    } catch (error) {
      logger.error('Error checking stock alerts:', error);
    }
  }
}