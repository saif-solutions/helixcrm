// apps/api/src/modules/leads/leads.module.ts

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { LeadsService } from './leads.service';
import { LeadsController } from './leads.controller';
import { LoggingModule } from '../../shared/logging/logging.module';
import { LeadRepository } from './repositories/lead.repository';
import { TenantModule } from '../../shared/tenant/tenant.module';
import { PermissionContextModule } from '../../shared/permissions/context/permission-context.module';

@Module({
  imports: [LoggingModule, TenantModule, PermissionContextModule, JwtModule],
  controllers: [LeadsController],
  providers: [
    LeadsService,
    LeadRepository,
    // ✅ Remove all APP_GUARD providers
  ],
  exports: [LeadsService],
})
export class LeadsModule {}
