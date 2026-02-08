// apps/api/src/shared/permissions/context/permission-context.module.ts

import { Module, Global } from '@nestjs/common';
import { PermissionContextService } from './permission-context.service';
import { PermissionCacheService } from '../permission-cache.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [PermissionContextService, PermissionCacheService],
  exports: [PermissionContextService, PermissionCacheService],
})
export class PermissionContextModule {}
