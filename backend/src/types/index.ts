import { Request } from 'express';
import { UserRole } from '@prisma/client';

// Extend Express Request type
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    firebaseUid: string;
    email: string;
    role: UserRole;
    locationId?: string;
  };
}

// API Response types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface APIError {
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
    requestId: string;
  };
}

// Product types (for Firestore)
export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  price: number;
  cost: number;
  trackingCodes: {
    qr?: string;
    rfid?: string;
    nfc?: string;
  };
  specifications: Record<string, any>;
  images: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface StockLevel {
  id: string;
  productId: string;
  locationId: string;
  quantity: number;
  reservedQuantity: number;
  minThreshold: number;
  maxThreshold: number;
  lastUpdated: Date;
  lastCountDate: Date;
}

// Real-time update types
export interface InventoryUpdate {
  type: 'STOCK_UPDATE' | 'PRODUCT_UPDATE' | 'LOCATION_UPDATE';
  locationId: string;
  productId?: string;
  data: any;
  timestamp: Date;
  userId: string;
}

// Search and filter types
export interface SearchQuery {
  q?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  locationId?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Dashboard metrics
export interface DashboardMetrics {
  totalRevenue: number;
  totalTransactions: number;
  averageOrderValue: number;
  topProducts: Array<{
    productId: string;
    name: string;
    quantity: number;
    revenue: number;
  }>;
  lowStockAlerts: number;
  recentTransactions: Array<{
    id: string;
    transactionNo: string;
    totalAmount: number;
    createdAt: Date;
  }>;
  salesTrend: Array<{
    date: string;
    revenue: number;
    transactions: number;
  }>;
}

// Validation schemas
export interface CreateProductRequest {
  sku: string;
  name: string;
  description: string;
  category: string;
  price: number;
  cost: number;
  specifications?: Record<string, any>;
  images?: string[];
  minThreshold?: number;
  maxThreshold?: number;
}

export interface UpdateStockRequest {
  productId: string;
  locationId: string;
  quantity: number;
  type: 'SET' | 'ADD' | 'SUBTRACT';
  reason?: string;
}

export interface CreateTransactionRequest {
  locationId: string;
  customerId?: string;
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
    discountAmount?: number;
  }>;
  paymentMethod: string;
  discountAmount?: number;
  notes?: string;
}

// JWT payload
export interface JWTPayload {
  userId: string;
  firebaseUid: string;
  email: string;
  role: UserRole;
  locationId?: string;
  iat: number;
  exp: number;
}