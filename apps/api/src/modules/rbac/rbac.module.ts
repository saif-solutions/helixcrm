// apps/api/src/modules/rbac/rbac.module.ts

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt'; // ✅ ADD THIS IMPORT
import { ConfigService } from '@nestjs/config'; // ✅ ADD THIS IMPORT

import { RolesController } from './roles.controller';
import { PermissionsController } from './permissions.controller';
import { RolesService } from './roles.service';
import { PermissionsService } from './permissions.service';
import { PermissionRepository } from './repositories/permission.repository';
import { RoleRepository } from './repositories/role.repository';
import { UserRoleRepository } from './repositories/user-role.repository';

// Import shared modules that provide dependencies
import { SharedModule } from '../../shared/shared.module';
import { AuditLogModule } from '../../shared/audit-log/audit-log.module';
import { TenantModule } from '../../shared/tenant/tenant.module';
import { PermissionsModule } from '../../shared/permissions/permissions.module';

@Module({
  imports: [
    // ✅ ADD JwtModule configuration
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_ACCESS_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
      inject: [ConfigService],
    }),
    SharedModule,
    AuditLogModule,
    TenantModule,
    PermissionsModule,
  ],
  controllers: [RolesController, PermissionsController],
  providers: [
    RolesService,
    PermissionsService,
    PermissionRepository,
    RoleRepository,
    UserRoleRepository,
  ],
  exports: [RolesService, PermissionsService],
})
export class RbacModule {}
