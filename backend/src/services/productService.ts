/**
 * Product Service
 * Handles all product catalog operations including CRUD, search, and tracking codes
 */

import { PrismaClient, Product, StockLevel } from '@prisma/client';
import { 
  CreateProductInput, 
  UpdateProductInput, 
  ProductSearchQuery, 
  ProductWithStock,
  PaginationParams,
  PaginatedResponse 
} from '../types/database';
// import { FirestoreService } from '../config/firestore'; // Disabled for now
import { logger } from '../utils/logger';
import { generateTrackingCodes } from '../utils/trackingCodes';
import { validateProductData } from '../utils/validation';
import { AuditService } from './auditService';

const prisma = new PrismaClient();

export class ProductService {
  /**
   * Create a new product
   */
  static async createProduct(
    productData: CreateProductInput,
    userId: string
  ): Promise<Product> {
    try {
      // Validate input data
      const validationResult = validateProductData(productData);
      if (!validationResult.isValid) {
        throw new Error(`Validation failed: ${validationResult.errors.join(', ')}`);
      }

      // Check if SKU already exists
      const existingProduct = await prisma.product.findUnique({
        where: { sku: productData.sku }
      });

      if (existingProduct) {
        throw new Error(`Product with SKU ${productData.sku} already exists`);
      }

      // Generate tracking codes if not provided
      const trackingCodes = productData.trackingCodes || await generateTrackingCodes(productData.sku);

      // Create product
      const product = await prisma.product.create({
        data: {
          ...productData,
          trackingCodes,
          images: productData.images || [],
        }
      });

      // Sync to Firestore for real-time updates (disabled for now)
      // try {
      //   await FirestoreService.syncProduct(product);
      // } catch (firestoreError) {
      //   logger.warn('Failed to sync product to Firestore:', firestoreError);
      // }

      // Log audit trail
      await AuditService.logAction({
        userId,
        action: 'CREATE',
        resource: 'product',
        resourceId: product.id,
        newValues: product,
      });

      logger.info(`Product created: ${product.sku} - ${product.name}`);
      return product;

    } catch (error) {
      logger.error('Error creating product:', error);
      throw error;
    }
  }

  /**
   * Get product by ID
   */
  static async getProductById(id: string): Promise<Product | null> {
    try {
      const product = await prisma.product.findUnique({
        where: { id, isActive: true }
      });

      return product;
    } catch (error) {
      logger.error(`Error fetching product ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get product by SKU
   */
  static async getProductBySku(sku: string): Promise<Product | null> {
    try {
      const product = await prisma.product.findUnique({
        where: { sku, isActive: true }
      });

      return product;
    } catch (error) {
      logger.error(`Error fetching product by SKU ${sku}:`, error);
      throw error;
    }
  }

  /**
   * Get product with stock levels
   */
  static async getProductWithStock(id: string, locationId?: string): Promise<ProductWithStock | null> {
    try {
      const product = await prisma.product.findUnique({
        where: { id, isActive: true },
        include: {
          stockLevels: locationId ? {
            where: { locationId }
          } : true
        }
      });

      return product as ProductWithStock | null;
    } catch (error) {
      logger.error(`Error fetching product with stock ${id}:`, error);
      throw error;
    }
  }

  /**
   * Update product
   */
  static async updateProduct(
    id: string,
    updateData: UpdateProductInput,
    userId: string
  ): Promise<Product> {
    try {
      // Get existing product for audit trail
      const existingProduct = await prisma.product.findUnique({
        where: { id }
      });

      if (!existingProduct) {
        throw new Error(`Product with ID ${id} not found`);
      }

      // Validate update data
      if (updateData.sku && updateData.sku !== existingProduct.sku) {
        const existingBySku = await prisma.product.findUnique({
          where: { sku: updateData.sku }
        });

        if (existingBySku) {
          throw new Error(`Product with SKU ${updateData.sku} already exists`);
        }
      }

      // Update product
      const updatedProduct = await prisma.product.update({
        where: { id },
        data: {
          ...updateData,
          updatedAt: new Date(),
        }
      });

      // Sync to Firestore (disabled for now)
      // try {
      //   await FirestoreService.syncProduct(updatedProduct);
      // } catch (firestoreError) {
      //   logger.warn('Failed to sync updated product to Firestore:', firestoreError);
      // }

      // Log audit trail
      await AuditService.logAction({
        userId,
        action: 'UPDATE',
        resource: 'product',
        resourceId: id,
        oldValues: existingProduct,
        newValues: updatedProduct,
      });

      logger.info(`Product updated: ${updatedProduct.sku} - ${updatedProduct.name}`);
      return updatedProduct;

    } catch (error) {
      logger.error(`Error updating product ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete product (soft delete)
   */
  static async deleteProduct(id: string, userId: string): Promise<void> {
    try {
      const existingProduct = await prisma.product.findUnique({
        where: { id }
      });

      if (!existingProduct) {
        throw new Error(`Product with ID ${id} not found`);
      }

      // Check if product has stock levels
      const stockLevels = await prisma.stockLevel.findMany({
        where: { productId: id, quantity: { gt: 0 } }
      });

      if (stockLevels.length > 0) {
        throw new Error('Cannot delete product with existing stock. Please transfer or adjust stock to zero first.');
      }

      // Soft delete
      await prisma.product.update({
        where: { id },
        data: { isActive: false, updatedAt: new Date() }
      });

      // Log audit trail
      await AuditService.logAction({
        userId,
        action: 'DELETE',
        resource: 'product',
        resourceId: id,
        oldValues: existingProduct,
      });

      logger.info(`Product deleted: ${existingProduct.sku} - ${existingProduct.name}`);

    } catch (error) {
      logger.error(`Error deleting product ${id}:`, error);
      throw error;
    }
  }

  /**
   * Search products with filters and pagination
   */
  static async searchProducts(
    query: ProductSearchQuery,
    pagination: PaginationParams = {}
  ): Promise<PaginatedResponse<Product>> {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'name',
        sortOrder = 'asc'
      } = pagination;

      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = {
        isActive: query.isActive !== undefined ? query.isActive : true,
      };

      if (query.query) {
        where.OR = [
          { name: { contains: query.query, mode: 'insensitive' } },
          { description: { contains: query.query, mode: 'insensitive' } },
          { sku: { contains: query.query, mode: 'insensitive' } },
          { category: { contains: query.query, mode: 'insensitive' } },
          { brand: { contains: query.query, mode: 'insensitive' } },
        ];
      }

      if (query.category) {
        where.category = { contains: query.category, mode: 'insensitive' };
      }

      if (query.brand) {
        where.brand = { contains: query.brand, mode: 'insensitive' };
      }

      if (query.minPrice !== undefined) {
        where.price = { ...where.price, gte: query.minPrice };
      }

      if (query.maxPrice !== undefined) {
        where.price = { ...where.price, lte: query.maxPrice };
      }

      // Execute search with pagination
      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: query.locationId ? {
            stockLevels: {
              where: { locationId: query.locationId }
            }
          } : undefined
        }),
        prisma.product.count({ where })
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        data: products,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        }
      };

    } catch (error) {
      logger.error('Error searching products:', error);
      throw error;
    }
  }

  /**
   * Get products by category
   */
  static async getProductsByCategory(
    category: string,
    pagination: PaginationParams = {}
  ): Promise<PaginatedResponse<Product>> {
    return this.searchProducts({ category }, pagination);
  }

  /**
   * Get low stock products
   */
  static async getLowStockProducts(locationId?: string): Promise<ProductWithStock[]> {
    try {
      const where: any = {
        isActive: true,
        stockLevels: {
          some: {
            ...(locationId && { locationId }),
            OR: [
              { quantity: { lte: prisma.stockLevel.fields.minThreshold } },
              { quantity: 0 }
            ]
          }
        }
      };

      const products = await prisma.product.findMany({
        where,
        include: {
          stockLevels: locationId ? {
            where: { locationId }
          } : true
        }
      });

      return products as ProductWithStock[];

    } catch (error) {
      logger.error('Error fetching low stock products:', error);
      throw error;
    }
  }

  /**
   * Bulk create products
   */
  static async bulkCreateProducts(
    productsData: CreateProductInput[],
    userId: string
  ): Promise<Product[]> {
    try {
      const createdProducts: Product[] = [];

      // Process in batches to avoid overwhelming the database
      const batchSize = 10;
      for (let i = 0; i < productsData.length; i += batchSize) {
        const batch = productsData.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (productData) => {
          try {
            return await this.createProduct(productData, userId);
          } catch (error) {
            logger.error(`Failed to create product ${productData.sku}:`, error);
            throw error;
          }
        });

        const batchResults = await Promise.all(batchPromises);
        createdProducts.push(...batchResults);
      }

      logger.info(`Bulk created ${createdProducts.length} products`);
      return createdProducts;

    } catch (error) {
      logger.error('Error in bulk product creation:', error);
      throw error;
    }
  }

  /**
   * Get product categories
   */
  static async getCategories(): Promise<string[]> {
    try {
      const categories = await prisma.product.findMany({
        where: { isActive: true },
        select: { category: true },
        distinct: ['category']
      });

      return categories.map(c => c.category).filter(Boolean).sort();

    } catch (error) {
      logger.error('Error fetching categories:', error);
      throw error;
    }
  }

  /**
   * Get product brands
   */
  static async getBrands(): Promise<string[]> {
    try {
      const brands = await prisma.product.findMany({
        where: { isActive: true, brand: { not: null } },
        select: { brand: true },
        distinct: ['brand']
      });

      return brands.map(b => b.brand).filter(Boolean).sort();

    } catch (error) {
      logger.error('Error fetching brands:', error);
      throw error;
    }
  }

  /**
   * Find product by tracking code
   */
  static async findByTrackingCode(
    code: string,
    codeType: 'qr' | 'rfid' | 'nfc' | 'barcode'
  ): Promise<Product | null> {
    try {
      const products = await prisma.product.findMany({
        where: {
          isActive: true,
          trackingCodes: {
            path: [codeType],
            equals: code
          }
        }
      });

      return products[0] || null;

    } catch (error) {
      logger.error(`Error finding product by ${codeType} code ${code}:`, error);
      throw error;
    }
  }

  /**
   * Update product images
   */
  static async updateProductImages(
    id: string,
    images: string[],
    userId: string
  ): Promise<Product> {
    try {
      const updatedProduct = await prisma.product.update({
        where: { id },
        data: { 
          images,
          updatedAt: new Date()
        }
      });

      // Log audit trail
      await AuditService.logAction({
        userId,
        action: 'UPDATE',
        resource: 'product_images',
        resourceId: id,
        newValues: { images },
      });

      logger.info(`Product images updated for: ${updatedProduct.sku}`);
      return updatedProduct;

    } catch (error) {
      logger.error(`Error updating product images ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get product statistics
   */
  static async getProductStats(): Promise<{
    totalProducts: number;
    activeProducts: number;
    totalCategories: number;
    totalBrands: number;
    lowStockCount: number;
  }> {
    try {
      const [
        totalProducts,
        activeProducts,
        categories,
        brands,
        lowStockProducts
      ] = await Promise.all([
        prisma.product.count(),
        prisma.product.count({ where: { isActive: true } }),
        this.getCategories(),
        this.getBrands(),
        this.getLowStockProducts()
      ]);

      return {
        totalProducts,
        activeProducts,
        totalCategories: categories.length,
        totalBrands: brands.length,
        lowStockCount: lowStockProducts.length,
      };

    } catch (error) {
      logger.error('Error fetching product statistics:', error);
      throw error;
    }
  }
}