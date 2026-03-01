// apps/api/src/shared/tenant/module/tenant.module.ts

import { Module, Global } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TenantContextInterceptor } from '../../interceptors/tenant-context.interceptor';
import { TenantContextService } from '../context/tenant-context.service';

@Global()
@Module({
  providers: [
    TenantContextService,
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantContextInterceptor,
    },
  ],
  exports: [TenantContextService],
})
export class TenantModule {}
