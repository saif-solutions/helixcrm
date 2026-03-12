// src/modules/rbac/permissions.service.ts
import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { PermissionRepository } from './repositories/permission.repository';
import { TenantContextService } from '../../shared/tenant/context/tenant-context.service';
import { PermissionContextService } from '../../shared/permissions/context/permission-context.service';
import type { Permission } from '@prisma/client';

// ==================== TYPE DEFINITIONS ====================

interface GroupedPermissions {
  module: string;
  permissions: Permission[];
}

interface PermissionHierarchy {
  [module: string]: {
    [action: string]: Permission[];
  };
}

// ==================== SERVICE IMPLEMENTATION ====================

@Injectable()
export class PermissionsService {
  private readonly logger = new Logger(PermissionsService.name);

  constructor(
    private readonly permissionRepository: PermissionRepository,
    private readonly tenantContext: TenantContextService,
    private readonly permissionContext: PermissionContextService,
  ) {}

  private handleError(
    error: unknown,
    context: string,
    metadata: Record<string, any>,
  ): never {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;

    this.logger.error(
      `${context} failed: ${errorMessage}`,
      errorStack,
      metadata,
    );
    throw error;
  }

  async findAll(): Promise<Permission[]> {
    // 1. PERMISSION CHECK
    if (!this.permissionContext.hasPermission('rbac:read')) {
      throw new ForbiddenException(
        'Insufficient permissions: rbac:read required',
      );
    }

    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    try {
      // 2. BUSINESS LOGIC USING REPOSITORY
      const permissions = await this.permissionRepository.findAll();
      return permissions;
    } catch (error) {
      this.handleError(error, 'PermissionsService.findAll', {
        tenantId,
        userId,
      });
    }
  }

  async findGrouped(): Promise<GroupedPermissions[]> {
    // 1. PERMISSION CHECK
    if (!this.permissionContext.hasPermission('rbac:read')) {
      throw new ForbiddenException(
        'Insufficient permissions: rbac:read required',
      );
    }

    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    try {
      // 2. GET PERMISSIONS USING REPOSITORY
      const permissions = await this.permissionRepository.findAll();

      // 3. GROUP BY MODULE
      const grouped = permissions.reduce<Record<string, Permission[]>>(
        (acc, permission) => {
          const [module] = permission.code.split(':');
          if (!acc[module]) {
            acc[module] = [];
          }
          acc[module].push(permission);
          return acc;
        },
        {},
      );

      // 4. CONVERT TO ARRAY FORMAT
      return Object.entries(grouped).map(([module, perms]) => ({
        module,
        permissions: perms,
      }));
    } catch (error) {
      this.handleError(error, 'PermissionsService.findGrouped', {
        tenantId,
        userId,
      });
    }
  }

  async getPermissionHierarchy(): Promise<PermissionHierarchy> {
    // 1. PERMISSION CHECK
    if (!this.permissionContext.hasPermission('rbac:read')) {
      throw new ForbiddenException(
        'Insufficient permissions: rbac:read required',
      );
    }

    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    try {
      // 2. GET PERMISSIONS USING REPOSITORY
      const permissions = await this.permissionRepository.findAll();

      // 3. ORGANIZE BY MODULE.ACTION
      const hierarchy: PermissionHierarchy = {};

      permissions.forEach((permission) => {
        const [module, action] = permission.code.split(':');

        if (!hierarchy[module]) {
          hierarchy[module] = {};
        }

        if (!hierarchy[module][action]) {
          hierarchy[module][action] = [];
        }

        hierarchy[module][action].push(permission);
      });

      return hierarchy;
    } catch (error) {
      this.handleError(error, 'PermissionsService.getPermissionHierarchy', {
        tenantId,
        userId,
      });
    }
  }
}
