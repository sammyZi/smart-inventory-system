/**
 * Advanced Analytics Service for SaaS Multi-Tenant System
 * Provides AI-powered insights, predictive analytics, and business intelligence
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export interface TenantAnalytics {
  tenantId: string;
  period: 'day' | 'week' | 'month' | 'year';
  metrics: {
    revenue: {
      current: number;
      previous: number;
      growth: number;
      trend: 'up' | 'down' | 'stable';
    };
    transactions: {
      count: number;
      averageValue: number;
      growth: number;
    };
    inventory: {
      totalProducts: number;
      lowStockItems: number;
      turnoverRate: number;
      deadStock: number;
    };
    users: {
      activeUsers: number;
      newUsers: number;
      userGrowth: number;
    };
    locations: {
      totalLocations: number;
      topPerforming: Array<{ locationId: string; name: string; revenue: number }>;
    };
  };
  insights: Array<{
    type: 'opportunity' | 'warning' | 'success' | 'info';
    title: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
    actionable: boolean;
    recommendation?: string;
  }>;
  predictions: {
    nextMonthRevenue: number;
    inventoryNeeds: Array<{ productId: string; predictedDemand: number; recommendedOrder: number }>;
    seasonalTrends: Array<{ period: string; expectedGrowth: number }>;
  };
}

export interface CompetitiveAnalysis {
  tenantId: string;
  industryBenchmarks: {
    averageRevenue: number;
    averageGrowthRate: number;
    averageInventoryTurnover: number;
  };
  tenantPosition: 'above_average' | 'average' | 'below_average';
  recommendations: string[];
}

export class AnalyticsService {
  /**
   * Generate comprehensive tenant analytics
   */
  static async generateTenantAnalytics(
    tenantId: string, 
    period: 'day' | 'week' | 'month' | 'year' = 'month'
  ): Promise<TenantAnalytics> {
    try {
      logger.info(`Generating analytics for tenant ${tenantId} (${period})`);

      // Get date range for the period
      const { startDate, endDate, previousStartDate, previousEndDate } = this.getDateRange(period);

      // Fetch current period data
      const [
        currentRevenue,
        previousRevenue,
        transactionData,
        inventoryData,
        userData,
        locationData
      ] = await Promise.all([
        this.getRevenueData(tenantId, startDate, endDate),
        this.getRevenueData(tenantId, previousStartDate, previousEndDate),
        this.getTransactionData(tenantId, startDate, endDate),
        this.getInventoryData(tenantId),
        this.getUserData(tenantId, startDate, endDate),
        this.getLocationData(tenantId, startDate, endDate)
      ]);

      // Calculate metrics
      const revenueGrowth = previousRevenue > 0 ? 
        ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0;

      const analytics: TenantAnalytics = {
        tenantId,
        period,
        metrics: {
          revenue: {
            current: currentRevenue,
            previous: previousRevenue,
            growth: revenueGrowth,
            trend: revenueGrowth > 5 ? 'up' : revenueGrowth < -5 ? 'down' : 'stable'
          },
          transactions: transactionData,
          inventory: inventoryData,
          users: userData,
          locations: locationData
        },
        insights: await this.generateInsights(tenantId, {
          revenueGrowth,
          transactionData,
          inventoryData,
          userData
        }),
        predictions: await this.generatePredictions(tenantId)
      };

      return analytics;

    } catch (error) {
      logger.error(`Error generating analytics for tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Generate AI-powered business insights
   */
  private static async generateInsights(
    tenantId: string, 
    data: any
  ): Promise<TenantAnalytics['insights']> {
    const insights: TenantAnalytics['insights'] = [];

    // Revenue insights
    if (data.revenueGrowth > 20) {
      insights.push({
        type: 'success',
        title: 'Exceptional Revenue Growth',
        description: `Revenue has grown by ${data.revenueGrowth.toFixed(1)}% this period`,
        impact: 'high',
        actionable: true,
        recommendation: 'Consider expanding inventory or adding new locations to capitalize on growth'
      });
    } else if (data.revenueGrowth < -10) {
      insights.push({
        type: 'warning',
        title: 'Revenue Decline Detected',
        description: `Revenue has decreased by ${Math.abs(data.revenueGrowth).toFixed(1)}% this period`,
        impact: 'high',
        actionable: true,
        recommendation: 'Review pricing strategy and customer acquisition efforts'
      });
    }

    // Inventory insights
    if (data.inventoryData.lowStockItems > 10) {
      insights.push({
        type: 'warning',
        title: 'Multiple Low Stock Items',
        description: `${data.inventoryData.lowStockItems} products are running low on stock`,
        impact: 'medium',
        actionable: true,
        recommendation: 'Set up automated reorder points to prevent stockouts'
      });
    }

    if (data.inventoryData.turnoverRate < 2) {
      insights.push({
        type: 'opportunity',
        title: 'Slow Inventory Turnover',
        description: 'Inventory is turning over slowly, indicating potential overstocking',
        impact: 'medium',
        actionable: true,
        recommendation: 'Consider promotional campaigns or adjust purchasing strategy'
      });
    }

    // User growth insights
    if (data.userData.userGrowth > 50) {
      insights.push({
        type: 'success',
        title: 'Strong Team Growth',
        description: `Team has grown by ${data.userData.userGrowth}% this period`,
        impact: 'medium',
        actionable: false
      });
    }

    // AI-powered seasonal insights
    const seasonalInsight = this.getSeasonalInsight();
    if (seasonalInsight) {
      insights.push(seasonalInsight);
    }

    return insights;
  }

  /**
   * Generate predictive analytics
   */
  private static async generatePredictions(tenantId: string): Promise<TenantAnalytics['predictions']> {
    try {
      // Simple predictive model (in real implementation, this would use ML)
      const historicalData = await this.getHistoricalData(tenantId, 6); // Last 6 months
      
      // Predict next month revenue using linear regression
      const nextMonthRevenue = this.predictRevenue(historicalData);
      
      // Generate inventory predictions
      const inventoryNeeds = await this.predictInventoryNeeds(tenantId);
      
      // Generate seasonal trends
      const seasonalTrends = this.generateSeasonalTrends();

      return {
        nextMonthRevenue,
        inventoryNeeds,
        seasonalTrends
      };

    } catch (error) {
      logger.error(`Error generating predictions for tenant ${tenantId}:`, error);
      return {
        nextMonthRevenue: 0,
        inventoryNeeds: [],
        seasonalTrends: []
      };
    }
  }

  /**
   * Get competitive analysis
   */
  static async getCompetitiveAnalysis(tenantId: string): Promise<CompetitiveAnalysis> {
    try {
      // Get tenant metrics
      const tenantAnalytics = await this.generateTenantAnalytics(tenantId, 'month');
      
      // Industry benchmarks (would come from external data in real implementation)
      const industryBenchmarks = {
        averageRevenue: 50000,
        averageGrowthRate: 15,
        averageInventoryTurnover: 4
      };

      // Determine position
      const tenantRevenue = tenantAnalytics.metrics.revenue.current;
      const tenantGrowth = tenantAnalytics.metrics.revenue.growth;
      const tenantTurnover = tenantAnalytics.metrics.inventory.turnoverRate;

      let position: 'above_average' | 'average' | 'below_average' = 'average';
      
      const aboveAverageCount = [
        tenantRevenue > industryBenchmarks.averageRevenue,
        tenantGrowth > industryBenchmarks.averageGrowthRate,
        tenantTurnover > industryBenchmarks.averageInventoryTurnover
      ].filter(Boolean).length;

      if (aboveAverageCount >= 2) position = 'above_average';
      else if (aboveAverageCount === 0) position = 'below_average';

      // Generate recommendations
      const recommendations = [];
      if (tenantRevenue < industryBenchmarks.averageRevenue) {
        recommendations.push('Focus on customer acquisition and retention strategies');
      }
      if (tenantGrowth < industryBenchmarks.averageGrowthRate) {
        recommendations.push('Implement growth initiatives such as new product lines or market expansion');
      }
      if (tenantTurnover < industryBenchmarks.averageInventoryTurnover) {
        recommendations.push('Optimize inventory management to improve turnover rates');
      }

      return {
        tenantId,
        industryBenchmarks,
        tenantPosition: position,
        recommendations
      };

    } catch (error) {
      logger.error(`Error generating competitive analysis for tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Helper methods for data fetching
   */
  private static getDateRange(period: string) {
    const now = new Date();
    let startDate: Date, endDate: Date, previousStartDate: Date, previousEndDate: Date;

    switch (period) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        previousStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        previousEndDate = startDate;
        break;
      case 'week':
        const weekStart = now.getDate() - now.getDay();
        startDate = new Date(now.getFullYear(), now.getMonth(), weekStart);
        endDate = new Date(now.getFullYear(), now.getMonth(), weekStart + 7);
        previousStartDate = new Date(now.getFullYear(), now.getMonth(), weekStart - 7);
        previousEndDate = startDate;
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        previousStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        previousEndDate = startDate;
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear() + 1, 0, 1);
        previousStartDate = new Date(now.getFullYear() - 1, 0, 1);
        previousEndDate = startDate;
        break;
      default:
        throw new Error('Invalid period');
    }

    return { startDate, endDate, previousStartDate, previousEndDate };
  }

  private static async getRevenueData(tenantId: string, startDate: Date, endDate: Date): Promise<number> {
    // Mock implementation - would query actual transaction data
    return Math.floor(Math.random() * 50000) + 10000;
  }

  private static async getTransactionData(tenantId: string, startDate: Date, endDate: Date) {
    // Mock implementation
    const count = Math.floor(Math.random() * 100) + 20;
    const averageValue = Math.floor(Math.random() * 200) + 50;
    return {
      count,
      averageValue,
      growth: Math.floor(Math.random() * 40) - 20
    };
  }

  private static async getInventoryData(tenantId: string) {
    // Mock implementation
    return {
      totalProducts: Math.floor(Math.random() * 1000) + 100,
      lowStockItems: Math.floor(Math.random() * 20),
      turnoverRate: Math.random() * 5 + 1,
      deadStock: Math.floor(Math.random() * 50)
    };
  }

  private static async getUserData(tenantId: string, startDate: Date, endDate: Date) {
    // Mock implementation
    return {
      activeUsers: Math.floor(Math.random() * 20) + 5,
      newUsers: Math.floor(Math.random() * 5),
      userGrowth: Math.floor(Math.random() * 100)
    };
  }

  private static async getLocationData(tenantId: string, startDate: Date, endDate: Date) {
    // Mock implementation
    return {
      totalLocations: Math.floor(Math.random() * 5) + 1,
      topPerforming: [
        { locationId: '1', name: 'Main Store', revenue: 25000 },
        { locationId: '2', name: 'Branch Store', revenue: 15000 }
      ]
    };
  }

  private static getSeasonalInsight() {
    const month = new Date().getMonth();
    const seasonalInsights = {
      11: { // December
        type: 'opportunity' as const,
        title: 'Holiday Season Opportunity',
        description: 'December typically sees 30-40% higher sales',
        impact: 'high' as const,
        actionable: true,
        recommendation: 'Increase inventory for popular items and plan holiday promotions'
      },
      0: { // January
        type: 'info' as const,
        title: 'Post-Holiday Adjustment',
        description: 'January typically sees reduced sales after holiday season',
        impact: 'medium' as const,
        actionable: true,
        recommendation: 'Focus on inventory clearance and customer retention'
      }
    };

    return seasonalInsights[month] || null;
  }

  private static async getHistoricalData(tenantId: string, months: number) {
    // Mock historical data
    return Array.from({ length: months }, (_, i) => ({
      month: i + 1,
      revenue: Math.floor(Math.random() * 40000) + 20000
    }));
  }

  private static predictRevenue(historicalData: any[]): number {
    // Simple linear regression prediction
    if (historicalData.length < 2) return 0;
    
    const revenues = historicalData.map(d => d.revenue);
    const trend = (revenues[revenues.length - 1] - revenues[0]) / revenues.length;
    return Math.max(0, revenues[revenues.length - 1] + trend);
  }

  private static async predictInventoryNeeds(tenantId: string) {
    // Mock inventory predictions
    return [
      { productId: '1', predictedDemand: 100, recommendedOrder: 150 },
      { productId: '2', predictedDemand: 50, recommendedOrder: 75 }
    ];
  }

  private static generateSeasonalTrends() {
    return [
      { period: 'Q1', expectedGrowth: 5 },
      { period: 'Q2', expectedGrowth: 15 },
      { period: 'Q3', expectedGrowth: 10 },
      { period: 'Q4', expectedGrowth: 25 }
    ];
  }
}