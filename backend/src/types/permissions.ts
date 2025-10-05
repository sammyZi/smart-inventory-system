/**
 * Permission System Type Definitions
 * Shared types for role-based access control
 */

export type UserRole = "ADMIN" | "MANAGER" | "STAFF" | "CUSTOMER"

export interface RolePermissions {
  // Store Management
  stores: {
    create: boolean
    read: 'all' | 'own' | 'assigned' | 'none'
    update: 'all' | 'own' | 'assigned' | 'none'
    delete: boolean
  }
  
  // User Management
  users: {
    createAdmin: boolean
    createManager: boolean
    createStaff: boolean
    viewUsers: 'all' | 'subordinates' | 'none'
    editUsers: 'all' | 'subordinates' | 'none'
    deleteUsers: 'all' | 'subordinates' | 'none'
  }
  
  // Product Management
  products: {
    create: boolean
    read: boolean
    update: boolean
    delete: boolean
    bulkImport: boolean
    setPricing: 'full' | 'request' | 'none'
  }
  
  // Inventory Management
  inventory: {
    stockIn: boolean
    stockOut: boolean
    stockAdjustment: boolean
    stockTransfer: 'all' | 'request' | 'none'
    viewLevels: 'all' | 'store' | 'availability' | 'none'
    physicalCount: boolean
  }
  
  // Sales & Billing
  sales: {
    processSale: boolean
    applyDiscount: 'custom' | 'limited' | 'preapproved' | 'none'
    processRefund: 'full' | 'manager' | 'none'
    viewTransactions: 'all' | 'store' | 'own' | 'none'
  }
  
  // Analytics & Reports
  analytics: {
    viewDashboard: 'full' | 'store' | 'pos' | 'customer'
    generateReports: 'all' | 'store' | 'none'
    viewFinancials: 'complete' | 'limited' | 'none'
    exportData: 'all' | 'store' | 'none'
  }
}

export interface UserContext {
  userId: string
  role: UserRole
  storeIds: string[] // Stores user has access to
  permissions: RolePermissions
  tenantId: string
}

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  storeIds: string[] // Stores user has access to
  managerId?: string // For staff, references their manager
  tenantId: string
  permissions: RolePermissions
  isActive: boolean
  lastLogin?: Date
  createdAt: Date
  updatedAt: Date
}

export interface Store {
  id: string
  name: string
  address: string
  managerId: string // Primary manager
  tenantId: string // Business owner
  settings: StoreSettings
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface StoreSettings {
  timezone: string
  currency: string
  taxRate: number
  allowDiscounts: boolean
  maxDiscountPercent: number
  requireManagerApproval: boolean
  enableInventoryTracking: boolean
  lowStockThreshold: number
}

export interface AuditLog {
  id: string
  userId: string
  role: UserRole
  tenantId: string
  action: string
  resource: string
  resourceId?: string
  metadata?: any
  timestamp: Date
  ip?: string
  userAgent?: string
}

// Permission checking utility types
export type StoreAction = 'create' | 'read' | 'update' | 'delete'
export type UserAction = 'create' | 'view' | 'edit' | 'delete'
export type ProductAction = 'create' | 'read' | 'update' | 'delete' | 'bulkImport' | 'setPricing'
export type InventoryAction = 'stockIn' | 'stockOut' | 'stockAdjustment' | 'stockTransfer' | 'viewLevels' | 'physicalCount'
export type SalesAction = 'processSale' | 'applyDiscount' | 'processRefund' | 'viewTransactions'
export type AnalyticsAction = 'viewDashboard' | 'generateReports' | 'viewFinancials' | 'exportData'

// API Response types
export interface PermissionCheckResponse {
  allowed: boolean
  reason?: string
  requiredRole?: UserRole
  requiredPermission?: string
}

export interface RoleValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

// Role hierarchy levels
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  ADMIN: 1,
  MANAGER: 2,
  STAFF: 3,
  CUSTOMER: 4
}

// Default permissions for new users
export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  timezone: 'UTC',
  currency: 'USD',
  taxRate: 0.1,
  allowDiscounts: true,
  maxDiscountPercent: 20,
  requireManagerApproval: false,
  enableInventoryTracking: true,
  lowStockThreshold: 10
}