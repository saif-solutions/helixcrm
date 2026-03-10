// apps/api/src/shared/guards/tenant.guard.ts

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { setTenantId } from '../als'; // ✅ Import from als.ts
import { IS_PUBLIC_KEY } from '../decorators/require-permission.decorator';

@Injectable()
export class TenantGuard implements CanActivate {
  private readonly logger = new Logger(TenantGuard.name);

  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Check if route is public
    const isPublic = this.reflector.get<boolean>(
      IS_PUBLIC_KEY,
      context.getHandler(),
    );

    if (isPublic) {
      this.logger.debug(
        `Skipping TenantGuard for public route: ${request.path}`,
      );
      return true;
    }

    if (!request.user) {
      this.logger.error(
        'No user found - AuthGuard must run before TenantGuard',
      );
      throw new ForbiddenException('Authentication required');
    }

    const user = request.user;
    const realTenantId = user.organizationId || user.org;

    if (!realTenantId) {
      this.logger.error('User missing organization ID', { userId: user.sub });
      throw new ForbiddenException('User missing organization context');
    }

    // Set tenant ID in ALS context
    setTenantId(realTenantId);

    // Set on request for backward compatibility
    request.organizationId = realTenantId;

    this.logger.log(
      `Tenant context established: ${realTenantId} for user ${user.sub}`,
    );

    return true;
  }
}
