import { Module, Global } from '@nestjs/common';
import { PermissionCacheService } from './permission-cache.service';
import { PermissionGuard } from '../guards/permission.guard';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [
    PermissionCacheService,
    PermissionGuard,
  ],
  exports: [
    PermissionCacheService,
    PermissionGuard,
  ],
})
export class PermissionsModule {}
