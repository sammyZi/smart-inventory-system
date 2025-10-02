/**
 * Product Routes
 * API endpoints for product catalog management
 */

import express, { Request, Response } from 'express';
import { ProductService } from '../services/productService';
import { authenticateJWT } from '../middleware/auth';
import { tenantAuth } from '../middleware/tenantAuth';
import { validateRequest } from '../middleware/validation';
import { auditCustomAction } from '../middleware/auditLogger';
import { apiRateLimit } from '../middleware/rateLimiter';
import { 
  CreateProductInput, 
  UpdateProductInput, 
  ProductSearchQuery,
  PaginationParams 
} from '../types/database';
import { logger } from '../utils/logger';
import { parseTrackingCode } from '../utils/trackingCodes';
import multer from 'multer';
import path from 'path';

const router = express.Router();

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/products/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 10 // Max 10 files
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Apply middleware to all routes
router.use(authenticateJWT);

/**
 * GET /api/products
 * Search and list products with pagination and filters
 */
router.get('/', apiRateLimit, async (req: Request, res: Response) => {
  try {
    const query: ProductSearchQuery = {
      query: req.query.q as string,
      category: req.query.category as string,
      brand: req.query.brand as string,
      minPrice: req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined,
      maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined,
      isActive: req.query.isActive ? req.query.isActive === 'true' : undefined,
      locationId: req.query.locationId as string,
    };

    const pagination: PaginationParams = {
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      sortBy: req.query.sortBy as string || 'name',
      sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'asc',
    };

    const result = await ProductService.searchProducts(query, pagination);

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });

  } catch (error) {
    logger.error('Error searching products:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search products',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/products/stats
 * Get product statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await ProductService.getProductStats();

    res.json({
      success: true,
      data: stats,
    });

  } catch (error) {
    logger.error('Error fetching product stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch product statistics',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/products/categories
 * Get all product categories
 */
router.get('/categories', async (req: Request, res: Response) => {
  try {
    const categories = await ProductService.getCategories();

    res.json({
      success: true,
      data: categories,
    });

  } catch (error) {
    logger.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch categories',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/products/brands
 * Get all product brands
 */
router.get('/brands', async (req: Request, res: Response) => {
  try {
    const brands = await ProductService.getBrands();

    res.json({
      success: true,
      data: brands,
    });

  } catch (error) {
    logger.error('Error fetching brands:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch brands',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/products/low-stock
 * Get products with low stock levels
 */
router.get('/low-stock', async (req: Request, res: Response) => {
  try {
    const locationId = req.query.locationId as string;
    const products = await ProductService.getLowStockProducts(locationId);

    res.json({
      success: true,
      data: products,
    });

  } catch (error) {
    logger.error('Error fetching low stock products:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch low stock products',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/products/scan/:code
 * Find product by tracking code (QR, barcode, RFID, NFC)
 */
router.get('/scan/:code', async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const decodedCode = decodeURIComponent(code);
    
    // Parse the tracking code to determine its type
    const parseResult = parseTrackingCode(decodedCode);
    
    if (!parseResult.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid tracking code',
        message: parseResult.error,
      });
    }

    let product = null;

    // Try to find product by the detected code type
    if (parseResult.type === 'qr' && parseResult.data?.sku) {
      product = await ProductService.getProductBySku(parseResult.data.sku);
    } else {
      // Try all tracking code types
      for (const codeType of ['qr', 'rfid', 'nfc', 'barcode'] as const) {
        product = await ProductService.findByTrackingCode(decodedCode, codeType);
        if (product) break;
      }
    }

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found',
        message: 'No product found with the provided tracking code',
      });
    }

    res.json({
      success: true,
      data: product,
      codeType: parseResult.type,
    });

  } catch (error) {
    logger.error('Error scanning product:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to scan product',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/products/:id
 * Get product by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const includeStock = req.query.includeStock === 'true';
    const locationId = req.query.locationId as string;

    let product;
    if (includeStock) {
      product = await ProductService.getProductWithStock(id, locationId);
    } else {
      product = await ProductService.getProductById(id);
    }

    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found',
        message: `Product with ID ${id} not found`,
      });
    }

    res.json({
      success: true,
      data: product,
    });

  } catch (error) {
    logger.error(`Error fetching product ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch product',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/products
 * Create a new product
 */
router.post('/', validateRequest, async (req: Request, res: Response) => {
  try {
    const productData: CreateProductInput = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    const product = await ProductService.createProduct(productData, userId);

    res.status(201).json({
      success: true,
      data: product,
      message: 'Product created successfully',
    });

  } catch (error) {
    logger.error('Error creating product:', error);
    
    if (error instanceof Error && error.message.includes('already exists')) {
      return res.status(409).json({
        success: false,
        error: 'Product already exists',
        message: error.message,
      });
    }

    if (error instanceof Error && error.message.includes('Validation failed')) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create product',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/products/bulk
 * Create multiple products in bulk
 */
router.post('/bulk', validateRequest, async (req: Request, res: Response) => {
  try {
    const productsData: CreateProductInput[] = req.body.products;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    if (!Array.isArray(productsData) || productsData.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid input',
        message: 'Products array is required and cannot be empty',
      });
    }

    if (productsData.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Too many products',
        message: 'Cannot create more than 100 products at once',
      });
    }

    const products = await ProductService.bulkCreateProducts(productsData, userId);

    res.status(201).json({
      success: true,
      data: products,
      message: `${products.length} products created successfully`,
    });

  } catch (error) {
    logger.error('Error in bulk product creation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create products',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * PUT /api/products/:id
 * Update product
 */
router.put('/:id', validateRequest, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData: UpdateProductInput = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    const product = await ProductService.updateProduct(id, updateData, userId);

    res.json({
      success: true,
      data: product,
      message: 'Product updated successfully',
    });

  } catch (error) {
    logger.error(`Error updating product ${req.params.id}:`, error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Product not found',
        message: error.message,
      });
    }

    if (error instanceof Error && error.message.includes('already exists')) {
      return res.status(409).json({
        success: false,
        error: 'SKU conflict',
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update product',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/products/:id/images
 * Upload product images
 */
router.post('/:id/images', upload.array('images', 10), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const files = req.files as Express.Multer.File[];

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No images provided',
      });
    }

    // Generate image URLs (in production, these would be uploaded to cloud storage)
    const imageUrls = files.map(file => `/uploads/products/${file.filename}`);

    const product = await ProductService.updateProductImages(id, imageUrls, userId);

    res.json({
      success: true,
      data: product,
      message: `${files.length} images uploaded successfully`,
    });

  } catch (error) {
    logger.error(`Error uploading images for product ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload images',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * DELETE /api/products/:id
 * Delete product (soft delete)
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    await ProductService.deleteProduct(id, userId);

    res.json({
      success: true,
      message: 'Product deleted successfully',
    });

  } catch (error) {
    logger.error(`Error deleting product ${req.params.id}:`, error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: 'Product not found',
        message: error.message,
      });
    }

    if (error instanceof Error && error.message.includes('existing stock')) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete product',
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to delete product',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;