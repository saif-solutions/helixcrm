import { Module } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { LeadsController } from './leads.controller';
import { LoggingModule } from '../../shared/logging/logging.module';
import { LeadRepository } from './repositories/lead.repository';
import { TenantModule } from '../../shared/tenant/tenant.module';
import { PermissionContextModule } from '../../shared/permissions/context/permission-context.module';

@Module({
  imports: [
    LoggingModule,
    TenantModule,
    PermissionContextModule,
  ],
  controllers: [LeadsController],
  providers: [
    LeadsService,
    LeadRepository,
  ],
  exports: [LeadsService],
})
export class LeadsModule {}