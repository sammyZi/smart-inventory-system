/**
 * Analytics and Reporting API Routes
 * Role-based analytics with tenant isolation
 */

import express from 'express'
import { requireRole, requirePermission, AuthenticatedRequest, applyRoleFilters } from '../../middleware/roleMiddleware'
import { AnalyticsService, ReportFilters, ExportOptions } from '../../services/analyticsService'

const router = express.Router()
const analyticsService = new AnalyticsService()

// Apply role requirement (ADMIN, MANAGER, or STAFF for basic metrics)
router.use(requireRole(['ADMIN', 'MANAGER', 'STAFF']))

/**
 * GET /analytics/dashboard
 * Get dashboard metrics with role-based filtering
 */
router.get('/dashboard', async (req: AuthenticatedRequest, res) => {
  try {
    const userContext = {
      userId: req.user!.id,
      role: req.user!.role,
      storeIds: req.user!.storeIds,
      permissions: req.user!.permissions,
      tenantId: req.user!.tenantId
    }

    const filters = {
      dateRange: {
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined
      }
    }

    const metrics = await analyticsService.getDashboardMetrics(userContext, filters)

    res.json({
      success: true,
      data: metrics,
      role: req.user!.role,
      scope: req.user!.role === 'ADMIN' ? 'all' : 'store'
    })
  } catch (error) {
    console.error('Dashboard metrics error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard metrics'
    })
  }
})

/**
 * GET /analytics/realtime
 * Get real-time metrics for live dashboards
 */
router.get('/realtime', async (req: AuthenticatedRequest, res) => {
  try {
    const userContext = {
      userId: req.user!.id,
      role: req.user!.role,
      storeIds: req.user!.storeIds,
      permissions: req.user!.permissions,
      tenantId: req.user!.tenantId
    }

    const metrics = await analyticsService.getRealtimeMetrics(userContext)

    res.json({
      success: true,
      data: metrics,
      timestamp: new Date(),
      role: req.user!.role
    })
  } catch (error) {
    console.error('Realtime metrics error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch realtime metrics'
    })
  }
})

/**
 * POST /analytics/reports
 * Generate custom reports with role-based access
 */
router.post('/reports', requirePermission('analytics', 'generateReports'), async (req: AuthenticatedRequest, res) => {
  try {
    const userContext = {
      userId: req.user!.id,
      role: req.user!.role,
      storeIds: req.user!.storeIds,
      permissions: req.user!.permissions,
      tenantId: req.user!.tenantId
    }

    const filters: ReportFilters = {
      dateRange: {
        startDate: new Date(req.body.startDate),
        endDate: new Date(req.body.endDate)
      },
      locationIds: req.body.locationIds,
      categoryIds: req.body.categoryIds,
      productIds: req.body.productIds,
      staffIds: req.body.staffIds,
      reportType: req.body.reportType
    }

    const report = await analyticsService.generateReport(userContext, filters)

    res.json({
      success: true,
      data: report,
      generatedBy: req.user!.role,
      generatedAt: new Date()
    })
  } catch (error) {
    console.error('Report generation error:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate report'
    })
  }
})

/**
 * POST /analytics/export
 * Export report data in various formats
 */
router.post('/export', requirePermission('analytics', 'exportData'), async (req: AuthenticatedRequest, res) => {
  try {
    const userContext = {
      userId: req.user!.id,
      role: req.user!.role,
      storeIds: req.user!.storeIds,
      permissions: req.user!.permissions,
      tenantId: req.user!.tenantId
    }

    const reportData = req.body.reportData
    const options: ExportOptions = {
      format: req.body.format || 'pdf',
      includeCharts: req.body.includeCharts || false,
      includeDetails: req.body.includeDetails || true,
      template: req.body.template
    }

    const exportBuffer = await analyticsService.exportReport(userContext, reportData, options)

    // Set appropriate headers for file download
    const filename = `report_${Date.now()}.${options.format}`
    const contentType = {
      'pdf': 'application/pdf',
      'excel': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'csv': 'text/csv'
    }[options.format]

    res.setHeader('Content-Type', contentType)
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.send(exportBuffer)
  } catch (error) {
    console.error('Export error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to export report'
    })
  }
})

/**
 * GET /analytics/sales
 * Sales analytics with role-based filtering
 */
router.get('/sales', requireRole(['ADMIN', 'MANAGER']), async (req: AuthenticatedRequest, res) => {
  try {
    const { period = '30d', groupBy = 'day' } = req.query

    // Mock sales analytics data
    const salesData = {
      period,
      groupBy,
      role: req.user!.role,
      data: [
        { date: '2024-01-01', sales: 5000, transactions: 125 },
        { date: '2024-01-02', sales: 5500, transactions: 140 },
        { date: '2024-01-03', sales: 4800, transactions: 118 }
      ],
      summary: {
        totalSales: req.user!.role === 'ADMIN' ? 245000 : 45000,
        totalTransactions: req.user!.role === 'ADMIN' ? 6125 : 1150,
        averageOrderValue: 40.0,
        growth: 15.2
      }
    }

    res.json({
      success: true,
      data: salesData
    })
  } catch (error) {
    console.error('Sales analytics error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sales analytics'
    })
  }
})

/**
 * GET /analytics/inventory
 * Inventory analytics with role-based filtering
 */
router.get('/inventory', requireRole(['ADMIN', 'MANAGER']), async (req: AuthenticatedRequest, res) => {
  try {
    const inventoryData = {
      role: req.user!.role,
      summary: {
        totalProducts: req.user!.role === 'ADMIN' ? 2500 : 450,
        lowStockItems: req.user!.role === 'ADMIN' ? 125 : 23,
        inventoryValue: req.user!.role === 'ADMIN' ? 850000 : 125000,
        turnoverRate: 4.2
      },
      categories: [
        { name: 'Electronics', value: 45000, percentage: 35 },
        { name: 'Clothing', value: 32000, percentage: 25 },
        { name: 'Food & Beverage', value: 28000, percentage: 22 },
        { name: 'Other', value: 20000, percentage: 18 }
      ],
      lowStockAlerts: [
        { productId: '1', name: 'Product A', currentStock: 5, minThreshold: 10 },
        { productId: '2', name: 'Product B', currentStock: 2, minThreshold: 15 }
      ]
    }

    res.json({
      success: true,
      data: inventoryData
    })
  } catch (error) {
    console.error('Inventory analytics error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch inventory analytics'
    })
  }
})

/**
 * GET /analytics/staff
 * Staff performance analytics (ADMIN and MANAGER only)
 */
router.get('/staff', requireRole(['ADMIN', 'MANAGER']), async (req: AuthenticatedRequest, res) => {
  try {
    const staffData = {
      role: req.user!.role,
      summary: {
        totalStaff: req.user!.role === 'ADMIN' ? 45 : 8,
        activeStaff: req.user!.role === 'ADMIN' ? 32 : 6,
        averagePerformance: 4.2,
        averageServiceTime: 3.8
      },
      performance: [
        {
          staffId: '1',
          name: 'John Smith',
          sales: 8500,
          transactions: 215,
          serviceTime: 3.2,
          rating: 4.8,
          storeId: req.user!.storeIds[0]
        },
        {
          staffId: '2',
          name: 'Sarah Johnson',
          sales: 7200,
          transactions: 180,
          serviceTime: 4.1,
          rating: 4.6,
          storeId: req.user!.storeIds[0]
        }
      ]
    }

    res.json({
      success: true,
      data: staffData
    })
  } catch (error) {
    console.error('Staff analytics error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch staff analytics'
    })
  }
})

/**
 * GET /analytics/financial
 * Financial analytics (ADMIN only)
 */
router.get('/financial', requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const financialData = {
      summary: {
        revenue: 245000,
        profit: 73500,
        expenses: 171500,
        profitMargin: 30.0,
        growth: 18.5
      },
      breakdown: {
        revenue: [
          { source: 'Product Sales', amount: 220000, percentage: 89.8 },
          { source: 'Services', amount: 15000, percentage: 6.1 },
          { source: 'Other', amount: 10000, percentage: 4.1 }
        ],
        expenses: [
          { category: 'Cost of Goods', amount: 140000, percentage: 81.6 },
          { category: 'Staff Salaries', amount: 20000, percentage: 11.7 },
          { category: 'Rent & Utilities', amount: 8000, percentage: 4.7 },
          { category: 'Other', amount: 3500, percentage: 2.0 }
        ]
      },
      trends: [
        { month: 'Jan', revenue: 200000, profit: 60000 },
        { month: 'Feb', revenue: 220000, profit: 66000 },
        { month: 'Mar', revenue: 245000, profit: 73500 }
      ]
    }

    res.json({
      success: true,
      data: financialData
    })
  } catch (error) {
    console.error('Financial analytics error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch financial analytics'
    })
  }
})

/**
 * GET /analytics/cross-tenant (ADMIN only)
 * Cross-tenant analytics for platform administrators
 */
router.get('/cross-tenant', requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    // Only platform administrators should access this
    // Additional validation could be added here
    
    const crossTenantData = {
      platformSummary: {
        totalTenants: 25,
        activeTenants: 23,
        totalRevenue: 1250000,
        totalTransactions: 45000
      },
      tenantPerformance: [
        { tenantId: '1', name: 'Business A', revenue: 245000, growth: 18.5 },
        { tenantId: '2', name: 'Business B', revenue: 180000, growth: 12.3 },
        { tenantId: '3', name: 'Business C', revenue: 320000, growth: 25.1 }
      ],
      platformMetrics: {
        averageRevenuePerTenant: 50000,
        topPerformingTenant: 'Business C',
        systemUptime: 99.9,
        totalUsers: 450
      }
    }

    res.json({
      success: true,
      data: crossTenantData,
      note: 'Platform-level analytics - ADMIN access only'
    })
  } catch (error) {
    console.error('Cross-tenant analytics error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cross-tenant analytics'
    })
  }
})

export default router