import { Module, Global } from '@nestjs/common';
import { PermissionCacheService } from './permission-cache.service';
import { PermissionContextService } from './context/permission-context.service';
import { PermissionGuard } from '../guards/permission.guard';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [
    PermissionCacheService,
    PermissionContextService,
    PermissionGuard,
  ],
  exports: [
    PermissionCacheService,
    PermissionContextService,
    PermissionGuard,
  ],
})
export class PermissionsModule {}
