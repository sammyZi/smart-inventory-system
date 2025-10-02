/**
 * Pricing and Discount Management Service
 * Handles tenant-specific pricing rules and discount calculations
 */

import { DiscountRule, PricingRule, DiscountType, PriceAdjustmentType } from '@prisma/client';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

export interface DiscountRuleData {
  name: string;
  description?: string;
  type: DiscountType;
  value: number;
  minAmount?: number;
  maxAmount?: number;
  applicableProducts?: string[];
  applicableCategories?: string[];
  validFrom?: Date;
  validTo?: Date;
  usageLimit?: number;
}

export interface PricingRuleData {
  name: string;
  productId?: string;
  category?: string;
  priceAdjustment: number;
  adjustmentType: PriceAdjustmentType;
  priority?: number;
  validFrom?: Date;
  validTo?: Date;
}

export interface DiscountCalculation {
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
  appliedRules: Array<{
    ruleId: string;
    ruleName: string;
    discountAmount: number;
  }>;
}

export class PricingService {
  /**
   * Create discount rule for tenant
   */
  static async createDiscountRule(
    tenantId: string,
    data: DiscountRuleData
  ): Promise<DiscountRule> {
    try {
      const rule = await prisma.discountRule.create({
        data: {
          tenantId,
          name: data.name,
          description: data.description,
          type: data.type,
          value: data.value,
          minAmount: data.minAmount,
          maxAmount: data.maxAmount,
          applicableProducts: data.applicableProducts || [],
          applicableCategories: data.applicableCategories || [],
          validFrom: data.validFrom,
          validTo: data.validTo,
          usageLimit: data.usageLimit,
          isActive: true
        }
      });

      logger.info(`Discount rule created for tenant ${tenantId}:`, {
        ruleId: rule.id,
        name: rule.name,
        type: rule.type
      });

      return rule;
    } catch (error) {
      logger.error(`Error creating discount rule for tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Get active discount rules for tenant
   */
  static async getActiveDiscountRules(tenantId: string): Promise<DiscountRule[]> {
    try {
      const now = new Date();
      
      const rules = await prisma.discountRule.findMany({
        where: {
          tenantId,
          isActive: true,
          OR: [
            { validFrom: null, validTo: null },
            { validFrom: { lte: now }, validTo: { gte: now } },
            { validFrom: { lte: now }, validTo: null },
            { validFrom: null, validTo: { gte: now } }
          ]
        },
        orderBy: { createdAt: 'desc' }
      });

      return rules;
    } catch (error) {
      logger.error(`Error fetching discount rules for tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Calculate applicable discounts for a transaction
   */
  static async calculateDiscounts(
    tenantId: string,
    items: Array<{
      productId: string;
      category: string;
      quantity: number;
      unitPrice: number;
    }>,
    subtotal: number
  ): Promise<DiscountCalculation> {
    try {
      const rules = await this.getActiveDiscountRules(tenantId);
      const appliedRules: Array<{ ruleId: string; ruleName: string; discountAmount: number }> = [];
      let totalDiscount = 0;

      for (const rule of rules) {
        // Check usage limit
        if (rule.usageLimit && rule.usageCount >= rule.usageLimit) {
          continue;
        }

        // Check minimum amount
        if (rule.minAmount && subtotal < rule.minAmount) {
          continue;
        }

        let ruleDiscount = 0;

        switch (rule.type) {
          case DiscountType.PERCENTAGE:
            ruleDiscount = this.calculatePercentageDiscount(
              rule,
              items,
              subtotal
            );
            break;

          case DiscountType.FIXED_AMOUNT:
            ruleDiscount = this.calculateFixedDiscount(
              rule,
              items,
              subtotal
            );
            break;

          case DiscountType.BUY_X_GET_Y:
            ruleDiscount = this.calculateBuyXGetYDiscount(
              rule,
              items
            );
            break;
        }

        if (ruleDiscount > 0) {
          // Apply max discount limit if set
          if (rule.maxAmount && ruleDiscount > rule.maxAmount) {
            ruleDiscount = rule.maxAmount;
          }

          appliedRules.push({
            ruleId: rule.id,
            ruleName: rule.name,
            discountAmount: ruleDiscount
          });

          totalDiscount += ruleDiscount;
        }
      }

      return {
        originalAmount: subtotal,
        discountAmount: totalDiscount,
        finalAmount: subtotal - totalDiscount,
        appliedRules
      };
    } catch (error) {
      logger.error(`Error calculating discounts for tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Create pricing rule for tenant
   */
  static async createPricingRule(
    tenantId: string,
    data: PricingRuleData
  ): Promise<PricingRule> {
    try {
      const rule = await prisma.pricingRule.create({
        data: {
          tenantId,
          name: data.name,
          productId: data.productId,
          category: data.category,
          priceAdjustment: data.priceAdjustment,
          adjustmentType: data.adjustmentType,
          priority: data.priority || 0,
          validFrom: data.validFrom,
          validTo: data.validTo,
          isActive: true
        }
      });

      logger.info(`Pricing rule created for tenant ${tenantId}:`, {
        ruleId: rule.id,
        name: rule.name
      });

      return rule;
    } catch (error) {
      logger.error(`Error creating pricing rule for tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Get active pricing rules for tenant
   */
  static async getActivePricingRules(tenantId: string): Promise<PricingRule[]> {
    try {
      const now = new Date();
      
      const rules = await prisma.pricingRule.findMany({
        where: {
          tenantId,
          isActive: true,
          OR: [
            { validFrom: null, validTo: null },
            { validFrom: { lte: now }, validTo: { gte: now } },
            { validFrom: { lte: now }, validTo: null },
            { validFrom: null, validTo: { gte: now } }
          ]
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' }
        ]
      });

      return rules;
    } catch (error) {
      logger.error(`Error fetching pricing rules for tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Apply pricing rules to get adjusted price
   */
  static async getAdjustedPrice(
    tenantId: string,
    productId: string,
    category: string,
    basePrice: number
  ): Promise<number> {
    try {
      const rules = await this.getActivePricingRules(tenantId);
      let adjustedPrice = basePrice;

      for (const rule of rules) {
        // Check if rule applies to this product
        const applies = 
          (rule.productId && rule.productId === productId) ||
          (rule.category && rule.category === category);

        if (!applies) continue;

        switch (rule.adjustmentType) {
          case PriceAdjustmentType.PERCENTAGE_INCREASE:
            adjustedPrice += adjustedPrice * (rule.priceAdjustment / 100);
            break;

          case PriceAdjustmentType.PERCENTAGE_DECREASE:
            adjustedPrice -= adjustedPrice * (rule.priceAdjustment / 100);
            break;

          case PriceAdjustmentType.FIXED_INCREASE:
            adjustedPrice += rule.priceAdjustment;
            break;

          case PriceAdjustmentType.FIXED_DECREASE:
            adjustedPrice -= rule.priceAdjustment;
            break;

          case PriceAdjustmentType.FIXED_PRICE:
            adjustedPrice = rule.priceAdjustment;
            break;
        }

        // Ensure price doesn't go negative
        if (adjustedPrice < 0) adjustedPrice = 0;
      }

      return adjustedPrice;
    } catch (error) {
      logger.error(`Error calculating adjusted price for tenant ${tenantId}:`, error);
      return basePrice; // Return base price on error
    }
  }

  /**
   * Update discount rule
   */
  static async updateDiscountRule(
    tenantId: string,
    ruleId: string,
    data: Partial<DiscountRuleData>
  ): Promise<DiscountRule> {
    try {
      // Verify rule belongs to tenant
      const existing = await prisma.discountRule.findFirst({
        where: { id: ruleId, tenantId }
      });

      if (!existing) {
        throw new Error('Discount rule not found or access denied');
      }

      const updated = await prisma.discountRule.update({
        where: { id: ruleId },
        data: {
          name: data.name,
          description: data.description,
          value: data.value,
          minAmount: data.minAmount,
          maxAmount: data.maxAmount,
          applicableProducts: data.applicableProducts,
          applicableCategories: data.applicableCategories,
          validFrom: data.validFrom,
          validTo: data.validTo,
          usageLimit: data.usageLimit
        }
      });

      return updated;
    } catch (error) {
      logger.error(`Error updating discount rule for tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Deactivate discount rule
   */
  static async deactivateDiscountRule(
    tenantId: string,
    ruleId: string
  ): Promise<void> {
    try {
      const existing = await prisma.discountRule.findFirst({
        where: { id: ruleId, tenantId }
      });

      if (!existing) {
        throw new Error('Discount rule not found or access denied');
      }

      await prisma.discountRule.update({
        where: { id: ruleId },
        data: { isActive: false }
      });
    } catch (error) {
      logger.error(`Error deactivating discount rule for tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  private static calculatePercentageDiscount(
    rule: DiscountRule,
    items: Array<{ productId: string; category: string; quantity: number; unitPrice: number }>,
    subtotal: number
  ): number {
    // If no specific products/categories, apply to entire subtotal
    if (rule.applicableProducts.length === 0 && rule.applicableCategories.length === 0) {
      return subtotal * (rule.value / 100);
    }

    // Calculate discount only for applicable items
    let applicableAmount = 0;
    for (const item of items) {
      if (
        rule.applicableProducts.includes(item.productId) ||
        rule.applicableCategories.includes(item.category)
      ) {
        applicableAmount += item.quantity * item.unitPrice;
      }
    }

    return applicableAmount * (rule.value / 100);
  }

  private static calculateFixedDiscount(
    rule: DiscountRule,
    items: Array<{ productId: string; category: string; quantity: number; unitPrice: number }>,
    subtotal: number
  ): number {
    // If no specific products/categories, apply fixed discount
    if (rule.applicableProducts.length === 0 && rule.applicableCategories.length === 0) {
      return rule.value;
    }

    // Check if any applicable items exist
    const hasApplicableItems = items.some(item =>
      rule.applicableProducts.includes(item.productId) ||
      rule.applicableCategories.includes(item.category)
    );

    return hasApplicableItems ? rule.value : 0;
  }

  private static calculateBuyXGetYDiscount(
    rule: DiscountRule,
    items: Array<{ productId: string; category: string; quantity: number; unitPrice: number }>
  ): number {
    // Simplified Buy X Get Y logic
    // In production, implement more sophisticated logic based on rule configuration
    let discount = 0;

    for (const item of items) {
      if (
        rule.applicableProducts.includes(item.productId) ||
        rule.applicableCategories.includes(item.category)
      ) {
        // Example: Buy 2 get 1 free (every 3rd item is free)
        const freeItems = Math.floor(item.quantity / 3);
        discount += freeItems * item.unitPrice;
      }
    }

    return discount;
  }
}
