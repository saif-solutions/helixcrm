// apps/api/src/shared/guards/guards.module.ts

import { Module, Global, Logger, DynamicModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthGuard } from './auth.guard';
import { TenantGuard } from './tenant.guard';
import { PermissionGuard } from './permission.guard';
import { JwtAuthGuard } from './jwt-auth.guard';
import { SystemGuard } from './system.guard';
import { AuthThrottlerGuard } from './auth-throttler.guard';
import { RefreshTokenGuard } from '../../modules/auth/guards/refresh-token.guard';
import { PermissionContextModule } from '../permissions/context/permission-context.module';
import { TenantContextModule } from '../tenant/context/tenant-context.module';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * Guards module configuration options
 */
export interface GuardsModuleOptions {
  /**
   * Whether to enable global guards
   * @default true
   */
  enableGlobalGuards?: boolean;

  /**
   * Custom rate limit configuration
   */
  rateLimit?: {
    ttl: number;
    limit: number;
  };

  /**
   * Custom guard order (advanced usage)
   */
  guardOrder?: Array<
    'AuthGuard' | 'TenantGuard' | 'PermissionGuard' | 'AuthThrottlerGuard'
  >;
}

/**
 * Guards Module
 *
 * Provides all authentication and authorization guards for the application.
 * This module is marked as @Global() so guards are available throughout the app.
 *
 * ## Guard Execution Order
 *
 * The guards execute in the following order:
 * 1. **AuthGuard** - Authenticates user and extracts user info from JWT
 * 2. **TenantGuard** - Establishes tenant context from authenticated user
 * 3. **PermissionGuard** - Checks permissions based on user roles
 * 4. **AuthThrottlerGuard** - Applies rate limiting based on user or IP
 *
 * This order ensures that:
 * - User is authenticated before tenant context is established
 * - Tenant context is available for permission checks
 * - Rate limiting applies after authentication for accurate user-based tracking
 *
 * @example
 * ```typescript
 * // Basic usage in app.module.ts
 * @Module({
 *   imports: [GuardsModule],
 * })
 * export class AppModule {}
 *
 * // With custom rate limiting
 * @Module({
 *   imports: [GuardsModule.forRoot({
 *     rateLimit: { ttl: 30, limit: 50 }
 *   })],
 * })
 * export class AppModule {}
 * ```
 */
@Global()
@Module({
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  imports: [
    // Core dependencies for guards
    PrismaModule,
    PermissionContextModule,
    TenantContextModule,

    // Throttler module for rate limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        ttl: configService.get<number>('THROTTLE_TTL', 60),
        limit: configService.get<number>('THROTTLE_LIMIT', 100),
      }),
    }),
  ],
  providers: [
    // Guard providers
    AuthGuard,
    TenantGuard,
    PermissionGuard,
    JwtAuthGuard,
    SystemGuard,
    AuthThrottlerGuard,
    RefreshTokenGuard,

    // Global guards - execute in this order
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: TenantGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionGuard,
    },
    {
      provide: APP_GUARD,
      useClass: AuthThrottlerGuard,
    },
  ],
  exports: [
    // Export all guards for use in other modules
    AuthGuard,
    TenantGuard,
    PermissionGuard,
    JwtAuthGuard,
    SystemGuard,
    AuthThrottlerGuard,
    RefreshTokenGuard,
  ],
})
export class GuardsModule {
  private static readonly logger = new Logger(GuardsModule.name);

  constructor() {
    GuardsModule.logger.log('✓ GuardsModule initialized successfully');
    GuardsModule.logger.debug(
      'Global guards registered in order: AuthGuard → TenantGuard → PermissionGuard → AuthThrottlerGuard',
    );

    // Log environment information
    const nodeEnv = process.env.NODE_ENV || 'development';
    GuardsModule.logger.debug(`Running in ${nodeEnv} mode`);
  }

  /**
   * Configure guards module with custom options
   * Use this method when you need to override default configuration
   *
   * @param options - Module configuration options
   * @returns Dynamic module with custom configuration
   *
   * @example
   * ```typescript
   * // Custom rate limiting
   * @Module({
   *   imports: [GuardsModule.forRoot({
   *     rateLimit: { ttl: 30, limit: 50 }
   *   })],
   * })
   * export class AppModule {}
   *
   * // Disable global guards
   * @Module({
   *   imports: [GuardsModule.forRoot({
   *     enableGlobalGuards: false
   *   })],
   * })
   * export class AppModule {}
   * ```
   */
  static forRoot(options: GuardsModuleOptions = {}): DynamicModule {
    const {
      enableGlobalGuards = true,
      rateLimit,
      guardOrder = [
        'AuthGuard',
        'TenantGuard',
        'PermissionGuard',
        'AuthThrottlerGuard',
      ],
    } = options;

    // Log configuration
    this.logConfiguration(enableGlobalGuards, rateLimit, guardOrder);

    // Create custom throttler module if rate limit is provided
    const throttlerModule = rateLimit
      ? ThrottlerModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: () => ({
            ttl: rateLimit.ttl,
            limit: rateLimit.limit,
          }),
        })
      : ThrottlerModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => ({
            ttl: configService.get<number>('THROTTLE_TTL', 60),
            limit: configService.get<number>('THROTTLE_LIMIT', 100),
          }),
        });

    // Build providers array
    const providers = [
      AuthGuard,
      TenantGuard,
      PermissionGuard,
      JwtAuthGuard,
      SystemGuard,
      AuthThrottlerGuard,
      RefreshTokenGuard,
    ];

    // Add global guards if enabled
    if (enableGlobalGuards) {
      // Map guard names to their classes
      const guardMap = {
        AuthGuard,
        TenantGuard,
        PermissionGuard,
        AuthThrottlerGuard,
      };

      // Add guards in the specified order
      for (const guardName of guardOrder) {
        const guardClass = guardMap[guardName];
        if (guardClass) {
          providers.push({
            provide: APP_GUARD,
            useClass: guardClass,
          });
        } else {
          this.logger.warn(`Unknown guard: ${guardName}, skipping...`);
        }
      }
    }

    // Return dynamic module
    return {
      module: GuardsModule,
      global: true,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      imports: [
        PrismaModule,
        PermissionContextModule,
        TenantContextModule,
        throttlerModule,
      ],
      providers,
      exports: [
        AuthGuard,
        TenantGuard,
        PermissionGuard,
        JwtAuthGuard,
        SystemGuard,
        AuthThrottlerGuard,
        RefreshTokenGuard,
      ],
    };
  }

  /**
   * Register guards module for feature modules
   * Use this when you need guards in a feature module without global registration
   *
   * @returns Dynamic module with guard exports
   *
   * @example
   * ```typescript
   * @Module({
   *   imports: [GuardsModule.forFeature()],
   * })
   * export class FeatureModule {}
   * ```
   */
  static forFeature(): DynamicModule {
    return {
      module: GuardsModule,
      providers: [],
      exports: [
        AuthGuard,
        TenantGuard,
        PermissionGuard,
        JwtAuthGuard,
        SystemGuard,
        AuthThrottlerGuard,
        RefreshTokenGuard,
      ],
    };
  }

  /**
   * Get the guard execution order
   * Useful for debugging and documentation
   *
   * @returns Array of guard names in execution order
   */
  static getGuardOrder(): ReadonlyArray<string> {
    return [
      'AuthGuard',
      'TenantGuard',
      'PermissionGuard',
      'AuthThrottlerGuard',
    ] as const;
  }

  /**
   * Check if a specific guard is registered globally
   *
   * @param guardName - Name of the guard to check
   * @returns True if the guard is registered globally
   */
  static isGuardRegistered(guardName: string): boolean {
    const registeredGuards = [
      'AuthGuard',
      'TenantGuard',
      'PermissionGuard',
      'AuthThrottlerGuard',
    ];
    return registeredGuards.includes(guardName);
  }

  /**
   * Get module information for debugging
   *
   * @returns Object with module metadata
   */
  static getModuleInfo(): {
    name: string;
    version: string;
    guards: string[];
    global: boolean;
  } {
    return {
      name: 'GuardsModule',
      version: '1.0.0',
      guards: [
        'AuthGuard',
        'TenantGuard',
        'PermissionGuard',
        'JwtAuthGuard',
        'SystemGuard',
        'AuthThrottlerGuard',
        'RefreshTokenGuard',
      ],
      global: true,
    };
  }

  /**
   * Log module configuration
   */
  private static logConfiguration(
    enableGlobalGuards: boolean,
    rateLimit: GuardsModuleOptions['rateLimit'],
    guardOrder: string[],
  ): void {
    this.logger.log('Configuring GuardsModule...');

    if (rateLimit) {
      this.logger.log(
        `Custom rate limit: ${rateLimit.limit} requests per ${rateLimit.ttl} seconds`,
      );
    }

    if (!enableGlobalGuards) {
      this.logger.warn(
        'Global guards are disabled - authentication will not be applied globally',
      );
    }

    if (guardOrder && guardOrder.length > 0) {
      this.logger.debug(`Custom guard order: ${guardOrder.join(' → ')}`);
    }

    this.logger.log('GuardsModule configuration complete');
  }
}
