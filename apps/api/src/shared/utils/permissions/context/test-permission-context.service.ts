// apps/api/src/shared/permissions/context/test-permission-context.service.ts
// Example of how services should use PermissionContextService

import { Injectable, Logger } from '@nestjs/common';
import { PermissionContextService } from './permission-context.service';

@Injectable()
export class ExampleService {
  private readonly logger = new Logger(ExampleService.name);

  constructor(private readonly permissionContext: PermissionContextService) {}

  async doSomethingRequiringPermission(): Promise<string> {
    // OLD WAY: Would need to recompute permissions or make DB calls
    // NEW WAY: Just check against the already-built context

    // Check single permission
    if (!this.permissionContext.hasPermission('user:read')) {
      this.logger.warn(
        `User ${this.permissionContext.getUserId()} lacks user:read permission`,
      );
      throw new Error('Insufficient permissions');
    }

    // Check multiple permissions (any)
    const allowed = this.permissionContext.hasAnyPermission([
      'user:write',
      'admin:full_access',
    ]);

    if (!allowed) {
      this.logger.warn(`User lacks required permissions for this operation`);
      throw new Error('Insufficient permissions');
    }

    // Get user info for audit/logging
    this.logger.debug(
      `Operation performed by user ${this.permissionContext.getUserId()} in tenant ${this.permissionContext.getTenantId()}`,
    );

    // Get all permissions (for debugging)
    const allPermissions = this.permissionContext.getPermissions();
    this.logger.debug(`User has ${allPermissions.length} total permissions`);

    return 'Operation completed successfully';
  }

  async doSomethingWithRoleCheck(): Promise<string> {
    // Check if user has specific role
    const roles = this.permissionContext.getRoles();
    this.logger.debug(`User roles: ${roles.join(', ')}`);

    if (!roles.includes('admin')) {
      throw new Error('Admin role required');
    }

    return 'Admin operation completed';
  }
}
