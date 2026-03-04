// apps/api/src/shared/permissions/context/permission-context.service.ts

import { Injectable, Logger } from '@nestjs/common';
import {
  RequestPermissionContext,
  IPermissionContext,
  PermissionContextOptions,
} from './permission-context.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { getTenantContext } from '../../tenant/tenant.context';

@Injectable()
export class PermissionContextService implements IPermissionContext {
  private readonly logger = new Logger(PermissionContextService.name);

  constructor(
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Build permission context for the current request
   * Called ONCE by PermissionGuard
   */
  async buildContext(
    options: PermissionContextOptions,
  ): Promise<RequestPermissionContext> {
    const tenantContext = getTenantContext();
    
    if (!tenantContext) {
      throw new Error('Tenant context not initialized - RequestContextMiddleware must run first');
    }

    this.logger.debug(`Building permission context - Tenant: ${tenantContext.tenantId}, RequestId: ${tenantContext.requestId}`);

    // Check if context already exists in ALS
    if (tenantContext.permissionContext) {
      this.logger.debug(`Reusing existing permission context for request ${tenantContext.requestId}`);
      return tenantContext.permissionContext;
    }

    const { userId, tenantId, jwtPermissions } = options;

    let permissions: string[];
    let source: 'jwt' | 'database' = 'database';
    let roles: string[] = [];

    // Try JWT permissions first (fastest)
    if (jwtPermissions && Array.isArray(jwtPermissions) && jwtPermissions.length > 0) {
      permissions = jwtPermissions;
      source = 'jwt';
      this.logger.debug(`Using JWT permissions for user ${userId} (${permissions.length} permissions)`);
    } else {
      // Fall back to database
      const result = await this.fetchPermissionsFromDatabase(userId, tenantId);
      permissions = result.permissions;
      roles = result.roles;
      source = 'database';
      this.logger.debug(`Fetched ${permissions.length} permissions from DB for user ${userId}`);
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

    // ✅ CRITICAL: Store in AsyncLocalStorage, not in a Map
    tenantContext.permissionContext = context;

    this.logger.debug(`Permission context built for request ${tenantContext.requestId}`, {
      permissionCount: permissions.length,
      roleCount: roles.length,
      source,
    });

    return context;
  }

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
        return { permissions: [], roles: [] };
      }

      const permissions = new Set<string>();
      const roles = new Set<string>();

      userWithRoles.UserRoles.forEach((userRole) => {
        if (userRole.role) {
          roles.add(userRole.role.name);
          userRole.role.permissions?.forEach((rolePermission) => {
            if (rolePermission.permission) {
              permissions.add(rolePermission.permission.code);
            }
          });
        }
      });

      return {
        permissions: Array.from(permissions),
        roles: Array.from(roles),
      };
    } catch (error) {
      this.logger.error(`Failed to fetch permissions from DB: ${error.message}`);
      return { permissions: [], roles: [] };
    }
  }

  private getContext(): RequestPermissionContext {
    const tenantContext = getTenantContext();
    
    if (!tenantContext) {
      throw new Error('Tenant context not initialized');
    }

    if (!tenantContext.permissionContext) {
      const error = new Error(
        `Permission context not built for request ${tenantContext.requestId || 'unknown'}. Ensure PermissionGuard runs before using PermissionContextService.`,
      );
      this.logger.error(error.message);
      throw error;
    }

    return tenantContext.permissionContext;
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
    return Array.from(this.getContext().allowedPermissions);
  }

  getRoles(): string[] {
    return this.getContext().roles;
  }

  getUserId(): string {
    return this.getContext().userId;
  }

  getTenantId(): string {
    return this.getContext().tenantId;
  }

  isSystemContext(): boolean {
    return this.getContext().isSystemContext;
  }

  getSource(): string {
    return this.getContext().source;
  }

  getRawContext(): RequestPermissionContext {
    return this.getContext();
  }

  isInitialized(): boolean {
    try {
      const tenantContext = getTenantContext();
      return !!tenantContext?.permissionContext;
    } catch {
      return false;
    }
  }
}