/**
 * Security Middleware
 * Comprehensive security protection with role-based controls
 */

import { Request, Response, NextFunction } from 'express'
import { SecurityService } from '../services/securityService'
import { AuditService } from '../services/auditService'
import { AuthenticatedRequest } from './roleMiddleware'

export class SecurityMiddleware {
  private securityService: SecurityService
  private auditService: AuditService

  constructor() {
    this.auditService = new AuditService()
    this.securityService = new SecurityService(this.auditService)
  }

  /**
   * Apply security headers to all responses
   */
  applySecurityHeaders() {
    return this.securityService.securityHeaders()
  }

  /**
   * Role-based rate limiting
   */
  applyRateLimit() {
    return this.securityService.createRoleBasedRateLimit({
      'ADMIN': {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 1000, // Higher limit for admins
        message: 'Too many requests from admin account'
      },
      'MANAGER': {
        windowMs: 15 * 60 * 1000,
        maxRequests: 500, // Moderate limit for managers
        message: 'Too many requests from manager account'
      },
      'STAFF': {
        windowMs: 15 * 60 * 1000,
        maxRequests: 200, // Lower limit for staff
        message: 'Too many requests from staff account'
      },
      'CUSTOMER': {
        windowMs: 15 * 60 * 1000,
        maxRequests: 100, // Lowest limit for customers
        message: 'Too many requests from customer account'
      },
      'DEFAULT': {
        windowMs: 15 * 60 * 1000,
        maxRequests: 50, // Very low limit for unauthenticated users
        message: 'Too many requests. Please authenticate.'
      }
    })
  }

  /**
   * Input validation middleware
   */
  validateInput(validationRules: any) {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        const userContext = req.user ? {
          userId: req.user.id,
          role: req.user.role,
          storeIds: req.user.storeIds,
          permissions: req.user.permissions,
          tenantId: req.user.tenantId
        } : undefined

        const validation = this.securityService.validateInput(
          { ...req.body, ...req.query, ...req.params },
          validationRules,
          userContext
        )

        if (!validation.isValid) {
          return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: validation.errors
          })
        }

        // Replace request data with sanitized data
        req.body = validation.sanitizedData
        next()
      } catch (error) {
        console.error('Input validation error:', error)
        res.status(500).json({
          success: false,
          error: 'Validation error occurred'
        })
      }
    }
  }

  /**
   * Audit logging middleware
   */
  auditLog(action: string, resource: string) {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      const startTime = Date.now()
      
      // Capture original response methods
      const originalSend = res.send
      const originalJson = res.json

      let responseData: any = null
      let statusCode = 200

      // Override response methods to capture data
      res.send = function(data) {
        responseData = data
        statusCode = res.statusCode
        return originalSend.call(this, data)
      }

      res.json = function(data) {
        responseData = data
        statusCode = res.statusCode
        return originalJson.call(this, data)
      }

      // Continue with request processing
      next()

      // Log after response is sent
      res.on('finish', async () => {
        if (req.user) {
          const userContext = {
            userId: req.user.id,
            role: req.user.role,
            storeIds: req.user.storeIds,
            permissions: req.user.permissions,
            tenantId: req.user.tenantId
          }

          const success = statusCode < 400
          const duration = Date.now() - startTime

          await this.auditService.logEvent(
            userContext,
            action,
            resource,
            {
              method: req.method,
              path: req.path,
              query: req.query,
              body: this.sanitizeRequestBody(req.body),
              statusCode,
              duration,
              resourceId: req.params.id
            },
            req,
            success,
            success ? undefined : `Request failed with status ${statusCode}`
          )
        }
      })
    }
  }

  /**
   * Tenant isolation validation
   */
  validateTenantAccess() {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        })
      }

      // Check if request includes tenant-specific resource
      const resourceTenantId = req.body.tenantId || req.params.tenantId || req.query.tenantId

      if (resourceTenantId) {
        const userContext = {
          userId: req.user.id,
          role: req.user.role,
          storeIds: req.user.storeIds,
          permissions: req.user.permissions,
          tenantId: req.user.tenantId
        }

        const validation = this.securityService.validateTenantAccess(
          userContext,
          resourceTenantId,
          req.path
        )

        if (!validation.isValid) {
          // Log cross-tenant access attempt
          await this.auditService.logEvent(
            userContext,
            'CROSS_TENANT_ACCESS_ATTEMPT',
            'tenant_isolation',
            {
              requestedTenantId: resourceTenantId,
              userTenantId: req.user.tenantId,
              resource: req.path
            },
            req,
            false,
            validation.error
          )

          return res.status(403).json({
            success: false,
            error: 'Cross-tenant access denied'
          })
        }
      }

      next()
    }
  }

  /**
   * Suspicious activity monitoring
   */
  monitorSuspiciousActivity() {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      if (req.user) {
        const userContext = {
          userId: req.user.id,
          role: req.user.role,
          storeIds: req.user.storeIds,
          permissions: req.user.permissions,
          tenantId: req.user.tenantId
        }

        // Check for suspicious patterns
        const suspiciousPatterns = this.detectSuspiciousPatterns(req)
        
        for (const pattern of suspiciousPatterns) {
          await this.securityService.monitorSuspiciousActivity(
            userContext,
            pattern.type,
            pattern.metadata,
            req
          )
        }
      }

      next()
    }
  }

  /**
   * CSRF protection
   */
  csrfProtection() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Skip CSRF for GET requests and API endpoints with proper authentication
      if (req.method === 'GET' || req.path.startsWith('/api/')) {
        return next()
      }

      const token = req.headers['x-csrf-token'] || req.body._csrf
      const sessionToken = req.session?.csrfToken

      if (!token || !this.securityService.validateCSRFToken(token as string, sessionToken)) {
        return res.status(403).json({
          success: false,
          error: 'Invalid CSRF token'
        })
      }

      next()
    }
  }

  /**
   * Content Security Policy
   */
  contentSecurityPolicy() {
    return (req: Request, res: Response, next: NextFunction) => {
      const csp = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        "font-src 'self'",
        "connect-src 'self'",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'"
      ].join('; ')

      res.setHeader('Content-Security-Policy', csp)
      next()
    }
  }

  /**
   * Request size limiting
   */
  limitRequestSize(maxSize: string = '10mb') {
    return (req: Request, res: Response, next: NextFunction) => {
      const contentLength = req.headers['content-length']
      
      if (contentLength) {
        const sizeInBytes = parseInt(contentLength)
        const maxSizeInBytes = this.parseSize(maxSize)
        
        if (sizeInBytes > maxSizeInBytes) {
          return res.status(413).json({
            success: false,
            error: 'Request entity too large'
          })
        }
      }

      next()
    }
  }

  /**
   * IP whitelist/blacklist
   */
  ipFilter(whitelist?: string[], blacklist?: string[]) {
    return (req: Request, res: Response, next: NextFunction) => {
      const clientIP = req.ip || req.connection.remoteAddress || 'unknown'

      if (blacklist && blacklist.includes(clientIP)) {
        return res.status(403).json({
          success: false,
          error: 'IP address blocked'
        })
      }

      if (whitelist && !whitelist.includes(clientIP)) {
        return res.status(403).json({
          success: false,
          error: 'IP address not whitelisted'
        })
      }

      next()
    }
  }

  // Private helper methods

  private sanitizeRequestBody(body: any): any {
    if (!body || typeof body !== 'object') return body

    const sanitized = { ...body }
    
    // Remove sensitive fields from logs
    delete sanitized.password
    delete sanitized.token
    delete sanitized.apiKey
    delete sanitized.secret

    return sanitized
  }

  private detectSuspiciousPatterns(req: Request): Array<{ type: string; metadata: any }> {
    const patterns: Array<{ type: string; metadata: any }> = []

    // Check for automated requests
    const userAgent = req.headers['user-agent'] || ''
    if (this.isAutomatedRequest(userAgent)) {
      patterns.push({
        type: 'automated_requests',
        metadata: { userAgent, path: req.path }
      })
    }

    // Check for unusual request patterns
    if (this.hasUnusualRequestPattern(req)) {
      patterns.push({
        type: 'unusual_access_pattern',
        metadata: { 
          method: req.method, 
          path: req.path,
          headers: Object.keys(req.headers)
        }
      })
    }

    // Check for potential data exfiltration
    if (this.isPotentialDataExfiltration(req)) {
      patterns.push({
        type: 'data_exfiltration_attempt',
        metadata: { 
          path: req.path,
          queryParams: Object.keys(req.query).length
        }
      })
    }

    return patterns
  }

  private isAutomatedRequest(userAgent: string): boolean {
    const botPatterns = [
      /bot/i, /crawler/i, /spider/i, /scraper/i,
      /curl/i, /wget/i, /python/i, /java/i
    ]
    
    return botPatterns.some(pattern => pattern.test(userAgent))
  }

  private hasUnusualRequestPattern(req: Request): boolean {
    // Check for unusual header combinations
    const suspiciousHeaders = ['x-forwarded-for', 'x-real-ip', 'x-originating-ip']
    const hasSuspiciousHeaders = suspiciousHeaders.some(header => req.headers[header])
    
    // Check for unusual request methods on specific paths
    const isUnusualMethod = req.method === 'OPTIONS' && req.path.includes('/api/')
    
    return hasSuspiciousHeaders || isUnusualMethod
  }

  private isPotentialDataExfiltration(req: Request): boolean {
    // Check for requests with excessive query parameters
    const queryParamCount = Object.keys(req.query).length
    
    // Check for requests to sensitive endpoints
    const sensitiveEndpoints = ['/api/analytics/export', '/api/admin/', '/api/reports/']
    const isSensitiveEndpoint = sensitiveEndpoints.some(endpoint => req.path.includes(endpoint))
    
    return queryParamCount > 20 || (isSensitiveEndpoint && req.method === 'GET')
  }

  private parseSize(size: string): number {
    const units = { b: 1, kb: 1024, mb: 1024 * 1024, gb: 1024 * 1024 * 1024 }
    const match = size.toLowerCase().match(/^(\d+)(b|kb|mb|gb)$/)
    
    if (!match) return 10 * 1024 * 1024 // Default 10MB
    
    const [, num, unit] = match
    return parseInt(num) * units[unit as keyof typeof units]
  }
}

// Export singleton instance
export const securityMiddleware = new SecurityMiddleware()