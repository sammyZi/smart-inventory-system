/**
 * Comprehensive Audit Logging Service
 * Tracks all role-based actions and system events with tenant isolation
 */

import { UserContext } from '../middleware/permissions'

export interface AuditEvent {
  id: string
  tenantId: string
  userId: string
  userRole: string
  action: string
  resource: string
  resourceId?: string
  details: Record<string, any>
  ipAddress: string
  userAgent: string
  timestamp: Date
  success: boolean
  errorMessage?: string
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  sessionId?: string
  storeId?: string
}

export interface SecurityAlert {
  id: string
  tenantId: string
  alertType: 'UNAUTHORIZED_ACCESS' | 'SUSPICIOUS_ACTIVITY' | 'DATA_BREACH' | 'RATE_LIMIT_EXCEEDED' | 'ROLE_ESCALATION'
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  description: string
  userId?: string
  ipAddress: string
  timestamp: Date
  resolved: boolean
  resolvedBy?: string
  resolvedAt?: Date
  metadata: Record<string, any>
}

export interface AuditQuery {
  tenantId: string
  userId?: string
  userRole?: string
  action?: string
  resource?: string
  startDate?: Date
  endDate?: Date
  riskLevel?: string
  success?: boolean
  limit?: number
  offset?: number
}

export class AuditService {
  private auditLogs: Map<string, AuditEvent> = new Map()
  private securityAlerts: Map<string, SecurityAlert> = new Map()
  private suspiciousActivities: Map<string, number> = new Map()

  /**
   * Log an audit event with comprehensive details
   */
  async logEvent(
    userContext: UserContext,
    action: string,
    resource: string,
    details: Record<string, any>,
    request?: any,
    success: boolean = true,
    errorMessage?: string
  ): Promise<void> {
    const auditEvent: AuditEvent = {
      id: this.generateId(),
      tenantId: userContext.tenantId,
      userId: userContext.userId,
      userRole: userContext.role,
      action,
      resource,
      resourceId: details.resourceId,
      details: this.sanitizeDetails(details, userContext.role),
      ipAddress: this.extractIpAddress(request),
      userAgent: request?.headers?.['user-agent'] || 'Unknown',
      timestamp: new Date(),
      success,
      errorMessage,
      riskLevel: this.calculateRiskLevel(action, resource, userContext.role, success),
      sessionId: request?.sessionId,
      storeId: details.storeId
    }

    // Store audit event
    this.auditLogs.set(auditEvent.id, auditEvent)

    // Check for suspicious activity
    await this.analyzeSuspiciousActivity(auditEvent)

    // Trigger real-time monitoring if high risk
    if (auditEvent.riskLevel === 'HIGH' || auditEvent.riskLevel === 'CRITICAL') {
      await this.triggerSecurityAlert(auditEvent)
    }

    // Log to external systems (in production)
    await this.logToExternalSystems(auditEvent)
  }

  /**
   * Log authentication events
   */
  async logAuthEvent(
    action: 'LOGIN' | 'LOGOUT' | 'LOGIN_FAILED' | 'PASSWORD_RESET' | 'ACCOUNT_LOCKED',
    userId: string,
    tenantId: string,
    request: any,
    success: boolean = true,
    errorMessage?: string
  ): Promise<void> {
    const userContext: UserContext = {
      userId,
      role: 'CUSTOMER', // Default for auth events
      storeIds: [],
      permissions: {} as any,
      tenantId
    }

    await this.logEvent(
      userContext,
      action,
      'authentication',
      { action },
      request,
      success,
      errorMessage
    )
  }

  /**
   * Log role-based access attempts
   */
  async logAccessAttempt(
    userContext: UserContext,
    resource: string,
    requiredRole: string,
    granted: boolean,
    request: any
  ): Promise<void> {
    const action = granted ? 'ACCESS_GRANTED' : 'ACCESS_DENIED'
    const riskLevel = granted ? 'LOW' : 'MEDIUM'

    await this.logEvent(
      userContext,
      action,
      resource,
      {
        requiredRole,
        userRole: userContext.role,
        granted
      },
      request,
      granted,
      granted ? undefined : `Access denied: insufficient role (${userContext.role} < ${requiredRole})`
    )

    // Track failed access attempts
    if (!granted) {
      await this.trackFailedAccess(userContext, resource, request)
    }
  }

  /**
   * Log data access events
   */
  async logDataAccess(
    userContext: UserContext,
    action: 'READ' | 'CREATE' | 'UPDATE' | 'DELETE',
    resource: string,
    resourceId: string,
    request: any,
    success: boolean = true
  ): Promise<void> {
    await this.logEvent(
      userContext,
      `DATA_${action}`,
      resource,
      {
        resourceId,
        dataAction: action
      },
      request,
      success
    )
  }

  /**
   * Query audit logs with role-based filtering
   */
  async queryAuditLogs(
    userContext: UserContext,
    query: AuditQuery
  ): Promise<{ events: AuditEvent[], total: number }> {
    // Ensure tenant isolation
    query.tenantId = userContext.tenantId

    // Apply role-based filtering
    const filteredQuery = this.applyRoleBasedFiltering(query, userContext.role)

    const events = Array.from(this.auditLogs.values())
      .filter(event => this.matchesQuery(event, filteredQuery))
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

    const total = events.length
    const offset = query.offset || 0
    const limit = query.limit || 100

    return {
      events: events.slice(offset, offset + limit),
      total
    }
  }

  /**
   * Get security alerts for tenant
   */
  async getSecurityAlerts(
    userContext: UserContext,
    resolved?: boolean
  ): Promise<SecurityAlert[]> {
    return Array.from(this.securityAlerts.values())
      .filter(alert => {
        if (alert.tenantId !== userContext.tenantId) return false
        if (resolved !== undefined && alert.resolved !== resolved) return false
        return true
      })
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }

  /**
   * Resolve security alert
   */
  async resolveSecurityAlert(
    alertId: string,
    userContext: UserContext,
    resolution: string
  ): Promise<void> {
    const alert = this.securityAlerts.get(alertId)
    if (!alert || alert.tenantId !== userContext.tenantId) {
      throw new Error('Alert not found or access denied')
    }

    alert.resolved = true
    alert.resolvedBy = userContext.userId
    alert.resolvedAt = new Date()
    alert.metadata.resolution = resolution

    // Log the resolution
    await this.logEvent(
      userContext,
      'ALERT_RESOLVED',
      'security_alert',
      { alertId, resolution },
      null,
      true
    )
  }

  /**
   * Get audit statistics
   */
  async getAuditStatistics(
    userContext: UserContext,
    timeframe: 'day' | 'week' | 'month' = 'day'
  ): Promise<{
    totalEvents: number
    successfulEvents: number
    failedEvents: number
    riskDistribution: Record<string, number>
    topActions: Array<{ action: string, count: number }>
    topUsers: Array<{ userId: string, count: number }>
  }> {
    const startDate = this.getTimeframeStart(timeframe)
    const events = Array.from(this.auditLogs.values())
      .filter(event => 
        event.tenantId === userContext.tenantId &&
        event.timestamp >= startDate
      )

    const stats = {
      totalEvents: events.length,
      successfulEvents: events.filter(e => e.success).length,
      failedEvents: events.filter(e => !e.success).length,
      riskDistribution: this.calculateRiskDistribution(events),
      topActions: this.getTopActions(events),
      topUsers: this.getTopUsers(events, userContext.role)
    }

    return stats
  }

  // Private helper methods

  private generateId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private sanitizeDetails(details: Record<string, any>, userRole: string): Record<string, any> {
    const sanitized = { ...details }

    // Remove sensitive information based on role
    if (userRole === 'STAFF' || userRole === 'CUSTOMER') {
      delete sanitized.password
      delete sanitized.token
      delete sanitized.apiKey
      delete sanitized.financialData
    }

    return sanitized
  }

  private extractIpAddress(request: any): string {
    if (!request) return 'unknown'
    
    return request.ip || 
           request.connection?.remoteAddress || 
           request.socket?.remoteAddress ||
           request.headers?.['x-forwarded-for']?.split(',')[0] ||
           'unknown'
  }

  private calculateRiskLevel(
    action: string,
    resource: string,
    userRole: string,
    success: boolean
  ): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    // Failed actions are higher risk
    if (!success) {
      if (action.includes('DELETE') || action.includes('ADMIN')) return 'HIGH'
      if (action.includes('ACCESS_DENIED')) return 'MEDIUM'
      return 'MEDIUM'
    }

    // Critical actions
    if (action.includes('DELETE') && resource === 'user') return 'CRITICAL'
    if (action.includes('ADMIN') && userRole !== 'ADMIN') return 'CRITICAL'
    
    // High risk actions
    if (action.includes('DELETE')) return 'HIGH'
    if (action.includes('FINANCIAL') && userRole !== 'ADMIN') return 'HIGH'
    
    // Medium risk actions
    if (action.includes('CREATE') || action.includes('UPDATE')) return 'MEDIUM'
    
    return 'LOW'
  }

  private async analyzeSuspiciousActivity(event: AuditEvent): Promise<void> {
    const key = `${event.tenantId}:${event.userId}:${event.ipAddress}`
    const count = (this.suspiciousActivities.get(key) || 0) + 1
    this.suspiciousActivities.set(key, count)

    // Check for suspicious patterns
    if (count > 10 && !event.success) {
      await this.createSecurityAlert(
        'SUSPICIOUS_ACTIVITY',
        'HIGH',
        `Multiple failed attempts detected for user ${event.userId}`,
        event.tenantId,
        event.userId,
        event.ipAddress,
        { failedAttempts: count, timeWindow: '5 minutes' }
      )
    }

    // Check for role escalation attempts
    if (event.action.includes('ACCESS_DENIED') && event.details.requiredRole === 'ADMIN') {
      await this.createSecurityAlert(
        'ROLE_ESCALATION',
        'HIGH',
        `Attempted admin access by ${event.userRole} user`,
        event.tenantId,
        event.userId,
        event.ipAddress,
        { attemptedRole: 'ADMIN', userRole: event.userRole }
      )
    }
  }

  private async triggerSecurityAlert(event: AuditEvent): Promise<void> {
    // Real-time security monitoring would be implemented here
    console.log(`SECURITY ALERT: High-risk event detected`, {
      tenantId: event.tenantId,
      userId: event.userId,
      action: event.action,
      riskLevel: event.riskLevel
    })
  }

  private async createSecurityAlert(
    alertType: SecurityAlert['alertType'],
    severity: SecurityAlert['severity'],
    description: string,
    tenantId: string,
    userId?: string,
    ipAddress?: string,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    const alert: SecurityAlert = {
      id: this.generateId(),
      tenantId,
      alertType,
      severity,
      description,
      userId,
      ipAddress: ipAddress || 'unknown',
      timestamp: new Date(),
      resolved: false,
      metadata
    }

    this.securityAlerts.set(alert.id, alert)
  }

  private async trackFailedAccess(
    userContext: UserContext,
    resource: string,
    request: any
  ): Promise<void> {
    const key = `failed_access:${userContext.tenantId}:${userContext.userId}`
    const count = (this.suspiciousActivities.get(key) || 0) + 1
    this.suspiciousActivities.set(key, count)

    if (count >= 5) {
      await this.createSecurityAlert(
        'UNAUTHORIZED_ACCESS',
        'MEDIUM',
        `Multiple unauthorized access attempts to ${resource}`,
        userContext.tenantId,
        userContext.userId,
        this.extractIpAddress(request),
        { resource, attemptCount: count }
      )
    }
  }

  private async logToExternalSystems(event: AuditEvent): Promise<void> {
    // In production, this would log to external systems like:
    // - SIEM systems
    // - Log aggregation services (ELK stack)
    // - Security monitoring platforms
    // - Compliance logging systems
    
    if (event.riskLevel === 'CRITICAL') {
      console.log('CRITICAL AUDIT EVENT:', event)
    }
  }

  private applyRoleBasedFiltering(query: AuditQuery, userRole: string): AuditQuery {
    const filteredQuery = { ...query }

    // Staff can only see their own audit logs
    if (userRole === 'STAFF') {
      filteredQuery.userId = query.userId
    }

    // Managers can see their store's audit logs
    if (userRole === 'MANAGER') {
      // Would filter by store in production
    }

    // Customers can only see their own logs
    if (userRole === 'CUSTOMER') {
      filteredQuery.userId = query.userId
      filteredQuery.userRole = 'CUSTOMER'
    }

    return filteredQuery
  }

  private matchesQuery(event: AuditEvent, query: AuditQuery): boolean {
    if (query.tenantId && event.tenantId !== query.tenantId) return false
    if (query.userId && event.userId !== query.userId) return false
    if (query.userRole && event.userRole !== query.userRole) return false
    if (query.action && event.action !== query.action) return false
    if (query.resource && event.resource !== query.resource) return false
    if (query.riskLevel && event.riskLevel !== query.riskLevel) return false
    if (query.success !== undefined && event.success !== query.success) return false
    
    if (query.startDate && event.timestamp < query.startDate) return false
    if (query.endDate && event.timestamp > query.endDate) return false

    return true
  }

  private getTimeframeStart(timeframe: 'day' | 'week' | 'month'): Date {
    const now = new Date()
    switch (timeframe) {
      case 'day':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000)
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      case 'month':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      default:
        return new Date(now.getTime() - 24 * 60 * 60 * 1000)
    }
  }

  private calculateRiskDistribution(events: AuditEvent[]): Record<string, number> {
    const distribution = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 }
    events.forEach(event => {
      distribution[event.riskLevel]++
    })
    return distribution
  }

  private getTopActions(events: AuditEvent[]): Array<{ action: string, count: number }> {
    const actionCounts = new Map<string, number>()
    events.forEach(event => {
      actionCounts.set(event.action, (actionCounts.get(event.action) || 0) + 1)
    })

    return Array.from(actionCounts.entries())
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }

  private getTopUsers(events: AuditEvent[], requestingRole: string): Array<{ userId: string, count: number }> {
    // Only admins can see all user statistics
    if (requestingRole !== 'ADMIN') {
      return []
    }

    const userCounts = new Map<string, number>()
    events.forEach(event => {
      userCounts.set(event.userId, (userCounts.get(event.userId) || 0) + 1)
    })

    return Array.from(userCounts.entries())
      .map(([userId, count]) => ({ userId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }
}