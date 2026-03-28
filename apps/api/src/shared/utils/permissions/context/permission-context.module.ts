// apps/api/src/shared/permissions/context/permission-context.module.ts

import { Module, Global, Logger } from '@nestjs/common';
import { PermissionContextService } from './permission-context.service';
import { PermissionCacheService } from '../permission-cache.service';
import { PrismaModule } from '../../prisma/prisma.module';

/**
 * Permission Context Module
 *
 * Provides permission context building and management.
 * This module is used internally by PermissionsModule.
 *
 * @example
 * ```typescript
 * // Typically used via PermissionsModule, not directly
 * @Module({
 *   imports: [PermissionContextModule],
 * })
 * export class SomeModule {}
 * ```
 */
@Global()
@Module({
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  imports: [PrismaModule],
  providers: [PermissionContextService, PermissionCacheService],
  exports: [PermissionContextService, PermissionCacheService],
})
export class PermissionContextModule {
  private static readonly logger = new Logger(PermissionContextModule.name);

  constructor() {
    PermissionContextModule.logger.log('PermissionContextModule initialized');
  }
}
