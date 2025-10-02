/**
 * Validation Middleware
 * Provides request validation using Joi schemas
 */

import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { logger } from '../utils/logger';

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

/**
 * Generic request validation middleware
 */
export function validateRequest(req: Request, res: Response, next: NextFunction): void {
  // For now, just pass through - we'll add specific validation as needed
  next();
}

/**
 * Validate request body against Joi schema
 */
export function validate(schema: Joi.ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const { error, value } = schema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
        allowUnknown: false
      });

      if (error) {
        const validationErrors: ValidationError[] = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }));

        logger.warn('Request validation failed:', {
          path: req.path,
          method: req.method,
          errors: validationErrors
        });

        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validationErrors
        });
      }

      // Replace request body with validated and sanitized data
      req.body = value;
      next();

    } catch (err) {
      logger.error('Validation middleware error:', err);
      res.status(500).json({
        success: false,
        error: 'Internal validation error'
      });
    }
  };
}

/**
 * Validate query parameters against Joi schema
 */
export function validateQuery(schema: Joi.ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const { error, value } = schema.validate(req.query, {
        abortEarly: false,
        stripUnknown: true,
        allowUnknown: false
      });

      if (error) {
        const validationErrors: ValidationError[] = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }));

        logger.warn('Query validation failed:', {
          path: req.path,
          method: req.method,
          errors: validationErrors
        });

        return res.status(400).json({
          success: false,
          error: 'Query validation failed',
          details: validationErrors
        });
      }

      // Replace query with validated data
      req.query = value;
      next();

    } catch (err) {
      logger.error('Query validation middleware error:', err);
      res.status(500).json({
        success: false,
        error: 'Internal validation error'
      });
    }
  };
}

/**
 * Validate route parameters against Joi schema
 */
export function validateParams(schema: Joi.ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const { error, value } = schema.validate(req.params, {
        abortEarly: false,
        stripUnknown: true,
        allowUnknown: false
      });

      if (error) {
        const validationErrors: ValidationError[] = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }));

        logger.warn('Params validation failed:', {
          path: req.path,
          method: req.method,
          errors: validationErrors
        });

        return res.status(400).json({
          success: false,
          error: 'Parameter validation failed',
          details: validationErrors
        });
      }

      // Replace params with validated data
      req.params = value;
      next();

    } catch (err) {
      logger.error('Params validation middleware error:', err);
      res.status(500).json({
        success: false,
        error: 'Internal validation error'
      });
    }
  };
}

// Common Joi schemas for reuse
export const commonSchemas = {
  id: Joi.string().required().min(1).max(50),
  email: Joi.string().email().required().max(254),
  password: Joi.string().min(8).max(128).required(),
  phone: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).optional(),
  sku: Joi.string().pattern(/^[A-Za-z0-9\-_]+$/).min(1).max(50).required(),
  price: Joi.number().min(0).max(999999.99).precision(2).required(),
  quantity: Joi.number().integer().min(0).max(999999).required(),
  name: Joi.string().min(1).max(200).required(),
  description: Joi.string().max(1000).optional().allow(''),
  category: Joi.string().min(1).max(100).required(),
  brand: Joi.string().max(100).optional().allow(''),
  weight: Joi.number().min(0).max(99999).optional(),
  dimensions: Joi.object({
    length: Joi.number().min(0).required(),
    width: Joi.number().min(0).required(),
    height: Joi.number().min(0).required(),
    unit: Joi.string().valid('cm', 'in', 'm').required()
  }).optional(),
  images: Joi.array().items(Joi.string().max(500)).max(10).optional(),
  trackingCodes: Joi.object({
    qr: Joi.string().optional(),
    rfid: Joi.string().optional(),
    nfc: Joi.string().optional(),
    barcode: Joi.string().optional()
  }).optional(),
  specifications: Joi.object().optional(),
  pagination: {
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sortBy: Joi.string().default('name'),
    sortOrder: Joi.string().valid('asc', 'desc').default('asc')
  }
};

// Product validation schemas
const productCreateSchema = Joi.object({
  sku: commonSchemas.sku,
  name: commonSchemas.name,
  description: commonSchemas.description,
  category: commonSchemas.category,
  brand: commonSchemas.brand,
  price: commonSchemas.price,
  cost: Joi.number().min(0).max(999999.99).precision(2).optional(),
  weight: commonSchemas.weight,
  dimensions: commonSchemas.dimensions,
  trackingCodes: commonSchemas.trackingCodes,
  specifications: commonSchemas.specifications,
  images: commonSchemas.images
});

export const productSchemas = {
  create: productCreateSchema,

  update: Joi.object({
    sku: Joi.string().pattern(/^[A-Za-z0-9\-_]+$/).min(1).max(50).optional(),
    name: Joi.string().min(1).max(200).optional(),
    description: commonSchemas.description,
    category: Joi.string().min(1).max(100).optional(),
    brand: commonSchemas.brand,
    price: Joi.number().min(0).max(999999.99).precision(2).optional(),
    cost: Joi.number().min(0).max(999999.99).precision(2).optional(),
    weight: commonSchemas.weight,
    dimensions: commonSchemas.dimensions,
    trackingCodes: commonSchemas.trackingCodes,
    specifications: commonSchemas.specifications,
    images: commonSchemas.images,
    isActive: Joi.boolean().optional()
  }).min(1), // At least one field must be provided

  search: Joi.object({
    q: Joi.string().max(200).optional(),
    category: Joi.string().max(100).optional(),
    brand: Joi.string().max(100).optional(),
    minPrice: Joi.number().min(0).optional(),
    maxPrice: Joi.number().min(0).optional(),
    isActive: Joi.boolean().optional(),
    locationId: Joi.string().optional(),
    ...commonSchemas.pagination
  }),

  bulkCreate: Joi.object({
    products: Joi.array().items(productCreateSchema).min(1).max(100).required()
  })
};

// Auth validation schemas
export const authSchemas = {
  login: Joi.object({
    email: commonSchemas.email,
    password: Joi.string().required() // Don't validate password strength on login
  }),

  register: Joi.object({
    email: commonSchemas.email,
    password: commonSchemas.password,
    firstName: Joi.string().min(1).max(100).required(),
    lastName: Joi.string().min(1).max(100).required(),
    phone: commonSchemas.phone,
    role: Joi.string().valid('ADMIN', 'MANAGER', 'STAFF', 'CUSTOMER').default('STAFF')
  }),

  refreshToken: Joi.object({
    refreshToken: Joi.string().required()
  })
};

// Location validation schemas
export const locationSchemas = {
  create: Joi.object({
    name: commonSchemas.name,
    address: Joi.string().max(500).optional(),
    city: Joi.string().max(100).optional(),
    state: Joi.string().max(100).optional(),
    zipCode: Joi.string().max(20).optional(),
    country: Joi.string().max(100).optional(),
    phone: commonSchemas.phone,
    email: Joi.string().email().max(254).optional(),
    timezone: Joi.string().default('UTC'),
    currency: Joi.string().length(3).default('USD'),
    taxRate: Joi.number().min(0).max(1).default(0)
  }),

  update: Joi.object({
    name: Joi.string().min(1).max(200).optional(),
    address: Joi.string().max(500).optional(),
    city: Joi.string().max(100).optional(),
    state: Joi.string().max(100).optional(),
    zipCode: Joi.string().max(20).optional(),
    country: Joi.string().max(100).optional(),
    phone: commonSchemas.phone,
    email: Joi.string().email().max(254).optional(),
    timezone: Joi.string().optional(),
    currency: Joi.string().length(3).optional(),
    taxRate: Joi.number().min(0).max(1).optional(),
    isActive: Joi.boolean().optional()
  }).min(1)
};