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