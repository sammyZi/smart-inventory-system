'use client'

/**
 * Advanced AI Dashboard - Multi-Tenant AI Features and Automation
 * Seasonal trends, automated reorders, and intelligent recommendations
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
  Cell,
  AreaChart,
  Area
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
  Activity,
  ShoppingCart,
  Package,
  DollarSign,
  Calendar,
  Users,
  Settings,
  Play,
  Pause,
  Eye,
  AlertCircle,
  Truck,
  FileText
} from 'lucide-react'

interface DashboardSummary {
  reorderRecommendations: {
    total: number
    critical: number
    high: number
    totalCost: number
  }
  performanceAlerts: {
    total: number
    critical: number
    unresolved: number
  }
  aiFeatures: {
    available: number
    enabled: string[]
    limits: Record<string, number>
  }
}

interface ReorderRecommendation {
  id: string
  productName: string
  currentStock: number
  recommendedQuantity: number
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  reasoning: string
  estimatedStockoutDate: string
  confidence: number
  costImpact: {
    totalCost: number
  }
}

interface SeasonalTrend {
  id: string
  productId: string
  pattern: {
    type: string
    peaks: Array<{ period: string; multiplier: number; confidence: number }>
    valleys: Array<{ period: string; multiplier: number; confidence: number }>
  }
  accuracy: number
}

interface PerformanceAlert {
  id: string
  alertType: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  message: string
  actionRequired: string
  isResolved: boolean
  createdAt: string
}

interface ABTest {
  id: string
  name: string
  status: 'DRAFT' | 'RUNNING' | 'COMPLETED' | 'PAUSED'
  modelA: { name: string }
  modelB: { name: string }
  trafficSplit: number
  startDate: string
  endDate: string
  results?: {
    winner: 'A' | 'B' | 'TIE'
    confidence: number
  }
}

export default function AdvancedAIDashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [recommendations, setRecommendations] = useState<ReorderRecommendation[]>([])
  const [seasonalTrends, setSeasonalTrends] = useState<SeasonalTrend[]>([])
  const [performanceAlerts, setPerformanceAlerts] = useState<PerformanceAlert[]>([])
  const [abTests, setAbTests] = useState<ABTest[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadDashboardSummary()
  }, [])

  const loadDashboardSummary = async () => {
    try {
      const response = await fetch('/api/ai/advanced/dashboard-summary', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
      const data = await response.json()
      if (data.success) {
        setSummary(data.data)
      }
    } catch (error) {
      console.error('Failed to load dashboard summary:', error)
    }
  }

  const loadReorderRecommendations = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/ai/advanced/reorder-recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          urgencyThreshold: 'MEDIUM',
          includeSeasonalAdjustment: true
        })
      })
      const data = await response.json()
      if (data.success) {
        setRecommendations(data.data)
      } else {
        setError(data.error || 'Failed to load recommendations')
      }
    } catch (error) {
      setError('Network error occurred')
    } finally {
      setLoading(false)
    }
  }

  const loadSeasonalTrends = async () => {
    try {
      const response = await fetch('/api/ai/advanced/seasonal-trends', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          timeRange: 'last_year'
        })
      })
      const data = await response.json()
      if (data.success) {
        setSeasonalTrends(data.data)
      }
    } catch (error) {
      console.error('Failed to load seasonal trends:', error)
    }
  }

  const loadPerformanceAlerts = async () => {
    try {
      const response = await fetch('/api/ai/advanced/performance-alerts', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
      const data = await response.json()
      if (data.success) {
        setPerformanceAlerts(data.data)
      }
    } catch (error) {
      console.error('Failed to load performance alerts:', error)
    }
  }

  const generatePurchaseOrders = async (recommendationIds: string[]) => {
    try {
      const response = await fetch('/api/ai/advanced/generate-purchase-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          recommendationIds,
          groupBySupplier: true,
          autoApprove: false
        })
      })
      const data = await response.json()
      if (data.success) {
        alert(`Generated ${data.count} purchase orders totaling $${data.totalAmount.toLocaleString()}`)
      } else {
        alert(data.error || 'Failed to generate purchase orders')
      }
    } catch (error) {
      alert('Network error occurred')
    }
  }

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'CRITICAL': return 'text-red-600 bg-red-50'
      case 'HIGH': return 'text-orange-600 bg-orange-50'
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-50'
      default: return 'text-green-600 bg-green-50'
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'text-red-600'
      case 'HIGH': return 'text-orange-600'
      case 'MEDIUM': return 'text-yellow-600'
      default: return 'text-blue-600'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Advanced AI Automation</h1>
          <p className="text-muted-foreground">
            Intelligent inventory management with automated recommendations
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="flex items-center space-x-1">
            <Brain className="h-3 w-3" />
            <span>AI Powered</span>
          </Badge>
          <Badge variant="default" className="flex items-center space-x-1">
            <Zap className="h-3 w-3" />
            <span>Automated</span>
          </Badge>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <ShoppingCart className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="text-sm font-medium">Reorder Recommendations</p>
                  <p className="text-2xl font-bold">{summary.reorderRecommendations.total}</p>
                  <p className="text-xs text-muted-foreground">
                    {summary.reorderRecommendations.critical + summary.reorderRecommendations.high} urgent
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-sm font-medium">Total Order Value</p>
                  <p className="text-2xl font-bold">${summary.reorderRecommendations.totalCost.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Recommended orders</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <div>
                  <p className="text-sm font-medium">Performance Alerts</p>
                  <p className="text-2xl font-bold">{summary.performanceAlerts.total}</p>
                  <p className="text-xs text-muted-foreground">
                    {summary.performanceAlerts.critical} critical
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Brain className="h-4 w-4 text-purple-600" />
                <div>
                  <p className="text-sm font-medium">AI Features</p>
                  <p className="text-2xl font-bold">{summary.aiFeatures.available}</p>
                  <p className="text-xs text-muted-foreground">Available features</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="recommendations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="recommendations">Reorder Recommendations</TabsTrigger>
          <TabsTrigger value="seasonal">Seasonal Trends</TabsTrigger>
          <TabsTrigger value="performance">Performance Monitoring</TabsTrigger>
          <TabsTrigger value="abtests">A/B Testing</TabsTrigger>
        </TabsList>

        {/* Reorder Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Package className="h-5 w-5" />
                <span>Automated Reorder Recommendations</span>
              </CardTitle>
              <CardDescription>
                AI-powered inventory recommendations based on demand forecasting and seasonal trends
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4">
                <Button onClick={loadReorderRecommendations} disabled={loading}>
                  {loading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Brain className="mr-2 h-4 w-4" />
                      Generate Recommendations
                    </>
                  )}
                </Button>
                {recommendations.length > 0 && (
                  <Button 
                    variant="outline"
                    onClick={() => generatePurchaseOrders(recommendations.map(r => r.id))}
                  >
                    <Truck className="mr-2 h-4 w-4" />
                    Generate Purchase Orders
                  </Button>
                )}
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {recommendations.length > 0 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    {recommendations.map((rec) => (
                      <div key={rec.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-medium">{rec.productName}</h3>
                            <Badge className={getUrgencyColor(rec.urgency)}>
                              {rec.urgency}
                            </Badge>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">${rec.costImpact.totalCost.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">Order cost</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Current Stock</p>
                            <p className="font-medium">{rec.currentStock} units</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Recommended Order</p>
                            <p className="font-medium">{rec.recommendedQuantity} units</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Confidence</p>
                            <div className="flex items-center space-x-2">
                              <Progress value={rec.confidence * 100} className="flex-1" />
                              <span className="text-xs">{Math.round(rec.confidence * 100)}%</span>
                            </div>
                          </div>
                        </div>
                        <div className="mt-2">
                          <p className="text-xs text-muted-foreground">{rec.reasoning}</p>
                          <p className="text-xs text-orange-600">
                            Estimated stockout: {new Date(rec.estimatedStockoutDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Seasonal Trends Tab */}
        <TabsContent value="seasonal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>Seasonal Trend Analysis</span>
              </CardTitle>
              <CardDescription>
                AI-detected seasonal patterns and demand fluctuations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={loadSeasonalTrends}>
                <BarChart3 className="mr-2 h-4 w-4" />
                Analyze Seasonal Trends
              </Button>

              {seasonalTrends.length > 0 && (
                <div className="space-y-4">
                  {seasonalTrends.map((trend) => (
                    <div key={trend.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-medium">Product {trend.productId}</h3>
                        <Badge variant="outline">
                          {Math.round(trend.accuracy * 100)}% Accuracy
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-sm font-medium mb-2">Peak Periods</h4>
                          <div className="space-y-1">
                            {trend.pattern.peaks.map((peak, index) => (
                              <div key={index} className="flex justify-between text-sm">
                                <span>{peak.period}</span>
                                <span className="text-green-600">+{Math.round((peak.multiplier - 1) * 100)}%</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium mb-2">Low Periods</h4>
                          <div className="space-y-1">
                            {trend.pattern.valleys.map((valley, index) => (
                              <div key={index} className="flex justify-between text-sm">
                                <span>{valley.period}</span>
                                <span className="text-red-600">{Math.round((valley.multiplier - 1) * 100)}%</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Monitoring Tab */}
        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5" />
                <span>Model Performance Monitoring</span>
              </CardTitle>
              <CardDescription>
                Real-time monitoring of AI model performance and alerts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={loadPerformanceAlerts}>
                <Eye className="mr-2 h-4 w-4" />
                Check Performance
              </Button>

              {performanceAlerts.length > 0 && (
                <div className="space-y-4">
                  {performanceAlerts.map((alert) => (
                    <Alert key={alert.id} variant={alert.severity === 'CRITICAL' ? 'destructive' : 'default'}>
                      <AlertCircle className={`h-4 w-4 ${getSeverityColor(alert.severity)}`} />
                      <AlertDescription>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{alert.message}</span>
                            <Badge variant="outline" className={getSeverityColor(alert.severity)}>
                              {alert.severity}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{alert.actionRequired}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(alert.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}

              {performanceAlerts.length === 0 && (
                <div className="text-center py-8">
                  <CheckCircle className="mx-auto h-12 w-12 text-green-600" />
                  <h3 className="mt-2 text-sm font-medium">All Models Performing Well</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    No performance issues detected
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* A/B Testing Tab */}
        <TabsContent value="abtests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="h-5 w-5" />
                <span>A/B Model Testing</span>
              </CardTitle>
              <CardDescription>
                Compare AI model performance with controlled experiments
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-8">
                <Target className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-medium">A/B Testing Framework</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Create and manage A/B tests to optimize AI model performance
                </p>
                <Button className="mt-4" variant="outline">
                  <Play className="mr-2 h-4 w-4" />
                  Create A/B Test
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}