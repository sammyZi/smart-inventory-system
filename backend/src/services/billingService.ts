/**
 * Multi-Tenant Point of Sale and Billing Service
 * Handles transaction processing, payment integration, and receipt generation with tenant isolation
 */

import { Transaction, TransactionItem, TransactionStatus, PaymentMethod, PaymentStatus, Refund, RefundStatus } from '@prisma/client';
import { logger } from '../utils/logger';
import { AuditService } from './auditService';
import { SaaSService } from './saasService';
import { RealtimeService } from './realtimeService';
import { InventoryService } from './inventoryService';
import { prisma, withTransaction } from '../config/database';

export interface TransactionData {
  locationId: string;
  customerId?: string;
  items: TransactionItemData[];
  paymentMethod: PaymentMethod;
  discountAmount?: number;
  notes?: string;
  customerInfo?: {
    name?: string;
    email?: string;
    phone?: string;
  };
}

export interface TransactionItemData {
  productId: string;
  quantity: number;
  unitPrice: number;
  discountAmount?: number;
}

export interface PaymentProcessingData {
  transactionId: string;
  paymentMethod: PaymentMethod;
  amount: number;
  paymentDetails?: {
    cardNumber?: string;
    expiryDate?: string;
    cvv?: string;
    cardholderName?: string;
    digitalWalletId?: string;
    bankTransferRef?: string;
  };
}

export interface RefundData {
  transactionId: string;
  items: Array<{
    productId: string;
    quantity: number;
    reason?: string;
  }>;
  reason: string;
  refundMethod?: 'original' | 'cash' | 'store_credit';
}

export interface TenantTaxConfig {
  tenantId: string;
  locationId: string;
  taxRate: number;
  taxName: string;
  taxNumber?: string;
  exemptCategories?: string[];
}

export interface TenantDiscountRule {
  id: string;
  tenantId: string;
  name: string;
  type: 'percentage' | 'fixed_amount' | 'buy_x_get_y';
  value: number;
  conditions: {
    minAmount?: number;
    maxAmount?: number;
    applicableProducts?: string[];
    applicableCategories?: string[];
    customerTiers?: string[];
    validFrom?: Date;
    validTo?: Date;
  };
  isActive: boolean;
}

export interface ReceiptData {
  transactionId: string;
  tenantBranding: {
    companyName: string;
    logo?: string;
    address: string;
    phone?: string;
    email?: string;
    website?: string;
    taxNumber?: string;
  };
  locationInfo: {
    name: string;
    address: string;
  };
  transaction: Transaction & {
    items: TransactionItem[];
  };
  qrCode?: string;
}

export class BillingService {
  /**
   * Create a new transaction with tenant isolation
   */
  static async createTransaction(
    tenantId: string,
    userId: string,
    data: TransactionData
  ): Promise<Transaction & { items: TransactionItem[] }> {
    try {
      // Verify location belongs to tenant
      const hasAccess = await SaaSService.verifyLocationOwnership(tenantId, data.locationId);
      if (!hasAccess) {
        throw new Error('Location access denied');
      }

      // Validate inventory availability
      for (const item of data.items) {
        const validation = await InventoryService.validateStockOperation(
          tenantId,
          item.productId,
          data.locationId,
          item.quantity
        );
        
        if (!validation.isValid) {
          throw new Error(`Insufficient stock for product ${item.productId}: ${validation.conflicts.join(', ')}`);
        }
      }

      // Get tenant tax configuration
      const taxConfig = await this.getTenantTaxConfig(tenantId, data.locationId);
      
      // Calculate totals
      const calculations = await this.calculateTransactionTotals(tenantId, data, taxConfig);

      const transaction = await withTransaction(async (tx) => {
        // Generate transaction number
        const transactionNo = await this.generateTransactionNumber(tenantId);

        // Create transaction
        const newTransaction = await tx.transaction.create({
          data: {
            transactionNo,
            locationId: data.locationId,
            customerId: data.customerId || null,
            staffId: userId,
            subtotal: calculations.subtotal,
            taxAmount: calculations.taxAmount,
            discountAmount: data.discountAmount || 0,
            totalAmount: calculations.totalAmount,
            paymentMethod: data.paymentMethod,
            paymentStatus: PaymentStatus.PENDING,
            status: TransactionStatus.PENDING,
            notes: data.notes || null,
            items: {
              create: data.items.map(item => ({
                productId: item.productId,
                productName: calculations.itemDetails[item.productId].name,
                productSku: calculations.itemDetails[item.productId].sku,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: item.quantity * item.unitPrice,
                discountAmount: item.discountAmount || 0,
                taxAmount: calculations.itemTaxes[item.productId] || 0
              }))
            }
          },
          include: {
            items: true
          }
        });

        // Reserve inventory
        for (const item of data.items) {
          await InventoryService.reserveStock(
            tenantId,
            item.productId,
            data.locationId,
            item.quantity,
            userId,
            newTransaction.id
          );
        }

        return newTransaction;
      });

      // Real-time notification
      RealtimeService.broadcastToTenant(tenantId, 'new-transaction', {
        type: 'transaction_created',
        transactionId: transaction.id,
        locationId: data.locationId,
        totalAmount: transaction.totalAmount,
        createdBy: userId
      });

      // Audit log
      await AuditService.log({
        userId,
        action: 'CREATE',
        resource: 'transaction',
        resourceId: transaction.id,
        newValues: {
          transactionNo: transaction.transactionNo,
          totalAmount: transaction.totalAmount,
          itemCount: data.items.length
        },
        locationId: data.locationId
      });

      logger.info(`Transaction created for tenant ${tenantId}:`, {
        transactionId: transaction.id,
        transactionNo: transaction.transactionNo,
        totalAmount: transaction.totalAmount
      });

      return transaction;

    } catch (error) {
      logger.error(`Error creating transaction for tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Process payment for transaction
   */
  static async processPayment(
    tenantId: string,
    userId: string,
    paymentData: PaymentProcessingData
  ): Promise<Transaction> {
    try {
      const transaction = await prisma.transaction.findUnique({
        where: { id: paymentData.transactionId },
        include: { items: true, location: true }
      });

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      // Verify location belongs to tenant
      const hasAccess = await SaaSService.verifyLocationOwnership(tenantId, transaction.locationId);
      if (!hasAccess) {
        throw new Error('Transaction access denied');
      }

      // Process payment based on method
      const paymentResult = await this.processPaymentMethod(paymentData);

      const updatedTransaction = await withTransaction(async (tx) => {
        // Update transaction status
        const updated = await tx.transaction.update({
          where: { id: paymentData.transactionId },
          data: {
            paymentStatus: paymentResult.success ? PaymentStatus.COMPLETED : PaymentStatus.FAILED,
            status: paymentResult.success ? TransactionStatus.COMPLETED : TransactionStatus.CANCELLED,
            completedAt: paymentResult.success ? new Date() : null
          },
          include: { items: true }
        });

        if (paymentResult.success) {
          // Update inventory - convert reservations to actual sales
          for (const item of transaction.items) {
            // Release reservation
            await InventoryService.releaseReservedStock(
              tenantId,
              item.productId,
              transaction.locationId,
              item.quantity,
              userId,
              transaction.id
            );

            // Update actual stock
            await InventoryService.updateStockLevel(
              tenantId,
              {
                productId: item.productId,
                locationId: transaction.locationId,
                quantity: -item.quantity, // Reduce stock
                reason: 'Sale transaction',
                reference: transaction.transactionNo
              },
              userId
            );
          }
        } else {
          // Release all reservations on payment failure
          for (const item of transaction.items) {
            await InventoryService.releaseReservedStock(
              tenantId,
              item.productId,
              transaction.locationId,
              item.quantity,
              userId,
              transaction.id
            );
          }
        }

        return updated;
      });

      // Real-time notification
      RealtimeService.broadcastToTenant(tenantId, 'payment-processed', {
        type: 'payment_completed',
        transactionId: transaction.id,
        success: paymentResult.success,
        amount: paymentData.amount,
        processedBy: userId
      });

      // Audit log
      await AuditService.log({
        userId,
        action: 'PAYMENT_PROCESS',
        resource: 'transaction',
        resourceId: transaction.id,
        newValues: {
          paymentStatus: updatedTransaction.paymentStatus,
          paymentMethod: paymentData.paymentMethod,
          success: paymentResult.success
        },
        locationId: transaction.locationId
      });

      logger.info(`Payment processed for tenant ${tenantId}:`, {
        transactionId: transaction.id,
        success: paymentResult.success,
        amount: paymentData.amount
      });

      return updatedTransaction;

    } catch (error) {
      logger.error(`Error processing payment for tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Generate receipt for transaction
   */
  static async generateReceipt(
    tenantId: string,
    transactionId: string,
    format: 'pdf' | 'html' | 'json' = 'json'
  ): Promise<ReceiptData | Buffer | string> {
    try {
      const transaction = await prisma.transaction.findUnique({
        where: { id: transactionId },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  sku: true,
                  name: true,
                  category: true
                }
              }
            }
          },
          location: true,
          staff: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        }
      });

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      // Verify access
      const hasAccess = await SaaSService.verifyLocationOwnership(tenantId, transaction.locationId);
      if (!hasAccess) {
        throw new Error('Transaction access denied');
      }

      // Get tenant branding information
      const tenantInfo = await SaaSService.getTenantInfo(tenantId);
      
      const receiptData: ReceiptData = {
        transactionId: transaction.id,
        tenantBranding: {
          companyName: tenantInfo.companyName,
          address: tenantInfo.locations[0]?.address || 'N/A',
          phone: tenantInfo.locations[0]?.phone,
          email: tenantInfo.adminEmail,
          taxNumber: 'TAX-' + tenantId.substring(0, 8).toUpperCase()
        },
        locationInfo: {
          name: transaction.location.name,
          address: transaction.location.address || 'N/A'
        },
        transaction: transaction as any,
        qrCode: await this.generateReceiptQRCode(transaction.transactionNo)
      };

      switch (format) {
        case 'pdf':
          return await this.generatePDFReceipt(receiptData);
        case 'html':
          return await this.generateHTMLReceipt(receiptData);
        default:
          return receiptData;
      }

    } catch (error) {
      logger.error(`Error generating receipt for tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Process refund for transaction
   */
  static async processRefund(
    tenantId: string,
    userId: string,
    refundData: RefundData
  ): Promise<Refund> {
    try {
      const transaction = await prisma.transaction.findUnique({
        where: { id: refundData.transactionId },
        include: { items: true }
      });

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      // Verify access
      const hasAccess = await SaaSService.verifyLocationOwnership(tenantId, transaction.locationId);
      if (!hasAccess) {
        throw new Error('Transaction access denied');
      }

      // Calculate refund amount
      const refundAmount = this.calculateRefundAmount(transaction, refundData.items);

      const refund = await withTransaction(async (tx) => {
        // Generate refund number
        const refundNo = `REF-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

        // Create refund record
        const newRefund = await tx.refund.create({
          data: {
            transactionId: refundData.transactionId,
            refundNo,
            amount: refundAmount,
            reason: refundData.reason,
            status: RefundStatus.PENDING,
            processedBy: userId,
            items: {
              create: refundData.items.map(item => {
                const originalItem = transaction.items.find(ti => ti.productId === item.productId);
                return {
                  productId: item.productId,
                  quantity: item.quantity,
                  unitPrice: originalItem?.unitPrice || 0,
                  totalPrice: item.quantity * (originalItem?.unitPrice || 0)
                };
              })
            }
          },
          include: { items: true }
        });

        // Update inventory - return items to stock
        for (const item of refundData.items) {
          await InventoryService.updateStockLevel(
            tenantId,
            {
              productId: item.productId,
              locationId: transaction.locationId,
              quantity: item.quantity, // Add back to stock
              reason: 'Refund return',
              reference: newRefund.refundNo
            },
            userId
          );
        }

        // Update refund status to completed
        const completedRefund = await tx.refund.update({
          where: { id: newRefund.id },
          data: {
            status: RefundStatus.COMPLETED,
            processedAt: new Date()
          },
          include: { items: true }
        });

        return completedRefund;
      });

      // Real-time notification
      RealtimeService.broadcastToTenant(tenantId, 'refund-processed', {
        type: 'refund_completed',
        refundId: refund.id,
        transactionId: refundData.transactionId,
        amount: refundAmount,
        processedBy: userId
      });

      // Audit log
      await AuditService.log({
        userId,
        action: 'CREATE',
        resource: 'refund',
        resourceId: refund.id,
        newValues: {
          refundNo: refund.refundNo,
          amount: refundAmount,
          itemCount: refundData.items.length
        },
        locationId: transaction.locationId
      });

      logger.info(`Refund processed for tenant ${tenantId}:`, {
        refundId: refund.id,
        transactionId: refundData.transactionId,
        amount: refundAmount
      });

      return refund;

    } catch (error) {
      logger.error(`Error processing refund for tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Get tenant transactions with filtering
   */
  static async getTenantTransactions(
    tenantId: string,
    filters?: {
      locationId?: string;
      status?: TransactionStatus;
      paymentMethod?: PaymentMethod;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ transactions: Transaction[]; total: number }> {
    try {
      // Get tenant locations
      const locations = await SaaSService.getAdminLocations(tenantId);
      const locationIds = locations.map(l => l.id);

      if (locationIds.length === 0) {
        return { transactions: [], total: 0 };
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

      if (filters?.status) whereClause.status = filters.status;
      if (filters?.paymentMethod) whereClause.paymentMethod = filters.paymentMethod;

      if (filters?.startDate || filters?.endDate) {
        whereClause.createdAt = {};
        if (filters.startDate) whereClause.createdAt.gte = filters.startDate;
        if (filters.endDate) whereClause.createdAt.lte = filters.endDate;
      }

      const [transactions, total] = await Promise.all([
        prisma.transaction.findMany({
          where: whereClause,
          include: {
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    sku: true,
                    name: true,
                    category: true
                  }
                }
              }
            },
            location: {
              select: {
                id: true,
                name: true
              }
            },
            staff: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: filters?.limit || 50,
          skip: filters?.offset || 0
        }),
        prisma.transaction.count({ where: whereClause })
      ]);

      return { transactions, total };

    } catch (error) {
      logger.error(`Error fetching transactions for tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Get sales analytics for tenant
   */
  static async getSalesAnalytics(
    tenantId: string,
    period: 'today' | 'week' | 'month' | 'year' = 'today'
  ): Promise<{
    totalSales: number;
    totalTransactions: number;
    averageOrderValue: number;
    topProducts: Array<{ productId: string; productName: string; quantity: number; revenue: number }>;
    salesByHour?: Array<{ hour: number; sales: number; transactions: number }>;
    salesByDay?: Array<{ date: string; sales: number; transactions: number }>;
  }> {
    try {
      const locations = await SaaSService.getAdminLocations(tenantId);
      const locationIds = locations.map(l => l.id);

      if (locationIds.length === 0) {
        return {
          totalSales: 0,
          totalTransactions: 0,
          averageOrderValue: 0,
          topProducts: []
        };
      }

      // Calculate date range
      const now = new Date();
      let startDate: Date;

      switch (period) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
      }

      const transactions = await prisma.transaction.findMany({
        where: {
          locationId: { in: locationIds },
          status: TransactionStatus.COMPLETED,
          createdAt: {
            gte: startDate,
            lte: now
          }
        },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      });

      // Calculate analytics
      const totalSales = transactions.reduce((sum, t) => sum + t.totalAmount, 0);
      const totalTransactions = transactions.length;
      const averageOrderValue = totalTransactions > 0 ? totalSales / totalTransactions : 0;

      // Top products
      const productStats = new Map<string, { name: string; quantity: number; revenue: number }>();
      
      transactions.forEach(transaction => {
        transaction.items.forEach(item => {
          const existing = productStats.get(item.productId) || { 
            name: (item as any).product?.name || 'Unknown', 
            quantity: 0, 
            revenue: 0 
          };
          existing.quantity += item.quantity;
          existing.revenue += item.totalPrice;
          productStats.set(item.productId, existing);
        });
      });

      const topProducts = Array.from(productStats.entries())
        .map(([productId, stats]) => ({ productId, productName: stats.name, ...stats }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      return {
        totalSales,
        totalTransactions,
        averageOrderValue,
        topProducts
      };

    } catch (error) {
      logger.error(`Error getting sales analytics for tenant ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  private static async getTenantTaxConfig(tenantId: string, locationId: string): Promise<TenantTaxConfig> {
    // For demo purposes, return default tax config
    // In production, this would be stored in database per tenant
    return {
      tenantId,
      locationId,
      taxRate: 0.08, // 8% default tax rate
      taxName: 'Sales Tax',
      exemptCategories: []
    };
  }

  private static async calculateTransactionTotals(
    tenantId: string,
    data: TransactionData,
    taxConfig: TenantTaxConfig
  ): Promise<{
    subtotal: number;
    taxAmount: number;
    totalAmount: number;
    itemDetails: Record<string, { name: string; sku: string; category: string }>;
    itemTaxes: Record<string, number>;
  }> {
    const itemDetails: Record<string, { name: string; sku: string; category: string }> = {};
    const itemTaxes: Record<string, number> = {};
    let subtotal = 0;
    let taxAmount = 0;

    // Get product details for all items
    const productIds = data.items.map(item => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, sku: true, category: true }
    });

    for (const item of data.items) {
      const product = products.find(p => p.id === item.productId);
      if (!product) {
        throw new Error(`Product not found: ${item.productId}`);
      }

      itemDetails[item.productId] = {
        name: product.name,
        sku: product.sku,
        category: product.category
      };

      const itemSubtotal = item.quantity * item.unitPrice - (item.discountAmount || 0);
      subtotal += itemSubtotal;

      // Calculate tax if category is not exempt
      if (!taxConfig.exemptCategories?.includes(product.category)) {
        const itemTax = itemSubtotal * taxConfig.taxRate;
        itemTaxes[item.productId] = itemTax;
        taxAmount += itemTax;
      }
    }

    const totalAmount = subtotal + taxAmount - (data.discountAmount || 0);

    return {
      subtotal,
      taxAmount,
      totalAmount,
      itemDetails,
      itemTaxes
    };
  }

  private static async generateTransactionNumber(tenantId: string): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const tenantPrefix = tenantId.substring(0, 4).toUpperCase();
    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    return `TXN-${tenantPrefix}-${dateStr}-${randomSuffix}`;
  }

  private static async processPaymentMethod(paymentData: PaymentProcessingData): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    // Mock payment processing - in production, integrate with payment gateways
    switch (paymentData.paymentMethod) {
      case PaymentMethod.CASH:
        return { success: true, transactionId: `CASH-${Date.now()}` };
      
      case PaymentMethod.CREDIT_CARD:
      case PaymentMethod.DEBIT_CARD:
        // Mock card processing
        if (paymentData.paymentDetails?.cardNumber?.endsWith('0000')) {
          return { success: false, error: 'Invalid card number' };
        }
        return { success: true, transactionId: `CARD-${Date.now()}` };
      
      case PaymentMethod.DIGITAL_WALLET:
        return { success: true, transactionId: `WALLET-${Date.now()}` };
      
      default:
        return { success: true, transactionId: `OTHER-${Date.now()}` };
    }
  }

  private static calculateRefundAmount(transaction: Transaction & { items: TransactionItem[] }, refundItems: Array<{ productId: string; quantity: number }>): number {
    let refundAmount = 0;
    
    for (const refundItem of refundItems) {
      const originalItem = transaction.items.find(item => item.productId === refundItem.productId);
      if (originalItem) {
        const itemRefundAmount = (originalItem.totalPrice / originalItem.quantity) * refundItem.quantity;
        refundAmount += itemRefundAmount;
      }
    }
    
    return refundAmount;
  }

  private static async generateReceiptQRCode(transactionNo: string): Promise<string> {
    // Mock QR code generation - in production, use actual QR code library
    return `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==`;
  }

  private static async generatePDFReceipt(receiptData: ReceiptData): Promise<Buffer> {
    // Mock PDF generation - in production, use libraries like puppeteer or pdfkit
    const mockPDF = Buffer.from('Mock PDF Receipt Content');
    return mockPDF;
  }

  private static async generateHTMLReceipt(receiptData: ReceiptData): Promise<string> {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - ${receiptData.transaction.transactionNo}</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; }
          .transaction-details { margin: 20px 0; }
          .items { margin: 20px 0; }
          .item { display: flex; justify-content: space-between; margin: 5px 0; }
          .totals { border-top: 1px solid #000; padding-top: 10px; }
          .total-line { display: flex; justify-content: space-between; margin: 5px 0; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>${receiptData.tenantBranding.companyName}</h2>
          <p>${receiptData.tenantBranding.address}</p>
          <p>Phone: ${receiptData.tenantBranding.phone || 'N/A'}</p>
        </div>
        
        <div class="transaction-details">
          <p><strong>Transaction #:</strong> ${receiptData.transaction.transactionNo}</p>
          <p><strong>Date:</strong> ${receiptData.transaction.createdAt}</p>
          <p><strong>Location:</strong> ${receiptData.locationInfo.name}</p>
        </div>
        
        <div class="items">
          <h3>Items:</h3>
          ${receiptData.transaction.items.map(item => `
            <div class="item">
              <span>${item.productName} x${item.quantity}</span>
              <span>$${item.totalPrice.toFixed(2)}</span>
            </div>
          `).join('')}
        </div>
        
        <div class="totals">
          <div class="total-line">
            <span>Subtotal:</span>
            <span>$${receiptData.transaction.subtotal.toFixed(2)}</span>
          </div>
          <div class="total-line">
            <span>Tax:</span>
            <span>$${receiptData.transaction.taxAmount.toFixed(2)}</span>
          </div>
          <div class="total-line">
            <span>Discount:</span>
            <span>-$${receiptData.transaction.discountAmount.toFixed(2)}</span>
          </div>
          <div class="total-line" style="font-weight: bold; font-size: 18px;">
            <span>Total:</span>
            <span>$${receiptData.transaction.totalAmount.toFixed(2)}</span>
          </div>
        </div>
        
        <div class="footer">
          <p>Thank you for your business!</p>
          <p>Transaction processed by: ${receiptData.tenantBranding.companyName}</p>
        </div>
      </body>
      </html>
    `;
  }
}