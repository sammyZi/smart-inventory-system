/**
 * Security Management API Routes
 * Role-based security monitoring and audit log access
 */

import express from 'express'
import { requireRole, AuthenticatedRequest } from '../../middleware/roleMiddleware'
import { securityMiddleware } from '../../middleware/securityMiddleware'
import { AuditService } from '../../services/auditService'

const router = express.Router()
const auditService = new AuditService()

// Apply security middleware to all routes
router.use(securityMiddleware.applySecurityHeaders())
router.use(securityMiddleware.validateTenantAccess())

/**
 * GET /security/audit-logs
 * Get audit logs with role-based filtering
 */
router.get('/audit-logs', requireRole(['ADMIN', 'MANAGER']), async (req: AuthenticatedRequest, res) => {
  try {
    const userContext = {
      userId: req.user!.id,
      role: req.user!.role,
      storeIds: req.user!.storeIds,
      permissions: req.user!.permissions,
      tenantId: req.user!.tenantId
    }

    const query = {
      tenantId: userContext.tenantId,
      userId: req.query.userId as string,
      userRole: req.query.userRole as string,
      action: req.query.action as string,
      resource: req.query.resource as string,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      riskLevel: req.query.riskLevel as string,
      success: req.query.success ? req.query.success === 'true' : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 100,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0
    }

    const result = await auditService.queryAuditLogs(userContext, query)

    res.json({
      success: true,
      data: result.events,
      total: result.total,
      query: {
        ...query,
        userRole: req.user!.role,
        accessLevel: req.user!.role === 'ADMIN' ? 'full' : 'limited'
      }
    })
  } catch (error) {
    console.error('Audit logs query error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audit logs'
    })
  }
})

/**
 * GET /security/alerts
 * Get security alerts for tenant
 */
router.get('/alerts', requireRole(['ADMIN', 'MANAGER']), async (req: AuthenticatedRequest, res) => {
  try {
    const userContext = {
      userId: req.user!.id,
      role: req.user!.role,
      storeIds: req.user!.storeIds,
      permissions: req.user!.permissions,
      tenantId: req.user!.tenantId
    }

    const resolved = req.query.resolved ? req.query.resolved === 'true' : undefined
    const alerts = await auditService.getSecurityAlerts(userContext, resolved)

    res.json({
      success: true,
      data: alerts,
      count: alerts.length,
      role: req.user!.role
    })
  } catch (error) {
    console.error('Security alerts error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch security alerts'
    })
  }
})

/**
 * POST /security/alerts/:alertId/resolve
 * Resolve a security alert
 */
router.post('/alerts/:alertId/resolve', requireRole(['ADMIN', 'MANAGER']), async (req: AuthenticatedRequest, res) => {
  try {
    const userContext = {
      userId: req.user!.id,
      role: req.user!.role,
      storeIds: req.user!.storeIds,
      permissions: req.user!.permissions,
      tenantId: req.user!.tenantId
    }

    const { alertId } = req.params
    const { resolution } = req.body

    if (!resolution) {
      return res.status(400).json({
        success: false,
        error: 'Resolution description is required'
      })
    }

    await auditService.resolveSecurityAlert(alertId, userContext, resolution)

    res.json({
      success: true,
      message: 'Security alert resolved successfully',
      resolvedBy: req.user!.role
    })
  } catch (error) {
    console.error('Alert resolution error:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to resolve security alert'
    })
  }
})

/**
 * GET /security/statistics
 * Get audit and security statistics
 */
router.get('/statistics', requireRole(['ADMIN', 'MANAGER']), async (req: AuthenticatedRequest, res) => {
  try {
    const userContext = {
      userId: req.user!.id,
      role: req.user!.role,
      storeIds: req.user!.storeIds,
      permissions: req.user!.permissions,
      tenantId: req.user!.tenantId
    }

    const timeframe = (req.query.timeframe as 'day' | 'week' | 'month') || 'day'
    const statistics = await auditService.getAuditStatistics(userContext, timeframe)

    res.json({
      success: true,
      data: statistics,
      timeframe,
      role: req.user!.role,
      generatedAt: new Date()
    })
  } catch (error) {
    console.error('Security statistics error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch security statistics'
    })
  }
})

/**
 * POST /security/test-alert
 * Test security alert system (Admin only)
 */
router.post('/test-alert', requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const userContext = {
      userId: req.user!.id,
      role: req.user!.role,
      storeIds: req.user!.storeIds,
      permissions: req.user!.permissions,
      tenantId: req.user!.tenantId
    }

    // Create a test security event
    await auditService.logEvent(
      userContext,
      'SECURITY_TEST',
      'security_system',
      {
        testType: 'manual_test',
        triggeredBy: req.user!.id,
        description: 'Manual security system test'
      },
      req,
      true
    )

    res.json({
      success: true,
      message: 'Security test alert created successfully',
      timestamp: new Date()
    })
  } catch (error) {
    console.error('Security test error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to create test alert'
    })
  }
})

/**
 * GET /security/user-activity/:userId
 * Get specific user's activity (Admin only)
 */
router.get('/user-activity/:userId', requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const userContext = {
      userId: req.user!.id,
      role: req.user!.role,
      storeIds: req.user!.storeIds,
      permissions: req.user!.permissions,
      tenantId: req.user!.tenantId
    }

    const { userId } = req.params
    const query = {
      tenantId: userContext.tenantId,
      userId,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0
    }

    const result = await auditService.queryAuditLogs(userContext, query)

    res.json({
      success: true,
      data: result.events,
      total: result.total,
      userId,
      requestedBy: req.user!.role
    })
  } catch (error) {
    console.error('User activity query error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user activity'
    })
  }
})

/**
 * GET /security/risk-assessment
 * Get security risk assessment (Admin only)
 */
router.get('/risk-assessment', requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const userContext = {
      userId: req.user!.id,
      role: req.user!.role,
      storeIds: req.user!.storeIds,
      permissions: req.user!.permissions,
      tenantId: req.user!.tenantId
    }

    // Get recent audit statistics
    const statistics = await auditService.getAuditStatistics(userContext, 'week')
    const alerts = await auditService.getSecurityAlerts(userContext, false) // Unresolved alerts

    // Calculate risk score
    const riskScore = this.calculateRiskScore(statistics, alerts)
    const riskLevel = this.getRiskLevel(riskScore)

    const assessment = {
      riskScore,
      riskLevel,
      summary: {
        totalEvents: statistics.totalEvents,
        failedEvents: statistics.failedEvents,
        activeAlerts: alerts.length,
        criticalAlerts: alerts.filter(a => a.severity === 'CRITICAL').length
      },
      recommendations: this.getSecurityRecommendations(riskLevel, statistics, alerts),
      lastAssessment: new Date()
    }

    res.json({
      success: true,
      data: assessment,
      assessedBy: req.user!.role
    })
  } catch (error) {
    console.error('Risk assessment error:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to generate risk assessment'
    })
  }
})

// Helper functions for risk assessment
function calculateRiskScore(statistics: any, alerts: any[]): number {
  let score = 0

  // Base score from failed events
  const failureRate = statistics.totalEvents > 0 ? statistics.failedEvents / statistics.totalEvents : 0
  score += failureRate * 40

  // Add score for active alerts
  score += alerts.length * 5

  // Add extra score for critical alerts
  const criticalAlerts = alerts.filter(a => a.severity === 'CRITICAL').length
  score += criticalAlerts * 15

  // Add score for high-risk events
  const highRiskEvents = statistics.riskDistribution?.HIGH || 0
  const criticalRiskEvents = statistics.riskDistribution?.CRITICAL || 0
  score += (highRiskEvents * 2) + (criticalRiskEvents * 5)

  return Math.min(score, 100) // Cap at 100
}

function getRiskLevel(score: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  if (score >= 80) return 'CRITICAL'
  if (score >= 60) return 'HIGH'
  if (score >= 30) return 'MEDIUM'
  return 'LOW'
}

function getSecurityRecommendations(
  riskLevel: string, 
  statistics: any, 
  alerts: any[]
): string[] {
  const recommendations: string[] = []

  if (riskLevel === 'CRITICAL' || riskLevel === 'HIGH') {
    recommendations.push('Immediate security review required')
    recommendations.push('Consider implementing additional access controls')
    recommendations.push('Review and resolve all active security alerts')
  }

  if (statistics.failedEvents > statistics.totalEvents * 0.1) {
    recommendations.push('High failure rate detected - review authentication systems')
  }

  if (alerts.length > 5) {
    recommendations.push('Multiple active alerts - prioritize alert resolution')
  }

  const criticalAlerts = alerts.filter(a => a.severity === 'CRITICAL').length
  if (criticalAlerts > 0) {
    recommendations.push(`${criticalAlerts} critical alerts require immediate attention`)
  }

  if (recommendations.length === 0) {
    recommendations.push('Security posture is good - continue monitoring')
    recommendations.push('Regular security reviews recommended')
  }

  return recommendations
}

export default router