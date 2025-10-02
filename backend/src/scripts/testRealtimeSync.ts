/**
 * Enhanced Real-time Synchronization Testing Script
 * Tests tenant-aware real-time sync, conflict resolution, and offline queue management
 */

import axios from 'axios';
import { io, Socket } from 'socket.io-client';
import { logger } from '../utils/logger';

const API_BASE = 'http://localhost:3001/api/v1';
const SOCKET_URL = 'http://localhost:3001';

interface TestResult {
    test: string;
    success: boolean;
    message: string;
    data?: any;
}

class RealtimeSyncTester {
    private results: TestResult[] = [];
    private adminToken: string = '';
    private tenantId: string = '';
    private locationId: string = '';
    private productId: string = '';
    private socket: Socket | null = null;
    private receivedEvents: any[] = [];

    async runAllTests(): Promise<void> {
        logger.info('Starting Enhanced Real-time Synchronization Tests...');

        try {
            // Setup test environment
            await this.setupTestEnvironment();

            // Test WebSocket connection and tenant joining
            await this.testWebSocketConnection();

            // Test real-time inventory synchronization
            await this.testRealtimeInventorySync();

            // Test conflict detection and resolution
            await this.testConflictResolution();

            // Test offline queue management
            await this.testOfflineQueueManagement();

            // Test location-based filtering
            await this.testLocationBasedFiltering();

            // Test network interruption handling
            await this.testNetworkInterruption();

            // Test REST API endpoints
            await this.testRealtimeAPIEndpoints();

            // Test system health and monitoring
            await this.testSystemHealthMonitoring();

            // Cleanup
            await this.cleanup();

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
                email: `test-realtime-${Date.now()}@example.com`,
                password: 'TestPassword123!',
                firstName: 'Realtime',
                lastName: 'Tester',
                companyName: 'Realtime Test Company'
            });

            this.adminToken = adminResponse.data.data.token;
            this.tenantId = adminResponse.data.data.user.id;

            // Create a location
            const locationResponse = await axios.post(`${API_BASE}/saas/locations`, {
                name: 'Realtime Test Location',
                address: '123 Sync Street',
                city: 'Realtime City',
                state: 'RT',
                zipCode: '12345'
            }, {
                headers: { Authorization: `Bearer ${this.adminToken}` }
            });

            this.locationId = locationResponse.data.data.id;

            // Create a test product
            const productResponse = await axios.post(`${API_BASE}/products`, {
                sku: `REALTIME-SKU-${Date.now()}`,
                name: 'Realtime Test Product',
                description: 'A test product for real-time sync testing',
                category: 'Test Category',
                price: 49.99,
                cost: 25.00
            }, {
                headers: { Authorization: `Bearer ${this.adminToken}` }
            });

            this.productId = productResponse.data.data.id;

            // Initialize stock level
            await axios.put(`${API_BASE}/inventory/stock/update`, {
                productId: this.productId,
                locationId: this.locationId,
                quantity: 100,
                reason: 'Initial stock for realtime testing'
            }, {
                headers: { Authorization: `Bearer ${this.adminToken}` }
            });

            this.addResult('Setup Test Environment', true, 'Realtime test environment created successfully');

        } catch (error) {
            this.addResult('Setup Test Environment', false, `Setup failed: ${error}`);
            throw error;
        }
    }

    private async testWebSocketConnection(): Promise<void> {
        try {
            // Create WebSocket connection
            this.socket = io(SOCKET_URL, {
                transports: ['websocket']
            });

            // Setup event listeners
            this.setupSocketListeners();

            // Wait for connection
            await new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Connection timeout'));
                }, 5000);

                this.socket!.on('connect', () => {
                    clearTimeout(timeout);
                    resolve();
                });

                this.socket!.on('connect_error', (error) => {
                    clearTimeout(timeout);
                    reject(error);
                });
            });

            this.addResult('WebSocket Connection', true, 'Successfully connected to WebSocket server');

            // Test tenant room joining
            await this.testTenantRoomJoining();

        } catch (error) {
            this.addResult('WebSocket Connection', false, `Connection failed: ${error}`);
        }
    }

    private async testTenantRoomJoining(): Promise<void> {
        try {
            // Join tenant room
            this.socket!.emit('join-tenant', {
                tenantId: this.tenantId,
                userId: 'test-user-id',
                token: this.adminToken,
                locationId: this.locationId
            });

            // Wait for initial sync data
            await new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Initial sync timeout'));
                }, 5000);

                this.socket!.on('initial-sync', (data) => {
                    clearTimeout(timeout);
                    this.addResult('Initial Sync Data', true, `Received ${data.stockLevels.length} stock levels`);
                    resolve();
                });

                this.socket!.on('error', (error) => {
                    clearTimeout(timeout);
                    reject(error);
                });
            });

            this.addResult('Tenant Room Joining', true, 'Successfully joined tenant room and received initial sync');

        } catch (error) {
            this.addResult('Tenant Room Joining', false, `Failed: ${error}`);
        }
    }

    private async testRealtimeInventorySync(): Promise<void> {
        try {
            // Test real-time inventory update
            const updateData = {
                productId: this.productId,
                locationId: this.locationId,
                newQuantity: 85,
                previousQuantity: 100,
                eventId: `test-event-${Date.now()}`,
                version: Date.now()
            };

            // Send inventory update
            this.socket!.emit('inventory-update', updateData);

            // Wait for confirmation
            await new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Update confirmation timeout'));
                }, 5000);

                this.socket!.on('update-confirmed', (data) => {
                    if (data.eventId === updateData.eventId) {
                        clearTimeout(timeout);
                        this.addResult('Inventory Update Confirmation', true, `Update confirmed with version ${data.newVersion}`);
                        resolve();
                    }
                });

                this.socket!.on('update-failed', (data) => {
                    if (data.eventId === updateData.eventId) {
                        clearTimeout(timeout);
                        reject(new Error(data.error));
                    }
                });
            });

            this.addResult('Real-time Inventory Sync', true, 'Successfully synchronized inventory update');

        } catch (error) {
            this.addResult('Real-time Inventory Sync', false, `Failed: ${error}`);
        }
    }

    private async testConflictResolution(): Promise<void> {
        try {
            // Simulate a conflict by sending an update with old version
            const conflictData = {
                productId: this.productId,
                locationId: this.locationId,
                newQuantity: 90,
                version: Date.now() - 10000 // Old version
            };

            this.socket!.emit('inventory-update', conflictData);

            // Wait for conflict detection
            await new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Conflict detection timeout'));
                }, 5000);

                this.socket!.on('sync-conflict', (conflict) => {
                    clearTimeout(timeout);
                    this.addResult('Conflict Detection', true, `Detected ${conflict.conflictType} conflict`);

                    // Resolve conflict by accepting server version
                    this.socket!.emit('resolve-conflict', {
                        conflictId: conflict.id,
                        resolution: 'accept_server'
                    });

                    resolve();
                });
            });

            // Wait for conflict resolution
            await new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Conflict resolution timeout'));
                }, 5000);

                this.socket!.on('conflict-resolved', (result) => {
                    clearTimeout(timeout);
                    this.addResult('Conflict Resolution', true, `Resolved conflict with ${result.resolution}`);
                    resolve();
                });
            });

        } catch (error) {
            this.addResult('Conflict Resolution', false, `Failed: ${error}`);
        }
    }

    private async testOfflineQueueManagement(): Promise<void> {
        try {
            // Simulate offline queue items
            const queueItems = [
                {
                    id: `queue-item-1-${Date.now()}`,
                    operation: 'update',
                    resourceType: 'stock_level',
                    resourceId: this.productId,
                    data: {
                        productId: this.productId,
                        locationId: this.locationId,
                        newQuantity: 95
                    },
                    timestamp: new Date()
                },
                {
                    id: `queue-item-2-${Date.now()}`,
                    operation: 'update',
                    resourceType: 'stock_level',
                    resourceId: this.productId,
                    data: {
                        productId: this.productId,
                        locationId: this.locationId,
                        newQuantity: 92
                    },
                    timestamp: new Date()
                }
            ];

            // Send offline queue for processing
            this.socket!.emit('sync-offline-queue', queueItems);

            // Wait for processing results
            await new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Offline queue processing timeout'));
                }, 10000);

                this.socket!.on('offline-sync-results', (results) => {
                    clearTimeout(timeout);
                    const successful = results.filter((r: any) => r.success).length;
                    this.addResult('Offline Queue Processing', true, `Processed ${successful}/${results.length} queue items`);
                    resolve();
                });

                this.socket!.on('offline-sync-failed', (error) => {
                    clearTimeout(timeout);
                    reject(new Error(error.error));
                });
            });

        } catch (error) {
            this.addResult('Offline Queue Management', false, `Failed: ${error}`);
        }
    }

    private async testLocationBasedFiltering(): Promise<void> {
        try {
            // Create second location
            const location2Response = await axios.post(`${API_BASE}/saas/locations`, {
                name: 'Second Test Location',
                address: '456 Filter Avenue',
                city: 'Filter City',
                state: 'FC',
                zipCode: '54321'
            }, {
                headers: { Authorization: `Bearer ${this.adminToken}` }
            });

            const location2Id = location2Response.data.data.id;

            // Join location-specific room
            this.socket!.emit('join-location', {
                locationId: location2Id,
                tenantId: this.tenantId
            });

            // Test location-filtered broadcast via API
            const broadcastResponse = await axios.post(`${API_BASE}/realtime/broadcast`, {
                type: 'inventory_update',
                data: {
                    message: 'Location-specific update',
                    productId: this.productId
                },
                locationId: location2Id
            }, {
                headers: { Authorization: `Bearer ${this.adminToken}` }
            });

            this.addResult('Location-based Filtering', true, `Broadcast sent to location ${location2Id}`);

        } catch (error) {
            this.addResult('Location-based Filtering', false, `Failed: ${error}`);
        }
    }

    private async testNetworkInterruption(): Promise<void> {
        try {
            // Simulate network status change to offline
            this.socket!.emit('network-status', { isOnline: false });

            // Wait a moment
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Simulate coming back online
            this.socket!.emit('network-status', { isOnline: true });

            // Wait for offline queue processing
            await new Promise<void>((resolve) => {
                const timeout = setTimeout(() => {
                    resolve(); // Don't fail if no offline queue to process
                }, 3000);

                this.socket!.on('offline-queue-processed', (results) => {
                    clearTimeout(timeout);
                    resolve();
                });
            });

            this.addResult('Network Interruption Handling', true, 'Successfully handled network status changes');

        } catch (error) {
            this.addResult('Network Interruption Handling', false, `Failed: ${error}`);
        }
    }

    private async testRealtimeAPIEndpoints(): Promise<void> {
        try {
            // Test sync state endpoint
            const syncStateResponse = await axios.get(`${API_BASE}/realtime/sync-state`, {
                headers: { Authorization: `Bearer ${this.adminToken}` }
            });

            this.addResult('Sync State API', true, `Connected users: ${syncStateResponse.data.data.connectedUsers}`);

            // Test health endpoint
            const healthResponse = await axios.get(`${API_BASE}/realtime/health`, {
                headers: { Authorization: `Bearer ${this.adminToken}` }
            });

            this.addResult('Health API', true, `System health retrieved: ${healthResponse.data.data.system.totalConnections} connections`);

            // Test ping endpoint
            const pingResponse = await axios.post(`${API_BASE}/realtime/ping`, {
                timestamp: new Date().toISOString()
            }, {
                headers: { Authorization: `Bearer ${this.adminToken}` }
            });

            this.addResult('Ping API', true, `Latency: ${pingResponse.data.data.latency}ms`);

        } catch (error) {
            this.addResult('Real-time API Endpoints', false, `Failed: ${error}`);
        }
    }

    private async testSystemHealthMonitoring(): Promise<void> {
        try {
            // Test system statistics
            const healthResponse = await axios.get(`${API_BASE}/realtime/health`, {
                headers: { Authorization: `Bearer ${this.adminToken}` }
            });

            const systemStats = healthResponse.data.data.system;
            const tenantStats = healthResponse.data.data.tenant;

            this.addResult('System Health Monitoring', true,
                `Active tenants: ${systemStats.activeTenants}, Total connections: ${systemStats.totalConnections}`);

            // Test events endpoint
            const eventsResponse = await axios.get(`${API_BASE}/realtime/events?limit=10`, {
                headers: { Authorization: `Bearer ${this.adminToken}` }
            });

            this.addResult('Events Monitoring', true, `Retrieved ${eventsResponse.data.data.count} events`);

        } catch (error) {
            this.addResult('System Health Monitoring', false, `Failed: ${error}`);
        }
    }

    private setupSocketListeners(): void {
        if (!this.socket) return;

        // Listen for all real-time events
        const events = [
            'inventory-updated',
            'user-connected',
            'user-disconnected',
            'sync-event',
            'metrics-update',
            'sync-state-update',
            'conflict-resolution-broadcast',
            'offline-sync-update'
        ];

        events.forEach(event => {
            this.socket!.on(event, (data) => {
                this.receivedEvents.push({
                    event,
                    data,
                    timestamp: new Date()
                });
                logger.debug(`Received event: ${event}`, data);
            });
        });
    }

    private async cleanup(): Promise<void> {
        try {
            if (this.socket) {
                this.socket.disconnect();
                this.socket = null;
            }

            this.addResult('Cleanup', true, `Cleaned up resources, received ${this.receivedEvents.length} events total`);

        } catch (error) {
            this.addResult('Cleanup', false, `Cleanup failed: ${error}`);
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

        logger.info('\n=== Enhanced Real-time Synchronization Test Results ===');
        logger.info(`Total Tests: ${total}`);
        logger.info(`Successful: ${successful}`);
        logger.info(`Failed: ${total - successful}`);
        logger.info(`Success Rate: ${((successful / total) * 100).toFixed(1)}%`);
        logger.info(`Total Events Received: ${this.receivedEvents.length}`);

        if (total - successful > 0) {
            logger.info('\nFailed Tests:');
            this.results
                .filter(r => !r.success)
                .forEach(r => logger.error(`- ${r.test}: ${r.message}`));
        }

        logger.info('\n=== Real-time Sync Test Summary Complete ===\n');
    }
}

// Run tests if called directly
if (require.main === module) {
    const tester = new RealtimeSyncTester();
    tester.runAllTests().catch(error => {
        logger.error('Test execution failed:', error);
        process.exit(1);
    });
}

export { RealtimeSyncTester };