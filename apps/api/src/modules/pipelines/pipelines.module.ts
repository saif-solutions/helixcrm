// apps/api/src/modules/pipelines/pipelines.module.ts
import { Module } from '@nestjs/common';
import { PipelinesService } from './pipelines.service';
import { PipelinesController } from './pipelines.controller';
import { LoggingModule } from '../../shared/logging/logging.module';
import { PipelineRepository } from './repositories/pipeline.repository';
import { TenantModule } from '../../shared/tenant/tenant.module';
import { PermissionsModule } from '../../shared/permissions/permissions.module';
import { AuditLogModule } from '../../shared/audit-log/audit-log.module';

@Module({
  imports: [
    LoggingModule,
    TenantModule, // Provides TenantContextService
    PermissionsModule, // Provides PermissionContextService
    AuditLogModule, // Provides AuditLogService
  ] as const, // Type assertion to avoid ESLint unsafe assignment
  controllers: [PipelinesController],
  providers: [PipelinesService, PipelineRepository],
  exports: [PipelinesService],
})
export class PipelinesModule {}
