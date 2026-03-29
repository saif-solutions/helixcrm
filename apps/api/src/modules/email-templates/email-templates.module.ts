import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { EmailTemplatesController } from './email-templates.controller';
import { EmailTemplatesService } from './email-templates.service';
import { EmailTemplateRepository } from './repositories/email-template.repository';
import { SentEmailRepository } from './repositories/sent-email.repository';
import { TenantModule } from '../../shared/tenant/tenant.module';
import { PermissionsModule } from '../../shared/permissions/permissions.module';
import { AuditLogModule } from '../../shared/audit-log/audit-log.module';

@Module({
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  imports: [
    BullModule.registerQueue({
      name: 'email-queue',
    }),
    TenantModule,
    PermissionsModule,
    AuditLogModule,
  ],
  controllers: [EmailTemplatesController],
  providers: [
    EmailTemplatesService,
    EmailTemplateRepository,
    SentEmailRepository,
  ],
  exports: [EmailTemplatesService],
})
export class EmailTemplatesModule {}
