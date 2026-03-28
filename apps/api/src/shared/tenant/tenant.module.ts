// apps/api/src/shared/tenant/tenant.module.ts

import { Module, Global, Logger } from '@nestjs/common';
import { TenantContextService } from './context/tenant-context.service';
import { TenantGuard } from '../guards/tenant.guard';
import { SystemGuard } from '../guards/system.guard';

/**
 * Tenant Module
 *
 * Provides tenant isolation and context management for multi-tenant operations.
 * Features:
 * - Tenant context propagation via AsyncLocalStorage
 * - Tenant-aware guards for route protection
 * - System context support for admin operations
 * - Tenant isolation validation
 *
 * @example
 * ```typescript
 * // In app.module.ts
 * @Module({
 *   imports: [TenantModule],
 * })
 * export class AppModule {}
 *
 * // Use guards in controllers
 * @UseGuards(AuthGuard, TenantGuard)
 * @Controller('deals')
 * export class DealsController {}
 * ```
 */
@Global()
@Module({
  providers: [TenantContextService, TenantGuard, SystemGuard],
  exports: [TenantContextService, TenantGuard, SystemGuard],
})
export class TenantModule {
  private readonly logger = new Logger(TenantModule.name);

  constructor() {
    this.logger.log('TenantModule initialized');
    this.logger.debug('Tenant context isolation enabled');
  }
}
