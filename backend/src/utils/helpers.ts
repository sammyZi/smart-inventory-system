import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

// Generate unique identifiers
export const generateId = (): string => uuidv4();

export const generateTransactionNo = (): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `TXN-${timestamp}-${random}`.toUpperCase();
};

export const generateRefundNo = (): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `REF-${timestamp}-${random}`.toUpperCase();
};

export const generateSKU = (category: string, name: string): string => {
  const categoryCode = category.substring(0, 3).toUpperCase();
  const nameCode = name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 6).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${categoryCode}-${nameCode}-${random}`;
};

// Encryption utilities
export const encrypt = (text: string): string => {
  const algorithm = 'aes-256-gcm';
  const key = Buffer.from(process.env.ENCRYPTION_KEY || 'default-key-32-characters-long!!', 'utf8');
  const iv = crypto.randomBytes(16);
  
  const cipher = crypto.createCipher(algorithm, key);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return `${iv.toString('hex')}:${encrypted}`;
};

export const decrypt = (encryptedText: string): string => {
  const algorithm = 'aes-256-gcm';
  const key = Buffer.from(process.env.ENCRYPTION_KEY || 'default-key-32-characters-long!!', 'utf8');
  
  const [ivHex, encrypted] = encryptedText.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  
  const decipher = crypto.createDecipher(algorithm, key);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
};

// Hash utilities
export const generateHash = (data: string): string => {
  return crypto.createHash('sha256').update(data).digest('hex');
};

// Date utilities
export const formatDate = (date: Date, format: 'ISO' | 'US' | 'EU' = 'ISO'): string => {
  switch (format) {
    case 'US':
      return date.toLocaleDateString('en-US');
    case 'EU':
      return date.toLocaleDateString('en-GB');
    default:
      return date.toISOString();
  }
};

export const getDateRange = (period: 'today' | 'week' | 'month' | 'year'): { start: Date; end: Date } => {
  const now = new Date();
  const start = new Date();
  const end = new Date();

  switch (period) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'week':
      start.setDate(now.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'month':
      start.setMonth(now.getMonth() - 1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'year':
      start.setFullYear(now.getFullYear() - 1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
  }

  return { start, end };
};

// Number utilities
export const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

export const roundToDecimals = (num: number, decimals: number = 2): number => {
  return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

export const calculateTax = (amount: number, taxRate: number): number => {
  return roundToDecimals(amount * taxRate);
};

export const calculateDiscount = (amount: number, discountPercent: number): number => {
  return roundToDecimals(amount * (discountPercent / 100));
};

// Array utilities
export const paginate = <T>(array: T[], page: number, limit: number): T[] => {
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  return array.slice(startIndex, endIndex);
};

export const groupBy = <T>(array: T[], key: keyof T): Record<string, T[]> => {
  return array.reduce((groups, item) => {
    const group = String(item[key]);
    groups[group] = groups[group] || [];
    groups[group].push(item);
    return groups;
  }, {} as Record<string, T[]>);
};

// String utilities
export const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export const capitalize = (text: string): string => {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
};

export const truncate = (text: string, length: number): string => {
  return text.length > length ? text.substring(0, length) + '...' : text;
};

// Validation utilities
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
  return phoneRegex.test(phone);
};

export const isValidURL = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Error utilities
export const createError = (message: string, statusCode: number = 500, code?: string) => {
  const error = new Error(message) as any;
  error.statusCode = statusCode;
  error.code = code;
  return error;
};

// Response utilities
export const createResponse = <T>(data: T, message?: string) => {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString(),
  };
};

export const createPaginatedResponse = <T>(
  data: T[],
  page: number,
  limit: number,
  total: number,
  message?: string
) => {
  return {
    success: true,
    data,
    message,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    timestamp: new Date().toISOString(),
  };
};