// apps/api/src/shared/security/csrf.middleware.ts

import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import csurf from 'csurf';
import SecurityConfig from '../../config/security.config';

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  private csrfProtection: any;
  private readonly logger = new Logger(CsrfMiddleware.name);

  constructor() {
    this.csrfProtection = csurf({
      cookie: SecurityConfig.cookies.csrfToken(),
      value: (req: any) => {
        return (
          (req.headers[SecurityConfig.csrf.headerName.toLowerCase()] as string) ||
          (req.body && req.body._csrf) ||
          (req.query._csrf as string)
        );
      },
      ignoreMethods: SecurityConfig.csrf.ignoreMethods as any,
    });
  }

  use(req: Request, res: Response, next: NextFunction) {
    // DEBUG: Log every request that hits this middleware
    this.logger.debug(`🔥 CSRF middleware processing: ${req.method} ${req.url}`);
    
    const skipCsrfPaths = [
      '/api/v1/auth/login',
      '/api/v1/auth/register',
      '/api/v1/auth/refresh',
      '/api/v1/auth/logout',
      '/api/auth/csrf-token',
      '/api/health',
      '/health',
    ];

    const shouldSkip = skipCsrfPaths.some((path) => req.path.startsWith(path));
    
    this.logger.debug(`Path: ${req.path}, Should skip: ${shouldSkip}`);

    if (shouldSkip) {
      this.logger.debug(`✅ Skipping CSRF for ${req.method} ${req.path}`);
      return next();
    }

    try {
      this.csrfProtection(req, res, (err: any) => {
        if (err) {
          if (err.code === 'EBADCSRFTOKEN') {
            this.logger.warn(
              `CSRF validation failed for ${req.method} ${req.path}`,
              {
                requestId: (req as any).requestId,
                ip: req.ip,
                userAgent: req.get('user-agent'),
                timestamp: new Date().toISOString(),
              },
            );

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

          return next(err);
        }

        next();
      });
    } catch (error) {
      this.logger.error(`CSRF middleware error: ${error.message}`, {
        stack: error.stack,
        timestamp: new Date().toISOString(),
      });
      return next(error);
    }
  }
}