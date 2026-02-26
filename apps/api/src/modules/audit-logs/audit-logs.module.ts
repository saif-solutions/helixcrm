// File: apps/api/src/modules/audit-logs/audit-logs.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt'; // ADD THIS IMPORT
import { AuditLogController } from './presentation/controllers/audit-log.controller';
import { AuditLogQueryService } from './application/services/audit-log-query.service'; // ADD THIS IMPORT
import { AuditLogService } from '../../shared/audit-log/audit-log.service';
import { AuditLogRepository } from './infrastructure/repositories/audit-log.repository';
import { SharedModule } from '../../shared/shared.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    SharedModule,
    forwardRef(() => AuthModule),
    JwtModule, // ADD THIS to provide JwtService for guards
  ],
  controllers: [AuditLogController],
  providers: [
    AuditLogService,
    AuditLogQueryService, // ADD THIS PROVIDER
    {
      provide: 'IAuditLogRepository',
      useClass: AuditLogRepository,
    },
  ],
  exports: [
    AuditLogService,
    AuditLogQueryService, // Export if needed elsewhere
    'IAuditLogRepository',
  ],
})
export class AuditLogsModule {}