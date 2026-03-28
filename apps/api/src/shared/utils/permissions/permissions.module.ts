// apps/api/src/shared/permissions/permissions.module.ts

import { Module, Global, Logger } from '@nestjs/common';
import { PermissionCacheService } from './permission-cache.service';
import { PermissionContextService } from './context/permission-context.service';
import { PermissionGuard } from '../guards/permission.guard';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * Permissions Module
 *
 * Provides permission management and authorization services.
 * Features:
 * - Permission caching for performance
 * - Permission context building
 * - Permission guard for route protection
 *
 * @example
 * ```typescript
 * // In app.module.ts
 * @Module({
 *   imports: [PermissionsModule],
 * })
 * export class AppModule {}
 * ```
 */
@Global()
@Module({
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  imports: [PrismaModule],
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  providers: [
    PermissionCacheService,
    PermissionContextService,
    PermissionGuard,
  ],
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  exports: [PermissionCacheService, PermissionContextService, PermissionGuard],
})
export class PermissionsModule {
  private static readonly logger = new Logger(PermissionsModule.name);

  constructor() {
    PermissionsModule.logger.log('PermissionsModule initialized');
  }
}
