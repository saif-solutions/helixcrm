import { Module } from '@nestjs/common';
import { AuditLogModule } from '../../shared/audit-log/audit-log.module';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
import { PermissionsController } from './permissions.controller';
import { PermissionsService } from './permissions.service';

@Module({
  imports: [
    AuditLogModule,
  ],
  controllers: [RolesController, PermissionsController],
  providers: [RolesService, PermissionsService],
  exports: [RolesService, PermissionsService],
})
export class RbacModule {}