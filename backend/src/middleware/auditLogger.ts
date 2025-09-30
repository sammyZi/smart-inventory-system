import { Request, Response, NextFunction } from 'express';
import { AuditService } from '../services/auditService';
import { AuthenticatedRequest } from '../types';
import { logger } from '../utils/logger';

// Middleware to automatically log API requests
export const auditLogger = (
  resource: string,
  action?: string
) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Store original res.json to capture response data
    const originalJson = res.json;
    let responseData: any;

    res.json = function(data: any) {
      responseData = data;
      return originalJson.call(this, data);
    };

    // Store original res.end to log after response
    const originalEnd = res.end;
    res.end = function(chunk?: any, encoding?: any) {
      // Log the action after response is sent
      setImmediate(async () => {
        try {
          if (req.user && res.statusCode < 400) {
            const actionType = action || getActionFromMethod(req.method);
            const resourceId = req.params.id || req.params.productId || req.params.transactionId;

            await AuditService.log({
              userId: req.user.id,
              locationId: req.user.locationId,
              action: actionType,
              resource: resource.toUpperCase(),
              resourceId,
              newValues: req.method !== 'GET' ? req.body : undefined,
              ipAddress: req.ip,
              userAgent: req.get('User-Agent')
            });
          }
        } catch (error) {
          logger.error('Audit logging failed', { error: error.message });
        }
      });

      return originalEnd.call(this, chunk, encoding);
    };

    next();
  };
};

// Helper function to determine action from HTTP method
function getActionFromMethod(method: string): string {
  switch (method.toUpperCase()) {
    case 'POST':
      return 'CREATE';
    case 'PUT':
    case 'PATCH':
      return 'UPDATE';
    case 'DELETE':
      return 'DELETE';
    case 'GET':
      return 'READ';
    default:
      return 'UNKNOWN';
  }
}

// Specific audit loggers for different resources
export const auditInventory = auditLogger('INVENTORY');
export const auditTransaction = auditLogger('TRANSACTION');
export const auditUser = auditLogger('USER');
export const auditLocation = auditLogger('LOCATION');

// Custom audit logger for specific actions
export const auditCustomAction = (
  action: string,
  resource: string,
  getResourceId?: (req: Request) => string,
  getOldValues?: (req: Request) => any,
  getNewValues?: (req: Request) => any
) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Store data before processing
    const oldValues = getOldValues ? getOldValues(req) : undefined;

    // Store original res.json to capture response data
    const originalJson = res.json;
    let responseData: any;

    res.json = function(data: any) {
      responseData = data;
      return originalJson.call(this, data);
    };

    // Store original res.end to log after response
    const originalEnd = res.end;
    res.end = function(chunk?: any, encoding?: any) {
      // Log the action after response is sent
      setImmediate(async () => {
        try {
          if (req.user && res.statusCode < 400) {
            const resourceId = getResourceId ? getResourceId(req) : req.params.id;
            const newValues = getNewValues ? getNewValues(req) : req.body;

            await AuditService.log({
              userId: req.user.id,
              locationId: req.user.locationId,
              action,
              resource: resource.toUpperCase(),
              resourceId,
              oldValues,
              newValues,
              ipAddress: req.ip,
              userAgent: req.get('User-Agent')
            });
          }
        } catch (error) {
          logger.error('Custom audit logging failed', { error: error.message });
        }
      });

      return originalEnd.call(this, chunk, encoding);
    };

    next();
  };
};

// Audit logger for authentication events
export const auditAuth = (action: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Store original res.json to capture response data
    const originalJson = res.json;
    let responseData: any;

    res.json = function(data: any) {
      responseData = data;
      return originalJson.call(this, data);
    };

    // Store original res.end to log after response
    const originalEnd = res.end;
    res.end = function(chunk?: any, encoding?: any) {
      // Log the action after response is sent
      setImmediate(async () => {
        try {
          if (res.statusCode < 400) {
            const userId = responseData?.data?.user?.id;
            const email = req.body.email || responseData?.data?.user?.email;

            await AuditService.logAuth(
              action as any,
              userId,
              email,
              req.ip,
              req.get('User-Agent'),
              {
                success: true,
                timestamp: new Date().toISOString()
              }
            );
          } else {
            // Log failed authentication attempts
            await AuditService.logAuth(
              action as any,
              undefined,
              req.body.email,
              req.ip,
              req.get('User-Agent'),
              {
                success: false,
                error: responseData?.error?.message,
                timestamp: new Date().toISOString()
              }
            );
          }
        } catch (error) {
          logger.error('Auth audit logging failed', { error: error.message });
        }
      });

      return originalEnd.call(this, chunk, encoding);
    };

    next();
  };
};

// Middleware to log sensitive operations
export const auditSensitiveOperation = (
  operation: string,
  getDetails?: (req: Request, res: Response) => any
) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const startTime = Date.now();

    // Store original res.end to log after response
    const originalEnd = res.end;
    res.end = function(chunk?: any, encoding?: any) {
      // Log the sensitive operation
      setImmediate(async () => {
        try {
          const duration = Date.now() - startTime;
          const details = getDetails ? getDetails(req, res) : {};

          await AuditService.logSystem(
            `SENSITIVE_${operation}`,
            req.user?.id,
            req.user?.locationId,
            {
              operation,
              duration,
              success: res.statusCode < 400,
              statusCode: res.statusCode,
              ...details
            },
            req.ip,
            req.get('User-Agent')
          );
        } catch (error) {
          logger.error('Sensitive operation audit logging failed', { error: error.message });
        }
      });

      return originalEnd.call(this, chunk, encoding);
    };

    next();
  };
};