// apps/api/src/shared/security/csrf.middleware.ts

import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';
import * as csurf from 'csurf';

// ==================== INTERFACES ====================

/**
 * Extended request with CSRF token methods
 */
interface CsrfRequest extends Request {
  csrfToken?: () => string;
  body?: Record<string, unknown>;
  query?: Record<string, unknown>;
}

/**
 * CSRF error interface
 */
interface CsrfError extends Error {
  code?: string;
}

/**
 * CSRF protection middleware type
 */
type CsrfProtectionMiddleware = (
  req: Request,
  res: Response,
  next: (err?: unknown) => void,
) => void;

// ==================== TYPE GUARDS ====================

/**
 * Type guard for CSRF error
 */
function isCsrfError(error: unknown): error is CsrfError {
  return (
    error instanceof Error &&
    'code' in error &&
    typeof (error as CsrfError).code === 'string'
  );
}

/**
 * Type guard for request with CSRF token
 */
function hasCsrfToken(
  req: Request,
): req is Request & { csrfToken: () => string } {
  return (
    'csrfToken' in req &&
    typeof (req as Request & { csrfToken: () => string }).csrfToken ===
      'function'
  );
}

// ==================== CONSTANTS ====================

const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_COOKIE_NAME = '_csrf';

const SKIP_PATHS = [
  '/api/v1/auth/login',
  '/api/v1/auth/register',
  '/api/v1/auth/refresh',
  '/api/v1/auth/logout',
  '/api/v1/auth/csrf-token',
  '/api/health',
  '/health',
];

// ==================== HELPER FUNCTIONS ====================

/**
 * Safely extract error message
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Unknown error occurred';
}

/**
 * Get CSRF token value from request
 */
function getCsrfTokenValue(req: CsrfRequest): string | undefined {
  // Priority 1: CSRF header
  const headerValue = req.headers[CSRF_HEADER_NAME];
  if (headerValue && typeof headerValue === 'string') {
    return headerValue;
  }

  // Priority 2: Request body _csrf field
  if (req.body && typeof req.body === 'object' && '_csrf' in req.body) {
    const bodyValue = req.body['_csrf'];
    if (typeof bodyValue === 'string') {
      return bodyValue;
    }
  }

  // Priority 3: Query parameter _csrf
  if (req.query && typeof req.query === 'object' && '_csrf' in req.query) {
    const queryValue = req.query['_csrf'];
    if (typeof queryValue === 'string') {
      return queryValue;
    }
  }

  return undefined;
}

/**
 * Create CSRF protection middleware
 */
function createCsrfProtection(isProduction: boolean): CsrfProtectionMiddleware {
  return csurf({
    cookie: {
      key: CSRF_COOKIE_NAME,
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax' as const,
      maxAge: 24 * 60 * 60 * 1000,
    },
    value: getCsrfTokenValue,
    ignoreMethods: ['GET', 'HEAD', 'OPTIONS'],
  }) as CsrfProtectionMiddleware;
}

// ==================== CSRF MIDDLEWARE ====================

/**
 * CSRF Protection Middleware
 *
 * Protects against Cross-Site Request Forgery attacks by validating
 * CSRF tokens on state-changing requests.
 */
@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  private readonly logger = new Logger(CsrfMiddleware.name);
  private readonly csrfProtection: CsrfProtectionMiddleware;
  private readonly isProduction: boolean;

  constructor(private readonly configService: ConfigService) {
    this.isProduction = configService.get('NODE_ENV') === 'production';
    this.csrfProtection = createCsrfProtection(this.isProduction);
  }

  /**
   * Main middleware handler
   */
  use(req: Request, res: Response, next: NextFunction): void {
    // Skip CSRF validation for safe paths
    if (this.shouldSkipValidation(req)) {
      return next();
    }

    // Apply CSRF protection - csrfProtection is guaranteed to be a function
    this.csrfProtection(req, res, (err: unknown) => {
      if (err) {
        this.handleCsrfError(err, req, res);
        return;
      }
      next();
    });
  }

  /**
   * Check if CSRF validation should be skipped for this request
   */
  private shouldSkipValidation(req: Request): boolean {
    const path = req.path;

    // Skip for GET, HEAD, OPTIONS methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return true;
    }

    // Skip for configured safe paths
    return SKIP_PATHS.some((skipPath) => path.startsWith(skipPath));
  }

  /**
   * Handle CSRF validation errors
   */
  private handleCsrfError(err: unknown, req: Request, res: Response): void {
    // Check for CSRF token error
    if (isCsrfError(err) && err.code === 'EBADCSRFTOKEN') {
      this.logger.warn(`CSRF validation failed: ${req.method} ${req.path}`, {
        ip: this.getClientIp(req),
        userAgent: req.get('user-agent'),
        timestamp: new Date().toISOString(),
        origin: req.get('origin'),
        referer: req.get('referer'),
      });

      res.status(403).json({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Invalid or missing CSRF token',
        suggestion: 'Get a new CSRF token from /api/v1/auth/csrf-token',
        requiredHeader: CSRF_HEADER_NAME,
      });
      return;
    }

    // Pass through other errors
    this.logger.error(`CSRF middleware error: ${getErrorMessage(err)}`);
    res.status(500).json({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'CSRF validation failed',
    });
  }

  /**
   * Get client IP address from request
   */
  private getClientIp(req: Request): string {
    const forwarded = req.get('x-forwarded-for');
    if (forwarded && typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return req.ip || 'unknown';
  }
}

/**
 * Get CSRF token from request (for token generation endpoint)
 */
export function getCsrfToken(req: Request): string | undefined {
  if (hasCsrfToken(req)) {
    return req.csrfToken();
  }
  return undefined;
}
