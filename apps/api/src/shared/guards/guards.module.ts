// apps/api/src/shared/guards/guards.module.ts
import { Module, Global } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { TenantGuard } from './tenant.guard';
import { PermissionGuard } from './permission.guard';
import { JwtAuthGuard } from './jwt-auth.guard';
import { SystemGuard } from './system.guard';
import { AuthThrottlerGuard } from './auth-throttler.guard';
import { RefreshTokenGuard } from '../../modules/auth/guards/refresh-token.guard';

@Global()
@Module({
  providers: [
    AuthGuard,
    TenantGuard,
    PermissionGuard,
    JwtAuthGuard,
    SystemGuard,
    AuthThrottlerGuard,
    RefreshTokenGuard,
  ],
  exports: [
    AuthGuard,
    TenantGuard,
    PermissionGuard,
    JwtAuthGuard,
    SystemGuard,
    AuthThrottlerGuard,
    RefreshTokenGuard,
  ],
})
export class GuardsModule {}
