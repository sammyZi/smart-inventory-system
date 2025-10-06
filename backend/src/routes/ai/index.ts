/**
 * AI Demand Forecasting API Routes
 * Role-based AI features with tenant isolation
 */

import express from 'express'
import { requireRole, AuthenticatedRequest } from '../../middleware/roleMiddleware'
import { AIService, TrainingData, ForecastParameters } from '../../services/aiService'
import geminiRoutes from './gemini'
import advancedRoutes from './advanced'

const router = express.Router()
const aiService = new AIService()

// Mount AI sub-routes
router.use('/gemini', geminiRoutes)
router.use('/advanced', advancedRoutes)

// Apply role requirement (ADMIN and MANAGER only)
router.use(requireRole(['ADMIN', 'MANAGER']))

/**
 * POST /ai/forecast
 * Generate demand forecast
 */
router.post('/forecast', async (req: AuthenticatedRequest, res) => {
  try {
    const userContext = {
      userId: req.user!.id,
      role: req.user!.role,
      storeIds: req.user!.storeIds,
      permissions: req.user!.permissions,
      tenantId: req.user!.tenantId
    }

    const { productId, parameters } = req.body

    if (!productId) {
      return res.status(400).json({
        success: false,
        error: 'Product ID is required'
      })
    }

    // Validate store access for managers
    if (userContext.role === 'MANAGER' && req.body.storeId) {
      if (!userContext.storeIds.includes(req.body.storeId)) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to specified store'
        })
      }
    }

    const forecastParams: ForecastParameters = {
      horizon: parameters?.horizon || 30,
      confidence: parameters?.confidence || 0.9,
      includeSeasonality: parameters?.includeSeasonality !== false,
      includeTrend: parameters?.includeTrend !== false,
      smoothingFactor: parameters?.smoothingFactor || 0.3
    }

    const forecast = await aiService.generateForecast(userContext, productId, forecastParams)

    res.json({
      success: true,
      data: forecast,
      parameters: forecastParams,
      requestedBy: userContext.role,
      generatedAt: new Date()
    })
  } catch (error: any) {
    console.error('Forecast generation error:', error)
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to generate forecast'
    })
  }
})

/**
 * POST /ai/train-model
 * Train or retrain AI model (Admin only)
 */
router.post('/train-model', requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const userContext = {
      userId: req.user!.id,
      role: req.user!.role,
      storeIds: req.user!.storeIds,
      permissions: req.user!.permissions,
      tenantId: req.user!.tenantId
    }

    const { trainingData } = req.body

    if (!trainingData || !Array.isArray(trainingData)) {
      return res.status(400).json({
        success: false,
        error: 'Training data is required and must be an array'
      })
    }

    // Validate training data format
    const validatedData: TrainingData = {
      dates: trainingData.map((data: any) => data.date),
      sales: trainingData.map((data: any) => Number(data.demand)),
      features: trainingData.map((data: any) => [
        Number(data.price),
        Boolean(data.promotions) ? 1 : 0,
        Number(data.seasonality || 0),
        Number(data.dayOfWeek),
        Number(data.month)
      ])
    }

    const model = await aiService.trainModel(
      userContext.tenantId,
      req.body.productId || 'default',
      validatedData
    )

    res.json({
      success: true,
      data: model,
      message: 'Model training completed successfully',
      trainedBy: userContext.role
    })
  } catch (error: any) {
    console.error('Model training error:', error)
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to train model'
    })
  }
})

/**
 * GET /ai/models
 * Get available AI models for tenant
 */
router.get('/models', async (req: AuthenticatedRequest, res) => {
  try {
    const userContext = {
      userId: req.user!.id,
      role: req.user!.role,
      storeIds: req.user!.storeIds,
      permissions: req.user!.permissions,
      tenantId: req.user!.tenantId
    }

    const models = await aiService.getModelMetrics(userContext)

    res.json({
      success: true,
      data: models,
      count: models.length,
      role: userContext.role
    })
  } catch (error: any) {
    console.error('Models retrieval error:', error)
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to retrieve models'
    })
  }
})

/**
 * GET /ai/models/:modelId/performance
 * Get model performance metrics
 */
router.get('/models/:modelId/performance', async (req: AuthenticatedRequest, res) => {
  try {
    const userContext = {
      userId: req.user!.id,
      role: req.user!.role,
      storeIds: req.user!.storeIds,
      permissions: req.user!.permissions,
      tenantId: req.user!.tenantId
    }

    const { modelId } = req.params
    const metrics = await aiService.getModelMetrics(userContext, modelId)

    res.json({
      success: true,
      data: metrics,
      modelId,
      role: userContext.role
    })
  } catch (error: any) {
    console.error('Model performance error:', error)
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to fetch model performance'
    })
  }
})

/**
 * POST /ai/check-retrain/:modelId
 * Check if model needs retraining and optionally retrain
 */
router.post('/check-retrain/:modelId', async (req: AuthenticatedRequest, res) => {
  try {
    const userContext = {
      userId: req.user!.id,
      role: req.user!.role,
      storeIds: req.user!.storeIds,
      permissions: req.user!.permissions,
      tenantId: req.user!.tenantId
    }

    const { modelId } = req.params
    
    // Mock retraining check - in production, implement actual logic
    const result = {
      needsRetraining: false,
      reason: 'Model performance is within acceptable range',
      lastChecked: new Date()
    }

    res.json({
      success: true,
      data: result,
      modelId,
      checkedBy: userContext.role,
      checkedAt: new Date()
    })
  } catch (error: any) {
    console.error('Model retrain check error:', error)
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to check model retraining status'
    })
  }
})

/**
 * GET /ai/trends
 * Get seasonal trends and patterns
 */
router.get('/trends', async (req: AuthenticatedRequest, res) => {
  try {
    const { productId, storeId } = req.query

    // Mock trends data - in production, implement actual seasonal analysis
    const trends = {
      seasonalityDetected: true,
      seasonalPattern: [
        { period: 'Monday', factor: 0.8 },
        { period: 'Tuesday', factor: 0.9 },
        { period: 'Wednesday', factor: 1.0 },
        { period: 'Thursday', factor: 1.1 },
        { period: 'Friday', factor: 1.3 },
        { period: 'Saturday', factor: 1.4 },
        { period: 'Sunday', factor: 1.2 }
      ],
      trendDirection: 'increasing' as const,
      trendStrength: 0.15
    }

    res.json({
      success: true,
      data: trends,
      productId,
      storeId,
      role: req.user!.role,
      analyzedAt: new Date()
    })
  } catch (error: any) {
    console.error('Trends analysis error:', error)
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to analyze trends'
    })
  }
})

/**
 * GET /ai/insights
 * Get AI-powered business insights
 */
router.get('/insights', async (req: AuthenticatedRequest, res) => {
  try {

    // Mock insights - in production, generate from AI analysis
    const insights = [
      {
        type: 'DEMAND_PATTERN',
        title: 'Weekly Demand Pattern Detected',
        description: 'Sales peak on Fridays and Saturdays, consider adjusting staff schedules',
        confidence: 0.89,
        impact: 'MEDIUM',
        actionable: true,
        recommendation: 'Increase staff by 20% on weekends'
      },
      {
        type: 'SEASONAL_TREND',
        title: 'Seasonal Trend Identified',
        description: 'Product category "Electronics" shows 15% increase in winter months',
        confidence: 0.76,
        impact: 'HIGH',
        actionable: true,
        recommendation: 'Increase electronics inventory by 15% in Q4'
      },
      {
        type: 'INVENTORY_OPTIMIZATION',
        title: 'Inventory Optimization Opportunity',
        description: 'Reducing slow-moving inventory could free up $12,000 in capital',
        confidence: 0.82,
        impact: 'HIGH',
        actionable: true,
        recommendation: 'Consider clearance sale for slow-moving items'
      }
    ]

    res.json({
      success: true,
      data: insights,
      count: insights.length,
      role: req.user!.role,
      scope: req.user!.role === 'ADMIN' ? 'all_stores' : 'assigned_stores',
      generatedAt: new Date()
    })
  } catch (error: any) {
    console.error('AI insights error:', error)
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to fetch AI insights'
    })
  }
})

/**
 * GET /ai/status
 * Get AI system status and health
 */
router.get('/status', async (req: AuthenticatedRequest, res) => {
  try {
    // Mock AI system status
    const status = {
      systemHealth: 'HEALTHY',
      modelsActive: 15,
      modelsTraining: 2,
      lastModelUpdate: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      averageAccuracy: 0.84,
      totalPredictions: 1250,
      successfulPredictions: 1050,
      failedPredictions: 200,
      systemLoad: 45, // percentage
      memoryUsage: 2.1, // GB
      features: {
        demandForecasting: true,
        seasonalityDetection: true,
        trendAnalysis: true,
        anomalyDetection: true,
        reorderRecommendations: true
      }
    }

    res.json({
      success: true,
      data: status,
      role: req.user!.role,
      checkedAt: new Date()
    })
  } catch (error: any) {
    console.error('AI status error:', error)
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to fetch AI system status'
    })
  }
})

export default router