// apps/api/src/shared/guards/system.guard.ts

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { TenantContextService } from '../tenant/context/tenant-context.service';
import type { Request } from 'express';

// ==================== TYPE GUARDS ====================

function isErrorWithMessage(error: unknown): error is { message: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  );
}

// ==================== SYSTEM GUARD ====================

@Injectable()
export class SystemGuard implements CanActivate {
  private readonly logger = new Logger(SystemGuard.name);
  private readonly isProduction = process.env.NODE_ENV === 'production';

  constructor(private readonly tenantContext: TenantContextService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const startTime = performance.now();

    try {
      // Resolve context, allowing system context
      const tenantContext = this.tenantContext.resolveContext(request, {
        requireTenantContext: false,
        allowSystemContext: true,
      });

      // Log context resolution in development
      if (!this.isProduction) {
        this.logDebug('Context resolved', {
          path: request.path,
          method: request.method,
          isSystemContext: tenantContext.isSystemContext,
          source: tenantContext.source,
        });
      }

      // Ensure this IS a system context
      if (!tenantContext.isSystemContext) {
        this.logger.error(
          'System guard failed: Tenant context found but system context required',
          JSON.stringify({
            tenantId: tenantContext.tenantId,
            path: request.path,
            method: request.method,
            source: tenantContext.source,
          }),
        );
        throw new Error('This route requires system context (no tenant)');
      }

      // Log success in development
      if (!this.isProduction) {
        const executionTime = performance.now() - startTime;
        this.logDebug('System guard passed: SYSTEM context', {
          path: request.path,
          method: request.method,
          executionTime: `${executionTime.toFixed(2)}ms`,
        });
      }

      return true;
    } catch (error) {
      // Handle and wrap errors
      const errorMessage = isErrorWithMessage(error)
        ? error.message
        : 'Unknown error';

      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `System guard failed: ${errorMessage}`,
        errorStack,
        JSON.stringify({
          path: request.path,
          method: request.method,
        }),
      );

      throw new ForbiddenException(`System context required: ${errorMessage}`);
    }
  }

  private logDebug(message: string, context: Record<string, unknown>): void {
    this.logger.debug(`${message} - ${JSON.stringify(context)}`);
  }
}
