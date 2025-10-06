/**
 * Enhanced Security Service
 * Comprehensive security measures with role-based protection
 */

import crypto from 'crypto'
import bcrypt from 'bcrypt'
import rateLimit from 'express-rate-limit'
import { Request, Response, NextFunction } from 'express'
import { UserContext } from '../middleware/permissions'
import { AuditService } from './auditService'

export interface SecurityConfig {
  encryption: {
    algorithm: string
    keyLength: number
    ivLength: number
  }
  rateLimit: {
    windowMs: number
    maxRequests: number
    skipSuccessfulRequests: boolean
  }
  passwordPolicy: {
    minLength: number
    requireUppercase: boolean
    requireLowercase: boolean
    requireNumbers: boolean
    requireSpecialChars: boolean
  }
  sessionSecurity: {
    maxAge: number
    secure: boolean
    httpOnly: boolean
    sameSite: 'strict' | 'lax' | 'none'
  }
}

export interface ValidationRule {
  field: string
  type: 'string' | 'number' | 'email' | 'phone' | 'date' | 'boolean'
  required: boolean
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  allowedValues?: any[]
  customValidator?: (value: any) => boolean
}

export interface RateLimitConfig {
  windowMs: number
  maxRequests: number
  message: string
  skipSuccessfulRequests?: boolean
  keyGenerator?: (req: Request) => string
}

export class SecurityService {
  private auditService: AuditService
  private encryptionKey: string
  private config: SecurityConfig

  constructor(auditService: AuditService) {
    this.auditService = auditService
    this.encryptionKey = process.env.ENCRYPTION_KEY || this.generateEncryptionKey()
    this.config = this.getDefaultConfig()
  }

  /**
   * Create role-based rate limiter
   */
  createRoleBasedRateLimit(configs: Record<string, RateLimitConfig>) {
    return (req: any, res: Response, next: NextFunction) => {
      const userRole = req.user?.role || 'GUEST'
      const config = configs[userRole] || configs['DEFAULT']

      if (!config) {
        return next()
      }

      const limiter = rateLimit({
        windowMs: config.windowMs,
        max: config.maxRequests,
        message: { error: config.message },
        skipSuccessfulRequests: config.skipSuccessfulRequests || false,
        keyGenerator: config.keyGenerator || ((req) => {
          return `${req.ip}:${req.user?.id || 'anonymous'}:${userRole}`
        }),
        handler: async (req, res) => {
          // Log rate limit exceeded
          if (req.user) {
            await this.auditService.logEvent(
              req.user,
              'RATE_LIMIT_EXCEEDED',
              'api_endpoint',
              {
                endpoint: req.path,
                method: req.method,
                userRole,
                limit: config.maxRequests,
                window: config.windowMs
              },
              req,
              false,
              'Rate limit exceeded'
            )
          }

          res.status(429).json({ error: config.message })
        }
      })

      limiter(req, res, next)
    }
  }

  /**
   * Comprehensive input validation with security checks
   */
  validateInput(
    data: Record<string, any>,
    rules: ValidationRule[],
    userContext?: UserContext
  ): { isValid: boolean; errors: string[]; sanitizedData: Record<string, any> } {
    const errors: string[] = []
    const sanitizedData: Record<string, any> = {}

    for (const rule of rules) {
      const value = data[rule.field]

      // Check required fields
      if (rule.required && (value === undefined || value === null || value === '')) {
        errors.push(`${rule.field} is required`)
        continue
      }

      // Skip validation for optional empty fields
      if (!rule.required && (value === undefined || value === null || value === '')) {
        continue
      }

      // Type validation
      const typeValidation = this.validateType(value, rule.type)
      if (!typeValidation.isValid) {
        errors.push(`${rule.field} must be a valid ${rule.type}`)
        continue
      }

      let sanitizedValue = typeValidation.sanitizedValue

      // Length validation
      if (rule.minLength && sanitizedValue.length < rule.minLength) {
        errors.push(`${rule.field} must be at least ${rule.minLength} characters`)
        continue
      }

      if (rule.maxLength && sanitizedValue.length > rule.maxLength) {
        errors.push(`${rule.field} must not exceed ${rule.maxLength} characters`)
        continue
      }

      // Pattern validation
      if (rule.pattern && !rule.pattern.test(sanitizedValue)) {
        errors.push(`${rule.field} format is invalid`)
        continue
      }

      // Allowed values validation
      if (rule.allowedValues && !rule.allowedValues.includes(sanitizedValue)) {
        errors.push(`${rule.field} must be one of: ${rule.allowedValues.join(', ')}`)
        continue
      }

      // Custom validation
      if (rule.customValidator && !rule.customValidator(sanitizedValue)) {
        errors.push(`${rule.field} validation failed`)
        continue
      }

      // Security checks
      const securityCheck = this.performSecurityChecks(sanitizedValue, rule.field)
      if (!securityCheck.isValid) {
        errors.push(`${rule.field}: ${securityCheck.error}`)
        continue
      }

      sanitizedData[rule.field] = securityCheck.sanitizedValue
    }

    // Log validation attempts if there are errors
    if (errors.length > 0 && userContext) {
      this.auditService.logEvent(
        userContext,
        'INPUT_VALIDATION_FAILED',
        'validation',
        {
          errors: errors.length,
          fields: rules.map(r => r.field)
        },
        null,
        false,
        `Validation failed: ${errors.join(', ')}`
      )
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitizedData
    }
  }

  /**
   * Encrypt sensitive data
   */
  encryptData(data: string): { encrypted: string; iv: string } {
    const iv = crypto.randomBytes(this.config.encryption.ivLength)
    const cipher = crypto.createCipher(this.config.encryption.algorithm, this.encryptionKey)
    
    let encrypted = cipher.update(data, 'utf8', 'hex')
    encrypted += cipher.final('hex')

    return {
      encrypted,
      iv: iv.toString('hex')
    }
  }

  /**
   * Decrypt sensitive data
   */
  decryptData(encryptedData: string, iv: string): string {
    const decipher = crypto.createDecipher(this.config.encryption.algorithm, this.encryptionKey)
    
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  }

  /**
   * Hash passwords securely
   */
  async hashPassword(password: string): Promise<string> {
    const saltRounds = parseInt(process.env.SALT_ROUNDS || '12')
    return await bcrypt.hash(password, saltRounds)
  }

  /**
   * Verify password against hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash)
  }

  /**
   * Validate password against security policy
   */
  validatePassword(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = []
    const policy = this.config.passwordPolicy

    if (password.length < policy.minLength) {
      errors.push(`Password must be at least ${policy.minLength} characters long`)
    }

    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter')
    }

    if (policy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter')
    }

    if (policy.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number')
    }

    if (policy.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character')
    }

    // Check for common weak passwords
    const commonPasswords = ['password', '123456', 'qwerty', 'admin', 'letmein']
    if (commonPasswords.includes(password.toLowerCase())) {
      errors.push('Password is too common and easily guessable')
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * Generate secure session token
   */
  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex')
  }

  /**
   * Create CSRF token
   */
  generateCSRFToken(): string {
    return crypto.randomBytes(32).toString('base64')
  }

  /**
   * Validate CSRF token
   */
  validateCSRFToken(token: string, sessionToken: string): boolean {
    // In production, implement proper CSRF validation
    return token === sessionToken
  }

  /**
   * Sanitize HTML input to prevent XSS
   */
  sanitizeHTML(input: string): string {
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
  }

  /**
   * Detect and prevent SQL injection attempts
   */
  detectSQLInjection(input: string): boolean {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
      /(--|\/\*|\*\/|;|'|")/,
      /(\bOR\b|\bAND\b).*(\b=\b|\bLIKE\b)/i,
      /(UNION.*SELECT|SELECT.*FROM|INSERT.*INTO|UPDATE.*SET|DELETE.*FROM)/i
    ]

    return sqlPatterns.some(pattern => pattern.test(input))
  }

  /**
   * Monitor and detect suspicious activities
   */
  async monitorSuspiciousActivity(
    userContext: UserContext,
    activity: string,
    metadata: Record<string, any>,
    request: any
  ): Promise<void> {
    const suspiciousPatterns = [
      'multiple_failed_logins',
      'unusual_access_pattern',
      'privilege_escalation_attempt',
      'data_exfiltration_attempt',
      'automated_requests'
    ]

    if (suspiciousPatterns.includes(activity)) {
      await this.auditService.logEvent(
        userContext,
        'SUSPICIOUS_ACTIVITY_DETECTED',
        'security_monitoring',
        {
          activity,
          ...metadata,
          riskScore: this.calculateRiskScore(activity, metadata)
        },
        request,
        false,
        `Suspicious activity detected: ${activity}`
      )
    }
  }

  /**
   * Check for cross-tenant access attempts
   */
  validateTenantAccess(
    userContext: UserContext,
    resourceTenantId: string,
    resource: string
  ): { isValid: boolean; error?: string } {
    if (userContext.tenantId !== resourceTenantId) {
      return {
        isValid: false,
        error: `Cross-tenant access denied: User from tenant ${userContext.tenantId} attempted to access resource from tenant ${resourceTenantId}`
      }
    }

    return { isValid: true }
  }

  /**
   * Implement security headers middleware
   */
  securityHeaders() {
    return (req: Request, res: Response, next: NextFunction) => {
      // Prevent clickjacking
      res.setHeader('X-Frame-Options', 'DENY')
      
      // Prevent MIME type sniffing
      res.setHeader('X-Content-Type-Options', 'nosniff')
      
      // Enable XSS protection
      res.setHeader('X-XSS-Protection', '1; mode=block')
      
      // Enforce HTTPS
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
      
      // Content Security Policy
      res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'")
      
      // Referrer Policy
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
      
      next()
    }
  }

  // Private helper methods

  private getDefaultConfig(): SecurityConfig {
    return {
      encryption: {
        algorithm: 'aes-256-cbc',
        keyLength: 32,
        ivLength: 16
      },
      rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 100,
        skipSuccessfulRequests: false
      },
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true
      },
      sessionSecurity: {
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'strict'
      }
    }
  }

  private generateEncryptionKey(): string {
    return crypto.randomBytes(32).toString('hex')
  }

  private validateType(value: any, type: string): { isValid: boolean; sanitizedValue: any } {
    switch (type) {
      case 'string':
        if (typeof value !== 'string') return { isValid: false, sanitizedValue: value }
        return { isValid: true, sanitizedValue: value.trim() }

      case 'number':
        const num = Number(value)
        if (isNaN(num)) return { isValid: false, sanitizedValue: value }
        return { isValid: true, sanitizedValue: num }

      case 'email':
        if (typeof value !== 'string') return { isValid: false, sanitizedValue: value }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        const email = value.trim().toLowerCase()
        return { isValid: emailRegex.test(email), sanitizedValue: email }

      case 'phone':
        if (typeof value !== 'string') return { isValid: false, sanitizedValue: value }
        const phoneRegex = /^\+?[\d\s\-\(\)]+$/
        const phone = value.replace(/\s/g, '')
        return { isValid: phoneRegex.test(phone), sanitizedValue: phone }

      case 'date':
        const date = new Date(value)
        if (isNaN(date.getTime())) return { isValid: false, sanitizedValue: value }
        return { isValid: true, sanitizedValue: date }

      case 'boolean':
        if (typeof value === 'boolean') return { isValid: true, sanitizedValue: value }
        if (value === 'true' || value === '1') return { isValid: true, sanitizedValue: true }
        if (value === 'false' || value === '0') return { isValid: true, sanitizedValue: false }
        return { isValid: false, sanitizedValue: value }

      default:
        return { isValid: true, sanitizedValue: value }
    }
  }

  private performSecurityChecks(value: any, field: string): { isValid: boolean; error?: string; sanitizedValue: any } {
    const stringValue = String(value)

    // Check for SQL injection
    if (this.detectSQLInjection(stringValue)) {
      return {
        isValid: false,
        error: 'Potential SQL injection detected',
        sanitizedValue: value
      }
    }

    // Check for XSS attempts
    if (/<script|javascript:|on\w+=/i.test(stringValue)) {
      return {
        isValid: false,
        error: 'Potential XSS attempt detected',
        sanitizedValue: value
      }
    }

    // Sanitize HTML for text fields
    let sanitizedValue = value
    if (typeof value === 'string' && field !== 'password') {
      sanitizedValue = this.sanitizeHTML(value)
    }

    return {
      isValid: true,
      sanitizedValue
    }
  }

  private calculateRiskScore(activity: string, metadata: Record<string, any>): number {
    let score = 0

    switch (activity) {
      case 'multiple_failed_logins':
        score = Math.min(metadata.attempts * 10, 100)
        break
      case 'privilege_escalation_attempt':
        score = 80
        break
      case 'data_exfiltration_attempt':
        score = 90
        break
      case 'automated_requests':
        score = 60
        break
      default:
        score = 30
    }

    return score
  }
}