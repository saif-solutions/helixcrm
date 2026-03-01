// apps/api/src/shared/guards/tenant.guard.ts

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { getTenantContext, setTenantContext } from '../tenant/tenant.context';
import { TenantContext } from '../tenant/tenant.types';

@Injectable()
export class TenantGuard implements CanActivate {
  private readonly logger = new Logger(TenantGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    try {
      // Get current context (should be PENDING from middleware)
      const currentContext = getTenantContext();
      
      this.logger.debug(`TenantGuard - Initial state:`, {
        tenantId: currentContext?.tenantId,
        isSystem: currentContext?.isSystemContext,
        hasUser: !!request.user,
        userId: request.user?.sub,
        orgFromUser: request.user?.organizationId || request.user?.org,
        path: request.path
      });

      // We must have a user at this point (AuthGuard runs before)
      if (!request.user) {
        this.logger.error('No user found in request - AuthGuard must run before TenantGuard');
        throw new ForbiddenException('Authentication required');
      }

      const user = request.user;
      const realTenantId = user.organizationId || user.org;

      if (!realTenantId) {
        this.logger.error('User authenticated but missing organization ID', {
          userId: user.sub,
          userObject: user
        });
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
      };

      // CRITICAL: Update the context directly using setTenantContext
      // This replaces the PENDING context with the real one
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
        user: request.user ? {
          id: request.user.sub,
          hasOrgId: !!(request.user.organizationId || request.user.org),
        } : null,
      });

      throw new ForbiddenException('Tenant context required for this operation');
    }
  }
}
