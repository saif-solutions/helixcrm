import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { DashboardRepository } from './repositories/dashboard.repository';
import { LoggingModule } from '../../shared/logging/logging.module';
import { TenantContextService } from '../../shared/tenant/context/tenant-context.service';
import { PermissionContextService } from '../../shared/permissions/context/permission-context.service';
import { AuditLogService } from '../../shared/audit-log/audit-log.service';

@Module({
  imports: [LoggingModule],
  controllers: [DashboardController],
  providers: [
    DashboardService,
    DashboardRepository, // ✅ ADDED
    TenantContextService, // ✅ ADDED
    PermissionContextService, // ✅ ADDED
    AuditLogService, // ✅ ADDED
  ],
  exports: [DashboardService],
})
export class DashboardModule {}
