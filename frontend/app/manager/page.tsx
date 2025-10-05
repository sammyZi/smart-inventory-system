'use client'

import { useAuth } from "@/components/auth-provider"
import { RoleGuard, ManagerAndAbove } from "@/components/role-based/RoleGuard"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { 
  Users, 
  Package, 
  ShoppingCart, 
  TrendingUp, 
  AlertTriangle, 
  DollarSign, 
  Building2, 
  Clock,
  Target,
  UserPlus,
  ClipboardList,
  FileText,
  Star
} from 'lucide-react'
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

interface StoreMetrics {
  todaysSales: number
  salesTarget: number
  transactionCount: number
  averageOrderValue: number
  staffOnDuty: number
  totalStaff: number
  lowStockItems: number
  customerSatisfaction: number
}

export default function ManagerDashboard() {
  const { user, tenant } = useAuth()
  const router = useRouter()
  const [metrics, setMetrics] = useState<StoreMetrics>({
    todaysSales: 1234.50,
    salesTarget: 2000,
    transactionCount: 45,
    averageOrderValue: 27.43,
    staffOnDuty: 6,
    totalStaff: 8,
    lowStockItems: 12,
    customerSatisfaction: 4.8
  })

  const salesProgress = (metrics.todaysSales / metrics.salesTarget) * 100

  return (
    <RoleGuard allowedRoles={['ADMIN', 'MANAGER']}>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6 space-y-6">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold">Store Manager Dashboard</h1>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  MANAGER
                </Badge>
              </div>
              <p className="text-muted-foreground">
                Welcome back, {user?.firstName}! Here's your store performance today.
              </p>
            </div>
            <Button variant="outline" onClick={() => router.push('/manager/settings')}>
              <Clock className="h-4 w-4 mr-2" />
              Shift Status
            </Button>
          </div>

          {/* Sales Target Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Target className="h-5 w-5 mr-2" />
                Today's Sales Target
              </CardTitle>
              <CardDescription>Track your progress towards daily goals</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-2xl font-bold">${metrics.todaysSales.toFixed(2)}</span>
                  <span className="text-muted-foreground">/ ${metrics.salesTarget.toFixed(2)}</span>
                </div>
                <Progress value={salesProgress} className="h-3" />
                <div className="flex justify-between text-sm">
                  <span className={salesProgress >= 100 ? "text-green-600" : "text-orange-600"}>
                    {salesProgress.toFixed(1)}% Complete
                  </span>
                  <span className="text-muted-foreground">
                    ${(metrics.salesTarget - metrics.todaysSales).toFixed(2)} remaining
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Transactions</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.transactionCount}</div>
                <p className="text-xs text-muted-foreground">
                  Avg: ${metrics.averageOrderValue.toFixed(2)} per order
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Staff on Duty</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.staffOnDuty}/{metrics.totalStaff}</div>
                <p className="text-xs text-muted-foreground">
                  {((metrics.staffOnDuty / metrics.totalStaff) * 100).toFixed(0)}% attendance
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
                <AlertTriangle className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{metrics.lowStockItems}</div>
                <p className="text-xs text-muted-foreground">
                  Require attention
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Customer Rating</CardTitle>
                <Star className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.customerSatisfaction}/5</div>
                <p className="text-xs text-muted-foreground">
                  Based on today's feedback
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Staff Management */}
            <Card>
              <CardHeader>
                <CardTitle>Staff Management</CardTitle>
                <CardDescription>Manage your team and track performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 border rounded">
                    <div>
                      <p className="font-medium">John Smith</p>
                      <p className="text-sm text-muted-foreground">Cashier - On duty</p>
                    </div>
                    <Badge variant="outline" className="text-green-600">Active</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 border rounded">
                    <div>
                      <p className="font-medium">Sarah Johnson</p>
                      <p className="text-sm text-muted-foreground">Sales Associate - On duty</p>
                    </div>
                    <Badge variant="outline" className="text-green-600">Active</Badge>
                  </div>
                  <div className="flex justify-between items-center p-3 border rounded">
                    <div>
                      <p className="font-medium">Mike Wilson</p>
                      <p className="text-sm text-muted-foreground">Cashier - Off duty</p>
                    </div>
                    <Badge variant="outline" className="text-gray-500">Off</Badge>
                  </div>
                  <Button className="w-full" onClick={() => router.push('/manager/staff')}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Manage Staff
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common management tasks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <Button 
                    variant="outline" 
                    className="h-20 flex-col"
                    onClick={() => router.push('/manager/inventory')}
                  >
                    <Package className="h-6 w-6 mb-2" />
                    Inventory
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-20 flex-col"
                    onClick={() => router.push('/manager/sales')}
                  >
                    <ShoppingCart className="h-6 w-6 mb-2" />
                    Sales
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-20 flex-col"
                    onClick={() => router.push('/manager/reports')}
                  >
                    <FileText className="h-6 w-6 mb-2" />
                    Reports
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-20 flex-col"
                    onClick={() => console.log('Stock count initiated')}
                  >
                    <ClipboardList className="h-6 w-6 mb-2" />
                    Stock Count
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Low Stock Alert */}
          {metrics.lowStockItems > 0 && (
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader>
                <CardTitle className="flex items-center text-orange-800">
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  Low Stock Alert
                </CardTitle>
                <CardDescription className="text-orange-700">
                  {metrics.lowStockItems} items need restocking
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span>Product A</span>
                    <Badge variant="outline" className="text-orange-600">5 left</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Product B</span>
                    <Badge variant="outline" className="text-red-600">2 left</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Product C</span>
                    <Badge variant="outline" className="text-orange-600">8 left</Badge>
                  </div>
                </div>
                <Button variant="outline" className="w-full mt-4" onClick={() => router.push('/manager/inventory')}>
                  View All Low Stock Items
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </RoleGuard>
  )
}