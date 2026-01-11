import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as csurf from 'csurf';
import SecurityConfig from '../../config/security.config';

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  private csrfProtection: any;
  private readonly logger = new Logger(CsrfMiddleware.name);

  constructor() {
    // Configure CSRF protection using centralized config
    this.csrfProtection = csurf({
      cookie: SecurityConfig.cookies.csrfToken(),
      value: (req: Request) => {
        // Get token from header (for API requests) or from body (for forms)
        return req.headers[SecurityConfig.csrf.headerName.toLowerCase()] as string || 
               (req.body && req.body._csrf) ||
               req.query._csrf as string;
      },
      ignoreMethods: SecurityConfig.csrf.ignoreMethods as any,
    });
  }

  use(req: Request, res: Response, next: NextFunction) {
    // Skip CSRF entirely for certain endpoints
    const skipCsrfPaths = [
      '/api/v1/auth/login',
      '/api/v1/auth/register', 
      '/api/v1/auth/refresh',
      '/api/v1/auth/logout',
      '/api/v1/health',
    ];

    if (skipCsrfPaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    // Apply CSRF protection with error handling
    try {
      this.csrfProtection(req, res, (err: any) => {
        if (err) {
          // Handle CSRF token errors specifically
          if (err.code === 'EBADCSRFTOKEN') {
            this.logger.warn(`CSRF validation failed for ${req.method} ${req.path}`, {
              requestId: (req as any).requestId,
              ip: req.ip,
              userAgent: req.get('user-agent'),
              timestamp: new Date().toISOString(),
            });
            
            return res.status(403).json({
              statusCode: 403,
              message: 'Invalid CSRF token',
              error: 'Forbidden',
              timestamp: new Date().toISOString(),
              path: req.path,
              requestId: (req as any).requestId,
              code: 'INVALID_CSRF_TOKEN',
              suggestion: 'Get a new CSRF token from /api/v1/auth/csrf-token',
            });
          }
          
          // For other errors, pass to next error handler
          return next(err);
        }
        
        // No error, continue
        next();
      });
    } catch (error) {
      // Catch any synchronous errors
      this.logger.error(`CSRF middleware error: ${error.message}`, {
        stack: error.stack,
        timestamp: new Date().toISOString(),
      });
      return next(error);
    }
  }
}