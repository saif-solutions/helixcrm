// apps/api/src/shared/guards/tenant.guard.ts

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { setTenantId } from '../als';
import { IS_PUBLIC_KEY } from '../decorators/require-permission.decorator';
import type { Request } from 'express';
import type { UserPayload } from '../types/request.types';

// ==================== INTERFACES ====================

interface AuthenticatedRequest extends Request {
  user?: UserPayload;
  organizationId?: string;
}

// ==================== TYPE GUARDS ====================

function hasUser(
  req: AuthenticatedRequest,
): req is AuthenticatedRequest & { user: UserPayload } {
  return req.user !== undefined && req.user !== null;
}

// ==================== TENANT GUARD ====================

@Injectable()
export class TenantGuard implements CanActivate {
  private readonly logger = new Logger(TenantGuard.name);
  private readonly isProduction = process.env.NODE_ENV === 'production';

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const startTime = this.isProduction ? undefined : performance.now();

    try {
      // Check if route is public
      const isPublic = this.reflector.get<boolean>(
        IS_PUBLIC_KEY,
        context.getHandler(),
      );

      if (isPublic) {
        if (!this.isProduction) {
          this.logger.debug(
            `Skipping TenantGuard for public route: ${request.path}`,
          );
        }
        return true;
      }

      // Validate user exists
      if (!hasUser(request)) {
        this.logger.error(
          'No user found - AuthGuard must run before TenantGuard',
          JSON.stringify({
            path: request.path,
            method: request.method,
          }),
        );
        throw new ForbiddenException('Authentication required');
      }

      const user = request.user;
      const realTenantId = user.organizationId ?? user.org;

      // Validate tenant ID exists
      if (!realTenantId) {
        this.logger.error(
          'User missing organization ID',
          JSON.stringify({
            userId: this.maskUserId(user.sub),
            path: request.path,
          }),
        );
        throw new ForbiddenException('User missing organization context');
      }

      // Set tenant ID in ALS context
      setTenantId(realTenantId);

      // Set on request for backward compatibility
      request.organizationId = realTenantId;

      // Log success (with masked user ID in production)
      if (this.isProduction) {
        this.logger.log(
          `Tenant context established for user ${this.maskUserId(user.sub)}`,
        );
      } else {
        const executionTime = performance.now() - startTime;
        this.logger.log(
          `Tenant context established: ${realTenantId} for user ${user.sub} (${executionTime.toFixed(2)}ms)`,
        );
      }

      return true;
    } catch (error) {
      // Re-throw HTTP exceptions
      if (error instanceof ForbiddenException) {
        throw error;
      }

      // Handle unexpected errors
      this.logger.error(
        `Unexpected error in TenantGuard: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new ForbiddenException('Tenant context validation failed');
    }
  }

  private maskUserId(userId: string): string {
    if (!userId || userId.length < 8) return '****';
    return `${userId.slice(0, 4)}...${userId.slice(-4)}`;
  }
}
