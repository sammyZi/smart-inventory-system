'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card'
import { Badge } from '../../ui/badge'
import { Button } from '../../ui/button'
import { Progress } from '../../ui/progress'
import { 
  Building2, 
  Users, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle, 
  Server,
  Database,
  Wifi,
  Brain,
  Link,
  Shield
} from 'lucide-react'

interface AdminMetrics {
  totalStores: number
  totalRevenue: number
  activeUsers: number
  systemHealth: number
  monthlyGrowth: number
  criticalAlerts: number
}

interface AdminWidgetsProps {
  metrics?: AdminMetrics
}

export function AdminWidgets({ metrics = defaultMetrics }: AdminWidgetsProps) {
  return (
    <div className="space-y-6">
      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stores</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalStores}</div>
            <p className="text-xs text-muted-foreground">
              +2 new this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-green-600">
              +{metrics.monthlyGrowth}% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeUsers}</div>
            <p className="text-xs text-muted-foreground">
              Across all locations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.systemHealth}%</div>
            <p className="text-xs text-green-600">
              All systems operational
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Features */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Brain className="h-5 w-5 mr-2" />
              AI & Analytics
            </CardTitle>
            <CardDescription>Advanced system features and insights</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-blue-500" />
                  <span className="text-sm">Demand Forecasting</span>
                </div>
                <Badge variant="outline" className="text-green-600">Active</Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wifi className="h-4 w-4 text-green-500" />
                  <span className="text-sm">IoT Sensors</span>
                </div>
                <Badge variant="outline" className="text-green-600">12 Connected</Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Link className="h-4 w-4 text-purple-500" />
                  <span className="text-sm">Blockchain Tracking</span>
                </div>
                <Badge variant="outline" className="text-green-600">Enabled</Badge>
              </div>
              
              <Button variant="outline" className="w-full">
                Manage Advanced Features
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="h-5 w-5 mr-2" />
              Security & Compliance
            </CardTitle>
            <CardDescription>System security status and alerts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Security Score</span>
                <div className="flex items-center gap-2">
                  <Progress value={95} className="w-20 h-2" />
                  <span className="text-sm font-medium">95%</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm">Data Encryption</span>
                <Badge variant="outline" className="text-green-600">AES-256</Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm">Backup Status</span>
                <Badge variant="outline" className="text-green-600">Up to Date</Badge>
              </div>
              
              {metrics.criticalAlerts > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <span className="text-sm">Critical Alerts</span>
                  </div>
                  <Badge variant="destructive">{metrics.criticalAlerts}</Badge>
                </div>
              )}
              
              <Button variant="outline" className="w-full">
                View Security Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Store Performance Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="h-5 w-5 mr-2" />
            Multi-Store Performance
          </CardTitle>
          <CardDescription>Performance metrics across all locations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Downtown Store</span>
                  <span className="text-sm text-green-600">+15%</span>
                </div>
                <Progress value={85} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>$15,234</span>
                  <span>Target: $18,000</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Mall Location</span>
                  <span className="text-sm text-green-600">+8%</span>
                </div>
                <Progress value={72} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>$12,456</span>
                  <span>Target: $17,000</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Airport Branch</span>
                  <span className="text-sm text-orange-600">-2%</span>
                </div>
                <Progress value={58} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>$8,901</span>
                  <span>Target: $15,000</span>
                </div>
              </div>
            </div>
            
            <Button variant="outline" className="w-full">
              View Detailed Store Analytics
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

const defaultMetrics: AdminMetrics = {
  totalStores: 5,
  totalRevenue: 245231,
  activeUsers: 23,
  systemHealth: 99.9,
  monthlyGrowth: 20.1,
  criticalAlerts: 0
}