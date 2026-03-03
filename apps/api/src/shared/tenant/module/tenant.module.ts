// apps/api/src/shared/tenant/module/tenant.module.ts

import { Module, Global } from '@nestjs/common';
import { TenantContextService } from '../context/tenant-context.service';

@Global()
@Module({
  providers: [
    TenantContextService,
    // TenantContextInterceptor removed - guards now handle context
  ],
  exports: [TenantContextService],
})
export class TenantModule {}