import { Module } from '@nestjs/common';
import { AuditLogController } from './presentation/controllers/audit-log.controller';
import { AuditLogService } from './application/services/audit-log.service';
import { AuditLogRepository } from './infrastructure/repositories/audit-log.repository';
import { SharedModule } from '../../shared/shared.module';

@Module({
  imports: [
    SharedModule,
  ],
  controllers: [
    AuditLogController,
  ],
  providers: [
    AuditLogService,
    {
      provide: 'IAuditLogRepository', // String token
      useClass: AuditLogRepository,
    },
  ],
  exports: [
    AuditLogService,
    'IAuditLogRepository', // Export string token
  ],
})
export class AuditLogsModule {}