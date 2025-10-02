/**
 * Pricing and Discount Management Routes
 * API endpoints for managing tenant-specific pricing rules and discounts
 */

import express, { Response } from 'express';
import { PricingService } from '../services/pricingService';
import { authenticateJWT } from '../middleware/auth';
import { requireAdmin } from '../middleware/tenantAuth';
import { validate } from '../middleware/validation';
import { apiRateLimit } from '../middleware/rateLimiter';
import { logger } from '../utils/logger';
import Joi from 'joi';
import { AuthenticatedRequest } from '../types';

const router = express.Router();

// Validation schemas
const discountRuleSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  description: Joi.string().max(500).optional(),
  type: Joi.string().valid('PERCENTAGE', 'FIXED_AMOUNT', 'BUY_X_GET_Y').required(),
  value: Joi.number().min(0).required(),
  minAmount: Joi.number().min(0).optional(),
  maxAmount: Joi.number().min(0).optional(),
  applicableProducts: Joi.array().items(Joi.string()).optional(),
  applicableCategories: Joi.array().items(Joi.string()).optional(),
  validFrom: Joi.date().optional(),
  validTo: Joi.date().optional(),
  usageLimit: Joi.number().integer().min(1).optional()
});

const pricingRuleSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  productId: Joi.string().optional(),
  category: Joi.string().optional(),
  priceAdjustment: Joi.number().required(),
  adjustmentType: Joi.string().valid(
    'PERCENTAGE_INCREASE',
    'PERCENTAGE_DECREASE',
    'FIXED_INCREASE',
    'FIXED_DECREASE',
    'FIXED_PRICE'
  ).required(),
  priority: Joi.number().integer().min(0).optional(),
  validFrom: Joi.date().optional(),
  validTo: Joi.date().optional()
});

// Apply middleware
router.use(authenticateJWT);
router.use(requireAdmin);

/**
 * POST /api/v1/pricing/discounts
 * Create a new discount rule
 */
router.post('/discounts',
  apiRateLimit,
  validate(discountRuleSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.user!.id;
      const ruleData = req.body;

      const rule = await PricingService.createDiscountRule(tenantId, ruleData);

      return res.status(201).json({
        success: true,
        message: 'Discount rule created successfully',
        data: rule
      });
    } catch (error) {
      logger.error('Error creating discount rule:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to create discount rule',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * GET /api/v1/pricing/discounts
 * Get all active discount rules for tenant
 */
router.get('/discounts',
  apiRateLimit,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.user!.id;

      const rules = await PricingService.getActiveDiscountRules(tenantId);

      return res.json({
        success: true,
        data: rules,
        count: rules.length
      });
    } catch (error) {
      logger.error('Error fetching discount rules:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch discount rules',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * PUT /api/v1/pricing/discounts/:ruleId
 * Update a discount rule
 */
router.put('/discounts/:ruleId',
  apiRateLimit,
  validate(discountRuleSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.user!.id;
      const { ruleId } = req.params;
      const updateData = req.body;

      const updated = await PricingService.updateDiscountRule(tenantId, ruleId, updateData);

      return res.json({
        success: true,
        message: 'Discount rule updated successfully',
        data: updated
      });
    } catch (error) {
      logger.error('Error updating discount rule:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update discount rule',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * DELETE /api/v1/pricing/discounts/:ruleId
 * Deactivate a discount rule
 */
router.delete('/discounts/:ruleId',
  apiRateLimit,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.user!.id;
      const { ruleId } = req.params;

      await PricingService.deactivateDiscountRule(tenantId, ruleId);

      return res.json({
        success: true,
        message: 'Discount rule deactivated successfully'
      });
    } catch (error) {
      logger.error('Error deactivating discount rule:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to deactivate discount rule',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * POST /api/v1/pricing/rules
 * Create a new pricing rule
 */
router.post('/rules',
  apiRateLimit,
  validate(pricingRuleSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.user!.id;
      const ruleData = req.body;

      const rule = await PricingService.createPricingRule(tenantId, ruleData);

      return res.status(201).json({
        success: true,
        message: 'Pricing rule created successfully',
        data: rule
      });
    } catch (error) {
      logger.error('Error creating pricing rule:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to create pricing rule',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * GET /api/v1/pricing/rules
 * Get all active pricing rules for tenant
 */
router.get('/rules',
  apiRateLimit,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.user!.id;

      const rules = await PricingService.getActivePricingRules(tenantId);

      return res.json({
        success: true,
        data: rules,
        count: rules.length
      });
    } catch (error) {
      logger.error('Error fetching pricing rules:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch pricing rules',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * POST /api/v1/pricing/calculate-discount
 * Calculate applicable discounts for a transaction
 */
router.post('/calculate-discount',
  apiRateLimit,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.user!.id;
      const { items, subtotal } = req.body;

      if (!items || !Array.isArray(items) || !subtotal) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request',
          message: 'Items array and subtotal are required'
        });
      }

      const calculation = await PricingService.calculateDiscounts(tenantId, items, subtotal);

      return res.json({
        success: true,
        data: calculation
      });
    } catch (error) {
      logger.error('Error calculating discounts:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to calculate discounts',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * GET /api/v1/pricing/adjusted-price
 * Get adjusted price for a product
 */
router.get('/adjusted-price',
  apiRateLimit,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.user!.id;
      const { productId, category, basePrice } = req.query;

      if (!productId || !category || !basePrice) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request',
          message: 'productId, category, and basePrice are required'
        });
      }

      const adjustedPrice = await PricingService.getAdjustedPrice(
        tenantId,
        productId as string,
        category as string,
        parseFloat(basePrice as string)
      );

      return res.json({
        success: true,
        data: {
          productId,
          basePrice: parseFloat(basePrice as string),
          adjustedPrice,
          difference: adjustedPrice - parseFloat(basePrice as string)
        }
      });
    } catch (error) {
      logger.error('Error calculating adjusted price:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to calculate adjusted price',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

export default router;
