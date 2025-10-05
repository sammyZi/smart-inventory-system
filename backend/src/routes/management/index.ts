/**
 * Management routes for ADMIN and MANAGER roles
 * Store-level operations and staff management
 */

import express from 'express'
import { requireRole, requirePermission, enforceStoreAccess, AuthenticatedRequest } from '../../middleware/roleMiddleware'

const router = express.Router()

// Apply role requirement (ADMIN or MANAGER)
router.use(requireRole(['ADMIN', 'MANAGER']))

// Product Management Routes
router.get('/products', requirePermission('products', 'read'), async (req: AuthenticatedRequest, res) => {
  try {
    // Get products with role-based filtering
    const { storeId } = req.query
    res.json({ 
      message: 'Products endpoint',
      role: req.user?.role,
      storeId,
      canDelete: req.user?.role === 'ADMIN'
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products' })
  }
})

router.post('/products', requirePermission('products', 'create'), async (req: AuthenticatedRequest, res) => {
  try {
    // Create new product
    const productData = req.body
    res.json({ 
      message: 'Product created',
      data: productData,
      createdBy: req.user?.role
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to create product' })
  }
})

router.put('/products/:productId', requirePermission('products', 'update'), async (req: AuthenticatedRequest, res) => {
  try {
    // Update product
    const { productId } = req.params
    const updates = req.body
    res.json({ 
      message: 'Product updated',
      productId,
      updates,
      updatedBy: req.user?.role
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to update product' })
  }
})

// Delete product (ADMIN only)
router.delete('/products/:productId', requireRole(['ADMIN']), requirePermission('products', 'delete'), async (req: AuthenticatedRequest, res) => {
  try {
    const { productId } = req.params
    res.json({ 
      message: 'Product deleted (ADMIN only)',
      productId,
      deletedBy: req.user?.role
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete product' })
  }
})

// Inventory Management Routes
router.get('/inventory/:storeId', enforceStoreAccess(), requirePermission('inventory', 'viewLevels'), async (req: AuthenticatedRequest, res) => {
  try {
    const { storeId } = req.params
    res.json({ 
      message: 'Store inventory',
      storeId,
      role: req.user?.role,
      viewLevel: req.user?.role === 'ADMIN' ? 'all' : 'store'
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch inventory' })
  }
})

router.post('/inventory/:storeId/stock-in', enforceStoreAccess(), requirePermission('inventory', 'stockIn'), async (req: AuthenticatedRequest, res) => {
  try {
    const { storeId } = req.params
    const stockData = req.body
    res.json({ 
      message: 'Stock added',
      storeId,
      data: stockData,
      addedBy: req.user?.role
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to add stock' })
  }
})

router.post('/inventory/:storeId/stock-out', enforceStoreAccess(), requirePermission('inventory', 'stockOut'), async (req: AuthenticatedRequest, res) => {
  try {
    const { storeId } = req.params
    const stockData = req.body
    res.json({ 
      message: 'Stock removed',
      storeId,
      data: stockData,
      removedBy: req.user?.role
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove stock' })
  }
})

router.post('/inventory/:storeId/adjustment', enforceStoreAccess(), requirePermission('inventory', 'stockAdjustment'), async (req: AuthenticatedRequest, res) => {
  try {
    const { storeId } = req.params
    const adjustmentData = req.body
    res.json({ 
      message: 'Stock adjusted',
      storeId,
      data: adjustmentData,
      adjustedBy: req.user?.role
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to adjust stock' })
  }
})

// Stock transfer (different permissions for ADMIN vs MANAGER)
router.post('/inventory/transfer', async (req: AuthenticatedRequest, res) => {
  try {
    const { fromStoreId, toStoreId } = req.body
    const userRole = req.user?.role

    if (userRole === 'ADMIN') {
      // Admin can transfer directly
      res.json({ 
        message: 'Stock transfer completed (ADMIN)',
        fromStoreId,
        toStoreId,
        status: 'completed'
      })
    } else if (userRole === 'MANAGER') {
      // Manager creates transfer request
      res.json({ 
        message: 'Stock transfer request created (MANAGER)',
        fromStoreId,
        toStoreId,
        status: 'pending_approval'
      })
    } else {
      res.status(403).json({ error: 'Insufficient permissions for stock transfer' })
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to process stock transfer' })
  }
})

// Staff Management Routes (ADMIN and MANAGER)
router.get('/staff/:storeId', enforceStoreAccess(), async (req: AuthenticatedRequest, res) => {
  try {
    const { storeId } = req.params
    res.json({ 
      message: 'Store staff',
      storeId,
      role: req.user?.role,
      canManage: ['ADMIN', 'MANAGER'].includes(req.user?.role || '')
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch staff' })
  }
})

router.post('/staff/:storeId', enforceStoreAccess(), requirePermission('users', 'createStaff'), async (req: AuthenticatedRequest, res) => {
  try {
    const { storeId } = req.params
    const staffData = req.body
    res.json({ 
      message: 'Staff member added',
      storeId,
      data: staffData,
      addedBy: req.user?.role
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to add staff member' })
  }
})

// Reports (store-specific for managers, all stores for admin)
router.get('/reports/:storeId', enforceStoreAccess(), requirePermission('analytics', 'generateReports'), async (req: AuthenticatedRequest, res) => {
  try {
    const { storeId } = req.params
    const { type, dateRange } = req.query
    
    res.json({ 
      message: 'Store reports',
      storeId,
      type,
      dateRange,
      role: req.user?.role,
      financialAccess: req.user?.role === 'ADMIN' ? 'complete' : 'limited'
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate reports' })
  }
})

export default router