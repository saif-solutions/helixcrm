// apps/api/src/modules/auth/auth.module.ts

import { Module, forwardRef } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { AuthController } from './auth.controller';
import { CsrfController } from './csrf.controller';
import { AuthService } from './auth.service';

import { PasswordResetController } from './controllers/password-reset.controller';
import { PasswordResetService } from './services/password-reset.service';
import { AccountLockoutService } from './services/account-lockout.service';
import { RefreshTokenService } from './services/refresh-token.service';

import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';

import { GuardsModule } from '../../shared/guards/guards.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

import { AuthCoreAdapter } from './adapters/AuthCoreAdapter';
import { PrismaUserRepositoryBridge } from './adapters/PrismaUserRepositoryBridge';
import { PrismaTokenRepositoryBridge } from './adapters/PrismaTokenRepositoryBridge';

// Injection tokens for abstraction
export const USER_REPOSITORY = 'USER_REPOSITORY';
export const TOKEN_REPOSITORY = 'TOKEN_REPOSITORY';

@Module({
  imports: [
    PassportModule,
    GuardsModule, // Add GuardsModule here too

    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 10,
      },
    ]),

    forwardRef(() => AuditLogsModule),

    JwtModule.register({
      secret:
        process.env.JWT_ACCESS_SECRET ||
        process.env.JWT_SECRET ||
        'dev_secret_do_not_use',
      signOptions: { expiresIn: '1h' },
    }),
  ],

  controllers: [AuthController, PasswordResetController, CsrfController],

  providers: [
    // ================= CORE SERVICES =================
    AuthService,
    PasswordResetService,
    AccountLockoutService,
    RefreshTokenService,

    // ================= STRATEGIES (CRITICAL) =================
    JwtStrategy,
    JwtRefreshStrategy,

    // ================= ADAPTERS / BRIDGES =================
    AuthCoreAdapter,
    PrismaUserRepositoryBridge,
    PrismaTokenRepositoryBridge,

    // ================= INJECTION TOKENS =================
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
    USER_REPOSITORY,
    TOKEN_REPOSITORY,
    JwtModule,
    PassportModule,
  ],
})
export class AuthModule {}
