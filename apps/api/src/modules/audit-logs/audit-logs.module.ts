// File: apps/api/src/modules/audit-logs/audit-logs.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { AuditLogController } from './presentation/controllers/audit-log.controller';
// import { AuditLogService } from './application/services/audit-log.service';
import { AuditLogService } from '../../shared/audit-log/audit-log.service';
import { AuditLogRepository } from './infrastructure/repositories/audit-log.repository';
import { SharedModule } from '../../shared/shared.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    SharedModule,
    forwardRef(() => AuthModule), // Circular dependency resolved with forwardRef
  ],
  controllers: [AuditLogController],
  providers: [
    AuditLogService,
    {
      provide: 'IAuditLogRepository', // String token for repository abstraction
      useClass: AuditLogRepository,
    },
  ],
  exports: [
    AuditLogService,
    'IAuditLogRepository', // Export repository token for use in other modules
  ],
})
export class AuditLogsModule {}