"use client"

import { useAuth } from "@/components/auth-provider"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BarChart3, TrendingUp, Download, Calendar, DollarSign, Package, Users, ShoppingCart } from 'lucide-react'
import { sampleSales, sampleProducts, sampleUsers } from "@/lib/sample-data"

export default function AdminReportsPage() {
  const { user } = useAuth()

  if (!user || user.role !== "admin") {
    return <div>Access denied</div>
  }

  const totalRevenue = sampleSales.reduce((sum, sale) => sum + sale.total, 0)
  const totalProducts = sampleProducts.length
  const totalUsers = sampleUsers.length
  const totalSales = sampleSales.length

  const topProducts = sampleProducts
    .sort((a, b) => b.price * (100 - b.stock) - a.price * (100 - a.stock))
    .slice(0, 5)

  return (
    <DashboardLayout sidebar={<AdminSidebar />} title="Reports & Analytics">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Reports</h2>
            <p className="text-gray-600 mt-1">Business insights and analytics</p>
          </div>
          
          <div className="flex space-x-3">
            <Button variant="outline" className="shadow-sm">
              <Calendar className="h-4 w-4 mr-2" />
              Date Range
            </Button>
            <Button className="gradient-bg shadow-lg">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="stat-card card-hover">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-3xl font-bold text-green-600">₹{totalRevenue.toLocaleString()}</p>
                  <p className="text-sm text-green-600 flex items-center mt-1">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    +12.5% from last month
                  </p>
                </div>
                <div className="bg-green-100 p-3 rounded-full">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="stat-card card-hover">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Sales</p>
                  <p className="text-3xl font-bold text-blue-600">{totalSales}</p>
                  <p className="text-sm text-blue-600 flex items-center mt-1">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    +8.2% from last month
                  </p>
                </div>
                <div className="bg-blue-100 p-3 rounded-full">
                  <ShoppingCart className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="stat-card card-hover">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Products</p>
                  <p className="text-3xl font-bold text-purple-600">{totalProducts}</p>
                  <p className="text-sm text-purple-600 flex items-center mt-1">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    +5 new this month
                  </p>
                </div>
                <div className="bg-purple-100 p-3 rounded-full">
                  <Package className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="stat-card card-hover">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Users</p>
                  <p className="text-3xl font-bold text-orange-600">{totalUsers}</p>
                  <p className="text-sm text-orange-600 flex items-center mt-1">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    All active
                  </p>
                </div>
                <div className="bg-orange-100 p-3 rounded-full">
                  <Users className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sales Chart Placeholder */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Sales Trend
              </CardTitle>
              <CardDescription>Monthly sales performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Sales chart would be displayed here</p>
                  <p className="text-sm text-gray-400">Integration with charting library needed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top Products */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Top Performing Products</CardTitle>
              <CardDescription>Based on sales volume and revenue</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topProducts.map((product, index) => (
                  <div key={product.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-gray-500">SKU: {product.sku}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">₹{product.price.toLocaleString()}</p>
                      <Badge variant="secondary" className="text-xs">
                        {product.stock} in stock
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Report Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="card-hover cursor-pointer">
            <CardContent className="p-6 text-center">
              <div className="bg-blue-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <BarChart3 className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Inventory Report</h3>
              <p className="text-gray-600 text-sm">Detailed stock levels and movements</p>
            </CardContent>
          </Card>
          
          <Card className="card-hover cursor-pointer">
            <CardContent className="p-6 text-center">
              <div className="bg-green-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Financial Report</h3>
              <p className="text-gray-600 text-sm">Revenue, profit, and expense analysis</p>
            </CardContent>
          </Card>
          
          <Card className="card-hover cursor-pointer">
            <CardContent className="p-6 text-center">
              <div className="bg-purple-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Users className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">User Activity</h3>
              <p className="text-gray-600 text-sm">Staff performance and activity logs</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
