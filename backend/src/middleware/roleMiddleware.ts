/**
 * Enhanced Role-Based Access Control Middleware
 * Implements comprehensive permission checking and data filtering
 */

import { Request, Response, NextFunction } from 'express'
import { UserRole, RolePermissions } from './permissions'

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string
    email: string
    role: UserRole
    storeIds: string[]
    tenantId: string
    permissions: RolePermissions
  }
}

export interface UserContext {
  userId: string
  role: UserRole
  storeIds: string[]
  permissions: RolePermissions
  tenantId: string
}

// Role permissions matrix (matches frontend)
export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  ADMIN: {
    stores: { create: true, read: 'all', update: 'all', delete: true },
    users: { 
      createAdmin: true, createManager: true, createStaff: true,
      viewUsers: 'all', editUsers: 'all', deleteUsers: 'all'
    },
    products: { 
      create: true, read: true, update: true, delete: true,
      bulkImport: true, setPricing: 'full'
    },
    inventory: {
      stockIn: true, stockOut: true, stockAdjustment: true,
      stockTransfer: 'all', viewLevels: 'all', physicalCount: true
    },
    sales: {
      processSale: true, applyDiscount: 'custom',
      processRefund: 'full', viewTransactions: 'all'
    },
    analytics: {
      viewDashboard: 'full', generateReports: 'all',
      viewFinancials: 'complete', exportData: 'all'
    }
  },
  
  MANAGER: {
    stores: { create: false, read: 'assigned', update: 'assigned', delete: false },
    users: {
      createAdmin: false, createManager: false, createStaff: true,
      viewUsers: 'subordinates', editUsers: 'subordinates', deleteUsers: 'subordinates'
    },
    products: {
      create: true, read: true, update: true, delete: false,
      bulkImport: false, setPricing: 'request'
    },
    inventory: {
      stockIn: true, stockOut: true, stockAdjustment: true,
      stockTransfer: 'request', viewLevels: 'store', physicalCount: true
    },
    sales: {
      processSale: true, applyDiscount: 'limited',
      processRefund: 'full', viewTransactions: 'store'
    },
    analytics: {
      viewDashboard: 'store', generateReports: 'store',
      viewFinancials: 'limited', exportData: 'store'
    }
  },
  
  STAFF: {
    stores: { create: false, read: 'none', update: 'none', delete: false },
    users: {
      createAdmin: false, createManager: false, createStaff: false,
      viewUsers: 'none', editUsers: 'none', deleteUsers: 'none'
    },
    products: {
      create: false, read: true, update: false, delete: false,
      bulkImport: false, setPricing: 'none'
    },
    inventory: {
      stockIn: false, stockOut: false, stockAdjustment: false,
      stockTransfer: 'none', viewLevels: 'availability', physicalCount: false
    },
    sales: {
      processSale: true, applyDiscount: 'preapproved',
      processRefund: 'none', viewTransactions: 'own'
    },
    analytics: {
      viewDashboard: 'pos', generateReports: 'none',
      viewFinancials: 'none', exportData: 'none'
    }
  },
  
  CUSTOMER: {
    stores: { create: false, read: 'none', update: 'none', delete: false },
    users: {
      createAdmin: false, createManager: false, createStaff: false,
      viewUsers: 'none', editUsers: 'none', deleteUsers: 'none'
    },
    products: {
      create: false, read: true, update: false, delete: false,
      bulkImport: false, setPricing: 'none'
    },
    inventory: {
      stockIn: false, stockOut: false, stockAdjustment: false,
      stockTransfer: 'none', viewLevels: 'availability', physicalCount: false
    },
    sales: {
      processSale: true, applyDiscount: 'none',
      processRefund: 'none', viewTransactions: 'own'
    },
    analytics: {
      viewDashboard: 'customer', generateReports: 'none',
      viewFinancials: 'none', exportData: 'none'
    }
  }
}

/**
 * Middleware to require specific roles
 */
export function requireRole(allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: allowedRoles,
        current: req.user.role
      })
    }

    next()
  }
}

/**
 * Middleware to check specific permissions
 */
export function requirePermission(
  resource: keyof RolePermissions,
  action: string
) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const userPermissions = ROLE_PERMISSIONS[req.user.role]
    const resourcePermissions = userPermissions[resource] as any

    if (!resourcePermissions || !resourcePermissions[action]) {
      return res.status(403).json({ 
        error: 'Permission denied',
        resource,
        action,
        role: req.user.role
      })
    }

    // Check if permission is boolean true or non-'none' string
    const hasPermission = resourcePermissions[action] === true || 
                         (typeof resourcePermissions[action] === 'string' && resourcePermissions[action] !== 'none')

    if (!hasPermission) {
      return res.status(403).json({ 
        error: 'Permission denied',
        resource,
        action,
        role: req.user.role
      })
    }

    next()
  }
}

/**
 * Middleware to enforce store-level access
 */
export function enforceStoreAccess() {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    const storeId = req.params.storeId || req.body.storeId || req.query.storeId

    // Admin can access all stores
    if (req.user.role === 'ADMIN') {
      return next()
    }

    // Manager and Staff must have store access
    if (req.user.role === 'MANAGER' || req.user.role === 'STAFF') {
      if (!storeId) {
        return res.status(400).json({ error: 'Store ID required' })
      }

      if (!req.user.storeIds.includes(storeId)) {
        return res.status(403).json({ 
          error: 'Store access denied',
          storeId,
          allowedStores: req.user.storeIds
        })
      }
    }

    next()
  }
}

/**
 * Apply role-based data filtering to database queries
 */
export function applyRoleFilters(
  userContext: UserContext,
  resource: string,
  baseQuery: any = {}
): any {
  const { role, storeIds, tenantId, userId } = userContext

  // Always filter by tenant
  const query = { ...baseQuery, tenantId }

  switch (role) {
    case 'ADMIN':
      // Admin sees all data within tenant
      return query

    case 'MANAGER':
      // Manager sees only their store data
      if (resource === 'products' || resource === 'inventory' || resource === 'sales') {
        query.storeId = { in: storeIds }
      }
      if (resource === 'users') {
        // Can see subordinates (staff in their stores)
        query.OR = [
          { id: userId }, // Can see themselves
          { role: 'STAFF', storeIds: { hasSome: storeIds } }
        ]
      }
      return query

    case 'STAFF':
      // Staff sees very limited data
      if (resource === 'sales' || resource === 'transactions') {
        query.staffId = userId // Only their own sales
      }
      if (resource === 'products') {
        query.storeId = { in: storeIds } // Products in their store
      }
      if (resource === 'users') {
        query.id = userId // Only themselves
      }
      return query

    case 'CUSTOMER':
      // Customer sees only public data and their own records
      if (resource === 'products') {
        query.isActive = true // Only active products
        // Remove sensitive fields in the service layer
      }
      if (resource === 'orders' || resource === 'transactions') {
        query.customerId = userId
      }
      return query

    default:
      return query
  }
}

/**
 * Get accessible store IDs for user
 */
export function getAccessibleStores(userContext: UserContext): string[] {
  const { role, storeIds } = userContext

  switch (role) {
    case 'ADMIN':
      return [] // Empty array means all stores (handled in query logic)
    case 'MANAGER':
    case 'STAFF':
      return storeIds
    case 'CUSTOMER':
      return [] // Customers don't have store-level access
    default:
      return []
  }
}

/**
 * Check if user can access specific store
 */
export function canAccessStore(userContext: UserContext, storeId: string): boolean {
  const { role, storeIds } = userContext

  if (role === 'ADMIN') return true
  if (role === 'MANAGER' || role === 'STAFF') {
    return storeIds.includes(storeId)
  }
  return false
}

/**
 * Filter sensitive data based on role
 */
export function filterSensitiveData(data: any, userContext: UserContext): any {
  const { role } = userContext

  if (!data) return data

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(item => filterSensitiveData(item, userContext))
  }

  // Handle objects
  if (typeof data === 'object') {
    const filtered = { ...data }

    // Remove cost information for non-admin/manager roles
    if (role === 'STAFF' || role === 'CUSTOMER') {
      delete filtered.cost
      delete filtered.costPrice
      delete filtered.profit
      delete filtered.margin
    }

    // Remove sensitive user information
    if (role !== 'ADMIN') {
      delete filtered.password
      delete filtered.hashedPassword
      delete filtered.salt
    }

    // Remove financial details for staff and customers
    if (role === 'STAFF' || role === 'CUSTOMER') {
      delete filtered.revenue
      delete filtered.totalProfit
      delete filtered.expenses
    }

    return filtered
  }

  return data
}

/**
 * Audit logging for role-based actions
 */
export function logRoleAction(
  userContext: UserContext,
  action: string,
  resource: string,
  resourceId?: string,
  metadata?: any
) {
  const logEntry = {
    userId: userContext.userId,
    role: userContext.role,
    tenantId: userContext.tenantId,
    action,
    resource,
    resourceId,
    metadata,
    timestamp: new Date(),
    ip: metadata?.ip,
    userAgent: metadata?.userAgent
  }

  // In a real implementation, this would write to an audit log
  console.log('AUDIT LOG:', logEntry)
  
  // TODO: Implement actual audit logging to database
}