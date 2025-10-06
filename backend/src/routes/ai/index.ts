/**
 * AI Demand Forecasting API Routes
 * Role-based AI features with tenant isolation
 */

import express from 'express'
import { requireRole, AuthenticatedRequest } from '../../middleware/roleMiddleware'
import { AIService, ForecastRequest, TrainingData } from '../../services/aiService'
import geminiRoutes from './gemini'

const router = express.Router()
const aiService = new AIService()

// Mount Gemini AI routes
router.use('/gemini', geminiRoutes)

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

    const forecastRequest: ForecastRequest = {
      tenantId: userContext.tenantId,
      productId: req.body.productId,
      categoryId: req.body.categoryId,
      storeId: req.body.storeId,
      forecastDays: req.body.forecastDays || 30,
      includeSeasonality: req.body.includeSeasonality !== false,
      includeExternalFactors: req.body.includeExternalFactors !== false
    }

    // Validate store access for managers
    if (userContext.role === 'MANAGER' && forecastRequest.storeId) {
      if (!userContext.storeIds.includes(forecastRequest.storeId)) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to specified store'
        })
      }
    }

    const forecast = await aiService.generateForecast(userContext, forecastRequest)

    res.json({
      success: true,
      data: forecast,
      requestedBy: userContext.role,
      generatedAt: new Date()
    })
  } catch (error) {
    console.error('Forecast generation error:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate forecast'
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

    const { trainingData, modelConfig } = req.body

    if (!trainingData || !Array.isArray(trainingData)) {
      return res.status(400).json({
        success: false,
        error: 'Training data is required and must be an array'
      })
    }

    // Validate training data format
    const validatedData: TrainingData[] = trainingData.map((data: any) => ({
      date: new Date(data.date),
      demand: Number(data.demand),
      price: Number(data.price),
      promotions: Boolean(data.promotions),
      seasonality: Number(data.seasonality || 0),
      dayOfWeek: Number(data.dayOfWeek),
      month: Number(data.month),
      externalFactors: data.externalFactors || {}
    }))

    const model = await aiService.trainModel(
      userContext,
      userContext.tenantId,
      validatedData,
      modelConfig
    )

    res.json({
      success: true,
      data: model,
      message: 'Model training completed successfully',
      trainedBy: userContext.role
    })
  } catch (error) {
    console.error('Model training error:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to train model'
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

    const models = await aiService.getAvailableModels(userContext)

    res.json({
      success: true,
      data: models,
      count: models.length,
      role: userContext.role
    })
  } catch (error) {
    console.error('Models retrieval error:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to retrieve models'
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
    const performance = await aiService.getModelPerformance(userContext, modelId)

    res.json({
      success: true,
      data: performance,
      modelId,
      role: userContext.role
    })
  } catch (error) {
    console.error('Model performance error:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch model performance'
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
    const result = await aiService.checkAndRetrain(userContext, modelId)

    res.json({
      success: true,
      data: result,
      modelId,
      checkedBy: userContext.role,
      checkedAt: new Date()
    })
  } catch (error) {
    console.error('Model retrain check error:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to check model retraining status'
    })
  }
})

/**
 * GET /ai/trends
 * Get seasonal trends and patterns
 */
router.get('/trends', async (req: AuthenticatedRequest, res) => {
  try {
    const userContext = {
      userId: req.user!.id,
      role: req.user!.role,
      storeIds: req.user!.storeIds,
      permissions: req.user!.permissions,
      tenantId: req.user!.tenantId
    }

    const { productId, storeId } = req.query

    const trends = await aiService.detectSeasonalTrends(userContext, {
      tenantId: userContext.tenantId,
      productId: productId as string,
      storeId: storeId as string
    })

    res.json({
      success: true,
      data: trends,
      productId,
      storeId,
      role: userContext.role,
      analyzedAt: new Date()
    })
  } catch (error) {
    console.error('Trends analysis error:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to analyze trends'
    })
  }
})

/**
 * GET /ai/insights
 * Get AI-powered business insights
 */
router.get('/insights', async (req: AuthenticatedRequest, res) => {
  try {
    const userContext = {
      userId: req.user!.id,
      role: req.user!.role,
      storeIds: req.user!.storeIds,
      permissions: req.user!.permissions,
      tenantId: req.user!.tenantId
    }

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
  } catch (error) {
    console.error('AI insights error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch AI insights'
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
  } catch (error) {
    console.error('AI status error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch AI system status'
    })
  }
})

export default router