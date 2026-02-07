import { Module } from "@nestjs/common";
import { PipelinesService } from "./pipelines.service";
import { PipelinesController } from "./pipelines.controller";
import { LoggingModule } from "../../shared/logging/logging.module";
import { PipelineRepository } from "./repositories/pipeline.repository";
import { TenantContextService } from "../../shared/tenant/context/tenant-context.service";
import { PermissionContextService } from "../../shared/permissions/context/permission-context.service";
import { AuditLogService } from "../../shared/audit-log/audit-log.service";

@Module({
  imports: [
    LoggingModule,
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