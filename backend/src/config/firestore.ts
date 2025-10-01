/**
 * Firestore Configuration and Collection Management
 * For real-time inventory data and live updates
 */

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Firestore, FieldValue } from 'firebase-admin/firestore';
import { logger } from '../utils/logger';

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
        throw new Error('Missing required Firebase environment variables');
    }

    const serviceAccount = {
        projectId,
        clientEmail,
        privateKey,
    };

    initializeApp({
        credential: cert(serviceAccount),
        projectId,
    });
}

export const firestore: Firestore = getFirestore();

// Collection names
export const COLLECTIONS = {
    PRODUCTS: 'products',
    STOCK_LEVELS: 'stock_levels',
    LOCATIONS: 'locations',
    REAL_TIME_UPDATES: 'real_time_updates',
    SENSOR_READINGS: 'sensor_readings',
    INVENTORY_ALERTS: 'inventory_alerts',
    SYNC_STATUS: 'sync_status',
} as const;

// Firestore document interfaces
export interface FirestoreProduct {
    id: string;
    sku: string;
    name: string;
    description?: string;
    category: string;
    brand?: string;
    price: number;
    cost?: number;
    trackingCodes?: {
        qr?: string;
        rfid?: string;
        nfc?: string;
        barcode?: string;
    };
    images: string[];
    isActive: boolean;
    lastUpdated: FieldValue;
    syncVersion: number;
}

export interface FirestoreStockLevel {
    id: string;
    productId: string;
    locationId: string;
    quantity: number;
    reservedQuantity: number;
    minThreshold: number;
    maxThreshold?: number;
    reorderPoint?: number;
    reorderQuantity?: number;
    lastCountDate?: FieldValue | undefined;
    lastUpdated: FieldValue;
    syncVersion: number;
}

export interface FirestoreLocation {
    id: string;
    name: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    adminId: string;
    isActive: boolean;
    timezone: string;
    currency: string;
    taxRate: number;
    lastUpdated: FieldValue;
    syncVersion: number;
}

export interface FirestoreRealTimeUpdate {
    id: string;
    type: 'stock_update' | 'product_update' | 'location_update' | 'transaction';
    entityId: string;
    locationId: string;
    changes: Record<string, any>;
    userId?: string;
    timestamp: FieldValue;
    processed: boolean;
    syncVersion: number;
}

export interface FirestoreSensorReading {
    id: string;
    sensorId: string;
    deviceId: string;
    locationId: string;
    sensorType: string;
    value: number;
    unit: string;
    metadata?: Record<string, any>;
    quality: 'GOOD' | 'FAIR' | 'POOR' | 'ERROR';
    timestamp: FieldValue;
    batteryLevel?: number;
}

export interface FirestoreInventoryAlert {
    id: string;
    type: 'low_stock' | 'high_stock' | 'out_of_stock' | 'sensor_alert';
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    locationId: string;
    productId?: string;
    sensorId?: string;
    message: string;
    threshold?: number;
    currentValue?: number;
    isResolved: boolean;
    resolvedBy?: string;
    resolvedAt?: FieldValue;
    createdAt: FieldValue;
}

export interface FirestoreSyncStatus {
    id: string;
    locationId: string;
    lastSyncTime: FieldValue;
    syncVersion: number;
    pendingChanges: number;
    status: 'synced' | 'syncing' | 'error' | 'offline';
    errorMessage?: string | undefined;
}

/**
 * Firestore service class for managing real-time data
 */
export class FirestoreService {
    /**
     * Initialize Firestore collections with proper indexes
     */
    static async initializeCollections(): Promise<void> {
        try {
            logger.info('Initializing Firestore collections...');

            // Create composite indexes (these should be created via Firebase console or CLI)
            const indexesToCreate = [
                { collection: COLLECTIONS.STOCK_LEVELS, fields: ['locationId', 'lastUpdated'] },
                { collection: COLLECTIONS.REAL_TIME_UPDATES, fields: ['locationId', 'timestamp'] },
                { collection: COLLECTIONS.SENSOR_READINGS, fields: ['locationId', 'timestamp'] },
                { collection: COLLECTIONS.INVENTORY_ALERTS, fields: ['locationId', 'isResolved', 'createdAt'] },
            ];

            logger.info('Firestore collections initialized. Ensure composite indexes are created in Firebase console.');
            logger.info('Required indexes:', indexesToCreate);
        } catch (error) {
            logger.error('Failed to initialize Firestore collections:', error);
            throw error;
        }
    }

    /**
     * Sync product data to Firestore
     */
    static async syncProduct(product: any): Promise<void> {
        try {
            const firestoreProduct: FirestoreProduct = {
                id: product.id,
                sku: product.sku,
                name: product.name,
                description: product.description,
                category: product.category,
                brand: product.brand,
                price: product.price,
                cost: product.cost,
                trackingCodes: product.trackingCodes,
                images: product.images || [],
                isActive: product.isActive,
                lastUpdated: FieldValue.serverTimestamp(),
                syncVersion: Date.now(),
            };

            await firestore
                .collection(COLLECTIONS.PRODUCTS)
                .doc(product.id)
                .set(firestoreProduct, { merge: true });

            logger.debug(`Product ${product.id} synced to Firestore`);
        } catch (error) {
            logger.error(`Failed to sync product ${product.id} to Firestore:`, error);
            throw error;
        }
    }

    /**
     * Sync stock level data to Firestore
     */
    static async syncStockLevel(stockLevel: any): Promise<void> {
        try {
            const firestoreStockLevel: FirestoreStockLevel = {
                id: stockLevel.id,
                productId: stockLevel.productId,
                locationId: stockLevel.locationId,
                quantity: stockLevel.quantity,
                reservedQuantity: stockLevel.reservedQuantity,
                minThreshold: stockLevel.minThreshold,
                maxThreshold: stockLevel.maxThreshold,
                reorderPoint: stockLevel.reorderPoint,
                reorderQuantity: stockLevel.reorderQuantity,
                lastCountDate: stockLevel.lastCountDate ? FieldValue.serverTimestamp() : undefined,
                lastUpdated: FieldValue.serverTimestamp(),
                syncVersion: Date.now(),
            };

            await firestore
                .collection(COLLECTIONS.STOCK_LEVELS)
                .doc(stockLevel.id)
                .set(firestoreStockLevel, { merge: true });

            // Check for low stock alerts
            if (stockLevel.quantity <= stockLevel.minThreshold) {
                await this.createInventoryAlert({
                    type: 'low_stock',
                    severity: stockLevel.quantity === 0 ? 'CRITICAL' : 'HIGH',
                    locationId: stockLevel.locationId,
                    productId: stockLevel.productId,
                    message: `Low stock alert: ${stockLevel.quantity} units remaining`,
                    threshold: stockLevel.minThreshold,
                    currentValue: stockLevel.quantity,
                });
            }

            logger.debug(`Stock level ${stockLevel.id} synced to Firestore`);
        } catch (error) {
            logger.error(`Failed to sync stock level ${stockLevel.id} to Firestore:`, error);
            throw error;
        }
    }

    /**
     * Create real-time update record
     */
    static async createRealTimeUpdate(update: Omit<FirestoreRealTimeUpdate, 'id' | 'timestamp' | 'syncVersion'>): Promise<void> {
        try {
            const updateDoc: Omit<FirestoreRealTimeUpdate, 'id'> = {
                ...update,
                timestamp: FieldValue.serverTimestamp(),
                syncVersion: Date.now(),
            };

            await firestore
                .collection(COLLECTIONS.REAL_TIME_UPDATES)
                .add(updateDoc);

            logger.debug(`Real-time update created for ${update.type}:${update.entityId}`);
        } catch (error) {
            logger.error('Failed to create real-time update:', error);
            throw error;
        }
    }

    /**
     * Store sensor reading
     */
    static async storeSensorReading(reading: Omit<FirestoreSensorReading, 'id' | 'timestamp'>): Promise<void> {
        try {
            const readingDoc: Omit<FirestoreSensorReading, 'id'> = {
                ...reading,
                timestamp: FieldValue.serverTimestamp(),
            };

            await firestore
                .collection(COLLECTIONS.SENSOR_READINGS)
                .add(readingDoc);

            logger.debug(`Sensor reading stored for sensor ${reading.sensorId}`);
        } catch (error) {
            logger.error('Failed to store sensor reading:', error);
            throw error;
        }
    }

    /**
     * Create inventory alert
     */
    static async createInventoryAlert(alert: Omit<FirestoreInventoryAlert, 'id' | 'createdAt' | 'isResolved'>): Promise<void> {
        try {
            // Check if similar alert already exists and is not resolved
            const existingAlerts = await firestore
                .collection(COLLECTIONS.INVENTORY_ALERTS)
                .where('type', '==', alert.type)
                .where('locationId', '==', alert.locationId)
                .where('productId', '==', alert.productId || null)
                .where('sensorId', '==', alert.sensorId || null)
                .where('isResolved', '==', false)
                .limit(1)
                .get();

            if (!existingAlerts.empty) {
                logger.debug(`Similar alert already exists for ${alert.type}`);
                return;
            }

            const alertDoc: Omit<FirestoreInventoryAlert, 'id'> = {
                ...alert,
                isResolved: false,
                createdAt: FieldValue.serverTimestamp(),
            };

            await firestore
                .collection(COLLECTIONS.INVENTORY_ALERTS)
                .add(alertDoc);

            logger.info(`Inventory alert created: ${alert.type} - ${alert.message}`);
        } catch (error) {
            logger.error('Failed to create inventory alert:', error);
            throw error;
        }
    }

    /**
     * Resolve inventory alert
     */
    static async resolveInventoryAlert(alertId: string, resolvedBy: string): Promise<void> {
        try {
            await firestore
                .collection(COLLECTIONS.INVENTORY_ALERTS)
                .doc(alertId)
                .update({
                    isResolved: true,
                    resolvedBy,
                    resolvedAt: FieldValue.serverTimestamp(),
                });

            logger.info(`Inventory alert ${alertId} resolved by ${resolvedBy}`);
        } catch (error) {
            logger.error(`Failed to resolve inventory alert ${alertId}:`, error);
            throw error;
        }
    }

    /**
     * Update sync status for location
     */
    static async updateSyncStatus(locationId: string, status: FirestoreSyncStatus['status'], errorMessage?: string): Promise<void> {
        try {
            const syncStatusDoc: Omit<FirestoreSyncStatus, 'id'> = {
                locationId,
                lastSyncTime: FieldValue.serverTimestamp(),
                syncVersion: Date.now(),
                pendingChanges: 0, // This should be calculated based on actual pending changes
                status,
                errorMessage,
            };

            await firestore
                .collection(COLLECTIONS.SYNC_STATUS)
                .doc(locationId)
                .set(syncStatusDoc, { merge: true });

            logger.debug(`Sync status updated for location ${locationId}: ${status}`);
        } catch (error) {
            logger.error(`Failed to update sync status for location ${locationId}:`, error);
            throw error;
        }
    }

    /**
     * Get real-time stock levels for location
     */
    static async getStockLevelsForLocation(locationId: string): Promise<FirestoreStockLevel[]> {
        try {
            const snapshot = await firestore
                .collection(COLLECTIONS.STOCK_LEVELS)
                .where('locationId', '==', locationId)
                .orderBy('lastUpdated', 'desc')
                .get();

            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FirestoreStockLevel));
        } catch (error) {
            logger.error(`Failed to get stock levels for location ${locationId}:`, error);
            throw error;
        }
    }

    /**
     * Get unresolved alerts for location
     */
    static async getUnresolvedAlerts(locationId: string): Promise<FirestoreInventoryAlert[]> {
        try {
            const snapshot = await firestore
                .collection(COLLECTIONS.INVENTORY_ALERTS)
                .where('locationId', '==', locationId)
                .where('isResolved', '==', false)
                .orderBy('createdAt', 'desc')
                .get();

            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FirestoreInventoryAlert));
        } catch (error) {
            logger.error(`Failed to get unresolved alerts for location ${locationId}:`, error);
            throw error;
        }
    }

    /**
     * Subscribe to real-time updates for location
     */
    static subscribeToLocationUpdates(
        locationId: string,
        callback: (updates: FirestoreRealTimeUpdate[]) => void
    ): () => void {
        const unsubscribe = firestore
            .collection(COLLECTIONS.REAL_TIME_UPDATES)
            .where('locationId', '==', locationId)
            .where('processed', '==', false)
            .orderBy('timestamp', 'desc')
            .limit(50)
            .onSnapshot(
                (snapshot) => {
                    const updates = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FirestoreRealTimeUpdate));
                    callback(updates);
                },
                (error) => {
                    logger.error(`Error in real-time updates subscription for location ${locationId}:`, error);
                }
            );

        return unsubscribe;
    }

    /**
     * Clean up old real-time updates
     */
    static async cleanupOldUpdates(olderThanDays: number = 7): Promise<void> {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

            const batch = firestore.batch();
            const snapshot = await firestore
                .collection(COLLECTIONS.REAL_TIME_UPDATES)
                .where('timestamp', '<', cutoffDate)
                .limit(500)
                .get();

            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });

            await batch.commit();
            logger.info(`Cleaned up ${snapshot.docs.length} old real-time updates`);
        } catch (error) {
            logger.error('Failed to cleanup old updates:', error);
            throw error;
        }
    }
}

/**
 * Firestore health check
 */
export async function checkFirestoreConnection(): Promise<boolean> {
    try {
        await firestore.collection('health_check').doc('test').set({ timestamp: FieldValue.serverTimestamp() });
        await firestore.collection('health_check').doc('test').delete();
        logger.info('Firestore connection successful');
        return true;
    } catch (error) {
        logger.error('Firestore connection failed:', error);
        return false;
    }
}

export default firestore;