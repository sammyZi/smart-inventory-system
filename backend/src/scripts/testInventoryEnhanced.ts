/**
 * Enhanced Inventory Management Testing Script
 * Tests tenant-scoped inventory operations, stock management, and conflict resolution
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

class InventoryTester {
  private results: TestResult[] = [];
  private adminToken: string = '';
  private tenantId: string = '';
  private locationId: string = '';
  private productId: string = '';

  async runAllTests(): Promise<void> {
    logger.info('Starting Enhanced Inventory Management Tests...');

    try {
      // Setup test environment
      await this.setupTestEnvironment();

      // Test stock level management
      await this.testStockLevelOperations();

      // Test bulk operations
      await this.testBulkStockOperations();

      // Test stock reservations
      await this.testStockReservations();

      // Test stock transfers
      await this.testStockTransfers();

      // Test validation and conflict resolution
      await this.testValidationAndConflicts();

      // Test inventory monitoring
      await this.testInventoryMonitoring();

      // Test dashboard and summary
      await this.testDashboardAndSummary();

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
        email: `test-admin-${Date.now()}@example.com`,
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'Admin',
        companyName: 'Test Inventory Company'
      });

      this.adminToken = adminResponse.data.data.token;
      this.tenantId = adminResponse.data.data.user.id;

      // Create a location
      const locationResponse = await axios.post(`${API_BASE}/saas/locations`, {
        name: 'Test Warehouse',
        address: '123 Test Street',
        city: 'Test City',
        state: 'TS',
        zipCode: '12345'
      }, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });

      this.locationId = locationResponse.data.data.id;

      // Create a test product
      const productResponse = await axios.post(`${API_BASE}/products`, {
        sku: `TEST-SKU-${Date.now()}`,
        name: 'Test Product',
        description: 'A test product for inventory testing',
        category: 'Test Category',
        price: 29.99,
        cost: 15.00
      }, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });

      this.productId = productResponse.data.data.id;

      // Initialize stock level
      await axios.put(`${API_BASE}/inventory/stock/update`, {
        productId: this.productId,
        locationId: this.locationId,
        quantity: 100,
        reason: 'Initial stock setup'
      }, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });

      this.addResult('Setup Test Environment', true, 'Test environment created successfully');

    } catch (error) {
      this.addResult('Setup Test Environment', false, `Setup failed: ${error}`);
      throw error;
    }
  }

  private async testStockLevelOperations(): Promise<void> {
    try {
      // Test getting stock levels
      const stockResponse = await axios.get(`${API_BASE}/inventory/stock`, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });

      this.addResult('Get Stock Levels', true, `Retrieved ${stockResponse.data.count} stock levels`);

      // Test stock update
      const updateResponse = await axios.put(`${API_BASE}/inventory/stock/update`, {
        productId: this.productId,
        locationId: this.locationId,
        quantity: 150,
        reason: 'Stock adjustment test'
      }, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });

      this.addResult('Update Stock Level', true, `Stock updated to ${updateResponse.data.data.quantity}`);

      // Test getting stock movements
      const movementsResponse = await axios.get(`${API_BASE}/inventory/movements`, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });

      this.addResult('Get Stock Movements', true, `Retrieved ${movementsResponse.data.count} movements`);

    } catch (error) {
      this.addResult('Stock Level Operations', false, `Failed: ${error}`);
    }
  }

  private async testBulkStockOperations(): Promise<void> {
    try {
      // Create additional products for bulk testing
      const product2Response = await axios.post(`${API_BASE}/products`, {
        sku: `BULK-TEST-1-${Date.now()}`,
        name: 'Bulk Test Product 1',
        category: 'Test',
        price: 19.99,
        cost: 10.00
      }, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });

      const product3Response = await axios.post(`${API_BASE}/products`, {
        sku: `BULK-TEST-2-${Date.now()}`,
        name: 'Bulk Test Product 2',
        category: 'Test',
        price: 39.99,
        cost: 20.00
      }, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });

      // Test bulk stock update
      const bulkUpdateResponse = await axios.post(`${API_BASE}/inventory/stock/bulk-update`, {
        updates: [
          {
            productId: product2Response.data.data.id,
            locationId: this.locationId,
            quantity: 50,
            reason: 'Bulk test setup'
          },
          {
            productId: product3Response.data.data.id,
            locationId: this.locationId,
            quantity: 75,
            reason: 'Bulk test setup'
          }
        ]
      }, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });

      const { success, failed } = bulkUpdateResponse.data.data;
      this.addResult('Bulk Stock Update', true, `${success.length} successful, ${failed.length} failed`);

    } catch (error) {
      this.addResult('Bulk Stock Operations', false, `Failed: ${error}`);
    }
  }

  private async testStockReservations(): Promise<void> {
    try {
      // Test stock reservation
      const reserveResponse = await axios.post(`${API_BASE}/inventory/stock/reserve`, {
        productId: this.productId,
        locationId: this.locationId,
        quantity: 25,
        reference: 'TEST-ORDER-001'
      }, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });

      this.addResult('Reserve Stock', true, `Reserved 25 units, reserved quantity: ${reserveResponse.data.data.reservedQuantity}`);

      // Test stock release
      const releaseResponse = await axios.post(`${API_BASE}/inventory/stock/release`, {
        productId: this.productId,
        locationId: this.locationId,
        quantity: 10,
        reference: 'TEST-ORDER-001'
      }, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });

      this.addResult('Release Reserved Stock', true, `Released 10 units, reserved quantity: ${releaseResponse.data.data.reservedQuantity}`);

    } catch (error) {
      this.addResult('Stock Reservations', false, `Failed: ${error}`);
    }
  }

  private async testStockTransfers(): Promise<void> {
    try {
      // Create second location for transfer testing
      const location2Response = await axios.post(`${API_BASE}/saas/locations`, {
        name: 'Test Store',
        address: '456 Store Avenue',
        city: 'Store City',
        state: 'SC',
        zipCode: '54321'
      }, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });

      const location2Id = location2Response.data.data.id;

      // Initialize stock at second location
      await axios.put(`${API_BASE}/inventory/stock/update`, {
        productId: this.productId,
        locationId: location2Id,
        quantity: 0,
        reason: 'Initial setup for transfer test'
      }, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });

      // Create stock transfer
      const transferResponse = await axios.post(`${API_BASE}/inventory/transfer`, {
        fromLocationId: this.locationId,
        toLocationId: location2Id,
        items: [
          {
            productId: this.productId,
            quantity: 20
          }
        ],
        notes: 'Test transfer'
      }, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });

      const transferId = transferResponse.data.data.id;
      this.addResult('Create Stock Transfer', true, `Transfer created with ID: ${transferId}`);

      // Process (approve) the transfer
      const processResponse = await axios.put(`${API_BASE}/inventory/transfer/${transferId}/process`, {
        action: 'approve'
      }, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });

      this.addResult('Process Stock Transfer', true, `Transfer ${processResponse.data.data.status}`);

    } catch (error) {
      this.addResult('Stock Transfers', false, `Failed: ${error}`);
    }
  }

  private async testValidationAndConflicts(): Promise<void> {
    try {
      // Test stock validation - valid operation
      const validResponse = await axios.post(`${API_BASE}/inventory/validate`, {
        productId: this.productId,
        locationId: this.locationId,
        requiredQuantity: 10
      }, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });

      this.addResult('Stock Validation - Valid', validResponse.data.data.isValid, 
        `Available: ${validResponse.data.data.availableStock}, Conflicts: ${validResponse.data.data.conflicts.length}`);

      // Test stock validation - insufficient stock
      const invalidResponse = await axios.post(`${API_BASE}/inventory/validate`, {
        productId: this.productId,
        locationId: this.locationId,
        requiredQuantity: 1000
      }, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });

      this.addResult('Stock Validation - Insufficient', !invalidResponse.data.data.isValid, 
        `Conflicts detected: ${invalidResponse.data.data.conflicts.join(', ')}`);

    } catch (error) {
      this.addResult('Validation and Conflicts', false, `Failed: ${error}`);
    }
  }

  private async testInventoryMonitoring(): Promise<void> {
    try {
      // Test inventory alerts
      const alertsResponse = await axios.get(`${API_BASE}/inventory/alerts`, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });

      this.addResult('Get Inventory Alerts', true, `Retrieved ${alertsResponse.data.count} alerts`);

      // Test low stock filtering
      const lowStockResponse = await axios.get(`${API_BASE}/inventory/stock?lowStock=true`, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });

      this.addResult('Get Low Stock Items', true, `Found ${lowStockResponse.data.count} low stock items`);

    } catch (error) {
      this.addResult('Inventory Monitoring', false, `Failed: ${error}`);
    }
  }

  private async testDashboardAndSummary(): Promise<void> {
    try {
      // Test inventory summary
      const summaryResponse = await axios.get(`${API_BASE}/inventory/summary`, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });

      const summary = summaryResponse.data.data;
      this.addResult('Get Inventory Summary', true, 
        `Products: ${summary.totalProducts}, Locations: ${summary.totalLocations}, Value: $${summary.totalStockValue.toFixed(2)}`);

      // Test dashboard
      const dashboardResponse = await axios.get(`${API_BASE}/inventory/dashboard`, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });

      this.addResult('Get Dashboard Data', true, 
        `Alerts: ${dashboardResponse.data.data.summary.alerts.length}, Recent movements: ${dashboardResponse.data.data.recentMovements.length}`);

    } catch (error) {
      this.addResult('Dashboard and Summary', false, `Failed: ${error}`);
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
    
    logger.info('\n=== Enhanced Inventory Management Test Results ===');
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
    
    logger.info('\n=== Test Summary Complete ===\n');
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new InventoryTester();
  tester.runAllTests().catch(error => {
    logger.error('Test execution failed:', error);
    process.exit(1);
  });
}

export { InventoryTester };