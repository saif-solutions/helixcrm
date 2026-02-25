// apps/api/src/shared/guards/system.guard.ts

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { TenantContextService } from '../tenant/context/tenant-context.service';

@Injectable()
export class SystemGuard implements CanActivate {
  private readonly logger = new Logger(SystemGuard.name);

  constructor(private readonly tenantContext: TenantContextService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    try {
      // Resolve context, allowing system context - pass the request
      const tenantContext = this.tenantContext.resolveContext(request, {
        requireTenantContext: false,
        allowSystemContext: true,
      });

      // Ensure this IS a system context
      if (!tenantContext.isSystemContext) {
        this.logger.error(
          `System guard failed: Tenant context found but system context required`,
          {
            tenantId: tenantContext.tenantId,
            path: request.path,
          },
        );
        throw new Error('This route requires system context (no tenant)');
      }

      this.logger.debug(`System guard passed: SYSTEM context`, {
        path: request.path,
        method: request.method,
      });

      return true;
    } catch (error) {
      this.logger.error(`System guard failed: ${error.message}`);
      throw new ForbiddenException(`System context required: ${error.message}`);
    }
  }
}
