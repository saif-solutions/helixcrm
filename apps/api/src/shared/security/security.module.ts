// apps/api/src/shared/security/security.module.ts

import { Global, Module, Logger } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';

// ==================== INTERFACES ====================

/**
 * JWT configuration interface
 */
interface JwtConfig {
  secret: string;
  expiresIn: string;
  issuer: string;
  audience: string;
}

// ==================== SECURITY MODULE ====================

/**
 * Security Module
 *
 * Provides security-related services and configurations:
 * - JWT authentication with async configuration
 * - Prisma database access
 * - Global security utilities
 *
 * Features:
 * - Environment-aware JWT configuration
 * - Secure defaults for production
 * - Async module configuration
 *
 * @example
 * ```typescript
 * // In app.module.ts
 * @Module({
 *   imports: [SecurityModule],
 * })
 * export class AppModule {}
 *
 * // In any service
 * constructor(private jwtService: JwtService) {}
 * ```
 */
@Global()
@Module({
  imports: [
    PrismaModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService): JwtConfig => {
        const nodeEnv = configService.get<string>('NODE_ENV', 'development');
        const isProduction = nodeEnv === 'production';

        // Get JWT configuration with defaults
        const secret = configService.get<string>('JWT_SECRET');
        const expiresIn = configService.get<string>('JWT_EXPIRES_IN', '15m');
        const issuer = configService.get<string>('JWT_ISSUER', 'helixcrm');
        const audience = configService.get<string>(
          'JWT_AUDIENCE',
          'helixcrm-client',
        );

        // Validate required configuration
        if (!secret) {
          throw new Error(
            'JWT_SECRET is not configured. Please set JWT_SECRET environment variable.',
          );
        }

        // Log configuration status
        const logger = new Logger('SecurityModule');
        logger.log(
          `JWT configured with issuer: ${issuer}, audience: ${audience}, expiresIn: ${expiresIn}`,
        );

        if (!isProduction && secret === 'change-me-in-production') {
          logger.warn(
            'Using default JWT_SECRET. This is not secure for production!',
          );
        }

        return {
          secret,
          expiresIn,
          issuer,
          audience,
        };
      },
    }),
  ],
  exports: [JwtModule, PrismaModule],
})
export class SecurityModule {
  private readonly logger = new Logger(SecurityModule.name);

  constructor() {
    this.logger.log('SecurityModule initialized');
    this.logEnvironmentStatus();
  }

  /**
   * Log security environment status
   */
  private logEnvironmentStatus(): void {
    const nodeEnv = process.env.NODE_ENV || 'development';
    const isProduction = nodeEnv === 'production';

    if (isProduction) {
      this.logger.log('Running in PRODUCTION mode with security hardening');
    } else {
      this.logger.warn(
        'Running in DEVELOPMENT mode - security features are relaxed',
      );
    }
  }
}
