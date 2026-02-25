// src/modules/rbac/rbac.module.ts
import { Module } from '@nestjs/common';
import { AuditLogModule } from '../../shared/audit-log/audit-log.module';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
import { PermissionsController } from './permissions.controller';
import { PermissionsService } from './permissions.service';
import { RoleRepository } from './repositories/role.repository';
import { PermissionRepository } from './repositories/permission.repository';
import { UserRoleRepository } from './repositories/user-role.repository';
import { TenantModule } from '../../shared/tenant/tenant.module'; // Updated import
import { PermissionsModule } from '../../shared/permissions/permissions.module'; // Using the global permissions module

@Module({
  imports: [
    AuditLogModule,
    TenantModule, // Updated from TenantContextModule
    PermissionsModule, // This is the global permissions module that provides PermissionContextService
  ],
  controllers: [RolesController, PermissionsController],
  providers: [
    RolesService,
    PermissionsService,
    RoleRepository,
    PermissionRepository,
    UserRoleRepository,
  ],
  exports: [RolesService, PermissionsService],
})
export class RbacModule {}
