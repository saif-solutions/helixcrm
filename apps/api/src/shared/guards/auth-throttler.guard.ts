// apps/api/src/shared/guards/auth-throttler.guard.ts

import { Injectable, ExecutionContext, Logger } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerStorage } from '@nestjs/throttler';
import { Reflector } from '@nestjs/core';
import type { ThrottlerModuleOptions } from '@nestjs/throttler';
import type { Request } from 'express';

// ==================== INTERFACES ====================

/**
 * Extended request with user information
 */
interface RequestWithUser extends Request {
  user?: {
    id?: string;
    sub?: string;
    email?: string;
    [key: string]: unknown;
  };
  ip?: string;
  socket?: {
    remoteAddress?: string;
  };
  headers: {
    'x-forwarded-for'?: string | string[];
    [key: string]: string | string[] | undefined;
  };
}

/**
 * Rate limit tracking identifier
 */
interface RateLimitTracker {
  key: string;
  type: 'user' | 'ip' | 'unknown';
}

/**
 * Log context for structured logging
 */
interface LogContext {
  guard: string;
  timestamp: string;
  trackerType?: string;
  trackerKey?: string;
  path?: string;
  method?: string;
  [key: string]: unknown;
}

// ==================== TYPE GUARDS ====================

/**
 * Type guard for valid user ID
 */
function hasValidUserId(
  user: RequestWithUser['user'],
): user is NonNullable<RequestWithUser['user']> & { id: string } {
  return (
    user !== null &&
    user !== undefined &&
    typeof user === 'object' &&
    (('id' in user && typeof user.id === 'string' && user.id.length > 0) ||
      ('sub' in user && typeof user.sub === 'string' && user.sub.length > 0))
  );
}

/**
 * Type guard for valid IP address
 */
function isValidIp(ip: unknown): ip is string {
  return (
    typeof ip === 'string' &&
    ip.length > 0 &&
    ip !== '::1' &&
    ip !== '127.0.0.1'
  );
}

/**
 * Get user ID from request user object
 */
function getUserId(user: RequestWithUser['user']): string | null {
  if (!hasValidUserId(user)) {
    return null;
  }
  return user.id || user.sub;
}

// ==================== AUTH THROTTLER GUARD ====================

@Injectable()
export class AuthThrottlerGuard extends ThrottlerGuard {
  private readonly logger = new Logger(AuthThrottlerGuard.name);
  private readonly isProduction = process.env.NODE_ENV === 'production';
  private readonly trustProxy = process.env.TRUST_PROXY === 'true';

  constructor(
    options: ThrottlerModuleOptions,
    storageService: ThrottlerStorage,
    reflector: Reflector,
  ) {
    super(options, storageService, reflector);
  }

  /**
   * Generate a unique tracker key for rate limiting
   * Prioritizes user ID over IP address for authenticated requests
   */
  protected getTracker(req: RequestWithUser): string {
    const startTime = this.isProduction ? undefined : performance.now();
    const tracker = this.buildTracker(req);

    // Log tracker creation in development
    if (!this.isProduction) {
      const executionTime = performance.now() - (startTime ?? 0);
      this.logDebug('Rate limit tracker created', {
        trackerType: tracker.type,
        trackerKey: this.maskTrackerKey(tracker.key, tracker.type),
        executionTime: `${executionTime.toFixed(2)}ms`,
        path: req.path,
        method: req.method,
      });
    }

    return tracker.key;
  }

  /**
   * Build rate limit tracker from request
   */
  private buildTracker(req: RequestWithUser): RateLimitTracker {
    // Priority 1: Authenticated user by ID
    const userId = getUserId(req.user);
    if (userId) {
      return {
        key: `user:${userId}`,
        type: 'user',
      };
    }

    // Priority 2: Client IP address
    const clientIp = this.getClientIp(req);
    if (clientIp) {
      return {
        key: `ip:${clientIp}`,
        type: 'ip',
      };
    }

    // Fallback: Unknown tracker
    this.logger.warn('Unable to determine rate limit tracker', {
      path: req.path,
      method: req.method,
      hasUser: !!req.user,
      hasIp: !!req.ip,
    });

    return {
      key: 'unknown',
      type: 'unknown',
    };
  }

  /**
   * Get client IP address with proxy support
   */
  private getClientIp(req: RequestWithUser): string | null {
    // Check X-Forwarded-For header when behind proxy
    if (this.trustProxy && req.headers['x-forwarded-for']) {
      const forwardedFor = req.headers['x-forwarded-for'];
      const ips = Array.isArray(forwardedFor) ? forwardedFor : [forwardedFor];
      const firstIp = ips[0];
      if (isValidIp(firstIp)) {
        return firstIp;
      }
    }

    // Use request IP
    if (req.ip && isValidIp(req.ip)) {
      return req.ip;
    }

    // Use socket remote address
    if (req.socket?.remoteAddress && isValidIp(req.socket.remoteAddress)) {
      return req.socket.remoteAddress;
    }

    return null;
  }

  /**
   * Override error response for better client feedback
   */
  protected async throwThrottlingException(
    context: ExecutionContext,
    throttlerLimit: number,
    throttlerTtl: number,
  ): Promise<void> {
    const req = context.switchToHttp().getRequest<RequestWithUser>();
    const tracker = this.buildTracker(req);

    const logContext: LogContext = {
      guard: 'AuthThrottlerGuard',
      timestamp: new Date().toISOString(),
      trackerType: tracker.type,
      trackerKey: this.maskTrackerKey(tracker.key, tracker.type),
      path: req.path,
      method: req.method,
      limit: throttlerLimit,
      ttl: throttlerTtl,
    };

    this.logger.warn('Rate limit exceeded', logContext);

    // Use parent method to throw the appropriate exception
    await super.throwThrottlingException(context, throttlerLimit, throttlerTtl);
  }

  /**
   * Get custom rate limit configuration for auth routes
   * Can be overridden for different auth endpoints
   */
  protected getAuthRateLimitConfig(): { points: number; duration: number } {
    // Default auth rate limit: 5 attempts per minute
    return {
      points: 5,
      duration: 60,
    };
  }

  /**
   * Check if route should use stricter rate limiting
   */
  protected isAuthRoute(req: RequestWithUser): boolean {
    const authPaths = [
      '/auth/login',
      '/auth/register',
      '/auth/refresh',
      '/auth/forgot-password',
    ];
    return authPaths.some((path) => req.path?.startsWith(path));
  }

  /**
   * Override canActivate to add custom auth route rate limiting
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RequestWithUser>();

    // Apply stricter rate limiting for auth routes
    if (this.isAuthRoute(req)) {
      const authConfig = this.getAuthRateLimitConfig();

      // Temporarily override throttler options for auth routes
      const originalOptions = { ...this.options };
      Object.assign(this.options, {
        limit: authConfig.points,
        ttl: authConfig.duration,
      });

      try {
        return await super.canActivate(context);
      } finally {
        // Restore original options
        Object.assign(this.options, originalOptions);
      }
    }

    // Use default rate limiting for non-auth routes
    return super.canActivate(context);
  }

  /**
   * Mask tracker key for logging
   */
  private maskTrackerKey(key: string, type: string): string {
    if (type === 'user') {
      // Mask user ID: show first 4 and last 4 characters
      const userId = key.replace('user:', '');
      if (userId.length <= 8) return `${type}:****`;
      return `${type}:${userId.slice(0, 4)}...${userId.slice(-4)}`;
    }

    if (type === 'ip') {
      // Mask IP address: show first and last octet
      const ip = key.replace('ip:', '');
      const parts = ip.split('.');
      if (parts.length === 4) {
        return `${type}:${parts[0]}.***.***.${parts[3]}`;
      }
      return `${type}:***.***.***.***`;
    }

    return `${type}:***`;
  }

  /**
   * Debug logging for development
   */
  private logDebug(message: string, context: Record<string, unknown>): void {
    if (!this.isProduction) {
      this.logger.debug(`${message} - ${JSON.stringify(context)}`);
    }
  }

  /**
   * Get storage service for testing/access
   */
  getStorage(): ThrottlerStorage {
    return this.storageService;
  }

  /**
   * Clear rate limit for a specific user or IP
   * Useful for after successful login or password reset
   *
   * Note: This method uses type assertion because ThrottlerStorage's record method
   * may not be exposed in the public type definitions, but it exists at runtime.
   */
  async clearRateLimit(tracker: string): Promise<void> {
    try {
      // Use type assertion to access the record method
      // The ThrottlerStorage interface doesn't expose record method in types,
      // but it exists at runtime in the storage service implementation
      const storage = this.storageService as {
        record: (key: string, totalHits: number, ttl: number) => Promise<void>;
      };

      await storage.record(tracker, 0, 1);
      this.logger.debug(
        `Rate limit cleared for tracker: ${this.maskTrackerKey(tracker, 'unknown')}`,
      );
    } catch (error) {
      this.logger.warn(`Failed to clear rate limit for tracker`, {
        tracker: this.maskTrackerKey(tracker, 'unknown'),
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
