/**
 * Real-time Synchronization API Routes
 * Handles tenant-aware real-time sync, conflict resolution, and offline queue management
 */

import express, { Response } from 'express';
import { RealtimeService } from '../services/realtimeService';
import { authenticateJWT } from '../middleware/auth';
import { enforceTenantIsolation } from '../middleware/tenantAuth';
import { validate } from '../middleware/validation';
import { apiRateLimit } from '../middleware/rateLimiter';
import { logger } from '../utils/logger';
import Joi from 'joi';
import { AuthenticatedRequest } from '../types';

const router = express.Router();

// Validation schemas
const syncEventSchema = Joi.object({
  type: Joi.string().valid('inventory_update', 'new_transaction', 'user_activity', 'system_alert').required(),
  data: Joi.object().required(),
  locationId: Joi.string().optional(),
  eventId: Joi.string().optional(),
  version: Joi.number().optional()
});

const offlineQueueSchema = Joi.object({
  items: Joi.array().items(
    Joi.object({
      id: Joi.string().required(),
      operation: Joi.string().valid('create', 'update', 'delete').required(),
      resourceType: Joi.string().required(),
      resourceId: Joi.string().optional(),
      data: Joi.object().required(),
      timestamp: Joi.date().required(),
      locationId: Joi.string().optional()
    })
  ).required()
});

const conflictResolutionSchema = Joi.object({
  conflictId: Joi.string().required(),
  resolution: Joi.string().valid('accept_local', 'accept_server', 'merge').required(),
  mergedData: Joi.object().optional()
});

// Apply middleware to all routes
router.use(authenticateJWT);
router.use(enforceTenantIsolation);

/**
 * GET /api/v1/realtime/sync-state
 * Get current synchronization state for tenant
 */
router.get('/sync-state', apiRateLimit, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    
    const syncState = RealtimeService.getTenantSyncState(tenantId);
    const connectedUsers = RealtimeService.getConnectedUsersCount(tenantId);

    res.json({
      success: true,
      data: {
        syncState,
        connectedUsers,
        timestamp: new Date()
      }
    });

  } catch (error) {
    logger.error('Error fetching sync state:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sync state',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/v1/realtime/broadcast
 * Broadcast real-time event to tenant users
 */
router.post('/broadcast', 
  validate(syncEventSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const userId = req.user!.id;
      const { type, data, locationId, eventId, version } = req.body;

      const event = {
        type,
        tenantId,
        data: {
          ...data,
          userId,
          eventId: eventId || `event_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
        },
        timestamp: new Date(),
        userId,
        locationId,
        eventId,
        version
      };

      // Broadcast event with location filtering if specified
      RealtimeService.broadcastSyncEvent(tenantId, event, locationId);

      res.json({
        success: true,
        data: {
          eventId: event.data.eventId,
          timestamp: event.timestamp,
          broadcastTo: locationId ? `location-${locationId}` : 'all-tenant-users'
        },
        message: 'Event broadcasted successfully'
      });

    } catch (error) {
      logger.error('Error broadcasting event:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to broadcast event',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * POST /api/v1/realtime/offline-queue
 * Process offline queue items for synchronization
 */
router.post('/offline-queue',
  validate(offlineQueueSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const userId = req.user!.id;
      const { items } = req.body;

      // Add tenant and user context to queue items
      const queueItems = items.map((item: any) => ({
        ...item,
        tenantId,
        userId,
        retryCount: 0,
        status: 'pending'
      }));

      // Add items to offline queue for processing
      queueItems.forEach((item: any) => {
        RealtimeService.addToOfflineQueue(tenantId, item);
      });

      // Trigger immediate processing if user is online
      // This would normally be handled by the WebSocket connection
      
      res.json({
        success: true,
        data: {
          queuedItems: queueItems.length,
          timestamp: new Date()
        },
        message: 'Offline queue items added for processing'
      });

    } catch (error) {
      logger.error('Error processing offline queue:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process offline queue',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * GET /api/v1/realtime/conflicts
 * Get pending synchronization conflicts for user
 */
router.get('/conflicts', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const userId = req.user!.id;

    // This would normally get conflicts from the RealtimeService
    // For now, return empty array as conflicts are handled via WebSocket
    const conflicts: any[] = [];

    res.json({
      success: true,
      data: {
        conflicts,
        count: conflicts.length,
        timestamp: new Date()
      }
    });

  } catch (error) {
    logger.error('Error fetching conflicts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch conflicts',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/v1/realtime/resolve-conflict
 * Resolve a synchronization conflict
 */
router.post('/resolve-conflict',
  validate(conflictResolutionSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const userId = req.user!.id;
      const resolution = req.body;

      // This would normally resolve the conflict via RealtimeService
      // For REST API, we'll return a success response
      // Actual conflict resolution happens via WebSocket

      res.json({
        success: true,
        data: {
          conflictId: resolution.conflictId,
          resolution: resolution.resolution,
          resolvedBy: userId,
          timestamp: new Date()
        },
        message: 'Conflict resolution initiated'
      });

    } catch (error) {
      logger.error('Error resolving conflict:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to resolve conflict',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * GET /api/v1/realtime/health
 * Get real-time system health and statistics
 */
router.get('/health', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    
    const systemStats = RealtimeService.getSystemStats();
    const tenantConnections = RealtimeService.getConnectedUsersCount(tenantId);
    const syncState = RealtimeService.getTenantSyncState(tenantId);

    res.json({
      success: true,
      data: {
        system: systemStats,
        tenant: {
          id: tenantId,
          connectedUsers: tenantConnections,
          syncState
        },
        timestamp: new Date()
      }
    });

  } catch (error) {
    logger.error('Error fetching real-time health:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch real-time health',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/v1/realtime/ping
 * Ping endpoint for connection testing
 */
router.post('/ping', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const userId = req.user!.id;
    const { timestamp: clientTimestamp } = req.body;

    const serverTimestamp = new Date();
    const latency = clientTimestamp ? serverTimestamp.getTime() - new Date(clientTimestamp).getTime() : null;

    res.json({
      success: true,
      data: {
        tenantId,
        userId,
        serverTimestamp,
        clientTimestamp,
        latency,
        status: 'connected'
      }
    });

  } catch (error) {
    logger.error('Error processing ping:', error);
    res.status(500).json({
      success: false,
      error: 'Ping failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/v1/realtime/events
 * Get recent real-time events for tenant (for debugging/monitoring)
 */
router.get('/events', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const limit = parseInt(req.query.limit as string) || 50;
    const eventType = req.query.type as string;

    // This would normally fetch from a real-time events log
    // For now, return empty array as events are handled via WebSocket
    const events: any[] = [];

    res.json({
      success: true,
      data: {
        events,
        count: events.length,
        filters: {
          tenantId,
          eventType,
          limit
        },
        timestamp: new Date()
      }
    });

  } catch (error) {
    logger.error('Error fetching real-time events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch real-time events',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;