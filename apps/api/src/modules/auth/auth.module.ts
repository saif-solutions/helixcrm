// File: apps/api/src/modules/auth/auth.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordResetController } from './controllers/password-reset.controller';
import { PasswordResetService } from './services/password-reset.service';
import { AccountLockoutService } from './services/account-lockout.service';
import { RefreshTokenService } from './services/refresh-token.service';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { RefreshTokenGuard } from './guards/refresh-token.guard';
import { AuditLogsModule } from '../audit-logs/audit-logs.module'; // Note: plural 'AuditLogsModule'
import { AuthCoreAdapter } from './adapters/AuthCoreAdapter';
import { PrismaUserRepositoryBridge } from './adapters/PrismaUserRepositoryBridge';
import { PrismaTokenRepositoryBridge } from './adapters/PrismaTokenRepositoryBridge';

// Injection tokens for abstraction
export const USER_REPOSITORY = 'USER_REPOSITORY';
export const TOKEN_REPOSITORY = 'TOKEN_REPOSITORY';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      ttl: 60000,
      limit: 10,
    }),
    forwardRef(() => AuditLogsModule), // Circular dependency resolved with forwardRef
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'defaultSecret',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  controllers: [AuthController, PasswordResetController],
  providers: [
    // Core Services
    AuthService,
    PasswordResetService,
    AccountLockoutService,
    RefreshTokenService,

    // Guards and Strategies
    JwtRefreshStrategy,
    RefreshTokenGuard,

    // Adapters and Bridges - Concrete implementations
    AuthCoreAdapter,
    PrismaUserRepositoryBridge,
    PrismaTokenRepositoryBridge,

    // Abstract tokens for dependency injection flexibility
    {
      provide: USER_REPOSITORY,
      useClass: PrismaUserRepositoryBridge,
    },
    {
      provide: TOKEN_REPOSITORY,
      useClass: PrismaTokenRepositoryBridge,
    },
  ],
  exports: [
    AuthService,
    AuthCoreAdapter,
    PrismaUserRepositoryBridge,
    PrismaTokenRepositoryBridge,
    USER_REPOSITORY,
    TOKEN_REPOSITORY,
    JwtModule, // Export JwtModule so JwtService is available elsewhere
  ],
})
export class AuthModule {}