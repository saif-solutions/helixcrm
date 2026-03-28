// apps/api/src/shared/guards/system.guard.ts

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TenantContextService } from '../tenant/context/tenant-context.service';
import { IS_PUBLIC_KEY } from '../decorators/require-permission.decorator';
import type { Request } from 'express';

// ==================== INTERFACES ====================

/**
 * Extended request with correlation ID
 */
interface ExtendedRequest extends Request {
  id?: string;
}

/**
 * Tenant context resolution options
 */
interface TenantContextOptions {
  requireTenantContext: boolean;
  allowSystemContext: boolean;
}

/**
 * Tenant context result
 */
interface TenantContextResult {
  tenantId?: string;
  isSystemContext: boolean;
  source?: string;
  [key: string]: unknown;
}

/**
 * Log context for structured logging
 */
interface LogContext {
  correlationId?: string;
  path: string;
  method: string;
  isSystemContext?: boolean;
  source?: string;
  [key: string]: unknown;
}

// ==================== TYPE GUARDS ====================

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
 * Get correlation ID from request
 */
function getCorrelationId(request: ExtendedRequest): string {
  return request.id || 'unknown';
}

/**
 * Mask sensitive path segments for logging
 */
function maskPathForLogging(path: string): string {
  // Mask IDs in paths (e.g., /users/123 → /users/:id)
  return path.replace(/\/[0-9a-f-]{8,}/gi, '/:id');
}

// ==================== SYSTEM GUARD ====================

/**
 * System Guard
 *
 * Ensures that routes are only accessible in system context (no tenant isolation).
 * This is used for system administration, cross-tenant operations, and maintenance endpoints.
 *
 * @example
 * ```typescript
 * @UseGuards(SystemGuard)
 * @Controller('system')
 * export class SystemController {
 *   @Get('config')
 *   getSystemConfig() {
 *     // Only accessible in system context
 *   }
 * }
 * ```
 */
@Injectable()
export class SystemGuard implements CanActivate {
  private readonly logger = new Logger(SystemGuard.name);
  private readonly isProduction = process.env.NODE_ENV === 'production';

  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly reflector: Reflector,
  ) {}

  /**
   * Check if the route can be activated
   * Ensures the request is in system context
   */
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<ExtendedRequest>();
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
      this.logDebug('System guard started', logContext);
    }

    try {
      // Check if route is public (skip system check)
      const isPublic = this.reflector.get<boolean>(
        IS_PUBLIC_KEY,
        context.getHandler(),
      );

      if (isPublic) {
        if (!this.isProduction) {
          this.logDebug('Public route, skipping system check', logContext);
        }
        return true;
      }

      // Resolve context with system context allowed
      const options: TenantContextOptions = {
        requireTenantContext: false,
        allowSystemContext: true,
      };

      const tenantContextResult = this.tenantContext.resolveContext(
        request,
        options,
      ) as TenantContextResult;

      if (!this.isProduction) {
        const executionTime = performance.now() - (startTime ?? 0);
        this.logDebug('Context resolved', {
          ...logContext,
          isSystemContext: tenantContextResult.isSystemContext,
          source: tenantContextResult.source,
          executionTime: `${executionTime.toFixed(2)}ms`,
        });
      }

      // Validate this is a system context
      if (!tenantContextResult.isSystemContext) {
        this.logger.error(
          'System guard failed: Tenant context found but system context required',
          JSON.stringify({
            correlationId,
            tenantId: tenantContextResult.tenantId,
            path: maskPathForLogging(path),
            method,
            source: tenantContextResult.source,
          }),
        );
        throw new ForbiddenException(
          'This route requires system context. Only accessible from system-level operations.',
        );
      }

      // Log success
      if (!this.isProduction) {
        const executionTime = performance.now() - (startTime ?? 0);
        this.logDebug('System guard passed: SYSTEM context', {
          ...logContext,
          executionTime: `${executionTime.toFixed(2)}ms`,
        });
      } else if (process.env.LOG_LEVEL === 'debug') {
        this.logger.debug(
          `System context granted for ${maskPathForLogging(path)}`,
          {
            correlationId,
          },
        );
      }

      return true;
    } catch (error) {
      this.handleError(error, logContext);
    }
  }

  /**
   * Handle errors during system guard execution
   */
  private handleError(error: unknown, logContext: LogContext): never {
    if (error instanceof ForbiddenException) {
      throw error;
    }

    const errorMessage = getErrorMessage(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    this.logger.error(
      `System guard failed: ${errorMessage}`,
      errorStack,
      JSON.stringify(logContext),
    );

    throw new ForbiddenException(`System context required: ${errorMessage}`, {
      cause: error instanceof Error ? error : undefined,
    });
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
