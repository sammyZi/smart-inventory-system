'use client'

/**
 * AI Demand Forecasting Dashboard
 * Role-based AI features with tenant isolation
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import { 
  TrendingUp, 
  TrendingDown, 
  Brain, 
  Target, 
  AlertTriangle, 
  CheckCircle,
  RefreshCw,
  BarChart3,
  Zap,
  Clock,
  Activity
} from 'lucide-react'

interface ForecastData {
  date: string
  predictedDemand: number
  confidence: number
  upperBound: number
  lowerBound: number
}

interface ModelMetrics {
  id: string
  modelType: string
  accuracy: number
  lastTrained: string
  trainingDataPoints: number
  isActive: boolean
}

interface TrendData {
  seasonalityDetected: boolean
  seasonalPattern: Array<{ period: string; factor: number }>
  trendDirection: 'increasing' | 'decreasing' | 'stable'
  trendStrength: number
}

interface AISystemStatus {
  systemHealth: string
  modelsActive: number
  modelsTraining: number
  averageAccuracy: number
  totalPredictions: number
  systemLoad: number
}

export default function AIDashboard() {
  const [forecastData, setForecastData] = useState<ForecastData[]>([])
  const [models, setModels] = useState<ModelMetrics[]>([])
  const [trends, setTrends] = useState<TrendData | null>(null)
  const [systemStatus, setSystemStatus] = useState<AISystemStatus | null>(null)
  const [selectedProduct, setSelectedProduct] = useState('')
  const [forecastDays, setForecastDays] = useState(30)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Mock products for demo
  const products = [
    { id: '1', name: 'Product A' },
    { id: '2', name: 'Product B' },
    { id: '3', name: 'Product C' }
  ]

  useEffect(() => {
    loadSystemStatus()
    loadModels()
  }, [])

  const loadSystemStatus = async () => {
    try {
      const response = await fetch('/api/ai/status', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
      const data = await response.json()
      if (data.success) {
        setSystemStatus(data.data)
      }
    } catch (error) {
      console.error('Failed to load AI system status:', error)
    }
  }

  const loadModels = async () => {
    try {
      const response = await fetch('/api/ai/models', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
      const data = await response.json()
      if (data.success) {
        setModels(data.data)
      }
    } catch (error) {
      console.error('Failed to load models:', error)
    }
  }

  const generateForecast = async () => {
    if (!selectedProduct) {
      setError('Please select a product')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/ai/forecast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          productId: selectedProduct,
          forecastDays,
          includeSeasonality: true,
          includeExternalFactors: true
        })
      })

      const data = await response.json()
      if (data.success) {
        setForecastData(data.data.predictions.map((pred: any) => ({
          date: new Date(pred.date).toLocaleDateString(),
          predictedDemand: pred.predictedDemand,
          confidence: pred.confidence * 100,
          upperBound: pred.upperBound,
          lowerBound: pred.lowerBound
        })))
      } else {
        setError(data.error || 'Failed to generate forecast')
      }
    } catch (error) {
      setError('Network error occurred')
    } finally {
      setLoading(false)
    }
  }

  const loadTrends = async () => {
    if (!selectedProduct) return

    try {
      const response = await fetch(`/api/ai/trends?productId=${selectedProduct}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
      const data = await response.json()
      if (data.success) {
        setTrends(data.data)
      }
    } catch (error) {
      console.error('Failed to load trends:', error)
    }
  }

  const retrainModel = async (modelId: string) => {
    try {
      const response = await fetch(`/api/ai/check-retrain/${modelId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      const data = await response.json()
      if (data.success) {
        await loadModels() // Refresh models list
        alert('Model retraining check completed')
      } else {
        alert(data.error || 'Failed to check model retraining')
      }
    } catch (error) {
      alert('Network error occurred')
    }
  }

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'HEALTHY': return 'text-green-600'
      case 'WARNING': return 'text-yellow-600'
      case 'ERROR': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'increasing': return <TrendingUp className="h-4 w-4 text-green-600" />
      case 'decreasing': return <TrendingDown className="h-4 w-4 text-red-600" />
      default: return <Activity className="h-4 w-4 text-blue-600" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Demand Forecasting</h1>
          <p className="text-muted-foreground">
            Advanced AI-powered demand prediction and inventory optimization
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="flex items-center space-x-1">
            <Brain className="h-3 w-3" />
            <span>AI Enabled</span>
          </Badge>
          {systemStatus && (
            <Badge 
              variant={systemStatus.systemHealth === 'HEALTHY' ? 'default' : 'destructive'}
              className="flex items-center space-x-1"
            >
              <Activity className="h-3 w-3" />
              <span>{systemStatus.systemHealth}</span>
            </Badge>
          )}
        </div>
      </div>

      {/* System Status Overview */}
      {systemStatus && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Target className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="text-sm font-medium">Active Models</p>
                  <p className="text-2xl font-bold">{systemStatus.modelsActive}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-sm font-medium">Avg Accuracy</p>
                  <p className="text-2xl font-bold">{Math.round(systemStatus.averageAccuracy * 100)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Zap className="h-4 w-4 text-yellow-600" />
                <div>
                  <p className="text-sm font-medium">Predictions</p>
                  <p className="text-2xl font-bold">{systemStatus.totalPredictions.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-purple-600" />
                <div>
                  <p className="text-sm font-medium">System Load</p>
                  <p className="text-2xl font-bold">{systemStatus.systemLoad}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="forecast" className="space-y-4">
        <TabsList>
          <TabsTrigger value="forecast">Demand Forecast</TabsTrigger>
          <TabsTrigger value="models">Model Management</TabsTrigger>
          <TabsTrigger value="trends">Trend Analysis</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
        </TabsList>

        {/* Forecast Tab */}
        <TabsContent value="forecast" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>Generate Demand Forecast</span>
              </CardTitle>
              <CardDescription>
                Create AI-powered demand predictions for inventory planning
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="product">Product</Label>
                  <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map(product => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="days">Forecast Days</Label>
                  <Input
                    id="days"
                    type="number"
                    value={forecastDays}
                    onChange={(e) => setForecastDays(Number(e.target.value))}
                    min="1"
                    max="365"
                  />
                </div>
                <div className="flex items-end">
                  <Button 
                    onClick={generateForecast} 
                    disabled={loading}
                    className="w-full"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Brain className="mr-2 h-4 w-4" />
                        Generate Forecast
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {forecastData.length > 0 && (
                <div className="space-y-4">
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={forecastData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Line 
                          type="monotone" 
                          dataKey="predictedDemand" 
                          stroke="#2563eb" 
                          strokeWidth={2}
                          name="Predicted Demand"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="upperBound" 
                          stroke="#dc2626" 
                          strokeDasharray="5 5"
                          name="Upper Bound"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="lowerBound" 
                          stroke="#16a34a" 
                          strokeDasharray="5 5"
                          name="Lower Bound"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-center">
                          <p className="text-sm font-medium text-muted-foreground">Avg Confidence</p>
                          <p className="text-2xl font-bold">
                            {Math.round(forecastData.reduce((acc, d) => acc + d.confidence, 0) / forecastData.length)}%
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-center">
                          <p className="text-sm font-medium text-muted-foreground">Peak Demand</p>
                          <p className="text-2xl font-bold">
                            {Math.max(...forecastData.map(d => d.predictedDemand))}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="text-center">
                          <p className="text-sm font-medium text-muted-foreground">Total Forecast</p>
                          <p className="text-2xl font-bold">
                            {forecastData.reduce((acc, d) => acc + d.predictedDemand, 0).toLocaleString()}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Models Tab */}
        <TabsContent value="models" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="h-5 w-5" />
                <span>AI Model Management</span>
              </CardTitle>
              <CardDescription>
                Monitor and manage AI forecasting models
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {models.map((model) => (
                  <div key={model.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium">{model.modelType} Model</h3>
                        <Badge variant={model.isActive ? 'default' : 'secondary'}>
                          {model.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Accuracy: {Math.round(model.accuracy * 100)}% • 
                        Last trained: {new Date(model.lastTrained).toLocaleDateString()} • 
                        {model.trainingDataPoints} data points
                      </p>
                      <Progress value={model.accuracy * 100} className="w-48" />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => retrainModel(model.id)}
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Check Retrain
                      </Button>
                    </div>
                  </div>
                ))}

                {models.length === 0 && (
                  <div className="text-center py-8">
                    <Brain className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-2 text-sm font-medium">No models found</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Generate your first forecast to create AI models
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Seasonal Trend Analysis</span>
              </CardTitle>
              <CardDescription>
                Analyze seasonal patterns and demand trends
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4">
                <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map(product => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={loadTrends} disabled={!selectedProduct}>
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Analyze Trends
                </Button>
              </div>

              {trends && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">Seasonality Detected</p>
                            <p className="text-2xl font-bold">
                              {trends.seasonalityDetected ? 'Yes' : 'No'}
                            </p>
                          </div>
                          {trends.seasonalityDetected ? (
                            <CheckCircle className="h-8 w-8 text-green-600" />
                          ) : (
                            <AlertTriangle className="h-8 w-8 text-yellow-600" />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">Trend Direction</p>
                            <p className="text-2xl font-bold capitalize">{trends.trendDirection}</p>
                          </div>
                          {getTrendIcon(trends.trendDirection)}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {trends.seasonalPattern.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Seasonal Pattern</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={trends.seasonalPattern}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="period" />
                              <YAxis />
                              <Tooltip />
                              <Bar dataKey="factor" fill="#2563eb" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Brain className="h-5 w-5" />
                <span>AI-Powered Insights</span>
              </CardTitle>
              <CardDescription>
                Actionable business insights from AI analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <TrendingUp className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Demand Pattern Detected:</strong> Sales peak on Fridays and Saturdays. 
                    Consider adjusting staff schedules for 20% increase in weekend demand.
                  </AlertDescription>
                </Alert>
                <Alert>
                  <BarChart3 className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Seasonal Opportunity:</strong> Electronics category shows 15% increase in winter months. 
                    Recommend increasing inventory by 15% in Q4.
                  </AlertDescription>
                </Alert>
                <Alert>
                  <Target className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Inventory Optimization:</strong> Reducing slow-moving inventory could free up $12,000 in capital. 
                    Consider clearance sales for items with low turnover.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}