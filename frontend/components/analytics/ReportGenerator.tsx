'use client'

import React, { useState } from 'react'
import { useAuth } from '../auth-provider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { DatePickerWithRange } from '../ui/date-range-picker'
import { Checkbox } from '../ui/checkbox'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'
import { Badge } from '../ui/badge'
import { 
  FileText, 
  Download, 
  Calendar, 
  Filter,
  Settings,
  BarChart3,
  DollarSign,
  Package,
  Users
} from 'lucide-react'
import { UserRole } from '../../lib/permissions'

interface ReportConfig {
  reportType: 'sales' | 'inventory' | 'staff' | 'financial' | 'comprehensive'
  dateRange: {
    from: Date
    to: Date
  }
  includeCharts: boolean
  includeDetails: boolean
  format: 'pdf' | 'excel' | 'csv'
  filters: {
    locationIds: string[]
    categoryIds: string[]
    productIds: string[]
    staffIds: string[]
  }
  customNotes?: string
}

export function ReportGenerator() {
  const { user, accessToken } = useAuth()
  const [config, setConfig] = useState<ReportConfig>({
    reportType: 'sales',
    dateRange: {
      from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      to: new Date()
    },
    includeCharts: true,
    includeDetails: true,
    format: 'pdf',
    filters: {
      locationIds: [],
      categoryIds: [],
      productIds: [],
      staffIds: []
    }
  })
  const [generating, setGenerating] = useState(false)
  const [lastReport, setLastReport] = useState<any>(null)

  const userRole = user?.role as UserRole

  // Available report types based on role
  const getAvailableReportTypes = () => {
    const types = [
      { value: 'sales', label: 'Sales Report', icon: DollarSign, roles: ['ADMIN', 'MANAGER'] },
      { value: 'inventory', label: 'Inventory Report', icon: Package, roles: ['ADMIN', 'MANAGER'] },
      { value: 'staff', label: 'Staff Performance', icon: Users, roles: ['ADMIN', 'MANAGER'] },
      { value: 'financial', label: 'Financial Report', icon: BarChart3, roles: ['ADMIN'] },
      { value: 'comprehensive', label: 'Comprehensive Report', icon: FileText, roles: ['ADMIN'] }
    ]

    return types.filter(type => type.roles.includes(userRole))
  }

  const generateReport = async () => {
    if (!accessToken) return

    setGenerating(true)
    try {
      // First generate the report data
      const reportResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/analytics/reports`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            reportType: config.reportType,
            startDate: config.dateRange.from.toISOString(),
            endDate: config.dateRange.to.toISOString(),
            locationIds: config.filters.locationIds,
            categoryIds: config.filters.categoryIds,
            productIds: config.filters.productIds,
            staffIds: config.filters.staffIds
          })
        }
      )

      if (!reportResponse.ok) {
        throw new Error('Failed to generate report')
      }

      const reportData = await reportResponse.json()
      setLastReport(reportData.data)

      // Then export the report
      const exportResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/analytics/export`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            reportData: reportData.data,
            format: config.format,
            includeCharts: config.includeCharts,
            includeDetails: config.includeDetails
          })
        }
      )

      if (exportResponse.ok) {
        const blob = await exportResponse.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${config.reportType}_report_${Date.now()}.${config.format}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Error generating report:', error)
      alert('Failed to generate report. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  const availableReportTypes = getAvailableReportTypes()

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">Report Generator</h2>
          <p className="text-muted-foreground">
            Create custom reports with role-based data access
          </p>
        </div>
        <Badge variant="outline">{userRole}</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Report Type Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Report Configuration
              </CardTitle>
              <CardDescription>Choose report type and parameters</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Report Type</Label>
                <Select 
                  value={config.reportType} 
                  onValueChange={(value: any) => setConfig({ ...config, reportType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableReportTypes.map((type) => {
                      const Icon = type.icon
                      return (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center">
                            <Icon className="h-4 w-4 mr-2" />
                            {type.label}
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Date Range</Label>
                <DatePickerWithRange
                  date={config.dateRange}
                  onDateChange={(range) => 
                    range && setConfig({ 
                      ...config, 
                      dateRange: { from: range.from!, to: range.to! } 
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Export Format</Label>
                <Select 
                  value={config.format} 
                  onValueChange={(value: any) => setConfig({ ...config, format: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF Document</SelectItem>
                    <SelectItem value="excel">Excel Spreadsheet</SelectItem>
                    <SelectItem value="csv">CSV File</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Report Options */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                Report Options
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="includeCharts"
                  checked={config.includeCharts}
                  onCheckedChange={(checked) => 
                    setConfig({ ...config, includeCharts: checked as boolean })
                  }
                />
                <Label htmlFor="includeCharts">Include Charts and Graphs</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="includeDetails"
                  checked={config.includeDetails}
                  onCheckedChange={(checked) => 
                    setConfig({ ...config, includeDetails: checked as boolean })
                  }
                />
                <Label htmlFor="includeDetails">Include Detailed Data</Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="customNotes">Custom Notes (Optional)</Label>
                <Textarea
                  id="customNotes"
                  placeholder="Add any custom notes or comments for this report..."
                  value={config.customNotes || ''}
                  onChange={(e) => setConfig({ ...config, customNotes: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Filters */}
          {userRole === 'ADMIN' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Filter className="h-5 w-5 mr-2" />
                  Advanced Filters
                </CardTitle>
                <CardDescription>Filter data by specific criteria (Admin only)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Locations</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="All locations" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Locations</SelectItem>
                        <SelectItem value="store1">Downtown Store</SelectItem>
                        <SelectItem value="store2">Mall Location</SelectItem>
                        <SelectItem value="store3">Airport Branch</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Categories</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="All categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="electronics">Electronics</SelectItem>
                        <SelectItem value="clothing">Clothing</SelectItem>
                        <SelectItem value="food">Food & Beverage</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Preview and Actions */}
        <div className="space-y-6">
          {/* Report Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Report Preview</CardTitle>
              <CardDescription>Summary of your report configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Type:</span>
                <span className="text-sm font-medium">
                  {availableReportTypes.find(t => t.value === config.reportType)?.label}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Period:</span>
                <span className="text-sm font-medium">
                  {config.dateRange.from.toLocaleDateString()} - {config.dateRange.to.toLocaleDateString()}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Format:</span>
                <span className="text-sm font-medium uppercase">{config.format}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Charts:</span>
                <span className="text-sm font-medium">
                  {config.includeCharts ? 'Included' : 'Excluded'}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Details:</span>
                <span className="text-sm font-medium">
                  {config.includeDetails ? 'Included' : 'Summary only'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Generate Button */}
          <Card>
            <CardContent className="pt-6">
              <Button 
                className="w-full" 
                onClick={generateReport}
                disabled={generating}
              >
                {generating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Generate Report
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Recent Reports */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 border rounded">
                  <div>
                    <p className="text-sm font-medium">Sales Report</p>
                    <p className="text-xs text-muted-foreground">Jan 1-31, 2024</p>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Download className="h-3 w-3" />
                  </Button>
                </div>
                
                <div className="flex justify-between items-center p-2 border rounded">
                  <div>
                    <p className="text-sm font-medium">Inventory Report</p>
                    <p className="text-xs text-muted-foreground">Dec 2023</p>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Download className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}