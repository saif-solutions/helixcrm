// apps/api/src/shared/shared.module.ts

import { Module, Global, Logger } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { PermissionsModule } from './permissions/permissions.module';
import { TenantModule } from './tenant/tenant.module';
import { GuardsModule } from './guards/guards.module';

/**
 * Shared Module
 *
 * Central module that exports all shared functionality:
 * - PrismaModule: Database access
 * - PermissionsModule: Permission management
 * - TenantModule: Multi-tenancy support
 * - GuardsModule: Authentication and authorization guards
 *
 * This module is marked as @Global() so all exports are available
 * throughout the application without needing to import them individually.
 *
 * @example
 * ```typescript
 * // In app.module.ts
 * @Module({
 *   imports: [SharedModule],
 * })
 * export class AppModule {}
 * ```
 */
@Global()
@Module({
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  imports: [PrismaModule, PermissionsModule, TenantModule, GuardsModule],
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  exports: [PrismaModule, PermissionsModule, TenantModule, GuardsModule],
})
export class SharedModule {
  private static readonly logger = new Logger(SharedModule.name);

  constructor() {
    SharedModule.logger.log('SharedModule initialized');
    SharedModule.logger.debug(
      'Exports: PrismaModule, PermissionsModule, TenantModule, GuardsModule',
    );
  }
}
