/**
 * Database Types and Interfaces
 * Generated from Prisma schema for type safety
 */

// Enums
export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  STAFF = 'STAFF',
  CUSTOMER = 'CUSTOMER'
}

export enum PaymentMethod {
  CASH = 'CASH',
  CREDIT_CARD = 'CREDIT_CARD',
  DEBIT_CARD = 'DEBIT_CARD',
  DIGITAL_WALLET = 'DIGITAL_WALLET',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CHECK = 'CHECK',
  OTHER = 'OTHER'
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED'
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED'
}

export enum RefundStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  COMPLETED = 'COMPLETED'
}

export enum MovementType {
  SALE = 'SALE',
  PURCHASE = 'PURCHASE',
  ADJUSTMENT = 'ADJUSTMENT',
  TRANSFER_IN = 'TRANSFER_IN',
  TRANSFER_OUT = 'TRANSFER_OUT',
  RETURN = 'RETURN',
  DAMAGE = 'DAMAGE',
  THEFT = 'THEFT',
  EXPIRED = 'EXPIRED',
  COUNT_ADJUSTMENT = 'COUNT_ADJUSTMENT'
}

export enum TransferStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  IN_TRANSIT = 'IN_TRANSIT',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REJECTED = 'REJECTED'
}

export enum SensorType {
  WEIGHT = 'WEIGHT',
  TEMPERATURE = 'TEMPERATURE',
  HUMIDITY = 'HUMIDITY',
  MOTION = 'MOTION',
  RFID_READER = 'RFID_READER',
  BARCODE_SCANNER = 'BARCODE_SCANNER',
  DOOR_SENSOR = 'DOOR_SENSOR',
  LIGHT_SENSOR = 'LIGHT_SENSOR',
  PRESSURE = 'PRESSURE',
  PROXIMITY = 'PROXIMITY'
}

export enum SensorStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  MAINTENANCE = 'MAINTENANCE',
  ERROR = 'ERROR',
  OFFLINE = 'OFFLINE'
}

export enum ReadingQuality {
  GOOD = 'GOOD',
  FAIR = 'FAIR',
  POOR = 'POOR',
  ERROR = 'ERROR'
}

export enum AlertType {
  THRESHOLD_EXCEEDED = 'THRESHOLD_EXCEEDED',
  THRESHOLD_BELOW = 'THRESHOLD_BELOW',
  SENSOR_OFFLINE = 'SENSOR_OFFLINE',
  BATTERY_LOW = 'BATTERY_LOW',
  CALIBRATION_NEEDED = 'CALIBRATION_NEEDED',
  MAINTENANCE_DUE = 'MAINTENANCE_DUE',
  ANOMALY_DETECTED = 'ANOMALY_DETECTED'
}

export enum AlertSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export enum EventType {
  MANUFACTURED = 'MANUFACTURED',
  QUALITY_CHECK = 'QUALITY_CHECK',
  SHIPPED = 'SHIPPED',
  RECEIVED = 'RECEIVED',
  STORED = 'STORED',
  SOLD = 'SOLD',
  RETURNED = 'RETURNED',
  RECYCLED = 'RECYCLED',
  DESTROYED = 'DESTROYED'
}

export enum PurchaseOrderStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  SENT = 'SENT',
  PARTIALLY_RECEIVED = 'PARTIALLY_RECEIVED',
  RECEIVED = 'RECEIVED',
  CANCELLED = 'CANCELLED'
}

export enum ModelType {
  DEMAND_FORECAST = 'DEMAND_FORECAST',
  PRICE_OPTIMIZATION = 'PRICE_OPTIMIZATION',
  INVENTORY_OPTIMIZATION = 'INVENTORY_OPTIMIZATION',
  ANOMALY_DETECTION = 'ANOMALY_DETECTION'
}

// Core Data Interfaces
export interface User {
  id: string;
  firebaseUid?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  role: UserRole;
  locationId?: string;
  createdById?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Location {
  id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  phone?: string;
  email?: string;
  adminId: string;
  isActive: boolean;
  timezone: string;
  currency: string;
  taxRate: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  category: string;
  brand?: string;
  price: number;
  cost?: number;
  weight?: number;
  dimensions?: ProductDimensions;
  trackingCodes?: TrackingCodes;
  specifications?: Record<string, any>;
  images: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductDimensions {
  length: number;
  width: number;
  height: number;
  unit: 'cm' | 'in' | 'm';
}

export interface TrackingCodes {
  qr?: string;
  rfid?: string;
  nfc?: string;
  barcode?: string;
}

export interface StockLevel {
  id: string;
  productId: string;
  locationId: string;
  quantity: number;
  reservedQuantity: number;
  minThreshold: number;
  maxThreshold?: number;
  reorderPoint?: number;
  reorderQuantity?: number;
  lastCountDate?: Date;
  lastUpdated: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface StockMovement {
  id: string;
  productId: string;
  locationId: string;
  movementType: MovementType;
  quantity: number;
  previousQty: number;
  newQty: number;
  reference?: string;
  reason?: string;
  performedBy?: string;
  notes?: string;
  timestamp: Date;
}

export interface Transaction {
  id: string;
  transactionNo: string;
  locationId: string;
  customerId?: string;
  staffId: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: TransactionStatus;
  notes?: string;
  receiptUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface TransactionItem {
  id: string;
  transactionId: string;
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  discountAmount: number;
  taxAmount: number;
}

export interface StockTransfer {
  id: string;
  transferNo: string;
  fromLocationId: string;
  toLocationId: string;
  status: TransferStatus;
  requestedBy: string;
  approvedBy?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  approvedAt?: Date;
  completedAt?: Date;
}

export interface StockTransferItem {
  id: string;
  transferId: string;
  productId: string;
  requestedQty: number;
  approvedQty?: number;
  receivedQty?: number;
  notes?: string;
}

export interface IoTSensor {
  id: string;
  deviceId: string;
  locationId: string;
  sensorType: SensorType;
  name: string;
  description?: string;
  position?: SensorPosition;
  configuration?: Record<string, any>;
  status: SensorStatus;
  lastReading?: Date;
  batteryLevel?: number;
  firmwareVersion?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SensorPosition {
  x: number;
  y: number;
  z?: number;
  zone?: string;
}

export interface SensorReading {
  id: string;
  sensorId: string;
  value: number;
  unit: string;
  metadata?: Record<string, any>;
  quality: ReadingQuality;
  timestamp: Date;
}

export interface SensorAlert {
  id: string;
  sensorId: string;
  alertType: AlertType;
  severity: AlertSeverity;
  message: string;
  threshold?: number;
  actualValue?: number;
  isResolved: boolean;
  resolvedBy?: string;
  resolvedAt?: Date;
  createdAt: Date;
}

export interface SupplyChainEvent {
  id: string;
  productId: string;
  eventType: EventType;
  location: string;
  actor: string;
  description?: string;
  metadata?: Record<string, any>;
  blockchainTxHash?: string;
  blockNumber?: bigint;
  gasUsed?: bigint;
  isVerified: boolean;
  timestamp: Date;
  createdAt: Date;
}

export interface Supplier {
  id: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  taxId?: string;
  paymentTerms?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PurchaseOrder {
  id: string;
  orderNo: string;
  supplierId: string;
  locationId: string;
  status: PurchaseOrderStatus;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  notes?: string;
  expectedDate?: Date;
  createdBy: string;
  approvedBy?: string;
  receivedBy?: string;
  createdAt: Date;
  updatedAt: Date;
  approvedAt?: Date;
  receivedAt?: Date;
}

export interface PurchaseOrderItem {
  id: string;
  purchaseOrderId: string;
  productId: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  receivedQty: number;
  notes?: string;
}

export interface Refund {
  id: string;
  transactionId: string;
  refundNo: string;
  amount: number;
  reason?: string;
  status: RefundStatus;
  processedBy?: string;
  createdAt: Date;
  updatedAt: Date;
  processedAt?: Date;
}

export interface RefundItem {
  id: string;
  refundId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface DailySales {
  id: string;
  locationId: string;
  date: Date;
  totalTransactions: number;
  totalRevenue: number;
  totalTax: number;
  totalDiscount: number;
  averageOrderValue: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AIModel {
  id: string;
  name: string;
  type: ModelType;
  version: string;
  productId?: string;
  locationId?: string;
  accuracy?: number;
  lastTrained?: Date;
  isActive: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditLog {
  id: string;
  userId?: string;
  locationId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

export interface SystemConfig {
  id: string;
  key: string;
  value: string;
  category?: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Input/Create Types (without auto-generated fields)
export interface CreateProductInput {
  sku: string;
  name: string;
  description?: string;
  category: string;
  brand?: string;
  price: number;
  cost?: number;
  weight?: number;
  dimensions?: ProductDimensions;
  trackingCodes?: TrackingCodes;
  specifications?: Record<string, any>;
  images?: string[];
}

export interface UpdateProductInput {
  sku?: string;
  name?: string;
  description?: string;
  category?: string;
  brand?: string;
  price?: number;
  cost?: number;
  weight?: number;
  dimensions?: ProductDimensions;
  trackingCodes?: TrackingCodes;
  specifications?: Record<string, any>;
  images?: string[];
  isActive?: boolean;
}

export interface CreateStockLevelInput {
  productId: string;
  locationId: string;
  quantity: number;
  minThreshold?: number;
  maxThreshold?: number;
  reorderPoint?: number;
  reorderQuantity?: number;
}

export interface UpdateStockLevelInput {
  quantity?: number;
  reservedQuantity?: number;
  minThreshold?: number;
  maxThreshold?: number;
  reorderPoint?: number;
  reorderQuantity?: number;
  lastCountDate?: Date;
}

export interface CreateTransactionInput {
  locationId: string;
  customerId?: string;
  staffId: string;
  items: CreateTransactionItemInput[];
  paymentMethod: PaymentMethod;
  notes?: string;
}

export interface CreateTransactionItemInput {
  productId: string;
  quantity: number;
  unitPrice: number;
  discountAmount?: number;
}

export interface CreateStockTransferInput {
  fromLocationId: string;
  toLocationId: string;
  requestedBy: string;
  items: CreateStockTransferItemInput[];
  notes?: string;
}

export interface CreateStockTransferItemInput {
  productId: string;
  requestedQty: number;
}

export interface CreateIoTSensorInput {
  deviceId: string;
  locationId: string;
  sensorType: SensorType;
  name: string;
  description?: string;
  position?: SensorPosition;
  configuration?: Record<string, any>;
}

export interface CreateSensorReadingInput {
  sensorId: string;
  value: number;
  unit: string;
  metadata?: Record<string, any>;
  quality?: ReadingQuality;
}

export interface CreateSupplyChainEventInput {
  productId: string;
  eventType: EventType;
  location: string;
  actor: string;
  description?: string;
  metadata?: Record<string, any>;
}

// Search and Filter Types
export interface ProductSearchQuery {
  query?: string;
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  isActive?: boolean;
  locationId?: string;
}

export interface StockLevelFilter {
  locationId?: string;
  productId?: string;
  belowMinThreshold?: boolean;
  aboveMaxThreshold?: boolean;
}

export interface TransactionFilter {
  locationId?: string;
  staffId?: string;
  customerId?: string;
  status?: TransactionStatus;
  paymentMethod?: PaymentMethod;
  startDate?: Date;
  endDate?: Date;
}

export interface SensorReadingFilter {
  sensorId?: string;
  locationId?: string;
  sensorType?: SensorType;
  startDate?: Date;
  endDate?: Date;
  minValue?: number;
  maxValue?: number;
}

// Response Types with Relations
export interface ProductWithStock extends Product {
  stockLevels: StockLevel[];
}

export interface TransactionWithItems extends Transaction {
  items: TransactionItem[];
  location: Location;
  staff: User;
}

export interface StockTransferWithItems extends StockTransfer {
  items: StockTransferItem[];
  fromLocation: Location;
  toLocation: Location;
}

export interface IoTSensorWithReadings extends IoTSensor {
  readings: SensorReading[];
  alerts: SensorAlert[];
  location: Location;
}

export interface SupplyChainEventWithProduct extends SupplyChainEvent {
  product: Product;
}

// Pagination Types
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}