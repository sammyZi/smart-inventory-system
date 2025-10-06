/**
 * Advanced AI Service - Multi-Tenant AI Features and Automation
 * Seasonal trends, automated reorders, and intelligent recommendations
 */

import { UserContext } from '../middleware/permissions'

export interface SeasonalTrend {
  id: string
  tenantId: string
  productId?: string
  categoryId?: string
  storeId?: string
  pattern: {
    type: 'weekly' | 'monthly' | 'quarterly' | 'yearly'
    peaks: Array<{
      period: string
      multiplier: number
      confidence: number
    }>
    valleys: Array<{
      period: string
      multiplier: number
      confidence: number
    }>
  }
  accuracy: number
  detectedAt: Date
  lastUpdated: Date
  isActive: boolean
}

export interface ReorderRecommendation {
  id: string
  tenantId: string
  productId: string
  productName: string
  currentStock: number
  recommendedQuantity: number
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  reasoning: string
  factors: {
    demandForecast: number
    leadTime: number
    safetyStock: number
    seasonalAdjustment: number
    trendAdjustment: number
  }
  estimatedStockoutDate: Date
  confidence: number
  costImpact: {
    orderCost: number
    holdingCost: number
    stockoutCost: number
    totalCost: number
  }
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'AUTO_APPROVED'
  approvedBy?: string
  createdAt: Date
  expiresAt: Date
}

export interface PurchaseOrderGeneration {
  id: string
  tenantId: string
  supplierId: string
  supplierName: string
  items: Array<{
    productId: string
    productName: string
    quantity: number
    unitCost: number
    totalCost: number
    recommendationId: string
  }>
  totalAmount: number
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  deliveryDate: Date
  generatedBy: 'AI' | 'MANUAL'
  aiConfidence: number
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'SENT' | 'RECEIVED'
  createdAt: Date
  approvedBy?: string
  approvedAt?: Date
}

export interface ModelPerformanceAlert {
  id: string
  tenantId: string
  modelId: string
  alertType: 'ACCURACY_DROP' | 'PREDICTION_DRIFT' | 'DATA_QUALITY' | 'SYSTEM_ERROR'
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  message: string
  details: {
    currentAccuracy?: number
    previousAccuracy?: number
    threshold?: number
    affectedPredictions?: number
    errorRate?: number
  }
  actionRequired: string
  isResolved: boolean
  createdAt: Date
  resolvedAt?: Date
  resolvedBy?: string
}

export interface ABTestConfiguration {
  id: string
  tenantId: string
  name: string
  description: string
  modelA: {
    id: string
    name: string
    type: string
    parameters: Record<string, any>
  }
  modelB: {
    id: string
    name: string
    type: string
    parameters: Record<string, any>
  }
  trafficSplit: number // Percentage for model A (0-100)
  metrics: Array<{
    name: string
    target: number
    weight: number
  }>
  duration: number // Days
  status: 'DRAFT' | 'RUNNING' | 'COMPLETED' | 'PAUSED'
  results?: {
    modelAPerformance: Record<string, number>
    modelBPerformance: Record<string, number>
    winner: 'A' | 'B' | 'TIE'
    confidence: number
    significance: number
  }
  createdBy: string
  startDate: Date
  endDate: Date
}

export class AdvancedAIService {
  private seasonalTrends: Map<string, SeasonalTrend[]> = new Map()
  private reorderRecommendations: Map<string, ReorderRecommendation[]> = new Map()
  private performanceAlerts: Map<string, ModelPerformanceAlert[]> = new Map()
  private abTests: Map<string, ABTestConfiguration[]> = new Map()

  /**
   * Detect seasonal trends for tenant products
   */
  async detectSeasonalTrends(
    userContext: UserContext,
    options: {
      productIds?: string[]
      categoryIds?: string[]
      storeIds?: string[]
      timeRange: 'last_year' | 'last_2_years' | 'all_time'
    }
  ): Promise<SeasonalTrend[]> {
    if (!this.canAccessAdvancedAI(userContext.role)) {
      throw new Error('Insufficient permissions for seasonal trend analysis')
    }

    try {
      // Get historical sales data for analysis
      const historicalData = await this.getHistoricalSalesData(userContext.tenantId, options)
      
      // Analyze patterns using advanced algorithms
      const trends = await this.analyzeSeasonalPatterns(historicalData, userContext.tenantId)
      
      // Store trends for tenant
      this.seasonalTrends.set(userContext.tenantId, trends)
      
      return trends
    } catch (error) {
      console.error('Seasonal trend detection error:', error)
      throw new Error('Failed to detect seasonal trends')
    }
  }

  /**
   * Generate automated reorder recommendations
   */
  async generateReorderRecommendations(
    userContext: UserContext,
    options: {
      storeIds?: string[]
      categoryIds?: string[]
      urgencyThreshold?: 'LOW' | 'MEDIUM' | 'HIGH'
      includeSeasonalAdjustment?: boolean
    }
  ): Promise<ReorderRecommendation[]> {
    if (!this.canAccessReorderRecommendations(userContext.role)) {
      throw new Error('Insufficient permissions for reorder recommendations')
    }

    try {
      // Get current inventory levels
      const inventoryData = await this.getCurrentInventoryData(userContext.tenantId, options)
      
      // Get demand forecasts
      const forecasts = await this.getDemandForecasts(userContext.tenantId, inventoryData)
      
      // Apply seasonal adjustments if requested
      const adjustedForecasts = options.includeSeasonalAdjustment 
        ? await this.applySeasonalAdjustments(forecasts, userContext.tenantId)
        : forecasts
      
      // Generate recommendations
      const recommendations = await this.calculateReorderRecommendations(
        inventoryData,
        adjustedForecasts,
        userContext.tenantId,
        options
      )
      
      // Filter by urgency threshold
      const filteredRecommendations = options.urgencyThreshold
        ? recommendations.filter(rec => this.getUrgencyLevel(rec.urgency) >= this.getUrgencyLevel(options.urgencyThreshold!))
        : recommendations
      
      // Store recommendations for tenant
      this.reorderRecommendations.set(userContext.tenantId, filteredRecommendations)
      
      return filteredRecommendations
    } catch (error) {
      console.error('Reorder recommendation error:', error)
      throw new Error('Failed to generate reorder recommendations')
    }
  }

  /**
   * Generate purchase orders from AI recommendations
   */
  async generatePurchaseOrders(
    userContext: UserContext,
    recommendationIds: string[],
    options: {
      groupBySupplier?: boolean
      priorityThreshold?: 'LOW' | 'MEDIUM' | 'HIGH'
      autoApprove?: boolean
    }
  ): Promise<PurchaseOrderGeneration[]> {
    if (userContext.role !== 'ADMIN' && userContext.role !== 'MANAGER') {
      throw new Error('Only ADMIN and MANAGER can generate purchase orders')
    }

    try {
      // Get recommendations
      const tenantRecommendations = this.reorderRecommendations.get(userContext.tenantId) || []
      const selectedRecommendations = tenantRecommendations.filter(rec => 
        recommendationIds.includes(rec.id)
      )

      if (selectedRecommendations.length === 0) {
        throw new Error('No valid recommendations found')
      }

      // Get supplier information
      const supplierData = await this.getSupplierData(userContext.tenantId, selectedRecommendations)
      
      // Group by supplier if requested
      const groupedOrders = options.groupBySupplier
        ? this.groupRecommendationsBySupplier(selectedRecommendations, supplierData)
        : this.createIndividualOrders(selectedRecommendations, supplierData)
      
      // Generate purchase orders
      const purchaseOrders = await this.createPurchaseOrders(
        groupedOrders,
        userContext,
        options
      )
      
      // Auto-approve if requested and user has permission
      if (options.autoApprove && userContext.role === 'ADMIN') {
        purchaseOrders.forEach(po => {
          po.status = 'APPROVED'
          po.approvedBy = userContext.userId
          po.approvedAt = new Date()
        })
      }
      
      return purchaseOrders
    } catch (error) {
      console.error('Purchase order generation error:', error)
      throw new Error('Failed to generate purchase orders')
    }
  }

  /**
   * Monitor model performance and generate alerts
   */
  async monitorModelPerformance(
    userContext: UserContext,
    modelIds?: string[]
  ): Promise<ModelPerformanceAlert[]> {
    if (!this.canAccessAdvancedAI(userContext.role)) {
      throw new Error('Insufficient permissions for model performance monitoring')
    }

    try {
      // Get model performance metrics
      const performanceMetrics = await this.getModelPerformanceMetrics(
        userContext.tenantId,
        modelIds
      )
      
      // Analyze for issues
      const alerts = await this.analyzePerformanceIssues(performanceMetrics, userContext.tenantId)
      
      // Store alerts for tenant
      const existingAlerts = this.performanceAlerts.get(userContext.tenantId) || []
      const updatedAlerts = [...existingAlerts, ...alerts]
      this.performanceAlerts.set(userContext.tenantId, updatedAlerts)
      
      return alerts
    } catch (error) {
      console.error('Model performance monitoring error:', error)
      throw new Error('Failed to monitor model performance')
    }
  }

  /**
   * Create A/B test for model comparison
   */
  async createABTest(
    userContext: UserContext,
    testConfig: Omit<ABTestConfiguration, 'id' | 'tenantId' | 'createdBy' | 'startDate' | 'endDate' | 'status'>
  ): Promise<ABTestConfiguration> {
    if (userContext.role !== 'ADMIN') {
      throw new Error('Only ADMIN can create A/B tests')
    }

    try {
      const abTest: ABTestConfiguration = {
        id: this.generateId(),
        tenantId: userContext.tenantId,
        createdBy: userContext.userId,
        status: 'DRAFT',
        startDate: new Date(),
        endDate: new Date(Date.now() + testConfig.duration * 24 * 60 * 60 * 1000),
        ...testConfig
      }
      
      // Store A/B test for tenant
      const existingTests = this.abTests.get(userContext.tenantId) || []
      existingTests.push(abTest)
      this.abTests.set(userContext.tenantId, existingTests)
      
      return abTest
    } catch (error) {
      console.error('A/B test creation error:', error)
      throw new Error('Failed to create A/B test')
    }
  }

  /**
   * Start A/B test
   */
  async startABTest(
    userContext: UserContext,
    testId: string
  ): Promise<ABTestConfiguration> {
    if (userContext.role !== 'ADMIN') {
      throw new Error('Only ADMIN can start A/B tests')
    }

    try {
      const tenantTests = this.abTests.get(userContext.tenantId) || []
      const test = tenantTests.find(t => t.id === testId)
      
      if (!test) {
        throw new Error('A/B test not found')
      }
      
      if (test.status !== 'DRAFT') {
        throw new Error('A/B test is not in draft status')
      }
      
      // Validate models exist and are ready
      await this.validateABTestModels(test)
      
      // Start the test
      test.status = 'RUNNING'
      test.startDate = new Date()
      
      return test
    } catch (error) {
      console.error('A/B test start error:', error)
      throw new Error('Failed to start A/B test')
    }
  }

  /**
   * Get A/B test results
   */
  async getABTestResults(
    userContext: UserContext,
    testId: string
  ): Promise<ABTestConfiguration> {
    if (!this.canAccessAdvancedAI(userContext.role)) {
      throw new Error('Insufficient permissions for A/B test results')
    }

    try {
      const tenantTests = this.abTests.get(userContext.tenantId) || []
      const test = tenantTests.find(t => t.id === testId)
      
      if (!test) {
        throw new Error('A/B test not found')
      }
      
      // Calculate results if test is completed
      if (test.status === 'COMPLETED' || new Date() > test.endDate) {
        test.results = await this.calculateABTestResults(test)
        test.status = 'COMPLETED'
      }
      
      return test
    } catch (error) {
      console.error('A/B test results error:', error)
      throw new Error('Failed to get A/B test results')
    }
  }

  /**
   * Get role-specific AI configurations
   */
  async getAIConfiguration(
    userContext: UserContext
  ): Promise<{
    features: string[]
    limits: Record<string, number>
    permissions: Record<string, boolean>
  }> {
    const baseConfig = {
      features: ['basic_forecasting', 'trend_analysis'],
      limits: {
        forecastDays: 30,
        modelsPerTenant: 5,
        requestsPerHour: 100
      },
      permissions: {
        viewForecasts: true,
        createModels: false,
        manageABTests: false,
        generatePurchaseOrders: false
      }
    }

    switch (userContext.role) {
      case 'ADMIN':
        return {
          features: [
            'basic_forecasting',
            'advanced_forecasting',
            'seasonal_analysis',
            'reorder_recommendations',
            'purchase_order_generation',
            'model_performance_monitoring',
            'ab_testing',
            'custom_model_training'
          ],
          limits: {
            forecastDays: 365,
            modelsPerTenant: 50,
            requestsPerHour: 1000
          },
          permissions: {
            viewForecasts: true,
            createModels: true,
            manageABTests: true,
            generatePurchaseOrders: true,
            monitorPerformance: true,
            configureAI: true
          }
        }

      case 'MANAGER':
        return {
          features: [
            'basic_forecasting',
            'advanced_forecasting',
            'seasonal_analysis',
            'reorder_recommendations',
            'purchase_order_generation'
          ],
          limits: {
            forecastDays: 180,
            modelsPerTenant: 20,
            requestsPerHour: 500
          },
          permissions: {
            viewForecasts: true,
            createModels: true,
            manageABTests: false,
            generatePurchaseOrders: true,
            monitorPerformance: true,
            configureAI: false
          }
        }

      default:
        return baseConfig
    }
  }

  // Private helper methods

  private canAccessAdvancedAI(role: string): boolean {
    return ['ADMIN'].includes(role)
  }

  private canAccessReorderRecommendations(role: string): boolean {
    return ['ADMIN', 'MANAGER'].includes(role)
  }

  private async getHistoricalSalesData(_tenantId: string, _options: any): Promise<any[]> {
    // Mock implementation - in production, fetch from database
    return [
      {
        date: '2024-01-01',
        productId: '1',
        quantity: 100,
        revenue: 2000,
        factors: { weather: 'cold', promotion: false }
      }
      // ... more data
    ]
  }

  private async analyzeSeasonalPatterns(_data: any[], tenantId: string): Promise<SeasonalTrend[]> {
    // Mock seasonal pattern analysis
    return [
      {
        id: this.generateId(),
        tenantId,
        productId: '1',
        pattern: {
          type: 'monthly',
          peaks: [
            { period: 'December', multiplier: 1.5, confidence: 0.85 },
            { period: 'November', multiplier: 1.3, confidence: 0.78 }
          ],
          valleys: [
            { period: 'February', multiplier: 0.7, confidence: 0.82 }
          ]
        },
        accuracy: 0.85,
        detectedAt: new Date(),
        lastUpdated: new Date(),
        isActive: true
      }
    ]
  }

  private async getCurrentInventoryData(_tenantId: string, _options: any): Promise<any[]> {
    // Mock implementation
    return [
      {
        productId: '1',
        currentStock: 50,
        reorderPoint: 20,
        maxStock: 200,
        leadTime: 7,
        cost: 10
      }
    ]
  }

  private async getDemandForecasts(_tenantId: string, inventoryData: any[]): Promise<any[]> {
    // Mock implementation
    return inventoryData.map(item => ({
      productId: item.productId,
      forecastedDemand: 15,
      confidence: 0.8,
      period: '30_days'
    }))
  }

  private async applySeasonalAdjustments(forecasts: any[], tenantId: string): Promise<any[]> {
    const trends = this.seasonalTrends.get(tenantId) || []
    
    return forecasts.map(forecast => {
      const trend = trends.find(t => t.productId === forecast.productId)
      if (trend) {
        const currentMonth = new Date().toLocaleString('default', { month: 'long' })
        const seasonalFactor = trend.pattern.peaks.find(p => p.period === currentMonth)?.multiplier || 1
        
        return {
          ...forecast,
          forecastedDemand: Math.round(forecast.forecastedDemand * seasonalFactor),
          seasonalAdjustment: seasonalFactor
        }
      }
      return forecast
    })
  }

  private async calculateReorderRecommendations(
    inventoryData: any[],
    forecasts: any[],
    tenantId: string,
    _options: any
  ): Promise<ReorderRecommendation[]> {
    const recommendations: ReorderRecommendation[] = []
    
    for (const item of inventoryData) {
      const forecast = forecasts.find(f => f.productId === item.productId)
      if (!forecast) continue
      
      const daysUntilStockout = Math.floor(item.currentStock / (forecast.forecastedDemand / 30))
      const safetyStock = Math.ceil(forecast.forecastedDemand * 0.2) // 20% safety stock
      const recommendedQuantity = Math.max(0, forecast.forecastedDemand + safetyStock - item.currentStock)
      
      if (recommendedQuantity > 0) {
        recommendations.push({
          id: this.generateId(),
          tenantId,
          productId: item.productId,
          productName: `Product ${item.productId}`,
          currentStock: item.currentStock,
          recommendedQuantity,
          urgency: this.calculateUrgency(daysUntilStockout),
          reasoning: `Based on ${forecast.forecastedDemand} forecasted demand over 30 days`,
          factors: {
            demandForecast: forecast.forecastedDemand,
            leadTime: item.leadTime,
            safetyStock,
            seasonalAdjustment: forecast.seasonalAdjustment || 1,
            trendAdjustment: 1
          },
          estimatedStockoutDate: new Date(Date.now() + daysUntilStockout * 24 * 60 * 60 * 1000),
          confidence: forecast.confidence,
          costImpact: {
            orderCost: recommendedQuantity * item.cost,
            holdingCost: recommendedQuantity * item.cost * 0.02, // 2% holding cost
            stockoutCost: forecast.forecastedDemand * item.cost * 0.1, // 10% stockout penalty
            totalCost: recommendedQuantity * item.cost * 1.02
          },
          approvalStatus: 'PENDING',
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        })
      }
    }
    
    return recommendations
  }

  private calculateUrgency(daysUntilStockout: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (daysUntilStockout <= 3) return 'CRITICAL'
    if (daysUntilStockout <= 7) return 'HIGH'
    if (daysUntilStockout <= 14) return 'MEDIUM'
    return 'LOW'
  }

  private getUrgencyLevel(urgency: string): number {
    const levels = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 }
    return levels[urgency as keyof typeof levels] || 1
  }

  private async getSupplierData(_tenantId: string, recommendations: ReorderRecommendation[]): Promise<any[]> {
    // Mock implementation
    return [
      {
        id: 'supplier1',
        name: 'Supplier A',
        products: recommendations.map(r => r.productId),
        leadTime: 7,
        minOrderValue: 1000
      }
    ]
  }

  private groupRecommendationsBySupplier(recommendations: ReorderRecommendation[], suppliers: any[]): any[] {
    // Group recommendations by supplier
    const grouped = new Map()
    
    recommendations.forEach(rec => {
      const supplier = suppliers.find(s => s.products.includes(rec.productId))
      if (supplier) {
        if (!grouped.has(supplier.id)) {
          grouped.set(supplier.id, { supplier, recommendations: [] })
        }
        grouped.get(supplier.id).recommendations.push(rec)
      }
    })
    
    return Array.from(grouped.values())
  }

  private createIndividualOrders(recommendations: ReorderRecommendation[], suppliers: any[]): any[] {
    return recommendations.map(rec => {
      const supplier = suppliers.find(s => s.products.includes(rec.productId))
      return {
        supplier,
        recommendations: [rec]
      }
    })
  }

  private async createPurchaseOrders(
    groupedOrders: any[],
    userContext: UserContext,
    _options: any
  ): Promise<PurchaseOrderGeneration[]> {
    const purchaseOrders: PurchaseOrderGeneration[] = []
    
    for (const group of groupedOrders) {
      const items = group.recommendations.map((rec: ReorderRecommendation) => ({
        productId: rec.productId,
        productName: rec.productName,
        quantity: rec.recommendedQuantity,
        unitCost: rec.costImpact.orderCost / rec.recommendedQuantity,
        totalCost: rec.costImpact.orderCost,
        recommendationId: rec.id
      }))
      
      const totalAmount = items.reduce((sum: number, item: any) => sum + item.totalCost, 0)
      const maxUrgency = Math.max(...group.recommendations.map((r: ReorderRecommendation) => 
        this.getUrgencyLevel(r.urgency)
      ))
      
      purchaseOrders.push({
        id: this.generateId(),
        tenantId: userContext.tenantId,
        supplierId: group.supplier.id,
        supplierName: group.supplier.name,
        items,
        totalAmount,
        priority: this.urgencyToPriority(maxUrgency),
        deliveryDate: new Date(Date.now() + group.supplier.leadTime * 24 * 60 * 60 * 1000),
        generatedBy: 'AI',
        aiConfidence: group.recommendations.reduce((sum: number, r: ReorderRecommendation) => 
          sum + r.confidence, 0) / group.recommendations.length,
        status: 'DRAFT',
        createdAt: new Date()
      })
    }
    
    return purchaseOrders
  }

  private urgencyToPriority(urgencyLevel: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' {
    if (urgencyLevel >= 4) return 'URGENT'
    if (urgencyLevel >= 3) return 'HIGH'
    if (urgencyLevel >= 2) return 'MEDIUM'
    return 'LOW'
  }

  private async getModelPerformanceMetrics(_tenantId: string, _modelIds?: string[]): Promise<any[]> {
    // Mock implementation
    return [
      {
        modelId: 'model1',
        accuracy: 0.75,
        previousAccuracy: 0.85,
        errorRate: 0.15,
        predictionCount: 1000,
        lastUpdated: new Date()
      }
    ]
  }

  private async analyzePerformanceIssues(metrics: any[], tenantId: string): Promise<ModelPerformanceAlert[]> {
    const alerts: ModelPerformanceAlert[] = []
    
    for (const metric of metrics) {
      // Check for accuracy drop
      if (metric.previousAccuracy && metric.accuracy < metric.previousAccuracy * 0.9) {
        alerts.push({
          id: this.generateId(),
          tenantId,
          modelId: metric.modelId,
          alertType: 'ACCURACY_DROP',
          severity: metric.accuracy < metric.previousAccuracy * 0.8 ? 'HIGH' : 'MEDIUM',
          message: `Model accuracy dropped from ${(metric.previousAccuracy * 100).toFixed(1)}% to ${(metric.accuracy * 100).toFixed(1)}%`,
          details: {
            currentAccuracy: metric.accuracy,
            previousAccuracy: metric.previousAccuracy,
            threshold: 0.9
          },
          actionRequired: 'Consider retraining the model with recent data',
          isResolved: false,
          createdAt: new Date()
        })
      }
      
      // Check for high error rate
      if (metric.errorRate > 0.2) {
        alerts.push({
          id: this.generateId(),
          tenantId,
          modelId: metric.modelId,
          alertType: 'PREDICTION_DRIFT',
          severity: metric.errorRate > 0.3 ? 'CRITICAL' : 'HIGH',
          message: `High error rate detected: ${(metric.errorRate * 100).toFixed(1)}%`,
          details: {
            errorRate: metric.errorRate,
            threshold: 0.2,
            affectedPredictions: metric.predictionCount
          },
          actionRequired: 'Review model parameters and training data quality',
          isResolved: false,
          createdAt: new Date()
        })
      }
    }
    
    return alerts
  }

  private async validateABTestModels(test: ABTestConfiguration): Promise<void> {
    // Mock validation - in production, check if models exist and are trained
    if (!test.modelA.id || !test.modelB.id) {
      throw new Error('Both models must be specified for A/B test')
    }
  }

  private async calculateABTestResults(_test: ABTestConfiguration): Promise<any> {
    // Mock A/B test results calculation
    const modelAPerformance = {
      accuracy: 0.85,
      precision: 0.82,
      recall: 0.88,
      f1Score: 0.85
    }
    
    const modelBPerformance = {
      accuracy: 0.87,
      precision: 0.84,
      recall: 0.90,
      f1Score: 0.87
    }
    
    const winner = modelBPerformance.accuracy > modelAPerformance.accuracy ? 'B' : 'A'
    const confidence = Math.abs(modelBPerformance.accuracy - modelAPerformance.accuracy) / Math.max(modelAPerformance.accuracy, modelBPerformance.accuracy)
    
    return {
      modelAPerformance,
      modelBPerformance,
      winner,
      confidence,
      significance: confidence > 0.05 ? 0.95 : 0.8
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9)
  }
}