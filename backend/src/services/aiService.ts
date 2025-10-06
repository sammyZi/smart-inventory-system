/**
 * AI Demand Forecasting Service
 * TensorFlow.js integration with tenant-isolated model storage
 */

import * as tf from '@tensorflow/tfjs-node'
import { UserContext } from '../middleware/permissions'

export interface ForecastData {
  productId: string
  productName: string
  historicalSales: number[]
  dates: string[]
  forecast: number[]
  forecastDates: string[]
  confidence: number
  accuracy: number
  trend: 'increasing' | 'decreasing' | 'stable'
  seasonality: boolean
}

export interface ModelMetrics {
  modelId: string
  tenantId: string
  productId: string
  accuracy: number
  mse: number // Mean Squared Error
  mae: number // Mean Absolute Error
  lastTrained: Date
  trainingDataPoints: number
  forecastHorizon: number
  confidence: number
}

export interface TrainingData {
  dates: string[]
  sales: number[]
  features?: number[][] // Additional features like promotions, weather, etc.
}

export interface ForecastParameters {
  horizon: number // Days to forecast
  confidence: number // Confidence level (0.8, 0.9, 0.95)
  includeSeasonality: boolean
  includeTrend: boolean
  smoothingFactor: number
}

export class AIService {
  private models: Map<string, tf.LayersModel> = new Map()
  private modelMetrics: Map<string, ModelMetrics> = new Map()
  private trainingQueue: Map<string, boolean> = new Map()

  constructor() {
    // Initialize TensorFlow.js backend
    this.initializeTensorFlow()
  }

  /**
   * Generate demand forecast for a product
   */
  async generateForecast(
    userContext: UserContext,
    productId: string,
    parameters: ForecastParameters = this.getDefaultParameters()
  ): Promise<ForecastData> {
    // Validate role permissions
    if (!this.canAccessAIFeatures(userContext.role)) {
      throw new Error('Insufficient permissions for AI forecasting features')
    }

    try {
      // Get historical sales data
      const historicalData = await this.getHistoricalSalesData(
        userContext.tenantId,
        productId,
        userContext.storeIds
      )

      if (historicalData.sales.length < 30) {
        throw new Error('Insufficient historical data for forecasting (minimum 30 data points required)')
      }

      // Get or create model for this product
      const modelKey = `${userContext.tenantId}_${productId}`
      let model = this.models.get(modelKey)

      if (!model || this.shouldRetrainModel(modelKey)) {
        model = await this.trainModel(userContext.tenantId, productId, historicalData)
        this.models.set(modelKey, model)
      }

      // Generate forecast
      const forecast = await this.predictDemand(model, historicalData, parameters)

      // Calculate additional insights
      const trend = this.analyzeTrend(historicalData.sales)
      const seasonality = this.detectSeasonality(historicalData.sales)
      const confidence = this.calculateConfidence(historicalData, forecast)

      // Get product name
      const productName = await this.getProductName(productId)

      return {
        productId,
        productName,
        historicalSales: historicalData.sales,
        dates: historicalData.dates,
        forecast: forecast.predictions,
        forecastDates: forecast.dates,
        confidence,
        accuracy: this.getModelAccuracy(modelKey),
        trend,
        seasonality
      }
    } catch (error) {
      console.error('Forecast generation error:', error)
      throw new Error(`Failed to generate forecast: ${error.message}`)
    }
  }

  /**
   * Train a new forecasting model for a product
   */
  async trainModel(
    tenantId: string,
    productId: string,
    trainingData: TrainingData
  ): Promise<tf.LayersModel> {
    const modelKey = `${tenantId}_${productId}`

    // Prevent concurrent training
    if (this.trainingQueue.get(modelKey)) {
      throw new Error('Model training already in progress')
    }

    this.trainingQueue.set(modelKey, true)

    try {
      // Prepare training data
      const { inputs, outputs } = this.prepareTrainingData(trainingData)

      // Create model architecture
      const model = this.createModelArchitecture(inputs.shape[1])

      // Compile model
      model.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'meanSquaredError',
        metrics: ['mae']
      })

      // Train model
      const history = await model.fit(inputs, outputs, {
        epochs: 100,
        batchSize: 32,
        validationSplit: 0.2,
        verbose: 0,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            if (epoch % 10 === 0) {
              console.log(`Training epoch ${epoch}: loss=${logs?.loss?.toFixed(4)}, mae=${logs?.mae?.toFixed(4)}`)
            }
          }
        }
      })

      // Calculate model metrics
      const metrics = this.calculateModelMetrics(model, inputs, outputs, tenantId, productId)
      this.modelMetrics.set(modelKey, metrics)

      // Save model (in production, save to persistent storage)
      await this.saveModel(model, modelKey)

      console.log(`Model trained successfully for ${modelKey}:`, {
        accuracy: metrics.accuracy,
        mse: metrics.mse,
        mae: metrics.mae
      })

      return model
    } finally {
      this.trainingQueue.set(modelKey, false)
    }
  }

  /**
   * Get forecasting recommendations for multiple products
   */
  async getBulkForecasts(
    userContext: UserContext,
    productIds: string[],
    parameters?: ForecastParameters
  ): Promise<ForecastData[]> {
    if (!this.canAccessAIFeatures(userContext.role)) {
      throw new Error('Insufficient permissions for AI forecasting features')
    }

    const forecasts: ForecastData[] = []
    const batchSize = 5 // Process in batches to avoid overwhelming the system

    for (let i = 0; i < productIds.length; i += batchSize) {
      const batch = productIds.slice(i, i + batchSize)
      const batchPromises = batch.map(productId =>
        this.generateForecast(userContext, productId, parameters)
          .catch(error => {
            console.error(`Forecast failed for product ${productId}:`, error)
            return null
          })
      )

      const batchResults = await Promise.all(batchPromises)
      forecasts.push(...batchResults.filter(result => result !== null) as ForecastData[])
    }

    return forecasts
  }

  /**
   * Get model performance metrics
   */
  async getModelMetrics(
    userContext: UserContext,
    productId?: string
  ): Promise<ModelMetrics[]> {
    if (!this.canAccessAIFeatures(userContext.role)) {
      throw new Error('Insufficient permissions for AI model metrics')
    }

    const tenantModels = Array.from(this.modelMetrics.values())
      .filter(metrics => metrics.tenantId === userContext.tenantId)

    if (productId) {
      return tenantModels.filter(metrics => metrics.productId === productId)
    }

    return tenantModels
  }

  /**
   * Retrain model with new data
   */
  async retrainModel(
    userContext: UserContext,
    productId: string
  ): Promise<ModelMetrics> {
    if (!this.canAccessAIFeatures(userContext.role)) {
      throw new Error('Insufficient permissions for model retraining')
    }

    const historicalData = await this.getHistoricalSalesData(
      userContext.tenantId,
      productId,
      userContext.storeIds
    )

    const model = await this.trainModel(userContext.tenantId, productId, historicalData)
    const modelKey = `${userContext.tenantId}_${productId}`
    
    return this.modelMetrics.get(modelKey)!
  }

  /**
   * Get forecast accuracy for a model
   */
  async validateForecast(
    userContext: UserContext,
    productId: string,
    actualSales: number[],
    forecastPeriod: { start: string, end: string }
  ): Promise<{ accuracy: number, mse: number, mae: number }> {
    const modelKey = `${userContext.tenantId}_${productId}`
    const model = this.models.get(modelKey)

    if (!model) {
      throw new Error('Model not found for validation')
    }

    // Get historical forecast for the period
    const historicalForecast = await this.getHistoricalForecast(
      userContext.tenantId,
      productId,
      forecastPeriod
    )

    if (!historicalForecast) {
      throw new Error('No historical forecast found for validation period')
    }

    // Calculate accuracy metrics
    const mse = this.calculateMSE(actualSales, historicalForecast)
    const mae = this.calculateMAE(actualSales, historicalForecast)
    const accuracy = Math.max(0, 1 - (mae / Math.mean(actualSales)))

    // Update model metrics
    const metrics = this.modelMetrics.get(modelKey)
    if (metrics) {
      metrics.accuracy = accuracy
      metrics.mse = mse
      metrics.mae = mae
    }

    return { accuracy, mse, mae }
  }

  // Private helper methods

  private async initializeTensorFlow(): Promise<void> {
    try {
      // Set TensorFlow.js backend
      await tf.ready()
      console.log('TensorFlow.js initialized successfully')
    } catch (error) {
      console.error('Failed to initialize TensorFlow.js:', error)
    }
  }

  private canAccessAIFeatures(role: string): boolean {
    return ['ADMIN', 'MANAGER'].includes(role)
  }

  private getDefaultParameters(): ForecastParameters {
    return {
      horizon: 30, // 30 days
      confidence: 0.9,
      includeSeasonality: true,
      includeTrend: true,
      smoothingFactor: 0.3
    }
  }

  private async getHistoricalSalesData(
    tenantId: string,
    productId: string,
    storeIds: string[]
  ): Promise<TrainingData> {
    // Mock implementation - replace with actual database queries
    const mockData = this.generateMockSalesData(90) // 90 days of data
    
    return {
      dates: mockData.dates,
      sales: mockData.sales
    }
  }

  private generateMockSalesData(days: number): { dates: string[], sales: number[] } {
    const dates: string[] = []
    const sales: number[] = []
    const baseDate = new Date()
    baseDate.setDate(baseDate.getDate() - days)

    for (let i = 0; i < days; i++) {
      const date = new Date(baseDate)
      date.setDate(date.getDate() + i)
      dates.push(date.toISOString().split('T')[0])

      // Generate realistic sales data with trend and seasonality
      const trend = i * 0.1
      const seasonality = Math.sin((i / 7) * 2 * Math.PI) * 5 // Weekly pattern
      const noise = (Math.random() - 0.5) * 10
      const baseSales = 50 + trend + seasonality + noise
      
      sales.push(Math.max(0, Math.round(baseSales)))
    }

    return { dates, sales }
  }

  private prepareTrainingData(data: TrainingData): { inputs: tf.Tensor, outputs: tf.Tensor } {
    const sequenceLength = 7 // Use 7 days to predict next day
    const inputs: number[][] = []
    const outputs: number[] = []

    for (let i = sequenceLength; i < data.sales.length; i++) {
      inputs.push(data.sales.slice(i - sequenceLength, i))
      outputs.push(data.sales[i])
    }

    return {
      inputs: tf.tensor2d(inputs),
      outputs: tf.tensor1d(outputs)
    }
  }

  private createModelArchitecture(inputShape: number): tf.LayersModel {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({ inputShape: [inputShape], units: 50, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({ units: 25, activation: 'relu' }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({ units: 1, activation: 'linear' })
      ]
    })

    return model
  }

  private async predictDemand(
    model: tf.LayersModel,
    historicalData: TrainingData,
    parameters: ForecastParameters
  ): Promise<{ predictions: number[], dates: string[] }> {
    const sequenceLength = 7
    const predictions: number[] = []
    const dates: string[] = []

    // Get the last sequence from historical data
    let lastSequence = historicalData.sales.slice(-sequenceLength)
    const lastDate = new Date(historicalData.dates[historicalData.dates.length - 1])

    for (let i = 0; i < parameters.horizon; i++) {
      // Predict next value
      const input = tf.tensor2d([lastSequence])
      const prediction = model.predict(input) as tf.Tensor
      const predictionValue = await prediction.data()
      
      const nextValue = Math.max(0, Math.round(predictionValue[0]))
      predictions.push(nextValue)

      // Generate next date
      const nextDate = new Date(lastDate)
      nextDate.setDate(nextDate.getDate() + i + 1)
      dates.push(nextDate.toISOString().split('T')[0])

      // Update sequence for next prediction
      lastSequence = [...lastSequence.slice(1), nextValue]

      // Clean up tensors
      input.dispose()
      prediction.dispose()
    }

    return { predictions, dates }
  }

  private calculateModelMetrics(
    model: tf.LayersModel,
    inputs: tf.Tensor,
    outputs: tf.Tensor,
    tenantId: string,
    productId: string
  ): ModelMetrics {
    // Calculate predictions for validation
    const predictions = model.predict(inputs) as tf.Tensor
    
    // Calculate MSE and MAE
    const mse = tf.losses.meanSquaredError(outputs, predictions).dataSync()[0]
    const mae = tf.losses.absoluteDifference(outputs, predictions).dataSync()[0]
    
    // Calculate accuracy (1 - normalized MAE)
    const meanActual = tf.mean(outputs).dataSync()[0]
    const accuracy = Math.max(0, 1 - (mae / meanActual))

    predictions.dispose()

    return {
      modelId: `${tenantId}_${productId}`,
      tenantId,
      productId,
      accuracy,
      mse,
      mae,
      lastTrained: new Date(),
      trainingDataPoints: inputs.shape[0],
      forecastHorizon: 30,
      confidence: accuracy
    }
  }

  private shouldRetrainModel(modelKey: string): boolean {
    const metrics = this.modelMetrics.get(modelKey)
    if (!metrics) return true

    // Retrain if model is older than 7 days or accuracy is below 70%
    const daysSinceTraining = (Date.now() - metrics.lastTrained.getTime()) / (1000 * 60 * 60 * 24)
    return daysSinceTraining > 7 || metrics.accuracy < 0.7
  }

  private analyzeTrend(sales: number[]): 'increasing' | 'decreasing' | 'stable' {
    if (sales.length < 2) return 'stable'

    const firstHalf = sales.slice(0, Math.floor(sales.length / 2))
    const secondHalf = sales.slice(Math.floor(sales.length / 2))

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length

    const changePercent = ((secondAvg - firstAvg) / firstAvg) * 100

    if (changePercent > 5) return 'increasing'
    if (changePercent < -5) return 'decreasing'
    return 'stable'
  }

  private detectSeasonality(sales: number[]): boolean {
    if (sales.length < 14) return false

    // Simple seasonality detection using autocorrelation
    const weeklyPattern = this.calculateAutocorrelation(sales, 7)
    return weeklyPattern > 0.3 // Threshold for seasonality detection
  }

  private calculateAutocorrelation(data: number[], lag: number): number {
    if (data.length <= lag) return 0

    const n = data.length - lag
    const mean = data.reduce((a, b) => a + b, 0) / data.length
    
    let numerator = 0
    let denominator = 0

    for (let i = 0; i < n; i++) {
      numerator += (data[i] - mean) * (data[i + lag] - mean)
    }

    for (let i = 0; i < data.length; i++) {
      denominator += Math.pow(data[i] - mean, 2)
    }

    return denominator === 0 ? 0 : numerator / denominator
  }

  private calculateConfidence(historicalData: TrainingData, forecast: any): number {
    // Simple confidence calculation based on historical variance
    const variance = this.calculateVariance(historicalData.sales)
    const cv = Math.sqrt(variance) / this.calculateMean(historicalData.sales) // Coefficient of variation
    
    // Higher variance = lower confidence
    return Math.max(0.5, Math.min(0.95, 1 - cv))
  }

  private calculateVariance(data: number[]): number {
    const mean = this.calculateMean(data)
    const squaredDiffs = data.map(x => Math.pow(x - mean, 2))
    return squaredDiffs.reduce((a, b) => a + b, 0) / data.length
  }

  private calculateMean(data: number[]): number {
    return data.reduce((a, b) => a + b, 0) / data.length
  }

  private calculateMSE(actual: number[], predicted: number[]): number {
    const squaredErrors = actual.map((a, i) => Math.pow(a - predicted[i], 2))
    return squaredErrors.reduce((a, b) => a + b, 0) / actual.length
  }

  private calculateMAE(actual: number[], predicted: number[]): number {
    const absoluteErrors = actual.map((a, i) => Math.abs(a - predicted[i]))
    return absoluteErrors.reduce((a, b) => a + b, 0) / actual.length
  }

  private getModelAccuracy(modelKey: string): number {
    const metrics = this.modelMetrics.get(modelKey)
    return metrics?.accuracy || 0
  }

  private async getProductName(productId: string): Promise<string> {
    // Mock implementation - replace with actual database query
    return `Product ${productId}`
  }

  private async saveModel(model: tf.LayersModel, modelKey: string): Promise<void> {
    // In production, save to persistent storage (file system, cloud storage, etc.)
    console.log(`Model ${modelKey} saved successfully`)
  }

  private async getHistoricalForecast(
    tenantId: string,
    productId: string,
    period: { start: string, end: string }
  ): Promise<number[] | null> {
    // Mock implementation - in production, retrieve from database
    return null
  }
}

// Add Math.mean helper if not available
declare global {
  interface Math {
    mean(values: number[]): number
  }
}

if (!Math.mean) {
  Math.mean = function(values: number[]): number {
    return values.reduce((a, b) => a + b, 0) / values.length
  }
}