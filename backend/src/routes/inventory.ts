/**
 * Inventory Management Routes with Tenant Isolation
 * API endpoints for stock management, transfers, and monitoring
 */

import express, { Request, Response } from 'express';
import { InventoryService } from '../services/inventoryService';
import { authenticateJWT } from '../middleware/auth';
import { requireAdmin, enforceTenantIsolation } from '../middleware/tenantAuth';
import { validate } from '../middleware/validation';
import { auditCustomAction } from '../middleware/auditLogger';
import { apiRateLimit } from '../middleware/rateLimiter';
import { logger } from '../utils/logger';
import { SaaSService } from '../services/saasService';
import Joi from 'joi';
import { AuthenticatedRequest } from '../types';

const router = express.Router();

// Validation schemas
const stockUpdateSchema = Joi.object({
  productId: Joi.string().required(),
  locationId: Joi.string().required(),
  quantity: Joi.number().integer().min(0).required(),
  reason: Joi.string().optional(),
  reference: Joi.string().optional()
});

const stockTransferSchema = Joi.object({
  fromLocationId: Joi.string().required(),
  toLocationId: Joi.string().required(),
  items: Joi.array().items(
    Joi.object({
      productId: Joi.string().required(),
      quantity: Joi.number().integer().min(1).required()
    })
  ).min(1).required(),
  notes: Joi.string().optional()
});

// Apply middleware to all routes
router.use(authenticateJWT);
router.use(enforceTenantIsolation);
router.use(auditCustomAction('INVENTORY_ACCESS'));

/**
 * GET /api/v1/inventory/stock
 * Get stock levels for tenant with filtering options
 */
router.get('/stock', apiRateLimit, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    
    const filters = {
      locationId: req.query.locationId as string,
      productId: req.query.productId as string,
      lowStock: req.query.lowStock === 'true',
      outOfStock: req.query.outOfStock === 'true'
    };

    const stockLevels = await InventoryService.getTenantStockLevels(tenantId, filters);

    res.json({
      success: true,
      data: stockLevels,
      count: stockLevels.length
    });

  } catch (error) {
    logger.error('Error fetching stock levels:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stock levels',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PUT /api/v1/inventory/stock/update
 * Update stock level for a product at a location
 */
router.put('/stock/update', 
  validate(stockUpdateSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const userId = req.user!.id;
      const updateData = req.body;

      const updatedStock = await InventoryService.updateStockLevel(tenantId, updateData, userId);

      res.json({
        success: true,
        data: updatedStock,
        message: 'Stock level updated successfully'
      });

    } catch (error) {
      logger.error('Error updating stock level:', error);
      
      if (error instanceof Error && error.message.includes('access denied')) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to update stock level',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * GET /api/v1/inventory/movements
 * Get stock movement history for tenant
 */
router.get('/movements', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    
    const filters = {
      locationId: req.query.locationId as string,
      productId: req.query.productId as string,
      movementType: req.query.movementType as any,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined
    };

    const movements = await InventoryService.getStockMovements(tenantId, filters);

    res.json({
      success: true,
      data: movements,
      count: movements.length
    });

  } catch (error) {
    logger.error('Error fetching stock movements:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stock movements',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/v1/inventory/transfer
 * Create stock transfer between locations
 */
router.post('/transfer',
  validate(stockTransferSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const userId = req.user!.id;
      const transferData = req.body;

      const transfer = await InventoryService.createStockTransfer(tenantId, transferData, userId);

      res.status(201).json({
        success: true,
        data: transfer,
        message: 'Stock transfer created successfully'
      });

    } catch (error) {
      logger.error('Error creating stock transfer:', error);
      
      if (error instanceof Error && error.message.includes('access denied')) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          message: error.message
        });
      }

      if (error instanceof Error && error.message.includes('Insufficient stock')) {
        return res.status(400).json({
          success: false,
          error: 'Insufficient stock',
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to create stock transfer',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * PUT /api/v1/inventory/transfer/:transferId/process
 * Process (approve/reject) stock transfer
 */
router.put('/transfer/:transferId/process',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const userId = req.user!.id;
      const { transferId } = req.params;
      const { action } = req.body;

      if (!['approve', 'reject'].includes(action)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid action',
          message: 'Action must be either "approve" or "reject"'
        });
      }

      const processedTransfer = await InventoryService.processStockTransfer(
        tenantId, 
        transferId, 
        userId, 
        action
      );

      res.json({
        success: true,
        data: processedTransfer,
        message: `Stock transfer ${action}d successfully`
      });

    } catch (error) {
      logger.error('Error processing stock transfer:', error);
      
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: 'Transfer not found',
          message: error.message
        });
      }

      if (error instanceof Error && error.message.includes('access denied')) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        error: 'Failed to process stock transfer',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * GET /api/v1/inventory/alerts
 * Get inventory alerts for tenant
 */
router.get('/alerts', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    
    const alerts = await InventoryService.getInventoryAlerts(tenantId);

    res.json({
      success: true,
      data: alerts,
      count: alerts.length
    });

  } catch (error) {
    logger.error('Error fetching inventory alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch inventory alerts',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/v1/inventory/dashboard
 * Get inventory dashboard data for tenant
 */
router.get('/dashboard', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    
    // Get dashboard metrics
    const [
      totalStock,
      lowStockItems,
      outOfStockItems,
      alerts,
      recentMovements
    ] = await Promise.all([
      InventoryService.getTenantStockLevels(tenantId),
      InventoryService.getTenantStockLevels(tenantId, { lowStock: true }),
      InventoryService.getTenantStockLevels(tenantId, { outOfStock: true }),
      InventoryService.getInventoryAlerts(tenantId),
      InventoryService.getStockMovements(tenantId, { limit: 10 })
    ]);

    // Calculate metrics
    const totalProducts = totalStock.length;
    const totalValue = totalStock.reduce((sum, stock) => {
      const product = (stock as any).product;
      return sum + (stock.quantity * (product?.price || 0));
    }, 0);

    const dashboardData = {
      summary: {
        totalProducts,
        totalValue,
        lowStockCount: lowStockItems.length,
        outOfStockCount: outOfStockItems.length,
        alertsCount: alerts.length
      },
      alerts: alerts.slice(0, 5), // Top 5 alerts
      recentMovements: recentMovements.slice(0, 10), // Last 10 movements
      stockByLocation: this.groupStockByLocation(totalStock),
      topProducts: this.getTopProductsByValue(totalStock).slice(0, 10)
    };

    res.json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    logger.error('Error fetching inventory dashboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch inventory dashboard',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Helper methods for dashboard data processing
 */
function groupStockByLocation(stockLevels: any[]) {
  const grouped = stockLevels.reduce((acc, stock) => {
    const locationName = stock.location?.name || 'Unknown';
    if (!acc[locationName]) {
      acc[locationName] = {
        locationName,
        totalProducts: 0,
        totalValue: 0,
        lowStockCount: 0
      };
    }
    
    acc[locationName].totalProducts += 1;
    acc[locationName].totalValue += stock.quantity * (stock.product?.price || 0);
    if (stock.quantity <= stock.minThreshold) {
      acc[locationName].lowStockCount += 1;
    }
    
    return acc;
  }, {});

  return Object.values(grouped);
}

function getTopProductsByValue(stockLevels: any[]) {
  return stockLevels
    .map(stock => ({
      productId: stock.productId,
      productName: stock.product?.name || 'Unknown',
      sku: stock.product?.sku || '',
      quantity: stock.quantity,
      unitPrice: stock.product?.price || 0,
      totalValue: stock.quantity * (stock.product?.price || 0),
      locationName: stock.location?.name || 'Unknown'
    }))
    .sort((a, b) => b.totalValue - a.totalValue);
}

export default router;