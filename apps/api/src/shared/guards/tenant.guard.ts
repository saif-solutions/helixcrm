// apps/api/src/shared/guards/tenant.guard.ts

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { TenantContextStorage, getTenantContext, setTenantContext } from '../tenant/tenant.context';
import { TenantContext } from '../tenant/tenant.types';

@Injectable()
export class TenantGuard implements CanActivate {
  private readonly logger = new Logger(TenantGuard.name);

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    try {
      // Log the current context (should be PENDING from middleware)
      const currentContext = getTenantContext();
      
      this.logger.debug(`TenantGuard - Initial state:`, {
        tenantId: currentContext?.tenantId,
        hasUser: !!request.user,
        path: request.path
      });

      // AuthGuard MUST run before TenantGuard
      if (!request.user) {
        this.logger.error('No user found - AuthGuard must run before TenantGuard');
        throw new ForbiddenException('Authentication required');
      }

      const user = request.user;
      const realTenantId = user.organizationId || user.org;

      if (!realTenantId) {
        this.logger.error('User missing organization ID', { userId: user.sub });
        throw new ForbiddenException('User missing organization context');
      }

      // Create the proper tenant context
      const realContext: TenantContext = {
        tenantId: realTenantId,
        organizationId: realTenantId,
        isSystemContext: false,
        resolvedAt: new Date(),
        source: 'token',
        userId: user.sub,
        userEmail: user.email,
        roles: user.roles || [],
        permissions: user.permissions || [],
        requestId: currentContext?.requestId,
      };

      // CRITICAL FIX: Use setTenantContext to update the AsyncLocalStorage
      setTenantContext(realContext);

      // Also set on request for backward compatibility
      request.organizationId = realTenantId;
      (request as any).tenantContext = realContext;

      // Verify the context was updated
      const verifiedContext = getTenantContext();
      
      this.logger.debug(`Tenant context after update:`, {
        tenantId: verifiedContext?.tenantId,
        userId: verifiedContext?.userId,
        source: verifiedContext?.source,
        match: verifiedContext?.tenantId === realTenantId
      });

      if (!verifiedContext || verifiedContext.tenantId !== realTenantId) {
        this.logger.error('Failed to verify tenant context was updated', {
          expected: realTenantId,
          actual: verifiedContext?.tenantId
        });
        throw new ForbiddenException('Failed to establish tenant context');
      }

      this.logger.log(
        `Tenant context established: ${realTenantId} for user ${user.sub}`,
        {
          path: request.path,
          method: request.method,
          source: 'token',
        }
      );

      return true;
    } catch (error) {
      this.logger.error(`Tenant guard failed: ${error.message}`, {
        path: request.path,
        method: request.method,
        stack: error.stack,
      });

      throw new ForbiddenException('Tenant context required for this operation');
    }
  }
}