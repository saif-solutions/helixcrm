// apps/api/src/shared/security/csrf.middleware.ts

import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import csurf from 'csurf';
import SecurityConfig from '../../config/security.config';

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  private readonly logger = new Logger(CsrfMiddleware.name);
  private csrfProtection;

  constructor() {
    this.csrfProtection = csurf({
      cookie: {
        key: SecurityConfig.csrf.cookieName, // "_csrf"
        httpOnly: false,
        secure: SecurityConfig.isProduction,
        sameSite: 'lax',
        path: '/',
      },

      ignoreMethods: SecurityConfig.csrf.ignoreMethods,

      value: (req: any) => {
        return (
          req.headers['x-csrf-token'] ||
          req.headers['x-xsrf-token'] ||
          req.body?._csrf ||
          req.query?._csrf
        );
      },
    });
  }

use(req: Request, res: Response, next: NextFunction) {
  this.logger.debug(`🔥 CSRF middleware DEFINITELY HIT: ${req.method} ${req.path}`);
    this.logger.debug(`CSRF check: ${req.method} ${req.path}`);

    const skipPaths = [
      '/api/v1/auth/login',
      '/api/v1/auth/register',
      '/api/v1/auth/refresh',
      '/api/v1/auth/logout',
      '/api/v1/auth/csrf-token', // ✅ Fixed - includes /v1/
      '/api/health',
    ];

    const shouldSkip = skipPaths.some((path) => req.path.startsWith(path));

    if (shouldSkip) {
      this.logger.debug(`Skipping CSRF for ${req.path}`);
      return next();
    }

    this.csrfProtection(req, res, (err: any) => {
      if (!err) {
        return next();
      }

      if (err.code === 'EBADCSRFTOKEN') {
        this.logger.warn('CSRF validation failed', {
          path: req.path,
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          requestId: (req as any).requestId,
        });

        return res.status(403).json({
          statusCode: 403,
          message: 'Invalid or missing CSRF token',
          error: 'Forbidden',
          code: 'INVALID_CSRF_TOKEN',
          path: req.path,
          timestamp: new Date().toISOString(),
        });
      }

      return next(err);
    });
  }
}