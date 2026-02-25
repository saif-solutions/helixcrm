import { Module } from '@nestjs/common';
import { DealsService } from './deals.service';
import { DealsController } from './deals.controller';
import { LoggingModule } from '../../shared/logging/logging.module';
import { DealRepository } from './repositories/deal.repository';
import { TenantModule } from '../../shared/tenant/tenant.module';
import { PermissionContextModule } from '../../shared/permissions/context/permission-context.module';
import { AuditLogModule } from '../../shared/audit-log/audit-log.module';

@Module({
  imports: [
    LoggingModule,
    TenantModule,
    PermissionContextModule,
    AuditLogModule,
  ],
  controllers: [DealsController],
  providers: [
    DealsService,
    DealRepository,
  ],
  exports: [DealsService],
})
export class DealsModule {}