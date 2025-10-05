'use client'

import React from 'react'
import { useAuth } from '../auth-provider'
import { UserRole, ROLE_DESCRIPTIONS, getNavigationForRole } from '../../lib/permissions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { 
  LayoutDashboard, 
  Store, 
  Users, 
  Package, 
  BarChart3, 
  Settings,
  ShoppingCart,
  Calculator,
  Search,
  Plus,
  UserPlus,
  Download,
  ClipboardList,
  FileText,
  Phone,
  QrCode,
  MapPin,
  Star,
  HelpCircle,
  ShoppingBag,
  User,
  Brain,
  Wifi,
  Link
} from 'lucide-react'

const iconMap = {
  LayoutDashboard,
  Store,
  Users,
  Package,
  BarChart3,
  Settings,
  ShoppingCart,
  Calculator,
  Search,
  Plus,
  UserPlus,
  Download,
  ClipboardList,
  FileText,
  Phone,
  QrCode,
  MapPin,
  Star,
  HelpCircle,
  ShoppingBag,
  User,
  Brain,
  Wifi,
  Link
}

interface DashboardMetrics {
  title: string
  value: string | number
  change?: string
  trend?: 'up' | 'down' | 'neutral'
}

interface RoleBasedDashboardProps {
  className?: string
}

export function RoleBasedDashboard({ className }: RoleBasedDashboardProps) {
  const { user } = useAuth()
  
  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Please log in to view dashboard</p>
      </div>
    )
  }

  const roleInfo = ROLE_DESCRIPTIONS[user.role as UserRole]
  const navigation = getNavigationForRole(user.role as UserRole)

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Role Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{roleInfo.title} Dashboard</h1>
          <p className="text-muted-foreground">{roleInfo.description}</p>
        </div>
        <Badge variant="outline" className="text-sm">
          {user.role} - {roleInfo.level}
        </Badge>
      </div>

      {/* Role-Specific Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {getRoleMetrics(user.role as UserRole).map((metric, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              {metric.change && (
                <p className={`text-xs ${
                  metric.trend === 'up' ? 'text-green-600' : 
                  metric.trend === 'down' ? 'text-red-600' : 
                  'text-muted-foreground'
                }`}>
                  {metric.change}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks for your role</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {navigation.quickActions.map((action, index) => {
              const Icon = iconMap[action.icon as keyof typeof iconMap] || Plus
              return (
                <Button
                  key={index}
                  variant="outline"
                  className="justify-start"
                  onClick={() => handleQuickAction(action.action)}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {action.label}
                </Button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Role-Specific Content */}
      {user.role === 'ADMIN' && <AdminDashboardContent />}
      {user.role === 'MANAGER' && <ManagerDashboardContent />}
      {user.role === 'STAFF' && <StaffDashboardContent />}
      {user.role === 'CUSTOMER' && <CustomerDashboardContent />}

      {/* Capabilities Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Your Capabilities</CardTitle>
          <CardDescription>What you can do with your current role</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            {roleInfo.capabilities.map((capability, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-sm">{capability}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Role-specific metrics
function getRoleMetrics(role: UserRole): DashboardMetrics[] {
  switch (role) {
    case 'ADMIN':
      return [
        { title: 'Total Stores', value: 5, change: '+2 this month', trend: 'up' },
        { title: 'Total Revenue', value: '$45,231', change: '+20.1% from last month', trend: 'up' },
        { title: 'Active Users', value: 23, change: '+3 new this week', trend: 'up' },
        { title: 'System Health', value: '99.9%', change: 'All systems operational', trend: 'neutral' }
      ]
    case 'MANAGER':
      return [
        { title: 'Store Sales', value: '$12,234', change: '+15% from last week', trend: 'up' },
        { title: 'Inventory Value', value: '$8,456', change: '-2% from last month', trend: 'down' },
        { title: 'Staff Count', value: 8, change: '+1 new hire', trend: 'up' },
        { title: 'Customer Satisfaction', value: '4.8/5', change: '+0.2 this month', trend: 'up' }
      ]
    case 'STAFF':
      return [
        { title: 'Today\'s Sales', value: '$1,234', change: '12 transactions', trend: 'neutral' },
        { title: 'Items Sold', value: 45, change: '+8 from yesterday', trend: 'up' },
        { title: 'Avg Transaction', value: '$28.50', change: '+$3.20 from yesterday', trend: 'up' },
        { title: 'Shift Progress', value: '6/8 hrs', change: '2 hours remaining', trend: 'neutral' }
      ]
    case 'CUSTOMER':
      return [
        { title: 'Loyalty Points', value: 1250, change: '+50 this month', trend: 'up' },
        { title: 'Orders This Month', value: 3, change: '+1 from last month', trend: 'up' },
        { title: 'Total Savings', value: '$45.60', change: 'From discounts & rewards', trend: 'neutral' },
        { title: 'Favorite Store', value: 'Downtown', change: '5 visits this month', trend: 'neutral' }
      ]
    default:
      return []
  }
}

// Role-specific dashboard components
function AdminDashboardContent() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Multi-Store Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Downtown Store</span>
              <span className="text-green-600">$15,234</span>
            </div>
            <div className="flex justify-between">
              <span>Mall Location</span>
              <span className="text-green-600">$12,456</span>
            </div>
            <div className="flex justify-between">
              <span>Airport Branch</span>
              <span className="text-green-600">$8,901</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>System Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Button variant="outline" className="w-full justify-start">
              <Brain className="mr-2 h-4 w-4" />
              AI Forecasting
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Wifi className="mr-2 h-4 w-4" />
              IoT Devices
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Link className="mr-2 h-4 w-4" />
              Blockchain Tracking
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function ManagerDashboardContent() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Store Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Today's Target</span>
              <span>$2,000</span>
            </div>
            <div className="flex justify-between">
              <span>Current Sales</span>
              <span className="text-green-600">$1,234</span>
            </div>
            <div className="flex justify-between">
              <span>Progress</span>
              <span>61.7%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Staff Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>On Duty</span>
              <span>6/8</span>
            </div>
            <div className="flex justify-between">
              <span>Performance</span>
              <span className="text-green-600">Excellent</span>
            </div>
            <Button variant="outline" size="sm" className="w-full">
              <UserPlus className="mr-2 h-4 w-4" />
              Add Staff Member
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function StaffDashboardContent() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>POS Interface</CardTitle>
        <CardDescription>Your point-of-sale workspace</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 md:grid-cols-2">
          <Button className="h-20 flex-col">
            <Calculator className="h-6 w-6 mb-2" />
            New Sale
          </Button>
          <Button variant="outline" className="h-20 flex-col">
            <Search className="h-6 w-6 mb-2" />
            Product Search
          </Button>
          <Button variant="outline" className="h-20 flex-col">
            <QrCode className="h-6 w-6 mb-2" />
            Scan Barcode
          </Button>
          <Button variant="outline" className="h-20 flex-col">
            <Phone className="h-6 w-6 mb-2" />
            Call Manager
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function CustomerDashboardContent() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Order #1234</span>
              <span className="text-green-600">Delivered</span>
            </div>
            <div className="flex justify-between">
              <span>Order #1235</span>
              <span className="text-blue-600">In Transit</span>
            </div>
            <div className="flex justify-between">
              <span>Order #1236</span>
              <span className="text-orange-600">Processing</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Loyalty Rewards</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Current Points</span>
              <span>1,250</span>
            </div>
            <div className="flex justify-between">
              <span>Next Reward</span>
              <span>250 points away</span>
            </div>
            <Button variant="outline" size="sm" className="w-full">
              <Star className="mr-2 h-4 w-4" />
              View Rewards
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Handle quick actions
function handleQuickAction(action: string) {
  switch (action) {
    case 'createStore':
      console.log('Opening create store dialog')
      break
    case 'createManager':
      console.log('Opening create manager dialog')
      break
    case 'backup':
      console.log('Initiating system backup')
      break
    case 'createStaff':
      console.log('Opening create staff dialog')
      break
    case 'stockCount':
      console.log('Starting stock count')
      break
    case 'dailyReport':
      console.log('Generating daily report')
      break
    case 'newSale':
      console.log('Starting new sale')
      break
    case 'callManager':
      console.log('Calling manager for assistance')
      break
    case 'scanProduct':
      console.log('Opening barcode scanner')
      break
    case 'findStore':
      console.log('Opening store locator')
      break
    default:
      console.log('Unknown action:', action)
  }
}