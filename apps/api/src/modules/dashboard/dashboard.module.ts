// apps/api/src/modules/dashboard/dashboard.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { DashboardRepository } from './repositories/dashboard.repository';
import { LoggingModule } from '../../shared/logging/logging.module';
import { TenantContextService } from '../../shared/tenant/context/tenant-context.service';
import { PermissionContextService } from '../../shared/permissions/context/permission-context.service';
import { AuditLogService } from '../../shared/audit-log/audit-log.service';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { TenantModule } from '../../shared/tenant/tenant.module';
import { PermissionContextModule } from '../../shared/permissions/context/permission-context.module';
import { AuditLogModule } from '../../shared/audit-log/audit-log.module';

@Module({
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  imports: [
    // Core modules
    PrismaModule,
    LoggingModule,
    TenantModule,
    PermissionContextModule,
    AuditLogModule,
    JwtModule,
  ],
  controllers: [DashboardController],
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  providers: [
    DashboardService,
    DashboardRepository,
    TenantContextService,
    PermissionContextService,
    AuditLogService,
  ],
  exports: [DashboardService, DashboardRepository],
})
export class DashboardModule {}
