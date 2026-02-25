// src/modules/email-templates/email-templates.module.ts
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { EmailTemplatesController } from './email-templates.controller';
import { EmailTemplatesService } from './email-templates.service';
import { EmailTemplateRepository } from './repositories/email-template.repository';
import { SentEmailRepository } from './repositories/sent-email.repository'; // ✅ ADDED
import { TenantModule } from '../../shared/tenant/tenant.module';
import { PermissionsModule } from '../../shared/permissions/permissions.module';
import { AuditLogModule } from '../../shared/audit-log/audit-log.module';

@Module({
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
    SentEmailRepository, // ✅ ADDED
  ],
  exports: [EmailTemplatesService],
})
export class EmailTemplatesModule {}
