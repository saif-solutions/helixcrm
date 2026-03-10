import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt'; // ADD THIS IMPORT
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { DashboardRepository } from './repositories/dashboard.repository';
import { LoggingModule } from '../../shared/logging/logging.module';
import { TenantContextService } from '../../shared/tenant/context/tenant-context.service';
import { PermissionContextService } from '../../shared/permissions/context/permission-context.service';
import { AuditLogService } from '../../shared/audit-log/audit-log.service';

@Module({
  imports: [
    LoggingModule,
    JwtModule, // ADD THIS TO IMPORTS ARRAY
  ],
  controllers: [DashboardController],
  providers: [
    DashboardService,
    DashboardRepository,
    TenantContextService,
    PermissionContextService,
    AuditLogService,
  ],
  exports: [DashboardService],
})
export class DashboardModule {}
