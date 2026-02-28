// apps/api/src/shared/guards/tenant.guard.ts

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { getTenantContext, withTenantContext } from '../tenant/tenant.context';

@Injectable()
export class TenantGuard implements CanActivate {
  private readonly logger = new Logger(TenantGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    try {
      // Get current context
      let tenantContext = getTenantContext();
      
      this.logger.debug(`TenantGuard - Current context: ${JSON.stringify({
        tenantId: tenantContext?.tenantId,
        isSystem: tenantContext?.isSystemContext,
        hasUser: !!request.user,
        userId: request.user?.sub,
        orgFromUser: request.user?.organizationId || request.user?.org
      })}`);
      
      // If context is PENDING and we now have a user, update to real tenant
      if (tenantContext?.tenantId === 'PENDING' && request.user) {
        const realTenantId = request.user.organizationId || request.user.org;
        
        if (realTenantId) {
          this.logger.debug(`Updating PENDING context to real tenant: ${realTenantId}`);
          
          const realContext = {
            tenantId: realTenantId,
            organizationId: realTenantId,
            isSystemContext: false,
            resolvedAt: new Date(),
            source: 'token' as const,
            userId: request.user.id || request.user.sub,
            userEmail: request.user.email,
            roles: request.user.roles || [],
            permissions: request.user.permissions || [],
          };
          
          // Update the context
          withTenantContext(realContext, () => {
            request.organizationId = realTenantId;
            (request as any).tenantContext = realContext;
          });
          
          tenantContext = realContext;
          this.logger.debug(`Context updated to: ${realTenantId}`);
        }
      }
      
      // Now validate the context
      if (!tenantContext || tenantContext.tenantId === 'SYSTEM' || tenantContext.tenantId === 'PENDING') {
        this.logger.error(`Invalid tenant context for route: ${request.path}`, {
          tenantId: tenantContext?.tenantId,
          isSystem: tenantContext?.isSystemContext,
        });
        throw new ForbiddenException('Tenant context required for this operation');
      }

      this.logger.debug(
        `Tenant guard passed: ${tenantContext.tenantId} (${tenantContext.source})`,
        {
          path: request.path,
          method: request.method,
          userId: tenantContext.userId,
        },
      );

      return true;
    } catch (error) {
      this.logger.error(`Tenant guard failed: ${error.message}`, {
        path: request.path,
        method: request.method,
        user: request.user ? {
          id: request.user.id || request.user.sub,
          hasOrgId: !!(request.user.organizationId || request.user.org),
        } : null,
      });

      throw new ForbiddenException('Tenant context required for this operation');
    }
  }
}