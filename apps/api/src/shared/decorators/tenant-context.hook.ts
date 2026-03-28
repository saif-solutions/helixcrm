// apps/api/src/shared/decorators/tenant-context.hook.ts

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { withTenantContext } from '../tenant/tenant.context';

/**
 * Extended Request interface with tenant context properties
 */
interface TenantContextRequest extends Request {
  user?: {
    id?: string;
    sub?: string;
    email?: string;
    organizationId?: string;
    org?: string;
    roles?: string[];
    permissions?: string[];
  };
}

/**
 * Tenant context interface
 */
export interface TenantContext {
  tenantId: string;
  organizationId: string;
  isSystemContext: boolean;
  resolvedAt: Date;
  source: 'token' | 'header' | 'subdomain';
  userId?: string;
  userEmail?: string;
  roles?: string[];
  permissions?: string[];
}

/**
 * Hook decorator to extract and create tenant context from request
 * @returns Tenant context object or null if not available
 *
 * @example
 * ```typescript
 * @Get()
 * async getData(@TenantContextHook() tenantContext: TenantContext) {
 *   // Use tenant context for database queries
 *   return this.service.getData(tenantContext);
 * }
 * ```
 */
export const TenantContextHook = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): TenantContext | null => {
    const request = ctx.switchToHttp().getRequest<TenantContextRequest>();

    // Validate user exists
    if (!request.user) {
      return null;
    }

    // Extract organization ID from user (supports both camelCase and shorthand)
    const organizationId = request.user.organizationId || request.user.org;

    // Return null if no organization context
    if (!organizationId) {
      return null;
    }

    // Create tenant context
    const tenantContext: TenantContext = {
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

    // Execute with tenant context and return the context
    return withTenantContext(tenantContext, () => tenantContext);
  },
);
