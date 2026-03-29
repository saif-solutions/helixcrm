// apps/api/src/modules/export-queue/export-queue.module.ts
import { Module, DynamicModule, Type } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ExportQueueService } from './export-queue.service';
import { ExportQueueController } from './export-queue.controller';
import { ExportQueueProcessor } from './processors/export-queue.processor';
import { ExportQueueRepository } from './repositories/export-queue.repository';
import { TenantModule } from '../../shared/tenant/tenant.module';
import { PermissionsModule } from '../../shared/permissions/permissions.module';
import { AuditLogModule } from '../../shared/audit-log/audit-log.module';

// Pre‑define Bull module configurations to avoid type inference issues
const bullForRoot = BullModule.forRoot({
  connection: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
});

const bullQueue = BullModule.registerQueue({
  name: 'export-queue',
});

@Module({
  imports: [
    bullForRoot,
    bullQueue,
    TenantModule,
    PermissionsModule,
    AuditLogModule,
  ] as Array<DynamicModule | Type<any>>, // Explicit type to satisfy ESLint
  controllers: [ExportQueueController],
  providers: [ExportQueueService, ExportQueueProcessor, ExportQueueRepository],
  exports: [ExportQueueService],
})
export class ExportQueueModule {}
