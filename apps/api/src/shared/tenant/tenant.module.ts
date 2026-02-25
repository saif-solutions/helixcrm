// apps/api/src/shared/tenant/tenant.module.ts

import { Module, Global } from '@nestjs/common';
import { TenantContextService } from './context/tenant-context.service';
import { TenantGuard } from '../guards/tenant.guard';
import { SystemGuard } from '../guards/system.guard';

@Global()
@Module({
  providers: [TenantContextService, TenantGuard, SystemGuard],
  exports: [TenantContextService, TenantGuard, SystemGuard],
})
export class TenantModule {}
