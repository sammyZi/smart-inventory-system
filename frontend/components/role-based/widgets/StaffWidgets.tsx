'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card'
import { Badge } from '../../ui/badge'
import { Button } from '../../ui/button'
import { 
  Calculator, 
  ShoppingCart, 
  DollarSign, 
  Clock,
  Phone,
  QrCode,
  Receipt,
  Target,
  TrendingUp
} from 'lucide-react'

interface StaffMetrics {
  todaysSales: number
  transactionCount: number
  averageTransaction: number
  shiftHours: number
  totalShiftHours: number
  personalTarget: number
  customerServed: number
}

interface StaffWidgetsProps {
  metrics?: StaffMetrics
}

export function StaffWidgets({ metrics = defaultMetrics }: StaffWidgetsProps) {
  const shiftProgress = (metrics.shiftHours / metrics.totalShiftHours) * 100
  const targetProgress = (metrics.todaysSales / metrics.personalTarget) * 100

  return (
    <div className="space-y-6">
      {/* Shift Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="h-5 w-5 mr-2" />
            Current Shift Status
          </CardTitle>
          <CardDescription>Your work progress today</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-medium">Shift Progress</span>
              <Badge variant="outline" className="text-green-600">Active</Badge>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{metrics.shiftHours} hours completed</span>
                <span>{metrics.totalShiftHours - metrics.shiftHours} hours remaining</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${shiftProgress}%` }}
                ></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Today's Performance */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Sales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics.todaysSales}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.transactionCount} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Transaction</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics.averageTransaction}</div>
            <p className="text-xs text-muted-foreground">
              Per customer
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customers Served</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.customerServed}</div>
            <p className="text-xs text-muted-foreground">
              Today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Target Progress</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{targetProgress.toFixed(0)}%</div>
            <p className="text-xs text-muted-foreground">
              ${metrics.personalTarget} target
            </p>
          </CardContent>
        </Card>
      </div>

      {/* POS Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calculator className="h-5 w-5 mr-2" />
            POS Quick Actions
          </CardTitle>
          <CardDescription>Common point-of-sale operations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button className="h-20 flex-col">
              <Calculator className="h-6 w-6 mb-2" />
              New Sale
            </Button>
            
            <Button variant="outline" className="h-20 flex-col">
              <QrCode className="h-6 w-6 mb-2" />
              Scan Product
            </Button>
            
            <Button variant="outline" className="h-20 flex-col">
              <Receipt className="h-6 w-6 mb-2" />
              Reprint Receipt
            </Button>
            
            <Button variant="outline" className="h-20 flex-col">
              <Phone className="h-6 w-6 mb-2" />
              Call Manager
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Your last few sales today</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 border rounded">
              <div>
                <p className="font-medium">Transaction #1234</p>
                <p className="text-sm text-muted-foreground">3 items • 2:45 PM</p>
              </div>
              <div className="text-right">
                <p className="font-medium">$45.67</p>
                <Badge variant="outline" className="text-green-600">Completed</Badge>
              </div>
            </div>
            
            <div className="flex justify-between items-center p-3 border rounded">
              <div>
                <p className="font-medium">Transaction #1233</p>
                <p className="text-sm text-muted-foreground">1 item • 2:30 PM</p>
              </div>
              <div className="text-right">
                <p className="font-medium">$12.99</p>
                <Badge variant="outline" className="text-green-600">Completed</Badge>
              </div>
            </div>
            
            <div className="flex justify-between items-center p-3 border rounded">
              <div>
                <p className="font-medium">Transaction #1232</p>
                <p className="text-sm text-muted-foreground">5 items • 2:15 PM</p>
              </div>
              <div className="text-right">
                <p className="font-medium">$78.34</p>
                <Badge variant="outline" className="text-green-600">Completed</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Feedback */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="h-5 w-5 mr-2" />
            Performance Feedback
          </CardTitle>
          <CardDescription>How you're doing today</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-green-50 rounded-lg">
              <h4 className="font-medium text-green-900 mb-2">🎉 Great Job!</h4>
              <p className="text-sm text-green-800">
                You're ahead of your daily target by 15%. Keep up the excellent work!
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 border rounded">
                <div className="text-lg font-bold text-blue-600">4.2min</div>
                <p className="text-xs text-muted-foreground">Avg Service Time</p>
              </div>
              
              <div className="text-center p-3 border rounded">
                <div className="text-lg font-bold text-green-600">98%</div>
                <p className="text-xs text-muted-foreground">Accuracy Rate</p>
              </div>
            </div>
            
            <div className="p-3 bg-blue-50 rounded">
              <p className="text-sm text-blue-800">
                💡 <strong>Tip:</strong> Remember to ask customers about our loyalty program to increase engagement!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Help & Support */}
      <Card>
        <CardHeader>
          <CardTitle>Need Help?</CardTitle>
          <CardDescription>Quick access to support and assistance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Button variant="outline" className="w-full justify-start">
              <Phone className="h-4 w-4 mr-2" />
              Call Manager for Assistance
            </Button>
            
            <Button variant="outline" className="w-full justify-start">
              <Receipt className="h-4 w-4 mr-2" />
              How to Process Refunds
            </Button>
            
            <Button variant="outline" className="w-full justify-start">
              <QrCode className="h-4 w-4 mr-2" />
              Barcode Scanner Issues
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

const defaultMetrics: StaffMetrics = {
  todaysSales: 1234,
  transactionCount: 45,
  averageTransaction: 27.43,
  shiftHours: 6,
  totalShiftHours: 8,
  personalTarget: 1000,
  customerServed: 45
}