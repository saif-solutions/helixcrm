import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import csurf from 'csurf';

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  private csrfProtection: any;

  constructor() {
    // Configure CSRF protection
    this.csrfProtection = csurf({
      cookie: {
        key: '_csrf', // Cookie name for CSRF token
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
      },
      value: (req: Request) => {
        // Get token from header (for API requests) or from body (for forms)
        return req.headers['x-csrf-token'] as string || 
               (req.body && req.body._csrf) ||
               req.query._csrf as string;
      },
    });
  }

  use(req: Request, res: Response, next: NextFunction) {
    // Skip CSRF for:
    // 1. GET, HEAD, OPTIONS requests (safe methods)
    // 2. Authentication endpoints (login, register, refresh, logout)
    // 3. Health checks
    const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
    const excludedPaths = [
      '/api/v1/auth/login',
      '/api/v1/auth/register', 
      '/api/v1/auth/refresh',
      '/api/v1/auth/logout',
      '/api/v1/health',
    ];

    if (safeMethods.includes(req.method) || 
        excludedPaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    // Apply CSRF protection to other requests
    this.csrfProtection(req, res, next);
  }
}
