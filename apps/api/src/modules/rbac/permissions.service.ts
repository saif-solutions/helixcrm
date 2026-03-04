// src/modules/rbac/permissions.service.ts
import { Injectable, ForbiddenException } from '@nestjs/common';
import { PermissionRepository } from './repositories/permission.repository';
import { TenantContextService } from '../../shared/tenant/context/tenant-context.service';
import { PermissionContextService } from '../../shared/permissions/context/permission-context.service';

@Injectable()
export class PermissionsService {
  constructor(
    private readonly permissionRepository: PermissionRepository,
    private readonly tenantContext: TenantContextService,
    private readonly permissionContext: PermissionContextService,
  ) {}

  async findAll() {
    // 1. PERMISSION CHECK - FIXED: 'rbac.read' → 'rbac:read'
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
    } catch (error: any) {
      // 3. ERROR HANDLING
      console.error(`PermissionsService.findAll failed: ${error.message}`, {
        tenantId,
        userId,
        error: error.stack,
      });
      throw error;
    }
  }

  async findGrouped() {
    // 1. PERMISSION CHECK - FIXED: 'rbac.read' → 'rbac:read'
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

      // 3. GROUP BY MODULE (PRESERVE ORIGINAL BUSINESS LOGIC)
      // Note: Permission codes are now in colon format (module:action)
      const grouped = permissions.reduce(
        (acc, permission) => {
          const [module] = permission.code.split(':');
          if (!acc[module]) {
            acc[module] = [];
          }
          acc[module].push(permission);
          return acc;
        },
        {} as Record<string, any[]>,
      );

      // 4. CONVERT TO ARRAY FORMAT
      return Object.entries(grouped).map(([module, perms]) => ({
        module,
        permissions: perms,
      }));
    } catch (error: any) {
      console.error(`PermissionsService.findGrouped failed: ${error.message}`, {
        tenantId,
        userId,
        error: error.stack,
      });
      throw error;
    }
  }

  async getPermissionHierarchy() {
    // 1. PERMISSION CHECK - FIXED: 'rbac.read' → 'rbac:read'
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

      // 3. ORGANIZE BY MODULE.ACTION (PRESERVE ORIGINAL BUSINESS LOGIC)
      // Updated to handle colon format (module:action)
      const hierarchy: Record<string, any> = {};

      permissions.forEach((permission) => {
        const [module, action] = permission.code.split(':');

        if (!hierarchy[module]) {
          hierarchy[module] = {};
        }

        if (!hierarchy[module][action]) {
          hierarchy[module][action] = [];
        }

        // Note: No scope in colon format - this part is simplified
        // If you need scope, you might want to use format like module:action:scope
      });

      return hierarchy;
    } catch (error: any) {
      console.error(
        `PermissionsService.getPermissionHierarchy failed: ${error.message}`,
        {
          tenantId,
          userId,
          error: error.stack,
        },
      );
      throw error;
    }
  }
}