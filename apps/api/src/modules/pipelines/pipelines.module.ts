import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt'; // ADD THIS IMPORT
import { PipelinesService } from './pipelines.service';
import { PipelinesController } from './pipelines.controller';
import { LoggingModule } from '../../shared/logging/logging.module';
import { PipelineRepository } from './repositories/pipeline.repository';
import { TenantContextService } from '../../shared/tenant/context/tenant-context.service';
import { PermissionContextService } from '../../shared/permissions/context/permission-context.service';
import { AuditLogService } from '../../shared/audit-log/audit-log.service';

@Module({
  imports: [
    LoggingModule,
    JwtModule, // ADD THIS TO IMPORTS ARRAY
  ],
  controllers: [PipelinesController],
  providers: [
    PipelinesService,
    PipelineRepository,
    TenantContextService,
    PermissionContextService,
    AuditLogService,
  ],
  exports: [PipelinesService],
})
export class PipelinesModule {}
