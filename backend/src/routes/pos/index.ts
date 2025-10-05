/**
 * Point of Sale routes for ADMIN, MANAGER, and STAFF roles
 * Billing and transaction processing
 */

import express from 'express'
import { requireRole, requirePermission, enforceStoreAccess, AuthenticatedRequest } from '../../middleware/roleMiddleware'

const router = express.Router()

// Apply role requirement (ADMIN, MANAGER, or STAFF)
router.use(requireRole(['ADMIN', 'MANAGER', 'STAFF']))

// Product Search for POS (all roles can search products)
router.get('/products/search', async (req: AuthenticatedRequest, res) => {
  try {
    const { query, storeId } = req.query
    const userRole = req.user?.role

    // Filter product data based on role
    const productData = {
      id: '1',
      name: 'Sample Product',
      price: 29.99,
      // Cost price only visible to ADMIN and MANAGER
      ...(userRole !== 'STAFF' && userRole !== 'CUSTOMER' && { cost: 19.99 }),
      availability: true,
      stock: userRole === 'STAFF' ? 'Available' : 25 // Staff only sees availability
    }

    res.json({ 
      message: 'Product search results',
      query,
      storeId,
      role: userRole,
      products: [productData]
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to search products' })
  }
})

// Process Sale (all roles can process sales)
router.post('/transactions', requirePermission('sales', 'processSale'), async (req: AuthenticatedRequest, res) => {
  try {
    const transactionData = req.body
    const userRole = req.user?.role

    res.json({ 
      message: 'Transaction processed',
      transactionId: 'TXN-' + Date.now(),
      data: transactionData,
      processedBy: userRole,
      timestamp: new Date()
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to process transaction' })
  }
})

// Apply Discount (role-based discount levels)
router.post('/transactions/:transactionId/discount', async (req: AuthenticatedRequest, res) => {
  try {
    const { transactionId } = req.params
    const { discountType, amount } = req.body
    const userRole = req.user?.role

    let maxDiscount = 0
    let discountLevel = 'none'

    switch (userRole) {
      case 'ADMIN':
        maxDiscount = 100 // No limit
        discountLevel = 'custom'
        break
      case 'MANAGER':
        maxDiscount = 25 // Up to 25%
        discountLevel = 'limited'
        break
      case 'STAFF':
        maxDiscount = 10 // Pre-approved discounts only
        discountLevel = 'preapproved'
        break
      default:
        return res.status(403).json({ error: 'Cannot apply discounts' })
    }

    if (amount > maxDiscount && userRole !== 'ADMIN') {
      return res.status(403).json({ 
        error: 'Discount exceeds maximum allowed',
        maxAllowed: maxDiscount,
        requested: amount
      })
    }

    res.json({ 
      message: 'Discount applied',
      transactionId,
      discountType,
      amount,
      appliedBy: userRole,
      discountLevel,
      maxAllowed: maxDiscount
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to apply discount' })
  }
})

// Process Refund (role-based refund permissions)
router.post('/transactions/:transactionId/refund', async (req: AuthenticatedRequest, res) => {
  try {
    const { transactionId } = req.params
    const refundData = req.body
    const userRole = req.user?.role

    if (userRole === 'STAFF') {
      return res.status(403).json({ 
        error: 'Staff cannot process refunds',
        message: 'Please call manager for refund assistance'
      })
    }

    res.json({ 
      message: 'Refund processed',
      transactionId,
      data: refundData,
      processedBy: userRole,
      refundLevel: userRole === 'ADMIN' ? 'full' : 'manager'
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to process refund' })
  }
})

// View Transactions (role-based visibility)
router.get('/transactions', async (req: AuthenticatedRequest, res) => {
  try {
    const { storeId, dateRange } = req.query
    const userRole = req.user?.role
    const userId = req.user?.id

    let transactionScope = 'none'
    let message = ''

    switch (userRole) {
      case 'ADMIN':
        transactionScope = 'all'
        message = 'All transactions across all stores'
        break
      case 'MANAGER':
        transactionScope = 'store'
        message = 'Transactions for managed stores'
        break
      case 'STAFF':
        transactionScope = 'own'
        message = 'Own transactions only'
        break
      default:
        return res.status(403).json({ error: 'Cannot view transactions' })
    }

    res.json({ 
      message,
      scope: transactionScope,
      storeId,
      dateRange,
      role: userRole,
      userId: transactionScope === 'own' ? userId : undefined
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transactions' })
  }
})

// Generate Receipt (all roles can generate receipts)
router.post('/receipts/:transactionId', async (req: AuthenticatedRequest, res) => {
  try {
    const { transactionId } = req.params
    const { format } = req.body // 'pdf', 'thermal', 'email'

    res.json({ 
      message: 'Receipt generated',
      transactionId,
      format,
      generatedBy: req.user?.role,
      receiptUrl: `/receipts/${transactionId}.${format}`
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate receipt' })
  }
})

// Payment Processing (all roles can process payments)
router.post('/payments', async (req: AuthenticatedRequest, res) => {
  try {
    const paymentData = req.body
    const { method, amount, transactionId } = paymentData

    res.json({ 
      message: 'Payment processed',
      paymentId: 'PAY-' + Date.now(),
      method,
      amount,
      transactionId,
      processedBy: req.user?.role,
      status: 'completed'
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to process payment' })
  }
})

// Manager Assistance (for staff to call manager)
router.post('/manager-assistance', requireRole(['STAFF']), async (req: AuthenticatedRequest, res) => {
  try {
    const { reason, transactionId, storeId } = req.body

    res.json({ 
      message: 'Manager assistance requested',
      reason,
      transactionId,
      storeId,
      requestedBy: req.user?.id,
      timestamp: new Date(),
      status: 'pending'
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to request manager assistance' })
  }
})

export default router