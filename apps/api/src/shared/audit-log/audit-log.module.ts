import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../../modules/audit-logs/audit-logs.module';
import { AuditLogService } from './audit-log.service';
import { AuditPermissionInterceptor } from '../../modules/audit-logs/presentation/interceptors/audit-permission.interceptor';

@Module({
  imports: [AuditLogsModule],
  providers: [
    AuditLogService, // Bridge service
    AuditPermissionInterceptor,
  ],
  exports: [
    AuditLogService, // Export bridge service for other modules
    AuditPermissionInterceptor,
  ],
})
export class AuditLogModule {}