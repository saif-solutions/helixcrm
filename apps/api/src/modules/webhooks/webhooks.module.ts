// apps/api/src/modules/webhooks/webhooks.module.ts
import { Module, DynamicModule, Type } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { WebhooksService } from './webhooks.service';
import { WebhooksController } from './webhooks.controller';
import { WebhookProcessor } from './processors/webhook.processor';
import { WebhookRepository } from './repositories/webhook.repository';
import { TenantModule } from '../../shared/tenant/tenant.module';
import { PermissionsModule } from '../../shared/permissions/permissions.module';
import { AuditLogModule } from '../../shared/audit-log/audit-log.module';

// Pre-define Bull module registration to avoid type inference issues
const bullQueue = BullModule.registerQueue({
  name: 'webhook-queue',
});

@Module({
  imports: [
    bullQueue,
    TenantModule,
    PermissionsModule,
    AuditLogModule,
  ] as Array<DynamicModule | Type<any>>,
  controllers: [WebhooksController],
  providers: [WebhooksService, WebhookProcessor, WebhookRepository],
  exports: [WebhooksService],
})
export class WebhooksModule {}
