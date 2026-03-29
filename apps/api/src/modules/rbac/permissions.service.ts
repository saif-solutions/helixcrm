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

// ==================== HELPER FUNCTIONS ====================

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return 'Unknown error occurred';
  }
}

function getErrorStack(error: unknown): string | undefined {
  return error instanceof Error ? error.stack : undefined;
}

// Permission context type guard
interface PermissionContextWithHasPermission {
  hasPermission(permission: string): boolean;
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

  private checkPermission(permission: string): boolean {
    const context: unknown = this.permissionContext;
    if (this.isPermissionContext(context)) {
      try {
        return context.hasPermission(permission) === true;
      } catch {
        this.logger.debug(
          `Permission check failed for ${permission}, relying on guard`,
        );
        return true;
      }
    }
    this.logger.debug(
      `Permission context not ready for ${permission}, relying on guard`,
    );
    return true;
  }

  private isPermissionContext(
    context: unknown,
  ): context is PermissionContextWithHasPermission {
    return (
      typeof context === 'object' &&
      context !== null &&
      typeof (context as PermissionContextWithHasPermission).hasPermission ===
        'function'
    );
  }

  private getTenantId(): string {
    const id = this.tenantContext.getTenantId();
    return typeof id === 'string' ? id : String(id ?? '');
  }

  private getUserId(): string {
    const id = this.tenantContext.getUserId();
    return typeof id === 'string' ? id : String(id ?? '');
  }

  private handleError(
    error: unknown,
    context: string,
    metadata: Record<string, unknown>,
  ): never {
    const errorMessage = getErrorMessage(error);
    const errorStack = getErrorStack(error);

    this.logger.error(
      `${context} failed: ${errorMessage}`,
      errorStack,
      metadata,
    );
    throw error;
  }

  async findAll(): Promise<Permission[]> {
    if (!this.checkPermission('rbac:read')) {
      throw new ForbiddenException(
        'Insufficient permissions: rbac:read required',
      );
    }

    const tenantId = this.getTenantId();
    const userId = this.getUserId();

    try {
      return await this.permissionRepository.findAll();
    } catch (error) {
      this.handleError(error, 'PermissionsService.findAll', {
        tenantId,
        userId,
      });
    }
  }

  async findGrouped(): Promise<GroupedPermissions[]> {
    if (!this.checkPermission('rbac:read')) {
      throw new ForbiddenException(
        'Insufficient permissions: rbac:read required',
      );
    }

    const tenantId = this.getTenantId();
    const userId = this.getUserId();

    try {
      const permissions = await this.permissionRepository.findAll();

      // Group by module
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
    if (!this.checkPermission('rbac:read')) {
      throw new ForbiddenException(
        'Insufficient permissions: rbac:read required',
      );
    }

    const tenantId = this.getTenantId();
    const userId = this.getUserId();

    try {
      const permissions = await this.permissionRepository.findAll();

      const hierarchy: PermissionHierarchy = {};

      for (const permission of permissions) {
        const [module, action] = permission.code.split(':');

        if (!hierarchy[module]) {
          hierarchy[module] = {};
        }
        if (!hierarchy[module][action]) {
          hierarchy[module][action] = [];
        }
        hierarchy[module][action].push(permission);
      }

      return hierarchy;
    } catch (error) {
      this.handleError(error, 'PermissionsService.getPermissionHierarchy', {
        tenantId,
        userId,
      });
    }
  }
}
