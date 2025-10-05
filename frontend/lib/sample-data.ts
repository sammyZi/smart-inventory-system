export interface Store {
  id: string
  name: string
  address: string
  phone: string
  email: string
  createdAt: Date
  updatedAt: Date
}

export interface Product {
  id: string
  name: string
  sku: string
  barcode: string
  category: string
  price: number
  cost: number
  stock: number
  minStock: number
  description?: string
  image?: string
  storeId: string // Added storeId
  createdAt: Date
  updatedAt: Date
}

export interface Sale {
  id: string
  invoiceNumber: string
  customerId?: string
  customerName?: string
  customerEmail?: string
  customerPhone?: string
  items: SaleItem[]
  subtotal: number
  tax: number
  discount: number
  total: number
  paymentMethod: 'cash' | 'card' | 'upi'
  status: 'completed' | 'pending' | 'cancelled'
  storeId: string // Added storeId
  createdAt: Date
  createdBy: string
}

export interface SaleItem {
  productId: string
  productName: string
  sku: string
  quantity: number
  price: number
  total: number
}

export interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'store_manager' | 'pos_staff'
  status: 'active' | 'inactive'
  storeId?: string // Added storeId, optional for admin
  createdAt: Date
}

export interface StockMovement {
  id: string
  productId: string
  productName: string
  type: 'in' | 'out' | 'adjustment'
  quantity: number
  reason: string
  storeId: string // Added storeId
  createdAt: Date
  createdBy: string
}

// Empty stores - data comes from backend
export const sampleStores: Store[] = []

// Empty products - data comes from backend
export const sampleProducts: Product[] = []

// Empty sales - data comes from backend
export const sampleSales: Sale[] = []

// Empty users - data comes from backend
export const sampleUsers: User[] = []

// Empty stock movements - data comes from backend
export const sampleStockMovements: StockMovement[] = []
