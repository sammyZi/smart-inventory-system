"use client"

import { useAuth } from "@/components/auth-provider"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { ManagerSidebar } from "@/components/manager/manager-sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Package, TrendingDown, TrendingUp, AlertTriangle, ShoppingCart, BarChart3 } from 'lucide-react'
import { sampleProducts, sampleSales, sampleStockMovements } from "@/lib/sample-data"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function ManagerDashboard() {
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user && user.role !== "store_manager") {
      router.push("/login")
    }
  }, [user, router])

  if (!user || user.role !== "store_manager") {
    return <div>Loading...</div>
  }

  const totalProducts = sampleProducts.length
  const lowStockProducts = sampleProducts.filter(p => p.stock <= p.minStock)
  const outOfStockProducts = sampleProducts.filter(p => p.stock === 0)
  const totalValue = sampleProducts.reduce((sum, p) => sum + (p.stock * p.cost), 0)
  
  const recentMovements = sampleStockMovements.slice(0, 5)
  const todaySales = sampleSales.filter(sale => 
    sale.createdAt.toDateString() === new Date().toDateString()
  ).length

  return (
    <DashboardLayout 
      sidebar={<ManagerSidebar />} 
      title="Store Manager Dashboard"
    >
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Welcome, {user.name}</h2>
            <p className="text-gray-600 mt-1">Here's your store's performance at a glance</p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-sm text-green-600 font-medium">Store is active</span>
          </div>
        </div>

        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="shadow-sm bg-white/95 backdrop-blur-sm border border-gray-200/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold text-gray-600">Total Products</CardTitle>
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <Package className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                {totalProducts}
              </div>
              <p className="text-sm text-gray-600 font-medium mt-1">
                Active inventory items
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm bg-white/95 backdrop-blur-sm border border-gray-200/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold text-gray-600">Low Stock</CardTitle>
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${lowStockProducts.length > 5 ? 'text-red-600' : 'text-amber-600'}`}>
                {lowStockProducts.length}
              </div>
              <p className="text-sm text-amber-600 font-medium mt-1">
                Items need restocking
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm bg-white/95 backdrop-blur-sm border border-gray-200/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold text-gray-600">Out of Stock</CardTitle>
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center">
                <TrendingDown className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${outOfStockProducts.length > 0 ? 'text-red-600' : 'text-gray-600'}`}>
                {outOfStockProducts.length}
              </div>
              <p className="text-sm text-red-600 font-medium mt-1">
                Urgent restocking needed
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-sm bg-white/95 backdrop-blur-sm border border-gray-200/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold text-gray-600">Inventory Value</CardTitle>
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                ₹{totalValue.toLocaleString()}
              </div>
              <p className="text-sm text-green-600 font-medium mt-1">
                Total stock value
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Enhanced Stock Alerts */}
          <Card className="shadow-sm bg-white/95 backdrop-blur-sm border border-gray-200/50">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl text-gray-900">Stock Alerts</CardTitle>
                  <CardDescription className="text-gray-600">Products requiring immediate attention</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {lowStockProducts.concat(outOfStockProducts).slice(0, 5).map((product, index) => (
                  <div key={product.id} className="flex items-center justify-between p-4 rounded-lg bg-white/80 border border-gray-200/50 hover:bg-white/90 transition-all duration-300">
                    <div className="flex items-center space-x-4">
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${product.stock === 0 ? 'from-red-500 to-rose-600' : 'from-amber-500 to-orange-600'} flex items-center justify-center text-white font-semibold text-sm`}>
                        !
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{product.name}</p>
                        <p className="text-sm text-gray-600">SKU: {product.sku}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={product.stock === 0 ? "destructive" : "secondary"} className="font-semibold">
                        {product.stock} left
                      </Badge>
                      <p className="text-xs text-gray-500 mt-1">
                        Min required: {product.minStock}
                      </p>
                    </div>
                  </div>
                ))}
                {lowStockProducts.length === 0 && outOfStockProducts.length === 0 && (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                      <Package className="h-8 w-8 text-green-600" />
                    </div>
                    <p className="text-gray-600 font-medium">
                      🎉 All products are well stocked!
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      No items require immediate restocking
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Recent Stock Movements */}
          <Card className="shadow-sm bg-white/95 backdrop-blur-sm border border-gray-200/50">
            <CardHeader>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl text-gray-900">Recent Stock Movements</CardTitle>
                  <CardDescription className="text-gray-600">Latest inventory changes in your store</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentMovements.map((movement, index) => (
                  <div key={movement.id} className="flex items-center justify-between p-4 rounded-lg bg-white/80 border border-gray-200/50 hover:bg-white/90 transition-all duration-300">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br ${movement.type === 'in' ? 'from-green-500 to-emerald-600' : movement.type === 'out' ? 'from-red-500 to-rose-600' : 'from-blue-500 to-indigo-600'}`}>
                        {movement.type === "in" ? (
                          <TrendingUp className="h-5 w-5 text-white" />
                        ) : movement.type === "out" ? (
                          <TrendingDown className="h-5 w-5 text-white" />
                        ) : (
                          <BarChart3 className="h-5 w-5 text-white" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{movement.productName}</p>
                        <p className="text-sm text-gray-600">{movement.reason}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge 
                        variant={movement.type === "in" ? "default" : movement.type === "out" ? "destructive" : "secondary"}
                        className="font-semibold"
                      >
                        {movement.type === "in" ? "+" : movement.type === "out" ? "-" : ""}
                        {Math.abs(movement.quantity)}
                      </Badge>
                      <p className="text-xs text-gray-500 mt-1">
                        {movement.createdAt.toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Quick Actions */}
        <Card className="shadow-sm bg-white/95 backdrop-blur-sm border border-gray-200/50">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-sky-500 to-cyan-600 flex items-center justify-center">
                <ShoppingCart className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl text-gray-900">Quick Actions</CardTitle>
                <CardDescription className="text-gray-600">Common inventory management tasks</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="shadow-sm bg-white/80 border border-gray-200/50 hover:bg-white/90 cursor-pointer p-6 text-center transition-all duration-300">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto mb-4">
                  <Package className="h-8 w-8 text-white" />
                </div>
                <h3 className="font-semibold text-lg text-gray-800">Add New Product</h3>
                <p className="text-sm text-gray-600 mt-1">Create a new inventory item</p>
              </Card>
              
              <Card className="shadow-sm bg-white/80 border border-gray-200/50 hover:bg-white/90 cursor-pointer p-6 text-center transition-all duration-300">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="h-8 w-8 text-white" />
                </div>
                <h3 className="font-semibold text-lg text-gray-800">Stock Adjustment</h3>
                <p className="text-sm text-gray-600 mt-1">Update inventory levels</p>
              </Card>
              
              <Card className="shadow-sm bg-white/80 border border-gray-200/50 hover:bg-white/90 cursor-pointer p-6 text-center transition-all duration-300">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="h-8 w-8 text-white" />
                </div>
                <h3 className="font-semibold text-lg text-gray-800">Generate Report</h3>
                <p className="text-sm text-gray-600 mt-1">View inventory analytics</p>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
