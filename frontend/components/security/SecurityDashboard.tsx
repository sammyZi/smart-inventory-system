'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '../auth-provider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Alert, AlertDescription } from '../ui/alert'
import { 
  Shield, 
  AlertTriangle, 
  Eye, 
  Lock, 
  Activity,
  Users,
  FileText,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  Filter
} from 'lucide-react'

interface AuditEvent {
  id: string
  userId: string
  userRole: string
  action: string
  resource: string
  timestamp: string
  success: boolean
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  ipAddress: string
  details: any
}

interface SecurityAlert {
  id: string
  alertType: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  description: string
  timestamp: string
  resolved: boolean
  userId?: string
}

interface SecurityStatistics {
  totalEvents: number
  successfulEvents: number
  failedEvents: number
  riskDistribution: Record<string, number>
  topActions: Array<{ action: string, count: number }>
}

export function SecurityDashboard() {
  const { user, accessToken } = useAuth()
  const [auditLogs, setAuditLogs] = useState<AuditEvent[]>([])
  const [securityAlerts, setSecurityAlerts] = useState<SecurityAlert[]>([])
  const [statistics, setStatistics] = useState<SecurityStatistics | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [timeframe, setTimeframe] = useState('day')

  useEffect(() => {
    if (accessToken && user && ['ADMIN', 'MANAGER'].includes(user.role)) {
      fetchSecurityData()
    }
  }, [accessToken, user, timeframe])

  const fetchSecurityData = async () => {
    try {
      setLoading(true)
      
      // Fetch audit logs
      const auditResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/security/audit-logs?limit=50`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      )
      
      if (auditResponse.ok) {
        const auditData = await auditResponse.json()
        setAuditLogs(auditData.data || [])
      }

      // Fetch security alerts
      const alertsResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/security/alerts`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      )
      
      if (alertsResponse.ok) {
        const alertsData = await alertsResponse.json()
        setSecurityAlerts(alertsData.data || [])
      }

      // Fetch statistics
      const statsResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/security/statistics?timeframe=${timeframe}`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      )
      
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStatistics(statsData.data)
      }
    } catch (error) {
      console.error('Error fetching security data:', error)
    } finally {
      setLoading(false)
    }
  }

  const resolveAlert = async (alertId: string, resolution: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/security/alerts/${alertId}/resolve`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ resolution })
        }
      )

      if (response.ok) {
        // Refresh alerts
        fetchSecurityData()
      }
    } catch (error) {
      console.error('Error resolving alert:', error)
    }
  }

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'CRITICAL': return 'text-red-600 bg-red-50'
      case 'HIGH': return 'text-orange-600 bg-orange-50'
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-50'
      case 'LOW': return 'text-green-600 bg-green-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'destructive'
      case 'HIGH': return 'destructive'
      case 'MEDIUM': return 'default'
      case 'LOW': return 'secondary'
      default: return 'secondary'
    }
  }

  if (!user || !['ADMIN', 'MANAGER'].includes(user.role)) {
    return (
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          Security dashboard access requires Admin or Manager privileges.
        </AlertDescription>
      </Alert>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  const unresolvedAlerts = securityAlerts.filter(alert => !alert.resolved)
  const criticalAlerts = unresolvedAlerts.filter(alert => alert.severity === 'CRITICAL')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold">Security Dashboard</h2>
          <p className="text-muted-foreground">
            Monitor security events and audit logs for your {user.role === 'ADMIN' ? 'organization' : 'store'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{user.role}</Badge>
          <Button variant="outline" onClick={fetchSecurityData}>
            <Activity className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Critical Alerts Banner */}
      {criticalAlerts.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {criticalAlerts.length} critical security alert{criticalAlerts.length > 1 ? 's' : ''} require immediate attention!
          </AlertDescription>
        </Alert>
      )}

      {/* Security Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics?.totalEvents || 0}</div>
            <p className="text-xs text-muted-foreground">
              Last {timeframe}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statistics ? Math.round((statistics.successfulEvents / statistics.totalEvents) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {statistics?.successfulEvents || 0} successful events
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unresolvedAlerts.length}</div>
            <p className="text-xs text-muted-foreground">
              {criticalAlerts.length} critical
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Events</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics?.failedEvents || 0}</div>
            <p className="text-xs text-muted-foreground">
              Security incidents
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="alerts">
            Alerts {unresolvedAlerts.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unresolvedAlerts.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="audit-logs">Audit Logs</TabsTrigger>
          {user.role === 'ADMIN' && (
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Risk Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Risk Distribution</CardTitle>
                <CardDescription>Events by risk level</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {statistics?.riskDistribution && Object.entries(statistics.riskDistribution).map(([level, count]) => (
                    <div key={level} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${getRiskColor(level).split(' ')[1]}`} />
                        <span className="font-medium">{level}</span>
                      </div>
                      <span className="text-sm font-bold">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Top Actions</CardTitle>
                <CardDescription>Most frequent security events</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {statistics?.topActions?.slice(0, 5).map((action, index) => (
                    <div key={action.action} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">#{index + 1}</span>
                        <span className="font-medium">{action.action}</span>
                      </div>
                      <span className="text-sm font-bold">{action.count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Events */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Security Events</CardTitle>
              <CardDescription>Latest audit log entries</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {auditLogs.slice(0, 10).map((event) => (
                  <div key={event.id} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center gap-3">
                      <Badge className={getRiskColor(event.riskLevel)}>
                        {event.riskLevel}
                      </Badge>
                      <div>
                        <p className="font-medium">{event.action}</p>
                        <p className="text-sm text-muted-foreground">
                          {event.userRole} • {event.resource} • {new Date(event.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {event.success ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Security Alerts</CardTitle>
              <CardDescription>Active security alerts requiring attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {securityAlerts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Shield className="h-8 w-8 mx-auto mb-2" />
                    <p>No security alerts</p>
                  </div>
                ) : (
                  securityAlerts.map((alert) => (
                    <div key={alert.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant={getSeverityColor(alert.severity) as any}>
                              {alert.severity}
                            </Badge>
                            <span className="font-medium">{alert.alertType}</span>
                            {alert.resolved && (
                              <Badge variant="outline" className="text-green-600">
                                Resolved
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm">{alert.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(alert.timestamp).toLocaleString()}
                            {alert.userId && ` • User: ${alert.userId}`}
                          </p>
                        </div>
                        {!alert.resolved && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => resolveAlert(alert.id, 'Resolved by security team')}
                          >
                            Resolve
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit-logs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Audit Logs</CardTitle>
              <CardDescription>Detailed security and access logs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {auditLogs.map((event) => (
                  <div key={event.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge className={getRiskColor(event.riskLevel)}>
                            {event.riskLevel}
                          </Badge>
                          <span className="font-medium">{event.action}</span>
                          {event.success ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                        <div className="text-sm space-y-1">
                          <p><strong>Resource:</strong> {event.resource}</p>
                          <p><strong>User:</strong> {event.userRole} ({event.userId})</p>
                          <p><strong>IP Address:</strong> {event.ipAddress}</p>
                          <p><strong>Timestamp:</strong> {new Date(event.timestamp).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {user.role === 'ADMIN' && (
          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Security Analytics</CardTitle>
                <CardDescription>Advanced security metrics and trends</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-4 border rounded">
                    <div className="text-2xl font-bold text-blue-600">
                      {Math.round(((statistics?.successfulEvents || 0) / (statistics?.totalEvents || 1)) * 100)}%
                    </div>
                    <p className="text-sm text-muted-foreground">Success Rate</p>
                  </div>
                  
                  <div className="text-center p-4 border rounded">
                    <div className="text-2xl font-bold text-orange-600">
                      {statistics?.riskDistribution?.HIGH || 0}
                    </div>
                    <p className="text-sm text-muted-foreground">High Risk Events</p>
                  </div>
                  
                  <div className="text-center p-4 border rounded">
                    <div className="text-2xl font-bold text-red-600">
                      {statistics?.riskDistribution?.CRITICAL || 0}
                    </div>
                    <p className="text-sm text-muted-foreground">Critical Events</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}