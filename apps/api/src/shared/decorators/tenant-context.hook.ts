// apps/api/src/shared/decorators/tenant-context.hook.ts

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { TenantContextService } from '../tenant/context/tenant-context.service';
import { withTenantContext } from '../tenant/tenant.context';

export const TenantContextHook = createParamDecorator(
  async (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const tenantContextService = ctx
      .switchToHttp()
      .getRequest().tenantContextService;

    if (!request.user) {
      return null;
    }

    const organizationId = request.user.organizationId || request.user.org;

    if (!organizationId) {
      return null;
    }

    // Create real tenant context
    const realContext = {
      tenantId: organizationId,
      organizationId: organizationId,
      isSystemContext: false,
      resolvedAt: new Date(),
      source: 'token' as const,
      userId: request.user.id || request.user.sub,
      userEmail: request.user.email,
      roles: request.user.roles || [],
      permissions: request.user.permissions || [],
    };

    // Re-run the rest of the request with real context
    return withTenantContext(realContext, () => {
      return realContext;
    });
  },
);
