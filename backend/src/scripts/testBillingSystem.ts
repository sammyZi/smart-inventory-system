/**
 * Multi-Tenant Point of Sale and Billing System Testing Script
 * Tests transaction processing, payment integration, and receipt generation
 */

import axios from 'axios';
import { logger } from '../utils/logger';

const API_BASE = 'http://localhost:3001/api/v1';

interface TestResult {
  test: string;
  success: boolean;
  message: string;
  data?: any;
}

class BillingSystemTester {
  private results: TestResult[] = [];
  private adminToken: string = '';
  private tenantId: string = '';
  private locationId: string = '';
  private productIds: string[] = [];
  private transactionId: string = '';

  async runAllTests(): Promise<void> {
    logger.info('Starting Multi-Tenant Point of Sale and Billing System Tests...');

    try {
      // Setup test environment
      await this.setupTestEnvironment();

      // Test transaction creation
      await this.testTransactionCreation();

      // Test payment processing
      await this.testPaymentProcessing();

      // Test receipt generation
      await this.testReceiptGeneration();

      // Test refund processing
      await this.testRefundProcessing();

      // Test sales analytics
      await this.testSalesAnalytics();

      // Test billing dashboard
      await this.testBillingDashboard();

      // Test quick sale functionality
      await this.testQuickSale();

      // Test tenant isolation
      await this.testTenantIsolation();

      // Print results
      this.printResults();

    } catch (error) {
      logger.error('Test suite failed:', error);
    }
  }

  private async setupTestEnvironment(): Promise<void> {
    try {
      // Create admin tenant
      const adminResponse = await axios.post(`${API_BASE}/saas/admin/signup`, {
        email: `test-billing-${Date.now()}@example.com`,
        password: 'TestPassword123!',
        firstName: 'Billing',
        lastName: 'Tester',
        companyName: 'Billing Test Company'
      });

      this.adminToken = adminResponse.data.data.token;
      this.tenantId = adminResponse.data.data.user.id;

      // Create a location
      const locationResponse = await axios.post(`${API_BASE}/saas/locations`, {
        name: 'Billing Test Store',
        address: '123 Billing Street',
        city: 'Billing City',
        state: 'BC',
        zipCode: '12345'
      }, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });

      this.locationId = locationResponse.data.data.id;

      // Create test products
      const products = [
        {
          sku: `BILLING-PROD-1-${Date.now()}`,
          name: 'Test Product 1',
          description: 'First test product for billing',
          category: 'Electronics',
          price: 29.99,
          cost: 15.00
        },
        {
          sku: `BILLING-PROD-2-${Date.now()}`,
          name: 'Test Product 2',
          description: 'Second test product for billing',
          category: 'Accessories',
          price: 19.99,
          cost: 10.00
        }
      ];

      for (const product of products) {
        const productResponse = await axios.post(`${API_BASE}/products`, product, {
          headers: { Authorization: `Bearer ${this.adminToken}` }
        });
        this.productIds.push(productResponse.data.data.id);

        // Initialize stock
        await axios.put(`${API_BASE}/inventory/stock/update`, {
          productId: productResponse.data.data.id,
          locationId: this.locationId,
          quantity: 100,
          reason: 'Initial stock for billing testing'
        }, {
          headers: { Authorization: `Bearer ${this.adminToken}` }
        });
      }

      this.addResult('Setup Test Environment', true, 'Billing test environment created successfully');

    } catch (error) {
      this.addResult('Setup Test Environment', false, `Setup failed: ${error}`);
      throw error;
    }
  }

  private async testTransactionCreation(): Promise<void> {
    try {
      const transactionData = {
        locationId: this.locationId,
        items: [
          {
            productId: this.productIds[0],
            quantity: 2,
            unitPrice: 29.99,
            discountAmount: 2.00
          },
          {
            productId: this.productIds[1],
            quantity: 1,
            unitPrice: 19.99
          }
        ],
        paymentMethod: 'CREDIT_CARD',
        discountAmount: 5.00,
        notes: 'Test transaction',
        customerInfo: {
          name: 'Test Customer',
          email: 'customer@test.com',
          phone: '+1234567890'
        }
      };

      const response = await axios.post(`${API_BASE}/billing/transactions`, transactionData, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });

      this.transactionId = response.data.data.id;
      const transaction = response.data.data;

      this.addResult('Transaction Creation', true, 
        `Transaction created: ${transaction.transactionNo}, Total: $${transaction.totalAmount}`);

      // Verify transaction details
      const expectedSubtotal = (2 * 29.99 - 2.00) + 19.99; // Items minus item discount
      const actualSubtotal = transaction.subtotal;
      
      if (Math.abs(expectedSubtotal - actualSubtotal) < 0.01) {
        this.addResult('Transaction Calculation', true, 
          `Subtotal calculated correctly: $${actualSubtotal}`);
      } else {
        this.addResult('Transaction Calculation', false, 
          `Subtotal mismatch: expected $${expectedSubtotal}, got $${actualSubtotal}`);
      }

    } catch (error) {
      this.addResult('Transaction Creation', false, `Failed: ${error}`);
    }
  }

  private async testPaymentProcessing(): Promise<void> {
    try {
      if (!this.transactionId) {
        throw new Error('No transaction ID available for payment testing');
      }

      const paymentData = {
        transactionId: this.transactionId,
        paymentMethod: 'CREDIT_CARD',
        amount: 100.00, // This should match the transaction total
        paymentDetails: {
          cardNumber: '4111111111111111',
          expiryDate: '12/25',
          cvv: '123',
          cardholderName: 'Test Customer'
        }
      };

      const response = await axios.post(`${API_BASE}/billing/payments`, paymentData, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });

      const processedTransaction = response.data.data;

      this.addResult('Payment Processing', true, 
        `Payment processed: Status ${processedTransaction.paymentStatus}`);

      // Verify transaction status changed to completed
      if (processedTransaction.status === 'COMPLETED') {
        this.addResult('Transaction Status Update', true, 
          'Transaction status updated to COMPLETED after payment');
      } else {
        this.addResult('Transaction Status Update', false, 
          `Expected COMPLETED status, got ${processedTransaction.status}`);
      }

    } catch (error) {
      this.addResult('Payment Processing', false, `Failed: ${error}`);
    }
  }

  private async testReceiptGeneration(): Promise<void> {
    try {
      if (!this.transactionId) {
        throw new Error('No transaction ID available for receipt testing');
      }

      // Test JSON receipt
      const jsonResponse = await axios.get(`${API_BASE}/billing/receipts/${this.transactionId}?format=json`, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });

      const receiptData = jsonResponse.data.data;
      this.addResult('JSON Receipt Generation', true, 
        `JSON receipt generated for transaction ${receiptData.transaction.transactionNo}`);

      // Test HTML receipt
      const htmlResponse = await axios.get(`${API_BASE}/billing/receipts/${this.transactionId}?format=html`, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });

      if (htmlResponse.data.includes('<!DOCTYPE html>')) {
        this.addResult('HTML Receipt Generation', true, 'HTML receipt generated successfully');
      } else {
        this.addResult('HTML Receipt Generation', false, 'HTML receipt format invalid');
      }

      // Test PDF receipt (mock)
      const pdfResponse = await axios.get(`${API_BASE}/billing/receipts/${this.transactionId}?format=pdf`, {
        headers: { Authorization: `Bearer ${this.adminToken}` },
        responseType: 'arraybuffer'
      });

      if (pdfResponse.data.byteLength > 0) {
        this.addResult('PDF Receipt Generation', true, 
          `PDF receipt generated: ${pdfResponse.data.byteLength} bytes`);
      } else {
        this.addResult('PDF Receipt Generation', false, 'PDF receipt is empty');
      }

    } catch (error) {
      this.addResult('Receipt Generation', false, `Failed: ${error}`);
    }
  }

  private async testRefundProcessing(): Promise<void> {
    try {
      if (!this.transactionId) {
        throw new Error('No transaction ID available for refund testing');
      }

      const refundData = {
        transactionId: this.transactionId,
        items: [
          {
            productId: this.productIds[0],
            quantity: 1,
            reason: 'Customer return'
          }
        ],
        reason: 'Customer requested refund',
        refundMethod: 'original'
      };

      const response = await axios.post(`${API_BASE}/billing/refunds`, refundData, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });

      const refund = response.data.data;
      this.addResult('Refund Processing', true, 
        `Refund processed: ${refund.refundNo}, Amount: $${refund.amount}`);

      // Verify refund status
      if (refund.status === 'COMPLETED') {
        this.addResult('Refund Status', true, 'Refund completed successfully');
      } else {
        this.addResult('Refund Status', false, `Expected COMPLETED status, got ${refund.status}`);
      }

    } catch (error) {
      this.addResult('Refund Processing', false, `Failed: ${error}`);
    }
  }

  private async testSalesAnalytics(): Promise<void> {
    try {
      // Test different analytics periods
      const periods = ['today', 'week', 'month', 'year'];
      
      for (const period of periods) {
        const response = await axios.get(`${API_BASE}/billing/analytics?period=${period}`, {
          headers: { Authorization: `Bearer ${this.adminToken}` }
        });

        const analytics = response.data.data.analytics;
        this.addResult(`Sales Analytics - ${period}`, true, 
          `${period}: $${analytics.totalSales} sales, ${analytics.totalTransactions} transactions`);
      }

      // Test analytics data structure
      const todayResponse = await axios.get(`${API_BASE}/billing/analytics?period=today`, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });

      const analytics = todayResponse.data.data.analytics;
      const hasRequiredFields = analytics.hasOwnProperty('totalSales') && 
                               analytics.hasOwnProperty('totalTransactions') && 
                               analytics.hasOwnProperty('averageOrderValue') && 
                               analytics.hasOwnProperty('topProducts');

      this.addResult('Analytics Data Structure', hasRequiredFields, 
        hasRequiredFields ? 'All required analytics fields present' : 'Missing analytics fields');

    } catch (error) {
      this.addResult('Sales Analytics', false, `Failed: ${error}`);
    }
  }

  private async testBillingDashboard(): Promise<void> {
    try {
      const response = await axios.get(`${API_BASE}/billing/dashboard`, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });

      const dashboard = response.data.data;
      
      // Verify dashboard structure
      const hasRequiredSections = dashboard.hasOwnProperty('summary') && 
                                  dashboard.hasOwnProperty('topProducts') && 
                                  dashboard.hasOwnProperty('recentTransactions') && 
                                  dashboard.hasOwnProperty('trends');

      this.addResult('Billing Dashboard Structure', hasRequiredSections, 
        hasRequiredSections ? 'Dashboard has all required sections' : 'Missing dashboard sections');

      // Verify summary periods
      const summary = dashboard.summary;
      const hasPeriods = summary.hasOwnProperty('today') && 
                        summary.hasOwnProperty('week') && 
                        summary.hasOwnProperty('month');

      this.addResult('Dashboard Summary Periods', hasPeriods, 
        hasPeriods ? 'All summary periods present' : 'Missing summary periods');

      this.addResult('Billing Dashboard', true, 
        `Dashboard loaded: Today $${summary.today?.sales || 0}, Week $${summary.week?.sales || 0}`);

    } catch (error) {
      this.addResult('Billing Dashboard', false, `Failed: ${error}`);
    }
  }

  private async testQuickSale(): Promise<void> {
    try {
      const quickSaleData = {
        locationId: this.locationId,
        items: [
          {
            productId: this.productIds[1],
            quantity: 1,
            unitPrice: 19.99
          }
        ],
        paymentMethod: 'CASH',
        customerInfo: {
          name: 'Quick Sale Customer'
        }
      };

      const response = await axios.post(`${API_BASE}/billing/quick-sale`, quickSaleData, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });

      const result = response.data.data;
      const transaction = result.transaction;
      const receipt = result.receipt;

      this.addResult('Quick Sale Transaction', true, 
        `Quick sale completed: ${transaction.transactionNo}, Status: ${transaction.status}`);

      this.addResult('Quick Sale Receipt', true, 
        `Receipt generated for quick sale: ${receipt.transactionId}`);

      // Verify transaction was completed immediately
      if (transaction.status === 'COMPLETED' && transaction.paymentStatus === 'COMPLETED') {
        this.addResult('Quick Sale Completion', true, 
          'Transaction and payment completed in single operation');
      } else {
        this.addResult('Quick Sale Completion', false, 
          `Transaction not fully completed: ${transaction.status}/${transaction.paymentStatus}`);
      }

    } catch (error) {
      this.addResult('Quick Sale', false, `Failed: ${error}`);
    }
  }

  private async testTenantIsolation(): Promise<void> {
    try {
      // Create second tenant
      const tenant2Response = await axios.post(`${API_BASE}/saas/admin/signup`, {
        email: `test-billing-2-${Date.now()}@example.com`,
        password: 'TestPassword123!',
        firstName: 'Billing2',
        lastName: 'Tester',
        companyName: 'Second Billing Company'
      });

      const tenant2Token = tenant2Response.data.data.token;

      // Try to access first tenant's transactions with second tenant's token
      try {
        await axios.get(`${API_BASE}/billing/transactions`, {
          headers: { Authorization: `Bearer ${tenant2Token}` }
        });

        // If we get here, isolation failed
        this.addResult('Tenant Isolation - Transactions', false, 
          'Second tenant can access first tenant\'s transactions');
      } catch (error) {
        // This should happen - second tenant should not see first tenant's data
        if (error.response?.status === 403 || error.response?.data?.data?.length === 0) {
          this.addResult('Tenant Isolation - Transactions', true, 
            'Tenant isolation working: Second tenant cannot access first tenant\'s transactions');
        } else {
          this.addResult('Tenant Isolation - Transactions', false, 
            `Unexpected error: ${error.response?.status}`);
        }
      }

      // Try to access first tenant's analytics
      try {
        const analyticsResponse = await axios.get(`${API_BASE}/billing/analytics`, {
          headers: { Authorization: `Bearer ${tenant2Token}` }
        });

        const analytics = analyticsResponse.data.data.analytics;
        if (analytics.totalSales === 0 && analytics.totalTransactions === 0) {
          this.addResult('Tenant Isolation - Analytics', true, 
            'Second tenant sees only their own analytics (empty)');
        } else {
          this.addResult('Tenant Isolation - Analytics', false, 
            'Second tenant can see first tenant\'s analytics data');
        }
      } catch (error) {
        this.addResult('Tenant Isolation - Analytics', false, 
          `Analytics isolation test failed: ${error}`);
      }

    } catch (error) {
      this.addResult('Tenant Isolation', false, `Failed: ${error}`);
    }
  }

  private addResult(test: string, success: boolean, message: string, data?: any): void {
    this.results.push({ test, success, message, data });
    
    if (success) {
      logger.info(`✅ ${test}: ${message}`);
    } else {
      logger.error(`❌ ${test}: ${message}`);
    }
  }

  private printResults(): void {
    const successful = this.results.filter(r => r.success).length;
    const total = this.results.length;
    
    logger.info('\n=== Multi-Tenant Point of Sale and Billing System Test Results ===');
    logger.info(`Total Tests: ${total}`);
    logger.info(`Successful: ${successful}`);
    logger.info(`Failed: ${total - successful}`);
    logger.info(`Success Rate: ${((successful / total) * 100).toFixed(1)}%`);
    
    if (total - successful > 0) {
      logger.info('\nFailed Tests:');
      this.results
        .filter(r => !r.success)
        .forEach(r => logger.error(`- ${r.test}: ${r.message}`));
    }
    
    logger.info('\n=== Billing System Test Summary Complete ===\n');
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new BillingSystemTester();
  tester.runAllTests().catch(error => {
    logger.error('Test execution failed:', error);
    process.exit(1);
  });
}

export { BillingSystemTester };