"use client"

import { useAuth } from "@/components/auth-provider"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { ManagerSidebar } from "@/components/manager/manager-sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Bell,
  Package,
  TrendingDown,
  Clock,
  Search,
  Filter,
  Archive
} from 'lucide-react'
import { sampleProducts, sampleSales } from "@/lib/sample-data"
import { useState, useMemo } from "react"

interface Alert {
  id: string
  type: "low_stock" | "out_of_stock" | "high_demand" | "expiry" | "reorder"
  title: string
  message: string
  severity: "critical" | "warning" | "info"
  createdAt: Date
  isRead: boolean
  productId?: string
  productName?: string
  currentStock?: number
  recommendedAction?: string
}

export default function ManagerAlertsPage() {
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [severityFilter, setSeverityFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  if (!user || user.role !== "store_manager") {
    return <div>Access denied</div>
  }

  // Generate sample alerts based on products and sales data
  const alerts: Alert[] = useMemo(() => {
    const alertList: Alert[] = []
    const now = new Date()

    // Low stock alerts
    sampleProducts.filter(product => product.quantity < 20 && product.quantity > 0).forEach(product => {
      alertList.push({
        id: `low_stock_${product.id}`,
        type: "low_stock",
        title: "Low Stock Alert",
        message: `${product.name} is running low on stock`,
        severity: product.quantity < 10 ? "critical" : "warning",
        createdAt: new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        isRead: Math.random() > 0.3,
        productId: product.id,
        productName: product.name,
        currentStock: product.quantity,
        recommendedAction: "Reorder immediately"
      })
    })

    // Out of stock alerts
    sampleProducts.filter(product => product.quantity === 0).forEach(product => {
      alertList.push({
        id: `out_of_stock_${product.id}`,
        type: "out_of_stock",
        title: "Out of Stock",
        message: `${product.name} is completely out of stock`,
        severity: "critical",
        createdAt: new Date(now.getTime() - Math.random() * 3 * 24 * 60 * 60 * 1000),
        isRead: Math.random() > 0.7,
        productId: product.id,
        productName: product.name,
        currentStock: 0,
        recommendedAction: "Emergency reorder required"
      })
    })

    // High demand alerts
    const topSellingProducts = sampleProducts
      .map(product => {
        const soldQuantity = sampleSales.reduce((sum, sale) => 
          sum + (sale.items.find(item => item.productId === product.id)?.quantity || 0), 0
        )
        return { ...product, soldQuantity }
      })
      .filter(product => product.soldQuantity > 50)
      .slice(0, 3)

    topSellingProducts.forEach(product => {
      alertList.push({
        id: `high_demand_${product.id}`,
        type: "high_demand",
        title: "High Demand Product",
        message: `${product.name} has high sales volume`,
        severity: "info",
        createdAt: new Date(now.getTime() - Math.random() * 5 * 24 * 60 * 60 * 1000),
        isRead: Math.random() > 0.5,
        productId: product.id,
        productName: product.name,
        currentStock: product.quantity,
        recommendedAction: "Consider increasing stock levels"
      })
    })

    // Reorder alerts
    sampleProducts.filter(product => product.quantity < 15).slice(0, 5).forEach(product => {
      alertList.push({
        id: `reorder_${product.id}`,
        type: "reorder",
        title: "Reorder Recommended",
        message: `${product.name} should be reordered soon`,
        severity: "warning",
        createdAt: new Date(now.getTime() - Math.random() * 4 * 24 * 60 * 60 * 1000),
        isRead: Math.random() > 0.4,
        productId: product.id,
        productName: product.name,
        currentStock: product.quantity,
        recommendedAction: "Place reorder within 7 days"
      })
    })

    return alertList.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }, [])

  const filteredAlerts = alerts.filter(alert =>
    (typeFilter === "all" || alert.type === typeFilter) &&
    (severityFilter === "all" || alert.severity === severityFilter) &&
    (statusFilter === "all" || 
      (statusFilter === "read" && alert.isRead) || 
      (statusFilter === "unread" && !alert.isRead)) &&
    (alert.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
     alert.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
     alert.productName?.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const criticalAlerts = filteredAlerts.filter(alert => alert.severity === "critical")
  const warningAlerts = filteredAlerts.filter(alert => alert.severity === "warning")
  const unreadAlerts = filteredAlerts.filter(alert => !alert.isRead)

  const getAlertIcon = (type: Alert["type"]) => {
    switch (type) {
      case "low_stock":
      case "out_of_stock":
        return <Package className="h-5 w-5" />
      case "high_demand":
        return <TrendingDown className="h-5 w-5" />
      case "expiry":
        return <Clock className="h-5 w-5" />
      case "reorder":
        return <Bell className="h-5 w-5" />
      default:
        return <AlertTriangle className="h-5 w-5" />
    }
  }

  const getSeverityColor = (severity: Alert["severity"]) => {
    switch (severity) {
      case "critical":
        return "text-red-600 bg-red-50"
      case "warning":
        return "text-orange-600 bg-orange-50"
      case "info":
        return "text-blue-600 bg-blue-50"
      default:
        return "text-gray-600 bg-gray-50"
    }
  }

  const markAsRead = (alertId: string) => {
    console.log(`Marking alert ${alertId} as read`)
  }

  const archiveAlert = (alertId: string) => {
    console.log(`Archiving alert ${alertId}`)
  }

  return (
    <DashboardLayout sidebar={<ManagerSidebar />} title="Alerts & Notifications">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Alerts & Notifications</h2>
            <p className="text-gray-600 mt-1">Monitor critical store operations and stock levels</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="shadow-sm bg-white/95 backdrop-blur-sm border border-gray-200/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Alerts</p>
                  <p className="text-3xl font-bold text-blue-600">{filteredAlerts.length}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  <Bell className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm bg-white/95 backdrop-blur-sm border border-gray-200/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Critical</p>
                  <p className="text-3xl font-bold text-red-600">{criticalAlerts.length}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm bg-white/95 backdrop-blur-sm border border-gray-200/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Warnings</p>
                  <p className="text-3xl font-bold text-orange-600">{warningAlerts.length}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                  <TrendingDown className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-sm bg-white/95 backdrop-blur-sm border border-gray-200/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Unread</p>
                  <p className="text-3xl font-bold text-purple-600">{unreadAlerts.length}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                  <XCircle className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <Card className="shadow-sm bg-white/95 backdrop-blur-sm border border-gray-200/50">
          <CardHeader>
            <CardTitle className="text-gray-900">Filter Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="search-alerts" className="text-gray-700">Search Alerts</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="search-alerts"
                    placeholder="Search alerts..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-12 bg-white/80 border-gray-200/70 focus:border-blue-500/50"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Alert Type</Label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="h-12 bg-white/80 border-gray-200/70 focus:border-blue-500/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="low_stock">Low Stock</SelectItem>
                    <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                    <SelectItem value="high_demand">High Demand</SelectItem>
                    <SelectItem value="reorder">Reorder</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Severity</Label>
                <Select value={severityFilter} onValueChange={setSeverityFilter}>
                  <SelectTrigger className="h-12 bg-white/80 border-gray-200/70 focus:border-blue-500/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Severities</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-12 bg-white/80 border-gray-200/70 focus:border-blue-500/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="unread">Unread</SelectItem>
                    <SelectItem value="read">Read</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alerts List */}
        <Card className="shadow-sm bg-white/95 backdrop-blur-sm border border-gray-200/50">
          <CardHeader>
            <CardTitle className="text-gray-900">Alert List</CardTitle>
            <CardDescription className="text-gray-600">
              {filteredAlerts.length} alert{filteredAlerts.length !== 1 ? 's' : ''} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredAlerts.map((alert) => (
                <div 
                  key={alert.id}
                  className={`p-4 rounded-lg border transition-colors ${
                    alert.isRead 
                      ? 'bg-gray-50/50 border-gray-200' 
                      : 'bg-white border-gray-300 shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className={`p-2 rounded-lg ${getSeverityColor(alert.severity)}`}>
                        {getAlertIcon(alert.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-semibold text-gray-900">{alert.title}</h4>
                          <Badge 
                            variant={
                              alert.severity === "critical" 
                                ? "destructive" 
                                : alert.severity === "warning" 
                                ? "secondary" 
                                : "default"
                            }
                            className="text-xs"
                          >
                            {alert.severity}
                          </Badge>
                          {!alert.isRead && (
                            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                          )}
                        </div>
                        <p className="text-gray-600 text-sm mb-2">{alert.message}</p>
                        {alert.productName && (
                          <div className="text-xs text-gray-500 mb-2">
                            <span className="font-medium">Product:</span> {alert.productName}
                            {alert.currentStock !== undefined && (
                              <span className="ml-4">
                                <span className="font-medium">Current Stock:</span> {alert.currentStock}
                              </span>
                            )}
                          </div>
                        )}
                        {alert.recommendedAction && (
                          <div className="text-xs text-blue-600 font-medium">
                            <span className="font-medium">Recommended:</span> {alert.recommendedAction}
                          </div>
                        )}
                        <div className="text-xs text-gray-400 mt-2">
                          {alert.createdAt.toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      {!alert.isRead && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => markAsRead(alert.id)}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => archiveAlert(alert.id)}
                      >
                        <Archive className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {filteredAlerts.length === 0 && (
              <div className="text-center py-12">
                <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No alerts found</h3>
                <p className="text-gray-600">No alerts match your current filters.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
