// File: apps/api/src/modules/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordResetController } from './controllers/password-reset.controller';
import { PasswordResetService } from './services/password-reset.service';
import { AccountLockoutService } from './services/account-lockout.service';
import { RefreshTokenService } from './services/refresh-token.service';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { RefreshTokenGuard } from './guards/refresh-token.guard';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { AuditLogModule } from '../../shared/audit-log/audit-log.module';
import { JwtModule } from '@nestjs/jwt'; // Add JWT module import
import { AuthCoreAdapter } from './adapters/AuthCoreAdapter'; // Add this import

@Module({
  imports: [
    // PrismaModule is now globally available via SecurityModule
    // JwtModule is now globally available via SecurityModule
    ThrottlerModule.forRoot({
      ttl: 60000,
      limit: 10,
    }),
    AuditLogModule, // ADD THIS TO IMPORTS ARRAY
    JwtModule, // Add JwtModule to imports for AuthCoreAdapter
  ],
  controllers: [AuthController, PasswordResetController],
  providers: [
    AuthService,
    PasswordResetService,
    AccountLockoutService,
    RefreshTokenService,
    JwtRefreshStrategy,
    RefreshTokenGuard,
    AuthCoreAdapter,
  ],
  exports: [AuthService, AuthCoreAdapter],
})
export class AuthModule {}
