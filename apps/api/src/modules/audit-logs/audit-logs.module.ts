// File: apps/api/src/modules/audit-logs/audit-logs.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuditLogController } from './presentation/controllers/audit-log.controller';
import { AuditLogQueryService } from './application/services/audit-log-query.service';
import { AuditLogService } from '../../shared/audit-log/audit-log.service';
import { AuditLogRepository } from './infrastructure/repositories/audit-log.repository';
import { SharedModule } from '../../shared/shared.module';
import { GuardsModule } from '../../shared/guards/guards.module';
import { IAuditLogRepositoryToken } from './infrastructure/repositories/audit-log.repository.interface';

@Module({
  imports: [SharedModule, GuardsModule, JwtModule],
  controllers: [AuditLogController],
  providers: [
    AuditLogService,
    AuditLogQueryService,
    {
      provide: IAuditLogRepositoryToken, // Use Symbol token
      useClass: AuditLogRepository,
    },
  ],
  exports: [AuditLogService, AuditLogQueryService, IAuditLogRepositoryToken],
})
export class AuditLogsModule {}
