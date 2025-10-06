/**
 * Gemini AI Routes - Intelligent Demand Forecasting
 * Advanced AI predictions using Google's Gemini API
 */

import express from 'express'
import { requireRole, AuthenticatedRequest } from '../../middleware/roleMiddleware'
import { getGeminiAI } from '../../services/geminiAIService'

const router = express.Router()

// Apply role requirement (ADMIN and MANAGER only)
router.use(requireRole(['ADMIN', 'MANAGER']))

/**
 * POST /ai/gemini/forecast
 * Generate intelligent demand forecast using Gemini AI
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

    const { inventoryData, forecastDays } = req.body

    if (!inventoryData) {
      return res.status(400).json({
        success: false,
        error: 'Inventory data is required'
      })
    }

    const geminiAI = getGeminiAI()
    const forecast = await geminiAI.generateIntelligentForecast(
      userContext,
      inventoryData,
      forecastDays || 30
    )

    res.json({
      success: true,
      data: forecast,
      aiProvider: 'Gemini',
      requestedBy: userContext.role,
      generatedAt: new Date()
    })
  } catch (error) {
    console.error('Gemini forecast error:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate intelligent forecast'
    })
  }
})

/**
 * POST /ai/gemini/insights
 * Generate business insights using Gemini AI
 */
router.post('/insights', async (req: AuthenticatedRequest, res) => {
  try {
    const userContext = {
      userId: req.user!.id,
      role: req.user!.role,
      storeIds: req.user!.storeIds,
      permissions: req.user!.permissions,
      tenantId: req.user!.tenantId
    }

    const { businessData } = req.body

    if (!businessData) {
      return res.status(400).json({
        success: false,
        error: 'Business data is required'
      })
    }

    const geminiAI = getGeminiAI()
    const insights = await geminiAI.generateBusinessInsights(userContext, businessData)

    res.json({
      success: true,
      data: insights,
      aiProvider: 'Gemini',
      requestedBy: userContext.role,
      generatedAt: new Date()
    })
  } catch (error) {
    console.error('Gemini insights error:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate business insights'
    })
  }
})

/**
 * POST /ai/gemini/seasonal-analysis
 * Analyze seasonal patterns using Gemini AI
 */
router.post('/seasonal-analysis', async (req: AuthenticatedRequest, res) => {
  try {
    const userContext = {
      userId: req.user!.id,
      role: req.user!.role,
      storeIds: req.user!.storeIds,
      permissions: req.user!.permissions,
      tenantId: req.user!.tenantId
    }

    const { historicalData } = req.body

    if (!historicalData || !Array.isArray(historicalData)) {
      return res.status(400).json({
        success: false,
        error: 'Historical data array is required'
      })
    }

    const geminiAI = getGeminiAI()
    const analysis = await geminiAI.analyzeSeasonalPatterns(userContext, historicalData)

    res.json({
      success: true,
      data: analysis,
      aiProvider: 'Gemini',
      requestedBy: userContext.role,
      analyzedAt: new Date()
    })
  } catch (error) {
    console.error('Gemini seasonal analysis error:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to analyze seasonal patterns'
    })
  }
})

/**
 * POST /ai/gemini/optimize-inventory
 * Get inventory optimization recommendations using Gemini AI
 */
router.post('/optimize-inventory', async (req: AuthenticatedRequest, res) => {
  try {
    const userContext = {
      userId: req.user!.id,
      role: req.user!.role,
      storeIds: req.user!.storeIds,
      permissions: req.user!.permissions,
      tenantId: req.user!.tenantId
    }

    const { inventoryData } = req.body

    if (!inventoryData || !Array.isArray(inventoryData)) {
      return res.status(400).json({
        success: false,
        error: 'Inventory data array is required'
      })
    }

    const geminiAI = getGeminiAI()
    const optimization = await geminiAI.getInventoryOptimization(userContext, inventoryData)

    res.json({
      success: true,
      data: optimization,
      aiProvider: 'Gemini',
      requestedBy: userContext.role,
      optimizedAt: new Date()
    })
  } catch (error) {
    console.error('Gemini optimization error:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate optimization recommendations'
    })
  }
})

export default router