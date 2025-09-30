import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from '../types';

// Security headers middleware
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Content Security Policy
  res.setHeader('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "font-src 'self' data:; " +
    "connect-src 'self' wss: ws:; " +
    "frame-ancestors 'none';"
  );

  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // XSS Protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions Policy
  res.setHeader('Permissions-Policy', 
    'camera=(), microphone=(), geolocation=(), payment=()'
  );

  next();
};

// Request sanitization middleware
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  // Sanitize common XSS patterns
  const sanitizeValue = (value: any): any => {
    if (typeof value === 'string') {
      return value
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .trim();
    }
    if (typeof value === 'object' && value !== null) {
      const sanitized: any = Array.isArray(value) ? [] : {};
      for (const key in value) {
        sanitized[key] = sanitizeValue(value[key]);
      }
      return sanitized;
    }
    return value;
  };

  if (req.body) {
    req.body = sanitizeValue(req.body);
  }
  if (req.query) {
    req.query = sanitizeValue(req.query);
  }
  if (req.params) {
    req.params = sanitizeValue(req.params);
  }

  next();
};

// SQL injection prevention middleware
export const preventSQLInjection = (req: Request, res: Response, next: NextFunction) => {
  const sqlInjectionPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
    /(--|\/\*|\*\/|;|'|"|`)/g,
    /(\b(OR|AND)\b.*=.*)/gi
  ];

  const checkForSQLInjection = (value: any): boolean => {
    if (typeof value === 'string') {
      return sqlInjectionPatterns.some(pattern => pattern.test(value));
    }
    if (typeof value === 'object' && value !== null) {
      return Object.values(value).some(checkForSQLInjection);
    }
    return false;
  };

  const hasSQLInjection = [req.body, req.query, req.params]
    .some(checkForSQLInjection);

  if (hasSQLInjection) {
    logger.warn('SQL injection attempt detected', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      body: req.body,
      query: req.query,
      params: req.params,
      userAgent: req.get('User-Agent')
    });

    return res.status(400).json({
      error: {
        code: 'INVALID_INPUT',
        message: 'Invalid characters detected in request',
        timestamp: new Date().toISOString()
      }
    });
  }

  next();
};

// Request size limiter
export const requestSizeLimiter = (maxSize: number = 10 * 1024 * 1024) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.get('content-length') || '0');
    
    if (contentLength > maxSize) {
      logger.warn('Request size limit exceeded', {
        ip: req.ip,
        path: req.path,
        contentLength,
        maxSize,
        userAgent: req.get('User-Agent')
      });

      return res.status(413).json({
        error: {
          code: 'REQUEST_TOO_LARGE',
          message: `Request size exceeds limit of ${maxSize} bytes`,
          timestamp: new Date().toISOString()
        }
      });
    }

    next();
  };
};

// Suspicious activity detector
export const suspiciousActivityDetector = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const suspiciousPatterns = [
    // Multiple rapid requests from same IP
    // Unusual user agent strings
    /bot|crawler|spider|scraper/i,
    // Common attack tools
    /sqlmap|nmap|nikto|burp|owasp/i
  ];

  const userAgent = req.get('User-Agent') || '';
  const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(userAgent));

  if (isSuspicious) {
    logger.warn('Suspicious activity detected', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      userAgent,
      userId: req.user?.id
    });

    // Don't block immediately, but log for analysis
    res.setHeader('X-Suspicious-Activity', 'detected');
  }

  next();
};

// Geolocation-based security (basic implementation)
export const geolocationSecurity = (allowedCountries: string[] = []) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // This would typically use a GeoIP service
    // For now, we'll just log the request for analysis
    const xForwardedFor = req.get('X-Forwarded-For');
    const xRealIp = req.get('X-Real-IP');
    const clientIp = xForwardedFor || xRealIp || req.ip;

    logger.info('Request geolocation info', {
      clientIp,
      xForwardedFor,
      xRealIp,
      path: req.path
    });

    // In production, implement actual geolocation checking here
    next();
  };
};

// Device fingerprinting middleware
export const deviceFingerprinting = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const deviceInfo = {
    userAgent: req.get('User-Agent'),
    acceptLanguage: req.get('Accept-Language'),
    acceptEncoding: req.get('Accept-Encoding'),
    connection: req.get('Connection'),
    ip: req.ip,
    timestamp: new Date().toISOString()
  };

  // Store device fingerprint for analysis
  if (req.user) {
    logger.info('Device fingerprint', {
      userId: req.user.id,
      deviceInfo
    });
  }

  // Add device info to request for later use
  (req as any).deviceInfo = deviceInfo;

  next();
};

// Honeypot middleware (trap for bots)
export const honeypot = (req: Request, res: Response, next: NextFunction) => {
  // Check for honeypot field in forms
  if (req.body && req.body.honeypot && req.body.honeypot.trim() !== '') {
    logger.warn('Honeypot triggered - likely bot activity', {
      ip: req.ip,
      path: req.path,
      honeypotValue: req.body.honeypot,
      userAgent: req.get('User-Agent')
    });

    // Return success to avoid revealing the honeypot
    return res.status(200).json({
      success: true,
      message: 'Request processed successfully'
    });
  }

  next();
};

// Combined security middleware
export const applySecurity = [
  securityHeaders,
  sanitizeInput,
  preventSQLInjection,
  requestSizeLimiter(),
  suspiciousActivityDetector,
  deviceFingerprinting,
  honeypot
];