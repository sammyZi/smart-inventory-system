import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthServiceV2 } from '../services/authServiceV2';
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from '../types';

// Middleware to automatically refresh tokens when they're close to expiry
export const autoTokenRefresh = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    
    try {
      // Decode token without verification to check expiry
      const decoded = jwt.decode(token) as any;
      
      if (!decoded || !decoded.exp) {
        return next();
      }

      const now = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = decoded.exp - now;
      
      // If token expires in less than 5 minutes, refresh it
      if (timeUntilExpiry < 300 && timeUntilExpiry > 0) {
        const refreshToken = req.cookies.refreshToken || req.headers['x-refresh-token'];
        const sessionId = req.headers['x-session-id'] as string;
        
        if (refreshToken) {
          try {
            const newTokens = await AuthServiceV2.refreshToken(refreshToken, sessionId);
            
            // Set new access token in response header
            res.setHeader('X-New-Access-Token', newTokens.accessToken);
            res.setHeader('X-Token-Refreshed', 'true');
            
            // Update refresh token cookie if it was also refreshed
            if (newTokens.refreshToken !== refreshToken) {
              res.cookie('refreshToken', newTokens.refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
              });
            }
            
            logger.info('Token auto-refreshed', {
              userId: decoded.userId,
              timeUntilExpiry,
              sessionId
            });
          } catch (error) {
            logger.warn('Auto token refresh failed', {
              userId: decoded.userId,
              error: error.message
            });
          }
        }
      }
    } catch (error) {
      // Token decode failed, continue normally
    }

    next();
  } catch (error) {
    logger.error('Auto token refresh middleware error', { error: error.message });
    next();
  }
};

// Middleware to handle token refresh requests
export const handleTokenRefresh = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
    const sessionId = req.headers['x-session-id'] as string;

    if (!refreshToken) {
      return res.status(401).json({
        error: {
          code: 'MISSING_REFRESH_TOKEN',
          message: 'Refresh token required',
          timestamp: new Date().toISOString()
        }
      });
    }

    const tokens = await AuthServiceV2.refreshToken(refreshToken, sessionId);

    // Update refresh token cookie
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    res.json({
      success: true,
      data: {
        accessToken: tokens.accessToken,
        expiresIn: '15m'
      },
      message: 'Token refreshed successfully'
    });
  } catch (error) {
    next(error);
  }
};