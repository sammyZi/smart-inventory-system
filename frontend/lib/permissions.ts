/**
 * Enhanced Role-Based Permission System
 * Implements comprehensive hierarchical role structure: ADMIN → MANAGER → STAFF → CUSTOMER
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
 * Enhanced permission checking functions
 */

// Check store management permissions
export function canManageStores(role: UserRole, action: 'create' | 'read' | 'update' | 'delete'): boolean {
  const permissions = ROLE_PERMISSIONS[role].stores
  if (action === 'create' || action === 'delete') return permissions[action]
  return permissions[action] !== 'none'
}

// Check user management permissions
export function canManageUsers(role: UserRole, targetRole: UserRole, action: 'create' | 'view' | 'edit' | 'delete'): boolean {
  const permissions = ROLE_PERMISSIONS[role].users
  
  if (action === 'create') {
    if (targetRole === 'ADMIN') return permissions.createAdmin
    if (targetRole === 'MANAGER') return permissions.createManager
    if (targetRole === 'STAFF') return permissions.createStaff
    return false
  }
  
  if (action === 'view') return permissions.viewUsers !== 'none'
  if (action === 'edit') return permissions.editUsers !== 'none'
  if (action === 'delete') return permissions.deleteUsers !== 'none'
  
  return false
}

// Check product management permissions
export function canManageProducts(role: UserRole, action: 'create' | 'read' | 'update' | 'delete' | 'bulkImport' | 'setPricing'): boolean {
  const permissions = ROLE_PERMISSIONS[role].products
  
  if (action === 'setPricing') return permissions.setPricing !== 'none'
  return permissions[action] === true
}

// Check inventory permissions
export function canManageInventory(role: UserRole, action: 'stockIn' | 'stockOut' | 'stockAdjustment' | 'stockTransfer' | 'viewLevels' | 'physicalCount'): boolean {
  const permissions = ROLE_PERMISSIONS[role].inventory
  
  if (action === 'stockTransfer') return permissions.stockTransfer !== 'none'
  if (action === 'viewLevels') return permissions.viewLevels !== 'none'
  return permissions[action] === true
}

// Check sales permissions
export function canManageSales(role: UserRole, action: 'processSale' | 'applyDiscount' | 'processRefund' | 'viewTransactions'): boolean {
  const permissions = ROLE_PERMISSIONS[role].sales
  
  if (action === 'applyDiscount') return permissions.applyDiscount !== 'none'
  if (action === 'processRefund') return permissions.processRefund !== 'none'
  if (action === 'viewTransactions') return permissions.viewTransactions !== 'none'
  return permissions[action] === true
}

// Check analytics permissions
export function canAccessAnalytics(role: UserRole, action: 'viewDashboard' | 'generateReports' | 'viewFinancials' | 'exportData'): boolean {
  const permissions = ROLE_PERMISSIONS[role].analytics
  
  if (action === 'generateReports') return permissions.generateReports !== 'none'
  if (action === 'viewFinancials') return permissions.viewFinancials !== 'none'
  if (action === 'exportData') return permissions.exportData !== 'none'
  return permissions.viewDashboard !== 'customer' || action === 'viewDashboard'
}

// Get user's data access scope for a resource
export function getDataScope(role: UserRole, resource: 'stores' | 'inventory' | 'sales' | 'analytics'): string {
  const permissions = ROLE_PERMISSIONS[role]
  
  switch (resource) {
    case 'stores':
      return permissions.stores.read
    case 'inventory':
      return permissions.inventory.viewLevels
    case 'sales':
      return permissions.sales.viewTransactions
    case 'analytics':
      return permissions.analytics.viewDashboard
    default:
      return 'none'
  }
}

// Check if user can access specific store
export function canAccessStore(userContext: UserContext, storeId: string): boolean {
  const { role, storeIds } = userContext
  
  // Admin can access all stores
  if (role === 'ADMIN') return true
  
  // Manager and Staff can only access their assigned stores
  if (role === 'MANAGER' || role === 'STAFF') {
    return storeIds.includes(storeId)
  }
  
  // Customers don't have store-level access
  return false
}

/**
 * Navigation configuration by role
 */
export interface NavItem {
  label: string
  path: string
  icon: string
  description?: string
}

export interface ActionItem {
  label: string
  action: string
  icon?: string
}

export interface NavigationConfig {
  primaryNav: NavItem[]
  secondaryNav: NavItem[]
  quickActions: ActionItem[]
}

export const ROLE_NAVIGATION: Record<UserRole, NavigationConfig> = {
  ADMIN: {
    primaryNav: [
      { label: 'Dashboard', path: '/admin', icon: 'LayoutDashboard' },
      { label: 'Stores', path: '/admin/stores', icon: 'Store' },
      { label: 'Users', path: '/admin/users', icon: 'Users' },
      { label: 'Products', path: '/admin/products', icon: 'Package' },
      { label: 'Analytics', path: '/admin/analytics', icon: 'BarChart3' },
      { label: 'Settings', path: '/admin/settings', icon: 'Settings' }
    ],
    secondaryNav: [
      { label: 'AI Forecasting', path: '/ai', icon: 'Brain' },
      { label: 'IoT Devices', path: '/admin/iot', icon: 'Wifi' },
      { label: 'Blockchain', path: '/admin/blockchain', icon: 'Link' }
    ],
    quickActions: [
      { label: 'Add Store', action: 'createStore', icon: 'Plus' },
      { label: 'Add Manager', action: 'createManager', icon: 'UserPlus' },
      { label: 'System Backup', action: 'backup', icon: 'Download' }
    ]
  },
  
  MANAGER: {
    primaryNav: [
      { label: 'Dashboard', path: '/manager', icon: 'LayoutDashboard' },
      { label: 'Inventory', path: '/manager/inventory', icon: 'Package' },
      { label: 'Staff', path: '/manager/staff', icon: 'Users' },
      { label: 'Sales', path: '/manager/sales', icon: 'ShoppingCart' },
      { label: 'Reports', path: '/manager/reports', icon: 'BarChart3' }
    ],
    secondaryNav: [
      { label: 'Customers', path: '/manager/customers', icon: 'User' },
      { label: 'Suppliers', path: '/manager/suppliers', icon: 'Truck' }
    ],
    quickActions: [
      { label: 'Add Staff', action: 'createStaff', icon: 'UserPlus' },
      { label: 'Stock Count', action: 'stockCount', icon: 'ClipboardList' },
      { label: 'Daily Report', action: 'dailyReport', icon: 'FileText' }
    ]
  },
  
  STAFF: {
    primaryNav: [
      { label: 'POS', path: '/pos', icon: 'Calculator' },
      { label: 'Products', path: '/pos/products', icon: 'Search' }
    ],
    secondaryNav: [],
    quickActions: [
      { label: 'New Sale', action: 'newSale', icon: 'Plus' },
      { label: 'Call Manager', action: 'callManager', icon: 'Phone' }
    ]
  },
  
  CUSTOMER: {
    primaryNav: [
      { label: 'Shop', path: '/shop', icon: 'Store' },
      { label: 'Orders', path: '/orders', icon: 'ShoppingBag' },
      { label: 'Profile', path: '/profile', icon: 'User' }
    ],
    secondaryNav: [
      { label: 'Loyalty', path: '/loyalty', icon: 'Star' },
      { label: 'Support', path: '/support', icon: 'HelpCircle' }
    ],
    quickActions: [
      { label: 'Scan Product', action: 'scanProduct', icon: 'QrCode' },
      { label: 'Find Store', action: 'findStore', icon: 'MapPin' }
    ]
  }
}

/**
 * Get navigation configuration for user role
 */
export function getNavigationForRole(role: UserRole): NavigationConfig {
  return ROLE_NAVIGATION[role]
}

/**
 * Comprehensive role descriptions for UI
 */
export const ROLE_DESCRIPTIONS = {
  ADMIN: {
    title: "Administrator",
    description: "Business Owner/Top Manager - Complete system access",
    level: "Top Level",
    capabilities: [
      "Create/Edit/Delete stores and branches",
      "Add/Edit/Delete products with full pricing control",
      "Add/Remove managers and staff across all locations",
      "Manage complete inventory across all stores",
      "View all reports and analytics with complete financial data",
      "Process refunds and cancellations",
      "Manage suppliers and purchase orders",
      "Set pricing and discount policies",
      "Configure all system settings",
      "Access AI predictions and blockchain features",
      "Export all data and system backup",
      "Multi-store management and oversight"
    ],
    dashboardFeatures: [
      "Overview of all stores",
      "Total sales across business",
      "Complete inventory value",
      "Store-wise comparison",
      "Profit/Loss statements",
      "Staff performance metrics",
      "AI demand forecasting",
      "System health monitoring"
    ]
  },
  
  MANAGER: {
    title: "Store Manager", 
    description: "Store/Department Manager - Daily operations management",
    level: "Middle Level",
    capabilities: [
      "Add/Edit products (cannot delete permanently)",
      "Manage stock in/out for their store only",
      "Add/Remove staff for their store",
      "Process sales and billing",
      "Process returns and refunds",
      "View store reports (limited financial access)",
      "Manage customers and handle complaints",
      "Physical stock counting",
      "Request stock transfers between locations",
      "Apply discounts within set limits",
      "Generate daily/weekly reports"
    ],
    restrictions: [
      "Cannot delete products permanently",
      "Cannot change master pricing (needs admin approval)",
      "Cannot access other stores' data",
      "Cannot modify system settings",
      "Cannot add/remove managers",
      "Cannot access complete financial data"
    ],
    dashboardFeatures: [
      "Store-specific metrics",
      "Today's sales and targets",
      "Stock levels for their store",
      "Staff attendance and performance",
      "Customer feedback",
      "Low stock warnings",
      "Daily sales summary"
    ]
  },
  
  STAFF: {
    title: "Staff/Cashier",
    description: "Front-line Employee - POS and billing operations only",
    level: "Ground Level",
    capabilities: [
      "Process sales/billing ONLY",
      "Search products and scan barcodes/QR codes",
      "Add items to cart and calculate totals",
      "Accept payments (cash/card/UPI)",
      "Print receipts and invoices",
      "Check product availability and prices",
      "Apply pre-approved discounts only",
      "View their own sales history"
    ],
    restrictions: [
      "Cannot add/edit/delete products",
      "Cannot view any reports or analytics",
      "Cannot access inventory management",
      "Cannot process refunds (needs manager)",
      "Cannot modify prices or give custom discounts",
      "Cannot view other staff's sales",
      "Cannot access settings or cost prices"
    ],
    interfaceFeatures: [
      "Simple POS/Billing screen",
      "Product search bar",
      "Barcode scanner integration",
      "Current cart display",
      "Payment options",
      "Print receipt button",
      "Call manager button for assistance"
    ]
  },
  
  CUSTOMER: {
    title: "Customer",
    description: "End User - Product browsing and self-service",
    level: "End User",
    capabilities: [
      "Browse product catalog",
      "Check product availability",
      "View prices (selling price only)",
      "Search products by name/category",
      "Reserve items for pickup",
      "View order history",
      "Check loyalty points and rewards",
      "Self-checkout with mobile app",
      "Track orders and delivery status",
      "View digital receipts",
      "Provide feedback and reviews"
    ],
    restrictions: [
      "Cannot see inventory levels or stock counts",
      "Cannot see cost prices or profit margins",
      "Cannot access admin or staff features",
      "Cannot see other customers' data",
      "Cannot modify prices or access backend"
    ],
    appFeatures: [
      "Product catalog with search",
      "Product details and images",
      "Availability checker",
      "Shopping cart and wishlist",
      "Order history and tracking",
      "Loyalty points dashboard",
      "Digital receipts storage",
      "Store locator for multiple locations"
    ]
  }
}

/**
 * Get role hierarchy level
 */
export function getRoleLevel(role: UserRole): number {
  const levels = { ADMIN: 1, MANAGER: 2, STAFF: 3, CUSTOMER: 4 }
  return levels[role]
}

/**
 * Check if role A can manage role B (hierarchical check)
 */
export function canManageRole(managerRole: UserRole, targetRole: UserRole): boolean {
  return getRoleLevel(managerRole) < getRoleLevel(targetRole)
}