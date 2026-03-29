// apps/api/src/modules/leads/leads.module.ts

import { Module } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { LeadsController } from './leads.controller';
import { LoggingModule } from '../../shared/logging/logging.module';
import { LeadRepository } from './repositories/lead.repository';
import { TenantModule } from '../../shared/tenant/tenant.module';
import { PermissionContextModule } from '../../shared/permissions/context/permission-context.module';
// JwtModule removed – authentication is handled by global JwtModule and guards

@Module({
  imports: [
    LoggingModule,
    TenantModule,
    PermissionContextModule,
    // JwtModule is provided globally in AppModule, no need to import here
  ] as const, // Type assertion to avoid ESLint unsafe assignment error
  controllers: [LeadsController],
  providers: [LeadsService, LeadRepository],
  exports: [LeadsService],
})
export class LeadsModule {}
