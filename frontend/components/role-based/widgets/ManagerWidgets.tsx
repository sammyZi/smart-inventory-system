'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card'
import { Badge } from '../../ui/badge'
import { Button } from '../../ui/button'
import { Progress } from '../../ui/progress'
import { 
  Target, 
  Users, 
  Package, 
  AlertTriangle, 
  Clock,
  TrendingUp,
  Star,
  UserPlus,
  ClipboardList
} from 'lucide-react'

interface ManagerMetrics {
  todaysSales: number
  salesTarget: number
  staffOnDuty: number
  totalStaff: number
  lowStockItems: number
  customerSatisfaction: number
  pendingTasks: number
  weeklyGrowth: number
}

interface ManagerWidgetsProps {
  metrics?: ManagerMetrics
}

export function ManagerWidgets({ metrics = defaultMetrics }: ManagerWidgetsProps) {
  const salesProgress = (metrics.todaysSales / metrics.salesTarget) * 100
  const staffUtilization = (metrics.staffOnDuty / metrics.totalStaff) * 100

  return (
    <div className="space-y-6">
      {/* Sales Target Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Target className="h-5 w-5 mr-2" />
            Today's Sales Progress
          </CardTitle>
          <CardDescription>Track your store's daily performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-2xl font-bold">${metrics.todaysSales.toLocaleString()}</span>
              <span className="text-muted-foreground">/ ${metrics.salesTarget.toLocaleString()}</span>
            </div>
            <Progress value={salesProgress} className="h-3" />
            <div className="flex justify-between text-sm">
              <span className={salesProgress >= 100 ? "text-green-600" : salesProgress >= 75 ? "text-orange-600" : "text-red-600"}>
                {salesProgress.toFixed(1)}% Complete
              </span>
              <span className="text-muted-foreground">
                ${(metrics.salesTarget - metrics.todaysSales).toLocaleString()} remaining
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Staff on Duty</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.staffOnDuty}/{metrics.totalStaff}</div>
            <p className="text-xs text-muted-foreground">
              {staffUtilization.toFixed(0)}% utilization
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
              Need attention
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
              This week's average
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.pendingTasks}</div>
            <p className="text-xs text-muted-foreground">
              Due today
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Staff Management & Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Staff Management
            </CardTitle>
            <CardDescription>Current staff status and quick actions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 border rounded">
                  <div>
                    <p className="font-medium">John Smith</p>
                    <p className="text-sm text-muted-foreground">Cashier - Shift: 9AM-5PM</p>
                  </div>
                  <Badge variant="outline" className="text-green-600">On Duty</Badge>
                </div>
                
                <div className="flex justify-between items-center p-3 border rounded">
                  <div>
                    <p className="font-medium">Sarah Johnson</p>
                    <p className="text-sm text-muted-foreground">Sales Associate - Shift: 1PM-9PM</p>
                  </div>
                  <Badge variant="outline" className="text-green-600">On Duty</Badge>
                </div>
                
                <div className="flex justify-between items-center p-3 border rounded">
                  <div>
                    <p className="font-medium">Mike Wilson</p>
                    <p className="text-sm text-muted-foreground">Cashier - Shift: 5PM-1AM</p>
                  </div>
                  <Badge variant="outline" className="text-gray-500">Off Duty</Badge>
                </div>
              </div>
              
              <Button className="w-full">
                <UserPlus className="h-4 w-4 mr-2" />
                Manage Staff Schedule
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <ClipboardList className="h-5 w-5 mr-2" />
              Daily Tasks
            </CardTitle>
            <CardDescription>Important tasks and reminders</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <p className="font-medium">Morning Stock Count</p>
                    <p className="text-sm text-muted-foreground">Electronics section</p>
                  </div>
                  <Badge variant="outline" className="text-orange-600">Pending</Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <p className="font-medium">Staff Meeting</p>
                    <p className="text-sm text-muted-foreground">3:00 PM - Break room</p>
                  </div>
                  <Badge variant="outline" className="text-blue-600">Scheduled</Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <p className="font-medium">Inventory Report</p>
                    <p className="text-sm text-muted-foreground">Weekly submission</p>
                  </div>
                  <Badge variant="outline" className="text-green-600">Complete</Badge>
                </div>
              </div>
              
              <Button variant="outline" className="w-full">
                View All Tasks
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="h-5 w-5 mr-2" />
            Store Performance Insights
          </CardTitle>
          <CardDescription>Weekly trends and recommendations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 border rounded">
                <div className="text-2xl font-bold text-green-600">+{metrics.weeklyGrowth}%</div>
                <p className="text-sm text-muted-foreground">Sales Growth</p>
                <p className="text-xs text-muted-foreground mt-1">vs last week</p>
              </div>
              
              <div className="text-center p-4 border rounded">
                <div className="text-2xl font-bold text-blue-600">87%</div>
                <p className="text-sm text-muted-foreground">Inventory Turnover</p>
                <p className="text-xs text-muted-foreground mt-1">Above target</p>
              </div>
              
              <div className="text-center p-4 border rounded">
                <div className="text-2xl font-bold text-purple-600">4.2min</div>
                <p className="text-sm text-muted-foreground">Avg Service Time</p>
                <p className="text-xs text-muted-foreground mt-1">Improved</p>
              </div>
            </div>
            
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">💡 Recommendation</h4>
              <p className="text-sm text-blue-800">
                Consider scheduling additional staff during 2-4 PM peak hours to reduce customer wait times.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

const defaultMetrics: ManagerMetrics = {
  todaysSales: 1234,
  salesTarget: 2000,
  staffOnDuty: 6,
  totalStaff: 8,
  lowStockItems: 12,
  customerSatisfaction: 4.8,
  pendingTasks: 3,
  weeklyGrowth: 15.2
}