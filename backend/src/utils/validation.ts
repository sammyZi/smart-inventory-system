import Joi from 'joi';
import { UserRole, PaymentMethod } from '@prisma/client';

// User validation schemas
export const createUserSchema = Joi.object({
  email: Joi.string().email().required(),
  firstName: Joi.string().min(1).max(50),
  lastName: Joi.string().min(1).max(50),
  phone: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/),
  role: Joi.string().valid(...Object.values(UserRole)).default('STAFF'),
  locationId: Joi.string().uuid(),
});

export const updateUserSchema = Joi.object({
  firstName: Joi.string().min(1).max(50),
  lastName: Joi.string().min(1).max(50),
  phone: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/),
  role: Joi.string().valid(...Object.values(UserRole)),
  locationId: Joi.string().uuid(),
  isActive: Joi.boolean(),
});

// Product validation schemas
export const createProductSchema = Joi.object({
  sku: Joi.string().min(1).max(50).required(),
  name: Joi.string().min(1).max(200).required(),
  description: Joi.string().max(1000),
  category: Joi.string().min(1).max(100).required(),
  price: Joi.number().min(0).precision(2).required(),
  cost: Joi.number().min(0).precision(2).required(),
  specifications: Joi.object(),
  images: Joi.array().items(Joi.string().uri()),
  minThreshold: Joi.number().integer().min(0).default(0),
  maxThreshold: Joi.number().integer().min(0).default(1000),
});

export const updateProductSchema = Joi.object({
  sku: Joi.string().min(1).max(50),
  name: Joi.string().min(1).max(200),
  description: Joi.string().max(1000),
  category: Joi.string().min(1).max(100),
  price: Joi.number().min(0).precision(2),
  cost: Joi.number().min(0).precision(2),
  specifications: Joi.object(),
  images: Joi.array().items(Joi.string().uri()),
  isActive: Joi.boolean(),
});

// Stock validation schemas
export const updateStockSchema = Joi.object({
  productId: Joi.string().required(),
  locationId: Joi.string().required(),
  quantity: Joi.number().integer().required(),
  type: Joi.string().valid('SET', 'ADD', 'SUBTRACT').required(),
  reason: Joi.string().max(200),
});

// Transaction validation schemas
export const createTransactionSchema = Joi.object({
  locationId: Joi.string().required(),
  customerId: Joi.string(),
  items: Joi.array().items(
    Joi.object({
      productId: Joi.string().required(),
      quantity: Joi.number().integer().min(1).required(),
      unitPrice: Joi.number().min(0).precision(2).required(),
      discountAmount: Joi.number().min(0).precision(2).default(0),
    })
  ).min(1).required(),
  paymentMethod: Joi.string().valid(...Object.values(PaymentMethod)).required(),
  discountAmount: Joi.number().min(0).precision(2).default(0),
  notes: Joi.string().max(500),
});

// Location validation schemas
export const createLocationSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  address: Joi.string().max(200),
  city: Joi.string().max(100),
  state: Joi.string().max(100),
  zipCode: Joi.string().max(20),
  country: Joi.string().max(100),
  phone: Joi.string().pattern(/^\+?[\d\s\-\(\)]+$/),
  email: Joi.string().email(),
  timezone: Joi.string().default('UTC'),
  currency: Joi.string().length(3).default('USD'),
  taxRate: Joi.number().min(0).max(1).precision(4).default(0),
});

// Search and pagination schemas
export const searchQuerySchema = Joi.object({
  q: Joi.string().max(100),
  category: Joi.string().max(100),
  minPrice: Joi.number().min(0),
  maxPrice: Joi.number().min(0),
  inStock: Joi.boolean(),
  locationId: Joi.string(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string().valid('name', 'price', 'createdAt', 'updatedAt').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
});

// Common validation utilities
export const validateUUID = (value: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
  return phoneRegex.test(phone);
};

// Validation middleware helper
export const validate = (schema: Joi.ObjectSchema) => {
  return (req: any, res: any, next: any) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details,
          timestamp: new Date().toISOString(),
        },
      });
    }

    req.body = value;
    next();
  };
};