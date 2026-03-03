// apps/api/src/shared/permissions/context/permission-context.service.ts

import { Injectable, Logger } from '@nestjs/common';
import {
  RequestPermissionContext,
  IPermissionContext,
  PermissionContextOptions,
} from './permission-context.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { getTenantContext } from '../../tenant/tenant.context';

@Injectable() // SINGLETON
export class PermissionContextService implements IPermissionContext {
  private readonly logger = new Logger(PermissionContextService.name);

  // Store contexts per request using requestId from tenant context
  private contexts = new Map<string, RequestPermissionContext>();

  constructor(
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Get request ID from tenant context - this is the KEY fix
   */
  private getRequestKey(): string {
    const tenantContext = getTenantContext();
    // If we have a requestId from the tenant context, use it
    if (tenantContext?.requestId) {
      return tenantContext.requestId;
    }
    // If we have tenantId but no requestId, use tenantId + timestamp
    if (tenantContext?.tenantId) {
      return `${tenantContext.tenantId}-${Date.now()}`;
    }
    // Last resort fallback
    return `req-${Date.now()}-${Math.random()}`;
  }

  /**
   * Build permission context for the current request
   * Called ONCE by PermissionGuard
   */
  async buildContext(
    options: PermissionContextOptions,
  ): Promise<RequestPermissionContext> {
    const requestKey = this.getRequestKey();
    
    // Log current tenant context for debugging
    const tenantContext = getTenantContext();
    this.logger.debug(`Building permission context - Current tenant context:`, {
      tenantId: tenantContext?.tenantId,
      requestId: tenantContext?.requestId,
      source: tenantContext?.source,
      requestKey,
    });

    // Check if context already exists for this request
    if (this.contexts.has(requestKey)) {
      this.logger.debug(`Reusing existing permission context for request ${requestKey}`);
      return this.contexts.get(requestKey)!;
    }

    const { userId, tenantId, jwtPermissions } = options;

    this.logger.debug(`Building permission context for user ${userId} in tenant ${tenantId}`);

    let permissions: string[];
    let source: 'jwt' | 'database' | 'cache' = 'database';
    let roles: string[] = [];

    // 1. Try JWT permissions first (fastest)
    if (
      jwtPermissions &&
      Array.isArray(jwtPermissions) &&
      jwtPermissions.length > 0
    ) {
      permissions = jwtPermissions;
      source = 'jwt';
      this.logger.debug(`Using JWT permissions for user ${userId} (${permissions.length} permissions)`);
    }
    // 2. Fall back to database
    else {
      const result = await this.fetchPermissionsFromDatabase(userId, tenantId);
      permissions = result.permissions;
      roles = result.roles;
      source = 'database';
      this.logger.debug(`Fetched ${permissions.length} permissions and ${roles.length} roles from DB for user ${userId}`);
    }

    // Build the context
    const context: RequestPermissionContext = {
      userId,
      tenantId,
      allowedPermissions: new Set(permissions),
      roles,
      isSystemContext: false,
      builtAt: new Date(),
      source,
    };

    // Store in map with requestKey
    this.contexts.set(requestKey, context);

    // Schedule cleanup after request completes
    setTimeout(() => {
      this.contexts.delete(requestKey);
      this.logger.debug(`Cleaned up permission context for request ${requestKey}`);
    }, 5000);

    this.logger.debug(`Permission context built successfully for user ${userId}`, {
      permissionCount: permissions.length,
      roleCount: roles.length,
      source,
      requestKey,
    });

    return context;
  }

  /**
   * Fetch permissions and roles from database
   */
  private async fetchPermissionsFromDatabase(
    userId: string,
    tenantId: string,
  ): Promise<{ permissions: string[]; roles: string[] }> {
    try {
      const userWithRoles = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          UserRoles: {
            where: { organizationId: tenantId },
            include: {
              role: {
                include: {
                  permissions: {
                    include: { permission: true },
                  },
                },
              },
            },
          },
        },
      });

      if (!userWithRoles || !userWithRoles.UserRoles) {
        this.logger.debug(`No roles found for user ${userId} in tenant ${tenantId}`);
        return { permissions: [], roles: [] };
      }

      const permissions = new Set<string>();
      const roles = new Set<string>();

      userWithRoles.UserRoles.forEach((userRole) => {
        if (userRole.role) {
          roles.add(userRole.role.name);
          if (userRole.role.permissions) {
            userRole.role.permissions.forEach((rolePermission) => {
              if (rolePermission.permission) {
                permissions.add(rolePermission.permission.code);
              }
            });
          }
        }
      });

      return {
        permissions: Array.from(permissions),
        roles: Array.from(roles),
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch permissions from DB: ${error.message}`,
        error.stack,
      );
      return { permissions: [], roles: [] };
    }
  }

  /**
   * Get context for current request
   */
  private getContext(): RequestPermissionContext {
    const requestKey = this.getRequestKey();
    const context = this.contexts.get(requestKey);
    
    // Log the current tenant context for debugging
    const tenantContext = getTenantContext();
    this.logger.debug(`Getting permission context - Request key: ${requestKey}, Tenant: ${tenantContext?.tenantId}, Has context: ${!!context}`);

    if (!context) {
      const error = new Error(
        `Permission context not built for request ${requestKey}. Ensure PermissionGuard runs before using PermissionContextService.`,
      );
      this.logger.error(error.message);
      throw error;
    }
    return context;
  }

  hasPermission(permission: string | string[]): boolean {
    const context = this.getContext();
    if (Array.isArray(permission)) {
      return permission.some((p) => context.allowedPermissions.has(p));
    }
    return context.allowedPermissions.has(permission);
  }

  hasAllPermissions(permissions: string[]): boolean {
    const context = this.getContext();
    return permissions.every((p) => context.allowedPermissions.has(p));
  }

  hasAnyPermission(permissions: string[]): boolean {
    const context = this.getContext();
    return permissions.some((p) => context.allowedPermissions.has(p));
  }

  getPermissions(): string[] {
    const context = this.getContext();
    return Array.from(context.allowedPermissions);
  }

  getRoles(): string[] {
    const context = this.getContext();
    return context.roles;
  }

  getUserId(): string {
    const context = this.getContext();
    return context.userId;
  }

  getTenantId(): string {
    const context = this.getContext();
    return context.tenantId;
  }

  isSystemContext(): boolean {
    const context = this.getContext();
    return context.isSystemContext;
  }

  getSource(): string {
    const context = this.getContext();
    return context.source;
  }

  getRawContext(): RequestPermissionContext {
    return this.getContext();
  }

  isInitialized(): boolean {
    try {
      const requestKey = this.getRequestKey();
      return this.contexts.has(requestKey);
    } catch {
      return false;
    }
  }

  clearAllContexts(): void {
    this.contexts.clear();
    this.logger.debug('All permission contexts cleared');
  }
}