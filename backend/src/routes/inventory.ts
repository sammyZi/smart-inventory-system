/**
 * Inventory Management Routes with Tenant Isolation
 * API endpoints for stock management, transfers, and monitoring
 */

import express, { Response } from 'express';
import { InventoryService } from '../services/inventoryService';
import { authenticateJWT } from '../middleware/auth';
import { enforceTenantIsolation } from '../middleware/tenantAuth';
import { validate } from '../middleware/validation';
import { apiRateLimit } from '../middleware/rateLimiter';
import { logger } from '../utils/logger';
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

    return res.json({
      success: true,
      data: stockLevels,
      count: stockLevels.length
    });

  } catch (error) {
    logger.error('Error fetching stock levels:', error);
    return res.status(500).json({
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

      return res.json({
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

      return res.status(500).json({
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
    
    const filters: any = {};
    
    if (req.query.locationId) filters.locationId = req.query.locationId as string;
    if (req.query.productId) filters.productId = req.query.productId as string;
    if (req.query.movementType) filters.movementType = req.query.movementType;
    if (req.query.startDate) filters.startDate = new Date(req.query.startDate as string);
    if (req.query.endDate) filters.endDate = new Date(req.query.endDate as string);
    if (req.query.limit) filters.limit = parseInt(req.query.limit as string);

    const movements = await InventoryService.getStockMovements(tenantId, filters);

    return res.json({
      success: true,
      data: movements,
      count: movements.length
    });

  } catch (error) {
    logger.error('Error fetching stock movements:', error);
    return res.status(500).json({
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

      return res.status(201).json({
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

      return res.status(500).json({
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

      return res.json({
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

      return res.status(500).json({
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

    return res.json({
      success: true,
      data: alerts,
      count: alerts.length
    });

  } catch (error) {
    logger.error('Error fetching inventory alerts:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch inventory alerts',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/v1/inventory/stock/bulk-update
 * Bulk update stock levels with conflict resolution
 */
router.post('/stock/bulk-update', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const userId = req.user!.id;
    const { updates } = req.body;

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input',
        message: 'Updates array is required and must not be empty'
      });
    }

    const result = await InventoryService.bulkUpdateStock(tenantId, updates, userId);

    return res.json({
      success: true,
      data: result,
      message: `Bulk update completed: ${result.success.length} successful, ${result.failed.length} failed`
    });

  } catch (error) {
    logger.error('Error in bulk stock update:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to perform bulk stock update',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/v1/inventory/stock/reserve
 * Reserve stock for pending transactions
 */
router.post('/stock/reserve', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const userId = req.user!.id;
    const { productId, locationId, quantity, reference } = req.body;

    if (!productId || !locationId || !quantity) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'productId, locationId, and quantity are required'
      });
    }

    const reservedStock = await InventoryService.reserveStock(
      tenantId, 
      productId, 
      locationId, 
      quantity, 
      userId, 
      reference
    );

    return res.json({
      success: true,
      data: reservedStock,
      message: 'Stock reserved successfully'
    });

  } catch (error) {
    logger.error('Error reserving stock:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to reserve stock',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/v1/inventory/stock/release
 * Release reserved stock
 */
router.post('/stock/release', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const userId = req.user!.id;
    const { productId, locationId, quantity, reference } = req.body;

    if (!productId || !locationId || !quantity) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'productId, locationId, and quantity are required'
      });
    }

    const releasedStock = await InventoryService.releaseReservedStock(
      tenantId, 
      productId, 
      locationId, 
      quantity, 
      userId, 
      reference
    );

    return res.json({
      success: true,
      data: releasedStock,
      message: 'Reserved stock released successfully'
    });

  } catch (error) {
    logger.error('Error releasing reserved stock:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to release reserved stock',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/v1/inventory/validate
 * Validate stock operation before execution
 */
router.post('/validate', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { productId, locationId, requiredQuantity } = req.body;

    if (!productId || !locationId || requiredQuantity === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'productId, locationId, and requiredQuantity are required'
      });
    }

    const validation = await InventoryService.validateStockOperation(
      tenantId, 
      productId, 
      locationId, 
      requiredQuantity
    );

    return res.json({
      success: true,
      data: validation
    });

  } catch (error) {
    logger.error('Error validating stock operation:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to validate stock operation',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/v1/inventory/summary
 * Get comprehensive inventory summary for tenant
 */
router.get('/summary', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    
    const summary = await InventoryService.getInventorySummary(tenantId);

    return res.json({
      success: true,
      data: summary
    });

  } catch (error) {
    logger.error('Error fetching inventory summary:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch inventory summary',
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
    
    // Get comprehensive summary
    const summary = await InventoryService.getInventorySummary(tenantId);
    
    // Get recent movements
    const recentMovements = await InventoryService.getStockMovements(tenantId, { limit: 10 });

    const dashboardData = {
      summary,
      recentMovements: recentMovements.slice(0, 10),
      alerts: summary.alerts.slice(0, 5) // Top 5 alerts
    };

    return res.json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    logger.error('Error fetching inventory dashboard:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch inventory dashboard',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});



export default router;