// apps/api/src/shared/guards/tenant.guard.ts

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { TenantContextService } from '../tenant/context/tenant-context.service';

@Injectable()
export class TenantGuard implements CanActivate {
  private readonly logger = new Logger(TenantGuard.name);

  constructor(private readonly tenantContext: TenantContextService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    try {
      // Resolve tenant context - pass the request to the service
      const tenantContext = this.tenantContext.resolveContext(request, {
        requireTenantContext: true,
        allowSystemContext: false, // Most routes should not allow system context
      });

      this.logger.debug(
        `Tenant guard passed: ${tenantContext.tenantId} (${tenantContext.source})`,
        {
          path: request.path,
          method: request.method,
        },
      );

      return true;
    } catch (error) {
      this.logger.error(`Tenant guard failed: ${error.message}`, error.stack);
      throw new ForbiddenException('Tenant context required');
    }
  }
}
