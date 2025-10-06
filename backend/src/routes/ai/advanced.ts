/**
 * Advanced AI Routes - Multi-Tenant AI Features and Automation
 * Seasonal trends, automated reorders, and intelligent recommendations
 */

import express from 'express'
import { requireRole, AuthenticatedRequest } from '../../middleware/roleMiddleware'
import { AdvancedAIService } from '../../services/advancedAIService'

const router = express.Router()
const advancedAI = new AdvancedAIService()

/**
 * POST /ai/advanced/seasonal-trends
 * Detect seasonal trends (ADMIN only)
 */
router.post('/seasonal-trends', requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const userContext = {
      userId: req.user!.id,
      role: req.user!.role,
      storeIds: req.user!.storeIds,
      permissions: req.user!.permissions,
      tenantId: req.user!.tenantId
    }

    const { productIds, categoryIds, storeIds, timeRange } = req.body

    const options = {
      productIds,
      categoryIds,
      storeIds,
      timeRange: timeRange || 'last_year'
    }

    const trends = await advancedAI.detectSeasonalTrends(userContext, options)

    res.json({
      success: true,
      data: trends,
      count: trends.length,
      analyzedBy: userContext.role,
      analyzedAt: new Date()
    })
  } catch (error: any) {
    console.error('Seasonal trends error:', error)
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to detect seasonal trends'
    })
  }
})

/**
 * POST /ai/advanced/reorder-recommendations
 * Generate automated reorder recommendations (ADMIN/MANAGER)
 */
router.post('/reorder-recommendations', requireRole(['ADMIN', 'MANAGER']), async (req: AuthenticatedRequest, res) => {
  try {
    const userContext = {
      userId: req.user!.id,
      role: req.user!.role,
      storeIds: req.user!.storeIds,
      permissions: req.user!.permissions,
      tenantId: req.user!.tenantId
    }

    const { storeIds, categoryIds, urgencyThreshold, includeSeasonalAdjustment } = req.body

    // Validate store access for managers
    if (userContext.role === 'MANAGER' && storeIds) {
      const unauthorizedStores = storeIds.filter((storeId: string) => 
        !userContext.storeIds.includes(storeId)
      )
      if (unauthorizedStores.length > 0) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to specified stores'
        })
      }
    }

    const options = {
      storeIds: userContext.role === 'MANAGER' ? userContext.storeIds : storeIds,
      categoryIds,
      urgencyThreshold,
      includeSeasonalAdjustment: includeSeasonalAdjustment !== false
    }

    const recommendations = await advancedAI.generateReorderRecommendations(userContext, options)

    res.json({
      success: true,
      data: recommendations,
      count: recommendations.length,
      urgentCount: recommendations.filter(r => r.urgency === 'CRITICAL' || r.urgency === 'HIGH').length,
      totalCost: recommendations.reduce((sum, r) => sum + r.costImpact.totalCost, 0),
      generatedBy: userContext.role,
      generatedAt: new Date()
    })
  } catch (error: any) {
    console.error('Reorder recommendations error:', error)
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to generate reorder recommendations'
    })
  }
})

/**
 * POST /ai/advanced/generate-purchase-orders
 * Generate purchase orders from recommendations (ADMIN/MANAGER)
 */
router.post('/generate-purchase-orders', requireRole(['ADMIN', 'MANAGER']), async (req: AuthenticatedRequest, res) => {
  try {
    const userContext = {
      userId: req.user!.id,
      role: req.user!.role,
      storeIds: req.user!.storeIds,
      permissions: req.user!.permissions,
      tenantId: req.user!.tenantId
    }

    const { recommendationIds, groupBySupplier, priorityThreshold, autoApprove } = req.body

    if (!recommendationIds || !Array.isArray(recommendationIds) || recommendationIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Recommendation IDs array is required'
      })
    }

    const options = {
      groupBySupplier: groupBySupplier !== false,
      priorityThreshold,
      autoApprove: autoApprove && userContext.role === 'ADMIN' // Only ADMIN can auto-approve
    }

    const purchaseOrders = await advancedAI.generatePurchaseOrders(userContext, recommendationIds, options)

    res.json({
      success: true,
      data: purchaseOrders,
      count: purchaseOrders.length,
      totalAmount: purchaseOrders.reduce((sum, po) => sum + po.totalAmount, 0),
      autoApproved: purchaseOrders.filter(po => po.status === 'APPROVED').length,
      generatedBy: userContext.role,
      generatedAt: new Date()
    })
  } catch (error: any) {
    console.error('Purchase order generation error:', error)
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to generate purchase orders'
    })
  }
})

/**
 * GET /ai/advanced/performance-alerts
 * Monitor model performance and get alerts (ADMIN only)
 */
router.get('/performance-alerts', requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const userContext = {
      userId: req.user!.id,
      role: req.user!.role,
      storeIds: req.user!.storeIds,
      permissions: req.user!.permissions,
      tenantId: req.user!.tenantId
    }

    const { modelIds } = req.query
    const modelIdArray = modelIds ? (modelIds as string).split(',') : undefined

    const alerts = await advancedAI.monitorModelPerformance(userContext, modelIdArray)

    // Group alerts by severity
    const alertsBySeverity = alerts.reduce((acc, alert) => {
      acc[alert.severity] = (acc[alert.severity] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    res.json({
      success: true,
      data: alerts,
      count: alerts.length,
      summary: {
        total: alerts.length,
        critical: alertsBySeverity.CRITICAL || 0,
        high: alertsBySeverity.HIGH || 0,
        medium: alertsBySeverity.MEDIUM || 0,
        low: alertsBySeverity.LOW || 0
      },
      monitoredBy: userContext.role,
      monitoredAt: new Date()
    })
  } catch (error: any) {
    console.error('Performance monitoring error:', error)
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to monitor model performance'
    })
  }
})

/**
 * POST /ai/advanced/ab-test
 * Create A/B test for model comparison (ADMIN only)
 */
router.post('/ab-test', requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const userContext = {
      userId: req.user!.id,
      role: req.user!.role,
      storeIds: req.user!.storeIds,
      permissions: req.user!.permissions,
      tenantId: req.user!.tenantId
    }

    const { name, description, modelA, modelB, trafficSplit, metrics, duration } = req.body

    if (!name || !modelA || !modelB) {
      return res.status(400).json({
        success: false,
        error: 'Name, modelA, and modelB are required'
      })
    }

    const testConfig = {
      name,
      description,
      modelA,
      modelB,
      trafficSplit: trafficSplit || 50,
      metrics: metrics || [
        { name: 'accuracy', target: 0.85, weight: 1.0 }
      ],
      duration: duration || 30
    }

    const abTest = await advancedAI.createABTest(userContext, testConfig)

    res.json({
      success: true,
      data: abTest,
      message: 'A/B test created successfully',
      createdBy: userContext.role,
      createdAt: new Date()
    })
  } catch (error: any) {
    console.error('A/B test creation error:', error)
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to create A/B test'
    })
  }
})

/**
 * POST /ai/advanced/ab-test/:testId/start
 * Start A/B test (ADMIN only)
 */
router.post('/ab-test/:testId/start', requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const userContext = {
      userId: req.user!.id,
      role: req.user!.role,
      storeIds: req.user!.storeIds,
      permissions: req.user!.permissions,
      tenantId: req.user!.tenantId
    }

    const { testId } = req.params

    const abTest = await advancedAI.startABTest(userContext, testId)

    res.json({
      success: true,
      data: abTest,
      message: 'A/B test started successfully',
      startedBy: userContext.role,
      startedAt: new Date()
    })
  } catch (error: any) {
    console.error('A/B test start error:', error)
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to start A/B test'
    })
  }
})

/**
 * GET /ai/advanced/ab-test/:testId/results
 * Get A/B test results (ADMIN/MANAGER)
 */
router.get('/ab-test/:testId/results', requireRole(['ADMIN', 'MANAGER']), async (req: AuthenticatedRequest, res) => {
  try {
    const userContext = {
      userId: req.user!.id,
      role: req.user!.role,
      storeIds: req.user!.storeIds,
      permissions: req.user!.permissions,
      tenantId: req.user!.tenantId
    }

    const { testId } = req.params

    const abTest = await advancedAI.getABTestResults(userContext, testId)

    res.json({
      success: true,
      data: abTest,
      hasResults: !!abTest.results,
      isCompleted: abTest.status === 'COMPLETED',
      accessedBy: userContext.role,
      accessedAt: new Date()
    })
  } catch (error: any) {
    console.error('A/B test results error:', error)
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to get A/B test results'
    })
  }
})

/**
 * GET /ai/advanced/configuration
 * Get role-specific AI configuration (ADMIN/MANAGER)
 */
router.get('/configuration', requireRole(['ADMIN', 'MANAGER']), async (req: AuthenticatedRequest, res) => {
  try {
    const userContext = {
      userId: req.user!.id,
      role: req.user!.role,
      storeIds: req.user!.storeIds,
      permissions: req.user!.permissions,
      tenantId: req.user!.tenantId
    }

    const configuration = await advancedAI.getAIConfiguration(userContext)

    res.json({
      success: true,
      data: configuration,
      role: userContext.role,
      tenantId: userContext.tenantId,
      retrievedAt: new Date()
    })
  } catch (error: any) {
    console.error('AI configuration error:', error)
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to get AI configuration'
    })
  }
})

/**
 * GET /ai/advanced/dashboard-summary
 * Get advanced AI dashboard summary (ADMIN/MANAGER)
 */
router.get('/dashboard-summary', requireRole(['ADMIN', 'MANAGER']), async (req: AuthenticatedRequest, res) => {
  try {
    const userContext = {
      userId: req.user!.id,
      role: req.user!.role,
      storeIds: req.user!.storeIds,
      permissions: req.user!.permissions,
      tenantId: req.user!.tenantId
    }

    // Get summary data for dashboard
    const [
      reorderRecommendations,
      performanceAlerts,
      configuration
    ] = await Promise.all([
      advancedAI.generateReorderRecommendations(userContext, { urgencyThreshold: 'MEDIUM' }),
      userContext.role === 'ADMIN' ? advancedAI.monitorModelPerformance(userContext) : [],
      advancedAI.getAIConfiguration(userContext)
    ])

    const summary = {
      reorderRecommendations: {
        total: reorderRecommendations.length,
        critical: reorderRecommendations.filter(r => r.urgency === 'CRITICAL').length,
        high: reorderRecommendations.filter(r => r.urgency === 'HIGH').length,
        totalCost: reorderRecommendations.reduce((sum, r) => sum + r.costImpact.totalCost, 0)
      },
      performanceAlerts: {
        total: performanceAlerts.length,
        critical: performanceAlerts.filter(a => a.severity === 'CRITICAL').length,
        unresolved: performanceAlerts.filter(a => !a.isResolved).length
      },
      aiFeatures: {
        available: configuration.features.length,
        enabled: configuration.features,
        limits: configuration.limits
      }
    }

    res.json({
      success: true,
      data: summary,
      role: userContext.role,
      generatedAt: new Date()
    })
  } catch (error: any) {
    console.error('Dashboard summary error:', error)
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to get dashboard summary'
    })
  }
})

export default router