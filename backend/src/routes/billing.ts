/**
 * Multi-Tenant Point of Sale and Billing API Routes
 * Handles transaction processing, payment integration, and receipt generation
 */

import express, { Response } from 'express';
import { BillingService } from '../services/billingService';
import { authenticateJWT } from '../middleware/auth';
import { enforceTenantIsolation } from '../middleware/tenantAuth';
import { validate } from '../middleware/validation';
import { apiRateLimit } from '../middleware/rateLimiter';
import { logger } from '../utils/logger';
import Joi from 'joi';
import { AuthenticatedRequest } from '../types';

const router = express.Router();

// Validation schemas
const transactionSchema = Joi.object({
  locationId: Joi.string().required(),
  customerId: Joi.string().optional(),
  items: Joi.array().items(
    Joi.object({
      productId: Joi.string().required(),
      quantity: Joi.number().integer().min(1).required(),
      unitPrice: Joi.number().min(0).required(),
      discountAmount: Joi.number().min(0).optional()
    })
  ).min(1).required(),
  paymentMethod: Joi.string().valid('CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'DIGITAL_WALLET', 'BANK_TRANSFER', 'CHECK', 'OTHER').required(),
  discountAmount: Joi.number().min(0).optional(),
  notes: Joi.string().optional(),
  customerInfo: Joi.object({
    name: Joi.string().optional(),
    email: Joi.string().email().optional(),
    phone: Joi.string().optional()
  }).optional()
});

const paymentSchema = Joi.object({
  transactionId: Joi.string().required(),
  paymentMethod: Joi.string().valid('CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'DIGITAL_WALLET', 'BANK_TRANSFER', 'CHECK', 'OTHER').required(),
  amount: Joi.number().min(0).required(),
  paymentDetails: Joi.object({
    cardNumber: Joi.string().optional(),
    expiryDate: Joi.string().optional(),
    cvv: Joi.string().optional(),
    cardholderName: Joi.string().optional(),
    digitalWalletId: Joi.string().optional(),
    bankTransferRef: Joi.string().optional()
  }).optional()
});

const refundSchema = Joi.object({
  transactionId: Joi.string().required(),
  items: Joi.array().items(
    Joi.object({
      productId: Joi.string().required(),
      quantity: Joi.number().integer().min(1).required(),
      reason: Joi.string().optional()
    })
  ).min(1).required(),
  reason: Joi.string().required(),
  refundMethod: Joi.string().valid('original', 'cash', 'store_credit').optional()
});

// Apply middleware to all routes
router.use(authenticateJWT);
router.use(enforceTenantIsolation);

/**
 * POST /api/v1/billing/transactions
 * Create a new transaction
 */
router.post('/transactions',
  validate(transactionSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const userId = req.user!.id;
      const transactionData = req.body;

      const transaction = await BillingService.createTransaction(tenantId, userId, transactionData);

      res.status(201).json({
        success: true,
        data: transaction,
        message: 'Transaction created successfully'
      });

    } catch (error) {
      logger.error('Error creating transaction:', error);
      
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
        error: 'Failed to create transaction',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * POST /api/v1/billing/payments
 * Process payment for a transaction
 */
router.post('/payments',
  validate(paymentSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const userId = req.user!.id;
      const paymentData = req.body;

      const transaction = await BillingService.processPayment(tenantId, userId, paymentData);

      res.json({
        success: true,
        data: transaction,
        message: 'Payment processed successfully'
      });

    } catch (error) {
      logger.error('Error processing payment:', error);
      
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: 'Transaction not found',
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
        error: 'Failed to process payment',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * GET /api/v1/billing/transactions
 * Get tenant transactions with filtering
 */
router.get('/transactions', apiRateLimit, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    
    const filters = {
      locationId: req.query.locationId as string,
      status: req.query.status as any,
      paymentMethod: req.query.paymentMethod as any,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined
    };

    const result = await BillingService.getTenantTransactions(tenantId, filters);

    res.json({
      success: true,
      data: result.transactions,
      pagination: {
        total: result.total,
        limit: filters.limit || 50,
        offset: filters.offset || 0,
        hasMore: (filters.offset || 0) + result.transactions.length < result.total
      }
    });

  } catch (error) {
    logger.error('Error fetching transactions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transactions',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/v1/billing/transactions/:transactionId
 * Get specific transaction details
 */
router.get('/transactions/:transactionId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { transactionId } = req.params;

    // This would use BillingService to get single transaction
    // For now, we'll use the existing getTenantTransactions with filter
    const result = await BillingService.getTenantTransactions(tenantId, { limit: 1 });
    const transaction = result.transactions.find(t => t.id === transactionId);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found',
        message: 'Transaction not found or access denied'
      });
    }

    res.json({
      success: true,
      data: transaction
    });

  } catch (error) {
    logger.error('Error fetching transaction:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transaction',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/v1/billing/refunds
 * Process refund for transaction items
 */
router.post('/refunds',
  validate(refundSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const userId = req.user!.id;
      const refundData = req.body;

      const refund = await BillingService.processRefund(tenantId, userId, refundData);

      res.status(201).json({
        success: true,
        data: refund,
        message: 'Refund processed successfully'
      });

    } catch (error) {
      logger.error('Error processing refund:', error);
      
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: 'Transaction not found',
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
        error: 'Failed to process refund',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * GET /api/v1/billing/receipts/:transactionId
 * Generate receipt for transaction
 */
router.get('/receipts/:transactionId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const { transactionId } = req.params;
    const format = (req.query.format as 'pdf' | 'html' | 'json') || 'json';

    const receipt = await BillingService.generateReceipt(tenantId, transactionId, format);

    switch (format) {
      case 'pdf':
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="receipt-${transactionId}.pdf"`);
        res.send(receipt);
        break;
      case 'html':
        res.setHeader('Content-Type', 'text/html');
        res.send(receipt);
        break;
      default:
        res.json({
          success: true,
          data: receipt
        });
    }

  } catch (error) {
    logger.error('Error generating receipt:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found',
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
      error: 'Failed to generate receipt',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/v1/billing/analytics
 * Get sales analytics for tenant
 */
router.get('/analytics', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const period = (req.query.period as 'today' | 'week' | 'month' | 'year') || 'today';

    const analytics = await BillingService.getSalesAnalytics(tenantId, period);

    res.json({
      success: true,
      data: {
        period,
        analytics,
        generatedAt: new Date()
      }
    });

  } catch (error) {
    logger.error('Error fetching sales analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sales analytics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/v1/billing/dashboard
 * Get billing dashboard data
 */
router.get('/dashboard', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;

    // Get analytics for different periods
    const [todayAnalytics, weekAnalytics, monthAnalytics] = await Promise.all([
      BillingService.getSalesAnalytics(tenantId, 'today'),
      BillingService.getSalesAnalytics(tenantId, 'week'),
      BillingService.getSalesAnalytics(tenantId, 'month')
    ]);

    // Get recent transactions
    const recentTransactions = await BillingService.getTenantTransactions(tenantId, { 
      limit: 10,
      offset: 0 
    });

    const dashboardData = {
      summary: {
        today: {
          sales: todayAnalytics.totalSales,
          transactions: todayAnalytics.totalTransactions,
          averageOrderValue: todayAnalytics.averageOrderValue
        },
        week: {
          sales: weekAnalytics.totalSales,
          transactions: weekAnalytics.totalTransactions,
          averageOrderValue: weekAnalytics.averageOrderValue
        },
        month: {
          sales: monthAnalytics.totalSales,
          transactions: monthAnalytics.totalTransactions,
          averageOrderValue: monthAnalytics.averageOrderValue
        }
      },
      topProducts: monthAnalytics.topProducts.slice(0, 5),
      recentTransactions: recentTransactions.transactions.slice(0, 5),
      trends: {
        salesGrowth: this.calculateGrowthRate(weekAnalytics.totalSales, todayAnalytics.totalSales * 7),
        transactionGrowth: this.calculateGrowthRate(weekAnalytics.totalTransactions, todayAnalytics.totalTransactions * 7)
      }
    };

    res.json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    logger.error('Error fetching billing dashboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch billing dashboard',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/v1/billing/quick-sale
 * Quick sale endpoint for simple transactions
 */
router.post('/quick-sale', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const userId = req.user!.id;
    const { locationId, items, paymentMethod, customerInfo } = req.body;

    // Validate required fields
    if (!locationId || !items || !paymentMethod) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'locationId, items, and paymentMethod are required'
      });
    }

    // Create transaction
    const transaction = await BillingService.createTransaction(tenantId, userId, {
      locationId,
      items,
      paymentMethod,
      customerInfo
    });

    // Process payment immediately
    const processedTransaction = await BillingService.processPayment(tenantId, userId, {
      transactionId: transaction.id,
      paymentMethod,
      amount: transaction.totalAmount
    });

    // Generate receipt
    const receipt = await BillingService.generateReceipt(tenantId, transaction.id, 'json');

    res.status(201).json({
      success: true,
      data: {
        transaction: processedTransaction,
        receipt
      },
      message: 'Quick sale completed successfully'
    });

  } catch (error) {
    logger.error('Error processing quick sale:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process quick sale',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Helper methods
 */
function calculateGrowthRate(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

export default router;