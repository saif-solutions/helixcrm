// apps/api/src/shared/security/csrf.middleware.ts
import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import csurf from 'csurf';
import SecurityConfig from '../config/security.config';

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  private csrfProtection: any;
  private readonly logger = new Logger(CsrfMiddleware.name);

  constructor() {
    this.csrfProtection = csurf({
      cookie: SecurityConfig.cookies.csrfToken(),
      value: (req: any) =>
        req.headers[SecurityConfig.csrf.headerName.toLowerCase()] ||
        req.body?._csrf ||
        req.query._csrf,
      ignoreMethods: SecurityConfig.csrf.ignoreMethods as any,
    });
  }

  use(req: Request, res: Response, next: NextFunction) {
    const skipPaths = [
      '/api/v1/auth/login',
      '/api/v1/auth/register',
      '/api/v1/auth/refresh',
      '/api/v1/auth/logout',
      '/api/v1/auth/csrf-token',
      '/api/health',
      '/health',
    ];

    if (skipPaths.some((p) => req.path.startsWith(p))) {
      return next();
    }

    this.csrfProtection(req, res, (err: any) => {
      if (err) {
        if (err.code === 'EBADCSRFTOKEN') {
          this.logger.warn(`CSRF validation failed: ${req.method} ${req.path}`, {
            ip: req.ip,
            userAgent: req.get('user-agent'),
            timestamp: new Date().toISOString(),
          });
          return res.status(403).json({
            statusCode: 403,
            error: 'Forbidden',
            message: 'Invalid CSRF token',
            suggestion: 'Get a new CSRF token from /auth/csrf-token',
          });
        }
        return next(err);
      }
      next();
    });
  }
}