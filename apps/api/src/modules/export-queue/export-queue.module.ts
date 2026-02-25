// src/modules/export-queue/export-queue.module.ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq'; // Changed from @nestjs/bull
import { ExportQueueService } from './export-queue.service';
import { ExportQueueController } from './export-queue.controller';
import { ExportQueueProcessor } from './processors/export-queue.processor';
import { ExportQueueRepository } from './repositories/export-queue.repository';
import { TenantModule } from '../../shared/tenant/tenant.module';
import { PermissionsModule } from '../../shared/permissions/permissions.module';
import { AuditLogModule } from '../../shared/audit-log/audit-log.module';

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    }),
    BullModule.registerQueue({
      name: 'export-queue',
    }),
    TenantModule,
    PermissionsModule,
    AuditLogModule,
  ],
  controllers: [ExportQueueController],
  providers: [ExportQueueService, ExportQueueProcessor, ExportQueueRepository],
  exports: [ExportQueueService],
})
export class ExportQueueModule {}
