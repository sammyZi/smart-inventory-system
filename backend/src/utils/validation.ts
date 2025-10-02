/**
 * Validation Utility
 * Provides validation functions for various data types and business rules
 */

import { CreateProductInput, UpdateProductInput } from '../types/database';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validate product data
 */
export function validateProductData(data: CreateProductInput | UpdateProductInput): ValidationResult {
  const errors: string[] = [];

  // SKU validation
  if ('sku' in data && data.sku) {
    if (typeof data.sku !== 'string' || data.sku.trim().length === 0) {
      errors.push('SKU is required and must be a non-empty string');
    } else if (data.sku.length > 50) {
      errors.push('SKU must be 50 characters or less');
    } else if (!/^[A-Za-z0-9\-_]+$/.test(data.sku)) {
      errors.push('SKU can only contain letters, numbers, hyphens, and underscores');
    }
  }

  // Name validation
  if ('name' in data && data.name !== undefined) {
    if (typeof data.name !== 'string' || data.name.trim().length === 0) {
      errors.push('Product name is required and must be a non-empty string');
    } else if (data.name.length > 200) {
      errors.push('Product name must be 200 characters or less');
    }
  }

  // Description validation
  if ('description' in data && data.description !== undefined && data.description !== null) {
    if (typeof data.description !== 'string') {
      errors.push('Description must be a string');
    } else if (data.description.length > 1000) {
      errors.push('Description must be 1000 characters or less');
    }
  }

  // Category validation
  if ('category' in data && data.category !== undefined) {
    if (typeof data.category !== 'string' || data.category.trim().length === 0) {
      errors.push('Category is required and must be a non-empty string');
    } else if (data.category.length > 100) {
      errors.push('Category must be 100 characters or less');
    }
  }

  // Brand validation
  if ('brand' in data && data.brand !== undefined && data.brand !== null) {
    if (typeof data.brand !== 'string') {
      errors.push('Brand must be a string');
    } else if (data.brand.length > 100) {
      errors.push('Brand must be 100 characters or less');
    }
  }

  // Price validation
  if ('price' in data && data.price !== undefined) {
    if (typeof data.price !== 'number' || isNaN(data.price)) {
      errors.push('Price must be a valid number');
    } else if (data.price < 0) {
      errors.push('Price cannot be negative');
    } else if (data.price > 999999.99) {
      errors.push('Price cannot exceed 999,999.99');
    }
  }

  // Cost validation
  if ('cost' in data && data.cost !== undefined && data.cost !== null) {
    if (typeof data.cost !== 'number' || isNaN(data.cost)) {
      errors.push('Cost must be a valid number');
    } else if (data.cost < 0) {
      errors.push('Cost cannot be negative');
    } else if (data.cost > 999999.99) {
      errors.push('Cost cannot exceed 999,999.99');
    }
  }

  // Weight validation
  if ('weight' in data && data.weight !== undefined && data.weight !== null) {
    if (typeof data.weight !== 'number' || isNaN(data.weight)) {
      errors.push('Weight must be a valid number');
    } else if (data.weight < 0) {
      errors.push('Weight cannot be negative');
    } else if (data.weight > 99999) {
      errors.push('Weight cannot exceed 99,999 kg');
    }
  }

  // Dimensions validation
  if ('dimensions' in data && data.dimensions !== undefined && data.dimensions !== null) {
    const { dimensions } = data;
    if (typeof dimensions !== 'object') {
      errors.push('Dimensions must be an object');
    } else {
      if (typeof dimensions.length !== 'number' || dimensions.length < 0) {
        errors.push('Dimensions length must be a positive number');
      }
      if (typeof dimensions.width !== 'number' || dimensions.width < 0) {
        errors.push('Dimensions width must be a positive number');
      }
      if (typeof dimensions.height !== 'number' || dimensions.height < 0) {
        errors.push('Dimensions height must be a positive number');
      }
      if (!['cm', 'in', 'm'].includes(dimensions.unit)) {
        errors.push('Dimensions unit must be cm, in, or m');
      }
    }
  }

  // Images validation
  if ('images' in data && data.images !== undefined) {
    if (!Array.isArray(data.images)) {
      errors.push('Images must be an array');
    } else {
      data.images.forEach((image, index) => {
        if (typeof image !== 'string') {
          errors.push(`Image at index ${index} must be a string`);
        } else if (image.length > 500) {
          errors.push(`Image URL at index ${index} must be 500 characters or less`);
        }
      });
      
      if (data.images.length > 10) {
        errors.push('Cannot have more than 10 images per product');
      }
    }
  }

  // Tracking codes validation
  if ('trackingCodes' in data && data.trackingCodes !== undefined && data.trackingCodes !== null) {
    const { trackingCodes } = data;
    if (typeof trackingCodes !== 'object') {
      errors.push('Tracking codes must be an object');
    } else {
      if (trackingCodes.qr && typeof trackingCodes.qr !== 'string') {
        errors.push('QR code must be a string');
      }
      if (trackingCodes.rfid && typeof trackingCodes.rfid !== 'string') {
        errors.push('RFID code must be a string');
      }
      if (trackingCodes.nfc && typeof trackingCodes.nfc !== 'string') {
        errors.push('NFC code must be a string');
      }
      if (trackingCodes.barcode && typeof trackingCodes.barcode !== 'string') {
        errors.push('Barcode must be a string');
      }
    }
  }

  // Specifications validation
  if ('specifications' in data && data.specifications !== undefined && data.specifications !== null) {
    if (typeof data.specifications !== 'object') {
      errors.push('Specifications must be an object');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate email format
 */
export function validateEmail(email: string): ValidationResult {
  const errors: string[] = [];
  
  if (!email || typeof email !== 'string') {
    errors.push('Email is required');
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.push('Invalid email format');
    } else if (email.length > 254) {
      errors.push('Email must be 254 characters or less');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate phone number format
 */
export function validatePhoneNumber(phone: string): ValidationResult {
  const errors: string[] = [];
  
  if (!phone || typeof phone !== 'string') {
    errors.push('Phone number is required');
  } else {
    // Remove all non-digit characters for validation
    const digitsOnly = phone.replace(/\D/g, '');
    
    if (digitsOnly.length < 10 || digitsOnly.length > 15) {
      errors.push('Phone number must be between 10 and 15 digits');
    }
    
    // Check for valid international format
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    if (!phoneRegex.test(digitsOnly)) {
      errors.push('Invalid phone number format');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): ValidationResult {
  const errors: string[] = [];
  
  if (!password || typeof password !== 'string') {
    errors.push('Password is required');
  } else {
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    
    if (password.length > 128) {
      errors.push('Password must be 128 characters or less');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate SKU format
 */
export function validateSKU(sku: string): ValidationResult {
  const errors: string[] = [];
  
  if (!sku || typeof sku !== 'string') {
    errors.push('SKU is required');
  } else {
    if (sku.trim().length === 0) {
      errors.push('SKU cannot be empty');
    } else if (sku.length > 50) {
      errors.push('SKU must be 50 characters or less');
    } else if (!/^[A-Za-z0-9\-_]+$/.test(sku)) {
      errors.push('SKU can only contain letters, numbers, hyphens, and underscores');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate quantity (must be non-negative integer)
 */
export function validateQuantity(quantity: number): ValidationResult {
  const errors: string[] = [];
  
  if (typeof quantity !== 'number' || isNaN(quantity)) {
    errors.push('Quantity must be a valid number');
  } else if (quantity < 0) {
    errors.push('Quantity cannot be negative');
  } else if (!Number.isInteger(quantity)) {
    errors.push('Quantity must be a whole number');
  } else if (quantity > 999999) {
    errors.push('Quantity cannot exceed 999,999');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate price (must be positive number with max 2 decimal places)
 */
export function validatePrice(price: number): ValidationResult {
  const errors: string[] = [];
  
  if (typeof price !== 'number' || isNaN(price)) {
    errors.push('Price must be a valid number');
  } else if (price < 0) {
    errors.push('Price cannot be negative');
  } else if (price > 999999.99) {
    errors.push('Price cannot exceed 999,999.99');
  } else {
    // Check for max 2 decimal places
    const decimalPlaces = (price.toString().split('.')[1] || '').length;
    if (decimalPlaces > 2) {
      errors.push('Price cannot have more than 2 decimal places');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate location data
 */
export function validateLocationData(data: any): ValidationResult {
  const errors: string[] = [];
  
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    errors.push('Location name is required');
  } else if (data.name.length > 200) {
    errors.push('Location name must be 200 characters or less');
  }
  
  if (data.address && (typeof data.address !== 'string' || data.address.length > 500)) {
    errors.push('Address must be a string of 500 characters or less');
  }
  
  if (data.city && (typeof data.city !== 'string' || data.city.length > 100)) {
    errors.push('City must be a string of 100 characters or less');
  }
  
  if (data.state && (typeof data.state !== 'string' || data.state.length > 100)) {
    errors.push('State must be a string of 100 characters or less');
  }
  
  if (data.zipCode && (typeof data.zipCode !== 'string' || data.zipCode.length > 20)) {
    errors.push('Zip code must be a string of 20 characters or less');
  }
  
  if (data.country && (typeof data.country !== 'string' || data.country.length > 100)) {
    errors.push('Country must be a string of 100 characters or less');
  }
  
  if (data.phone && !validatePhoneNumber(data.phone).isValid) {
    errors.push('Invalid phone number format');
  }
  
  if (data.email && !validateEmail(data.email).isValid) {
    errors.push('Invalid email format');
  }
  
  if (data.taxRate !== undefined) {
    if (typeof data.taxRate !== 'number' || isNaN(data.taxRate)) {
      errors.push('Tax rate must be a valid number');
    } else if (data.taxRate < 0 || data.taxRate > 1) {
      errors.push('Tax rate must be between 0 and 1 (0% to 100%)');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Sanitize string input (remove potentially harmful characters)
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/['"]/g, '') // Remove quotes that could break SQL
    .substring(0, 1000); // Limit length
}

/**
 * Validate pagination parameters
 */
export function validatePaginationParams(params: any): ValidationResult {
  const errors: string[] = [];
  
  if (params.page !== undefined) {
    if (typeof params.page !== 'number' || !Number.isInteger(params.page) || params.page < 1) {
      errors.push('Page must be a positive integer');
    }
  }
  
  if (params.limit !== undefined) {
    if (typeof params.limit !== 'number' || !Number.isInteger(params.limit) || params.limit < 1 || params.limit > 100) {
      errors.push('Limit must be an integer between 1 and 100');
    }
  }
  
  if (params.sortOrder !== undefined) {
    if (!['asc', 'desc'].includes(params.sortOrder)) {
      errors.push('Sort order must be either "asc" or "desc"');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}