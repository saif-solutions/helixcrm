// apps/api/src/shared/guards/tenant.guard.ts

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { setTenantId, getTenantId } from '../als';
import { IS_PUBLIC_KEY } from '../decorators/require-permission.decorator';
import type { Request } from 'express';
import type { UserPayload } from '../types/request.types';

// ==================== INTERFACES ====================

/**
 * Extended request with user information
 */
interface AuthenticatedRequest extends Request {
  user?: UserPayload;
  organizationId?: string;
  id?: string;
}

/**
 * Log context for structured logging
 */
interface LogContext {
  correlationId?: string;
  path: string;
  method: string;
  userId?: string;
  organizationId?: string;
  [key: string]: unknown;
}

// ==================== TYPE GUARDS ====================

/**
 * Type guard for request with user
 */
function hasUser(
  req: AuthenticatedRequest,
): req is AuthenticatedRequest & { user: UserPayload } {
  return req.user !== undefined && req.user !== null;
}

/**
 * Type guard for error with message
 */
function hasErrorMessage(error: unknown): error is { message: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  );
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Safely extract error message
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (hasErrorMessage(error)) return error.message;
  if (typeof error === 'string') return error;
  return 'Unknown error occurred';
}

/**
 * Mask user ID for logging
 */
function maskUserId(userId: string | undefined): string {
  if (!userId) return 'unknown';
  if (userId.length <= 8) return '****';
  return `${userId.slice(0, 4)}...${userId.slice(-4)}`;
}

/**
 * Get organization ID from user payload
 */
function getOrganizationId(user: UserPayload): string {
  return user.organizationId || user.org;
}

/**
 * Get correlation ID from request
 */
function getCorrelationId(request: AuthenticatedRequest): string {
  return request.id || 'unknown';
}

/**
 * Mask sensitive path segments for logging
 */
function maskPathForLogging(path: string): string {
  return path.replace(/\/[0-9a-f-]{8,}/gi, '/:id');
}

// ==================== TENANT GUARD ====================

/**
 * Tenant Guard
 *
 * Ensures that requests are properly scoped to a tenant context.
 * This guard must run after AuthGuard to have access to the authenticated user.
 *
 * The guard:
 * 1. Skips tenant validation for public routes
 * 2. Validates that the user has an organization ID
 * 3. Sets the tenant ID in ALS for context propagation
 * 4. Ensures tenant isolation across the request lifecycle
 *
 * @example
 * ```typescript
 * @UseGuards(AuthGuard, TenantGuard)
 * @Controller('deals')
 * export class DealsController {
 *   // All routes are tenant-scoped
 * }
 * ```
 */
@Injectable()
export class TenantGuard implements CanActivate {
  private readonly logger = new Logger(TenantGuard.name);
  private readonly isProduction = process.env.NODE_ENV === 'production';

  constructor(private readonly reflector: Reflector) {}

  /**
   * Check if the route can be activated
   * Establishes tenant context from authenticated user
   */
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const startTime = this.isProduction ? undefined : performance.now();

    const correlationId = getCorrelationId(request);
    const path = request.path;
    const method = request.method;

    const logContext: LogContext = {
      correlationId,
      path: maskPathForLogging(path),
      method,
    };

    if (!this.isProduction) {
      this.logDebug('Tenant guard started', logContext);
    }

    try {
      // Check if route is public (skip tenant validation)
      const isPublic = this.reflector.get<boolean>(
        IS_PUBLIC_KEY,
        context.getHandler(),
      );

      if (isPublic) {
        if (!this.isProduction) {
          this.logDebug('Public route, skipping tenant validation', logContext);
        }
        return true;
      }

      // Validate user exists
      if (!hasUser(request)) {
        this.logger.error(
          'No user found - AuthGuard must run before TenantGuard',
          JSON.stringify({
            correlationId,
            path: maskPathForLogging(path),
            method,
          }),
        );
        throw new ForbiddenException(
          'Authentication required before tenant context can be established',
        );
      }

      const user = request.user;
      const organizationId = getOrganizationId(user);
      const userId = user.sub;

      logContext.userId = maskUserId(userId);
      logContext.organizationId = organizationId;

      // Validate organization ID exists
      if (!organizationId) {
        this.logger.error(
          'User missing organization ID',
          JSON.stringify({
            correlationId,
            userId: maskUserId(userId),
            path: maskPathForLogging(path),
          }),
        );
        throw new ForbiddenException(
          'User missing organization context. Please contact your administrator.',
        );
      }

      // Set tenant ID in ALS context
      setTenantId(organizationId);

      // Set on request for backward compatibility
      request.organizationId = organizationId;

      // Verify tenant context was set correctly
      const alsTenantId = getTenantId();
      if (alsTenantId !== organizationId) {
        this.logger.error(
          'Tenant context setting failed',
          JSON.stringify({
            correlationId,
            userId: maskUserId(userId),
            expected: organizationId,
            actual: alsTenantId,
          }),
        );
        throw new ForbiddenException('Failed to establish tenant context');
      }

      // Log success
      if (!this.isProduction) {
        const executionTime = performance.now() - (startTime ?? 0);
        this.logger.log(
          `Tenant context established: ${organizationId} for user ${maskUserId(userId)} (${executionTime.toFixed(2)}ms)`,
        );
      } else {
        // Production: Log at debug level if configured
        if (process.env.LOG_LEVEL === 'debug') {
          this.logger.debug(
            `Tenant context established for user ${maskUserId(userId)}`,
            { correlationId, organizationId },
          );
        }
      }

      return true;
    } catch (error) {
      this.handleError(error, logContext);
    }
  }

  /**
   * Handle errors during tenant guard execution
   */
  private handleError(error: unknown, logContext: LogContext): never {
    // Re-throw ForbiddenException directly
    if (error instanceof ForbiddenException) {
      throw error;
    }

    const errorMessage = getErrorMessage(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    this.logger.error(
      `Tenant guard failed: ${errorMessage}`,
      errorStack,
      JSON.stringify(logContext),
    );

    throw new ForbiddenException(
      `Tenant context validation failed: ${errorMessage}`,
      { cause: error instanceof Error ? error : undefined },
    );
  }

  /**
   * Debug logging helper
   */
  private logDebug(message: string, context: Record<string, unknown>): void {
    if (!this.isProduction) {
      this.logger.debug(`${message} - ${JSON.stringify(context)}`);
    }
  }
}
