"use client"

import { useAuth } from "@/components/auth-provider"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, GlassCard, TransparentContainer } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Package, ShoppingCart, TrendingUp, AlertTriangle, DollarSign } from 'lucide-react'
import { sampleProducts, sampleSales, sampleUsers, sampleStores } from "@/lib/sample-data"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

export default function AdminDashboard() {
  const { user } = useAuth()
  const router = useRouter()
  const [selectedStoreId, setSelectedStoreId] = useState<string>("all")

  useEffect(() => {
    if (user && user.role !== "admin") {
      router.push("/login")
    }
  }, [user, router])

  if (!user || user.role !== "admin") {
    return <div>Loading...</div>
  }

  const filteredProducts = selectedStoreId === "all"
    ? sampleProducts
    : sampleProducts.filter(p => p.storeId === selectedStoreId)

  const filteredSales = selectedStoreId === "all"
    ? sampleSales
    : sampleSales.filter(s => s.storeId === selectedStoreId)

  const filteredUsers = selectedStoreId === "all"
    ? sampleUsers.filter(u => u.role !== "admin")
    : sampleUsers.filter(u => u.storeId === selectedStoreId)

  const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.total, 0)
  const lowStockProducts = filteredProducts.filter(p => p.stock <= p.minStock)
  const totalProducts = filteredProducts.length
  const totalUsers = filteredUsers.length
  const totalSales = filteredSales.length

  const recentSales = filteredSales.slice(0, 5)

  // Helper function to determine status color based on performance
  const getStatusColor = (value: number, threshold: { good: number, poor: number }) => {
    if (value >= threshold.good) return 'status-positive'
    if (value <= threshold.poor) return 'status-negative'
    return 'status-warning'
  }

  const revenueGrowth = 12.5 // Simulated growth percentage
  const salesGrowth = 8.2   // Simulated growth percentage

  return (
    <DashboardLayout 
      sidebar={<AdminSidebar />} 
      title="Admin Dashboard"
    >
      <div className="space-y-6">
        {/* Welcome Header */}
        <div>
          <h2 className="text-3xl font-bold">Welcome back, {user.name}</h2>
          <p className="text-muted-foreground">Here's what's happening with your business today.</p>
        </div>

        {/* Store Filter */}
        <Card>
          <CardHeader>
            <CardTitle>Store Management</CardTitle>
            <CardDescription>Filter data by store or manage all stores</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-w-sm space-y-2">
              <Label htmlFor="store-filter">Select Store</Label>
              <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
                <SelectTrigger id="store-filter">
                  <SelectValue placeholder="Select a store" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stores</SelectItem>
                  {sampleStores.map(store => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{totalRevenue.toLocaleString()}</div>
              <p className={`text-xs flex items-center space-x-1 ${getStatusColor(revenueGrowth, { good: 10, poor: 5 })}`}>
                <TrendingUp className="h-3 w-3" />
                <span>+{revenueGrowth}% from last month</span>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+{totalSales}</div>
              <p className={`text-xs flex items-center space-x-1 ${getStatusColor(salesGrowth, { good: 10, poor: 3 })}`}>
                <TrendingUp className="h-3 w-3" />
                <span>+{salesGrowth}% from last month</span>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Products</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalProducts}</div>
              {lowStockProducts.length > 0 ? (
                <p className="text-xs text-amber-600 flex items-center space-x-1">
                  <AlertTriangle className="h-3 w-3" />
                  <span>{lowStockProducts.length} low stock</span>
                </p>
              ) : (
                <p className="text-xs status-positive flex items-center space-x-1">
                  <Package className="h-3 w-3" />
                  <span>All items in stock</span>
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                Active in {selectedStoreId === "all" ? "all stores" : sampleStores.find(s => s.id === selectedStoreId)?.name}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Sales */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Sales</CardTitle>
              <CardDescription>Latest transactions across your stores.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentSales.map(sale => (
                  <div key={sale.id} className="flex items-center">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback>{sale.customerName ? sale.customerName.charAt(0) : 'W'}</AvatarFallback>
                    </Avatar>
                    <div className="ml-4 space-y-1">
                      <p className="text-sm font-medium leading-none">{sale.customerName || "Walk-in Customer"}</p>
                      <p className="text-sm text-muted-foreground">{sale.invoiceNumber}</p>
                    </div>
                    <div className="ml-auto font-medium">₹{sale.total.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Low Stock Alert */}
          <Card>
            <CardHeader>
              <CardTitle>Stock Alerts</CardTitle>
              <CardDescription>Products that need immediate attention.</CardDescription>
            </CardHeader>
            <CardContent>
              {lowStockProducts.length > 0 ? (
                <div className="space-y-4">
                  {lowStockProducts.map(product => (
                    <div key={product.id} className="flex items-center">
                      <div className="w-2 h-2 mr-2 rounded-full bg-destructive" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium leading-none">{product.name}</p>
                        <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
                      </div>
                      <div className="ml-auto font-medium">
                        <Badge variant="destructive">{product.stock} left</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <Package className="h-8 w-8 mx-auto mb-2" />
                  <p>All products are well stocked!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
