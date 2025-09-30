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

// Sample Stores
export const sampleStores: Store[] = [
  {
    id: "store1",
    name: "Main Street Store",
    address: "123 Main St, Anytown, USA",
    phone: "+1 (111) 222-3333",
    email: "main@invbill.com",
    createdAt: new Date("2023-01-01"),
    updatedAt: new Date("2023-01-01")
  },
  {
    id: "store2",
    name: "Downtown Branch",
    address: "456 Oak Ave, Anytown, USA",
    phone: "+1 (444) 555-6666",
    email: "downtown@invbill.com",
    createdAt: new Date("2023-02-10"),
    updatedAt: new Date("2023-02-10")
  }
]

// Sample Products (assigned to stores)
export const sampleProducts: Product[] = [
  {
    id: "1",
    name: "Wireless Bluetooth Headphones",
    sku: "WBH001",
    barcode: "1234567890123",
    category: "Electronics",
    price: 2999,
    cost: 1800,
    stock: 45,
    minStock: 10,
    description: "High-quality wireless headphones with noise cancellation",
    image: "/placeholder.svg?height=200&width=200",
    storeId: "store1", // Assigned to store1
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-01-20")
  },
  {
    id: "2",
    name: "Smartphone Case",
    sku: "SPC002",
    barcode: "2345678901234",
    category: "Accessories",
    price: 599,
    cost: 300,
    stock: 120,
    minStock: 20,
    description: "Protective case for smartphones",
    image: "/placeholder.svg?height=200&width=200",
    storeId: "store1", // Assigned to store1
    createdAt: new Date("2024-01-10"),
    updatedAt: new Date("2024-01-18")
  },
  {
    id: "3",
    name: "USB-C Cable",
    sku: "USC003",
    barcode: "3456789012345",
    category: "Accessories",
    price: 299,
    cost: 150,
    stock: 8,
    minStock: 15,
    description: "Fast charging USB-C cable",
    image: "/placeholder.svg?height=200&width=200",
    storeId: "store2", // Assigned to store2
    createdAt: new Date("2024-01-12"),
    updatedAt: new Date("2024-01-22")
  },
  {
    id: "4",
    name: "Wireless Mouse",
    sku: "WM004",
    barcode: "4567890123456",
    category: "Electronics",
    price: 899,
    cost: 500,
    stock: 32,
    minStock: 10,
    description: "Ergonomic wireless mouse",
    image: "/placeholder.svg?height=200&width=200",
    storeId: "store2", // Assigned to store2
    createdAt: new Date("2024-01-08"),
    updatedAt: new Date("2024-01-19")
  },
  {
    id: "5",
    name: "Bluetooth Speaker",
    sku: "BS005",
    barcode: "5678901234567",
    category: "Electronics",
    price: 1599,
    cost: 900,
    stock: 25,
    minStock: 5,
    description: "Portable Bluetooth speaker with bass boost",
    image: "/placeholder.svg?height=200&width=200",
    storeId: "store1", // Assigned to store1
    createdAt: new Date("2024-01-14"),
    updatedAt: new Date("2024-01-21")
  }
]

// Sample Sales (assigned to stores)
export const sampleSales: Sale[] = [
  {
    id: "1",
    invoiceNumber: "INV-2024-001",
    customerName: "John Doe",
    customerEmail: "john@example.com",
    customerPhone: "+1234567890",
    items: [
      {
        productId: "1",
        productName: "Wireless Bluetooth Headphones",
        sku: "WBH001",
        quantity: 1,
        price: 2999,
        total: 2999
      },
      {
        productId: "2",
        productName: "Smartphone Case",
        sku: "SPC002",
        quantity: 2,
        price: 599,
        total: 1198
      }
    ],
    subtotal: 4197,
    tax: 755.46,
    discount: 200,
    total: 4752.46,
    paymentMethod: "card",
    status: "completed",
    storeId: "store1", // Assigned to store1
    createdAt: new Date("2024-01-22T10:30:00"),
    createdBy: "3"
  },
  {
    id: "2",
    invoiceNumber: "INV-2024-002",
    customerName: "Jane Smith",
    customerPhone: "+1234567891",
    items: [
      {
        productId: "4",
        productName: "Wireless Mouse",
        sku: "WM004",
        quantity: 1,
        price: 899,
        total: 899
      }
    ],
    subtotal: 899,
    tax: 161.82,
    discount: 0,
    total: 1060.82,
    paymentMethod: "cash",
    status: "completed",
    storeId: "store2", // Assigned to store2
    createdAt: new Date("2024-01-22T14:15:00"),
    createdBy: "3"
  }
]

// Sample Users (assigned to stores)
export const sampleUsers: User[] = [
  {
    id: "1",
    name: "John Admin",
    email: "admin@company.com",
    role: "admin",
    status: "active",
    storeId: undefined, // Admin is not tied to a specific store
    createdAt: new Date("2024-01-01")
  },
  {
    id: "2",
    name: "Sarah Manager",
    email: "manager@company.com",
    role: "store_manager",
    status: "active",
    storeId: "store1", // Assigned to store1
    createdAt: new Date("2024-01-05")
  },
  {
    id: "3",
    name: "Mike Staff",
    email: "staff@company.com",
    role: "pos_staff",
    status: "active",
    storeId: "store1", // Assigned to store1
    createdAt: new Date("2024-01-10")
  },
  {
    id: "4",
    name: "Emily Manager",
    email: "manager2@company.com",
    role: "store_manager",
    status: "active",
    storeId: "store2", // Assigned to store2
    createdAt: new Date("2024-01-15")
  },
  {
    id: "5",
    name: "David Staff",
    email: "staff2@company.com",
    role: "pos_staff",
    status: "active",
    storeId: "store2", // Assigned to store2
    createdAt: new Date("2024-01-20")
  }
]

// Sample Stock Movements (assigned to stores)
export const sampleStockMovements: StockMovement[] = [
  {
    id: "1",
    productId: "1",
    productName: "Wireless Bluetooth Headphones",
    type: "in",
    quantity: 50,
    reason: "New stock arrival",
    storeId: "store1", // Assigned to store1
    createdAt: new Date("2024-01-15T09:00:00"),
    createdBy: "2"
  },
  {
    id: "2",
    productId: "1",
    productName: "Wireless Bluetooth Headphones",
    type: "out",
    quantity: 1,
    reason: "Sale - INV-2024-001",
    storeId: "store1", // Assigned to store1
    createdAt: new Date("2024-01-22T10:30:00"),
    createdBy: "3"
  },
  {
    id: "3",
    productId: "3",
    productName: "USB-C Cable",
    type: "adjustment",
    quantity: -2,
    reason: "Damaged items",
    storeId: "store2", // Assigned to store2
    createdAt: new Date("2024-01-20T16:00:00"),
    createdBy: "4"
  }
]
