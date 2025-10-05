"use client"

import { useAuth } from "@/components/auth-provider"
import { RoleBasedLayout } from "@/components/layout/RoleBasedLayout"
import { RoleBasedDashboard } from "@/components/role-based/RoleBasedDashboard"
import { RoleGuard, AdminOnly, ManagerAndAbove } from "@/components/role-based/RoleGuard"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Package, ShoppingCart, TrendingUp, DollarSign, Building2, Settings, Shield } from 'lucide-react'
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { UserRole, ROLE_DESCRIPTIONS } from "@/lib/permissions"

export default function AdminDashboard() {
  const { user, tenant, accessToken } = useAuth()
  const router = useRouter()
  const [analytics, setAnalytics] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Allow all authenticated users to access dashboard, but show role-appropriate content
  useEffect(() => {
    if (user && !['ADMIN', 'MANAGER', 'STAFF', 'CUSTOMER'].includes(user.role)) {
      router.push("/login")
    }
  }, [user, router])

  useEffect(() => {
    if (accessToken && user && ['ADMIN', 'MANAGER'].includes(user.role)) {
      fetchAnalytics()
    }
  }, [accessToken, user])

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/billing/analytics?period=today`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setAnalytics(data.data)
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  const userRole = user.role as UserRole
  const roleInfo = ROLE_DESCRIPTIONS[userRole]

  if (isLoading) {
    return (
      <RoleBasedLayout title="Admin Dashboard">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </RoleBasedLayout>
    )
  }

  return (
    <RoleGuard allowedRoles={['ADMIN', 'MANAGER', 'STAFF', 'CUSTOMER']}>
      <RoleBasedLayout title={`${roleInfo.title} Dashboard`}>
        <div className="container mx-auto p-6 space-y-6">
          {/* Welcome Header with Role Badge */}
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-3xl font-bold">Welcome back, {user.firstName} {user.lastName}</h2>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  {userRole}
                </Badge>
              </div>
              <p className="text-muted-foreground">
                {roleInfo.description} - {tenant?.companyName && `Managing ${tenant.companyName}`}
              </p>
            </div>
            <AdminOnly>
              <Button variant="outline" onClick={() => router.push('/admin/settings')}>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </AdminOnly>
          </div>

          {/* Role-Based Dashboard Component */}
          <RoleBasedDashboard />

          {/* Business Overview - Admin and Manager only */}
          <ManagerAndAbove>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building2 className="h-5 w-5 mr-2" />
                  Business Overview
                </CardTitle>
                <CardDescription>Your business information and locations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Company Name</Label>
                    <p className="text-lg font-semibold">{tenant?.companyName}</p>
                  </div>
                  <AdminOnly>
                    <div>
                      <Label className="text-sm font-medium">Admin Email</Label>
                      <p className="text-sm text-muted-foreground">{tenant?.adminEmail}</p>
                    </div>
                  </AdminOnly>
                  <div>
                    <Label className="text-sm font-medium">
                      {userRole === 'ADMIN' ? 'Total Locations' : 'Your Locations'}
                    </Label>
                    <p className="text-lg font-semibold">{tenant?.locations?.length || 0}</p>
                  </div>
                </div>
                
                {tenant?.locations && tenant.locations.length > 0 && (
                  <div className="mt-4">
                    <Label className="text-sm font-medium">
                      {userRole === 'ADMIN' ? 'All Locations' : 'Assigned Locations'}
                    </Label>
                    <div className="mt-2 space-y-2">
                      {tenant.locations.map((location) => (
                        <div key={location.id} className="flex items-center justify-between p-2 border rounded">
                          <div>
                            <p className="font-medium">{location.name}</p>
                            <p className="text-sm text-muted-foreground">{location.address || 'No address set'}</p>
                          </div>
                          <ManagerAndAbove>
                            <Button variant="ghost" size="sm" onClick={() => router.push(`/admin/stores/${location.id}`)}>
                              Manage
                            </Button>
                          </ManagerAndAbove>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </ManagerAndAbove>

          {/* Analytics Stats - Admin and Manager only */}
          <ManagerAndAbove>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {userRole === 'ADMIN' ? "Total Sales" : "Store Sales"}
                  </CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${analytics?.totalSales?.toFixed(2) || '0.00'}</div>
                  <p className="text-xs text-muted-foreground">
                    From {analytics?.totalTransactions || 0} transactions
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Transactions</CardTitle>
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics?.totalTransactions || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Avg: ${analytics?.averageOrderValue?.toFixed(2) || '0.00'} per order
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Products</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics?.topProducts?.length || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {userRole === 'ADMIN' ? 'All products' : 'Store products'}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Locations</CardTitle>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{tenant?.locations?.length || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    {userRole === 'ADMIN' ? 'All locations' : 'Assigned locations'}
                  </p>
                </CardContent>
              </Card>
            </div>
          </ManagerAndAbove>

          {/* Analytics and Actions - Role-based content */}
          <ManagerAndAbove>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Products */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Products Today</CardTitle>
                  <CardDescription>
                    {userRole === 'ADMIN' ? 'Best selling products across all stores.' : 'Best selling products in your store.'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {analytics?.topProducts && analytics.topProducts.length > 0 ? (
                    <div className="space-y-4">
                      {analytics.topProducts.slice(0, 5).map((product: any, index: number) => (
                        <div key={product.productId} className="flex items-center">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                            <span className="text-sm font-medium">#{index + 1}</span>
                          </div>
                          <div className="space-y-1 flex-1">
                            <p className="text-sm font-medium leading-none">{product.productName}</p>
                            <p className="text-sm text-muted-foreground">Qty: {product.quantity}</p>
                          </div>
                          <div className="font-medium">${product.revenue.toFixed(2)}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      <ShoppingCart className="h-8 w-8 mx-auto mb-2" />
                      <p>No sales data available yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Role-Based Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>
                    {userRole === 'ADMIN' ? 'Administrative tasks.' : 'Management tasks for your role.'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {userRole === 'ADMIN' && (
                      <>
                        <Button 
                          variant="outline" 
                          className="h-20 flex-col"
                          onClick={() => router.push('/admin/products')}
                        >
                          <Package className="h-6 w-6 mb-2" />
                          Manage Products
                        </Button>
                        <Button 
                          variant="outline" 
                          className="h-20 flex-col"
                          onClick={() => router.push('/admin/stores')}
                        >
                          <Building2 className="h-6 w-6 mb-2" />
                          Manage Stores
                        </Button>
                        <Button 
                          variant="outline" 
                          className="h-20 flex-col"
                          onClick={() => router.push('/admin/users')}
                        >
                          <Users className="h-6 w-6 mb-2" />
                          Manage Users
                        </Button>
                        <Button 
                          variant="outline" 
                          className="h-20 flex-col"
                          onClick={() => router.push('/admin/reports')}
                        >
                          <TrendingUp className="h-6 w-6 mb-2" />
                          System Reports
                        </Button>
                      </>
                    )}
                    {userRole === 'MANAGER' && (
                      <>
                        <Button 
                          variant="outline" 
                          className="h-20 flex-col"
                          onClick={() => router.push('/manager/inventory')}
                        >
                          <Package className="h-6 w-6 mb-2" />
                          Manage Inventory
                        </Button>
                        <Button 
                          variant="outline" 
                          className="h-20 flex-col"
                          onClick={() => router.push('/manager/staff')}
                        >
                          <Users className="h-6 w-6 mb-2" />
                          Manage Staff
                        </Button>
                        <Button 
                          variant="outline" 
                          className="h-20 flex-col"
                          onClick={() => router.push('/manager/sales')}
                        >
                          <ShoppingCart className="h-6 w-6 mb-2" />
                          Sales Overview
                        </Button>
                        <Button 
                          variant="outline" 
                          className="h-20 flex-col"
                          onClick={() => router.push('/manager/reports')}
                        >
                          <TrendingUp className="h-6 w-6 mb-2" />
                          Store Reports
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </ManagerAndAbove>
        </div>
      </RoleBasedLayout>
    </RoleGuard>
  )
}
