// apps/api/src/shared/permissions/context/permission-context.service.ts

import { Injectable, Scope, Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { 
  RequestPermissionContext, 
  IPermissionContext,
  PermissionContextOptions 
} from './permission-context.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { Logger } from '@nestjs/common';

@Injectable({ scope: Scope.REQUEST })
export class PermissionContextService implements IPermissionContext {
  private readonly logger = new Logger(PermissionContextService.name);
  
  // Store the context for this request
  private context: RequestPermissionContext | null = null;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(REQUEST) private readonly request: Request,
  ) {}

  /**
   * Build permission context for the current request
   * Called ONCE by PermissionGuard
   */
  async buildContext(options: PermissionContextOptions): Promise<RequestPermissionContext> {
    if (this.context) {
      this.logger.warn(`Permission context already built for current request`);
      return this.context;
    }

    const { userId, tenantId, jwtPermissions, skipCache = false } = options;
    
    let permissions: string[];
    let source: 'jwt' | 'database' | 'cache' = 'database';
    let roles: string[] = [];

    // 1. Try JWT permissions first (fastest)
    if (jwtPermissions && Array.isArray(jwtPermissions) && jwtPermissions.length > 0) {
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
      this.logger.debug(`Fetched permissions from DB for user ${userId} (${permissions.length} permissions)`);
    }

    // Build the context
    this.context = {
      userId,
      tenantId,
      allowedPermissions: new Set(permissions),
      roles,
      isSystemContext: false,
      builtAt: new Date(),
      source,
    };

    return this.context;
  }

  /**
   * Fetch permissions and roles from database
   */
  private async fetchPermissionsFromDatabase(
    userId: string, 
    tenantId: string
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
      this.logger.error(`Failed to fetch permissions from DB: ${error.message}`, error.stack);
      return { permissions: [], roles: [] };
    }
  }

  /**
   * Check if user has a specific permission
   */
  hasPermission(permission: string | string[]): boolean {
    const context = this.getContext();
    if (Array.isArray(permission)) {
      return permission.some(p => context.allowedPermissions.has(p));
    }
    return context.allowedPermissions.has(permission);
  }

  /**
   * Check if user has ALL specified permissions
   */
  hasAllPermissions(permissions: string[]): boolean {
    const context = this.getContext();
    return permissions.every(p => context.allowedPermissions.has(p));
  }

  /**
   * Check if user has ANY of the specified permissions
   */
  hasAnyPermission(permissions: string[]): boolean {
    const context = this.getContext();
    return permissions.some(p => context.allowedPermissions.has(p));
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

  private getContext(): RequestPermissionContext {
    if (!this.context) {
      throw new Error(`Permission context not built. Ensure PermissionGuard runs before using PermissionContextService.`);
    }
    return this.context;
  }
}
