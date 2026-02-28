// apps/api/src/shared/permissions/context/permission-context.service.ts

import { Injectable, Scope, Inject, Logger } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import {
  RequestPermissionContext,
  IPermissionContext,
  PermissionContextOptions,
} from './permission-context.interface';
import { PrismaService } from '../../prisma/prisma.service';

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
  async buildContext(
    options: PermissionContextOptions,
  ): Promise<RequestPermissionContext> {
    if (this.context) {
      this.logger.warn(`Permission context already built for current request`);
      return this.context;
    }

    const { userId, tenantId, jwtPermissions, skipCache = false } = options;

    // ENTERPRISE FIX: Enhanced permission resolution with better logging
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
      this.logger.debug(
        `Using JWT permissions for user ${userId} (${permissions.length} permissions)`,
      );
    }
    // 2. Fall back to database
    else {
      const result = await this.fetchPermissionsFromDatabase(userId, tenantId);
      permissions = result.permissions;
      roles = result.roles;
      source = 'database';
      this.logger.debug(
        `Fetched ${permissions.length} permissions and ${roles.length} roles from DB for user ${userId}`,
      );
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

    this.logger.debug(`Permission context built successfully for user ${userId}`, {
      permissionCount: permissions.length,
      roleCount: roles.length,
      source,
    });

    return this.context;
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

      const result = {
        permissions: Array.from(permissions),
        roles: Array.from(roles),
      };

      this.logger.debug(`Database fetch complete for user ${userId}: ${result.permissions.length} permissions, ${result.roles.length} roles`);

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to fetch permissions from DB: ${error.message}`,
        error.stack,
      );
      return { permissions: [], roles: [] };
    }
  }

  /**
   * Check if user has a specific permission
   */
  hasPermission(permission: string | string[]): boolean {
    const context = this.getContext();
    if (Array.isArray(permission)) {
      const hasAny = permission.some((p) => context.allowedPermissions.has(p));
      this.logger.debug(`Checking any permission ${permission.join(' OR ')}: ${hasAny}`);
      return hasAny;
    }
    const hasIt = context.allowedPermissions.has(permission);
    this.logger.debug(`Checking permission ${permission}: ${hasIt}`);
    return hasIt;
  }

  /**
   * Check if user has ALL specified permissions
   */
  hasAllPermissions(permissions: string[]): boolean {
    const context = this.getContext();
    const hasAll = permissions.every((p) => context.allowedPermissions.has(p));
    this.logger.debug(`Checking all permissions ${permissions.join(' AND ')}: ${hasAll}`);
    return hasAll;
  }

  /**
   * Check if user has ANY of the specified permissions
   */
  hasAnyPermission(permissions: string[]): boolean {
    const context = this.getContext();
    const hasAny = permissions.some((p) => context.allowedPermissions.has(p));
    this.logger.debug(`Checking any permission ${permissions.join(' OR ')}: ${hasAny}`);
    return hasAny;
  }

  getPermissions(): string[] {
    const context = this.getContext();
    const perms = Array.from(context.allowedPermissions);
    this.logger.debug(`Getting permissions for user ${context.userId}: ${perms.length} permissions`);
    return perms;
  }

  getRoles(): string[] {
    const context = this.getContext();
    this.logger.debug(`Getting roles for user ${context.userId}: ${context.roles.length} roles`);
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
      const error = new Error(
        `Permission context not built. Ensure PermissionGuard runs before using PermissionContextService.`,
      );
      this.logger.error(error.message);
      throw error;
    }
    return this.context;
  }
}