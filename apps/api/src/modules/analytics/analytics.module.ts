// apps/api/src/modules/analytics/analytics.module.ts

import { Module, DynamicModule, ModuleMetadata } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { CacheModule } from '@nestjs/cache-manager';
import { BullModule } from '@nestjs/bullmq';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { AnalyticsSummaryService } from './services/analytics-summary.service';
import { AnalyticsExportProcessor } from './processors/analytics-export.processor';
import { AnalyticsRepository } from './repositories/analytics.repository';
import { AnalyticsSummaryRepository } from './repositories/analytics-summary.repository';
import { AuditLogModule } from '../../shared/audit-log/audit-log.module';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { LoggingModule } from '../../shared/logging/logging.module';
import { TenantModule } from '../../shared/tenant/tenant.module';
import { PermissionsModule } from '../../shared/permissions/permissions.module';
import { DateRangeConstraint } from '../../shared/validators/date-range.validator';
import { CurrencyCodeConstraint } from '../../shared/validators/currency-code.validator';

// Define Redis configuration interface
interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  tls?: Record<string, unknown>;
}

// Define BullMQ connection interface
interface BullMQConnection {
  connection: RedisConfig;
  defaultJobOptions: {
    removeOnComplete: boolean;
    removeOnFail: boolean;
    attempts: number;
    timeout: number;
  };
}

@Module({})
export class AnalyticsModule {
  static register(): DynamicModule {
    return {
      module: AnalyticsModule,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      imports: [
        ConfigModule,
        PrismaModule,
        AuditLogModule,
        LoggingModule,
        TenantModule,
        PermissionsModule,
        ScheduleModule.forRoot(),

        CacheModule.registerAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => {
            const ttl = configService.get<number>('ANALYTICS_CACHE_TTL', 300);
            const max = configService.get<number>('ANALYTICS_CACHE_MAX', 100);

            console.log(
              `✅ Analytics cache configured: TTL=${ttl}s, Max=${max} entries`,
            );

            return {
              ttl: ttl * 1000,
              max,
              store: 'memory',
            };
          },
        }),
      ],
      controllers: [AnalyticsController],
      providers: [
        AnalyticsService,
        AnalyticsSummaryService,
        AnalyticsRepository,
        AnalyticsSummaryRepository,
        DateRangeConstraint,
        CurrencyCodeConstraint,
      ],
      exports: [AnalyticsService, AnalyticsSummaryService],
    };
  }

  static registerWithExports(): DynamicModule {
    const baseModule = this.register();
    const baseMetadata: ModuleMetadata = {
      imports: baseModule.imports,
      controllers: baseModule.controllers,
      providers: baseModule.providers,
      exports: baseModule.exports,
    };

    const exportsEnabled = process.env.ANALYTICS_EXPORT_ENABLED !== 'false';
    const redisHost = process.env.REDIS_HOST || 'localhost';

    if (!exportsEnabled) {
      console.log(
        'ℹ️ Analytics exports disabled via ANALYTICS_EXPORT_ENABLED=false',
      );
      return baseModule;
    }

    console.log(`✅ Analytics exports enabled, Redis host: ${redisHost}`);

    const bullQueueAsync = BullModule.registerQueueAsync({
      name: 'analytics-export',
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): BullMQConnection => {
        // Type-safe config extraction
        const redisHost = configService.get<string>('REDIS_HOST', 'localhost');
        const redisPort = configService.get<number>('REDIS_PORT', 6379);
        const redisPassword = configService.get<string>('REDIS_PASSWORD');
        const useTls =
          configService.get<string>('REDIS_TLS', 'false') === 'true';
        const jobAttempts = configService.get<number>('EXPORT_JOB_ATTEMPTS', 3);
        const jobTimeout = configService.get<number>(
          'EXPORT_JOB_TIMEOUT',
          300000,
        );

        // Build Redis config with proper typing
        const redisConfig: RedisConfig = {
          host: redisHost,
          port: redisPort,
        };

        // Add Redis password if configured (type-safe)
        if (redisPassword !== undefined && redisPassword !== null) {
          redisConfig.password = redisPassword;
          console.log(
            '✅ Redis password configured (TLS:',
            useTls ? 'enabled' : 'disabled',
            ')',
          );
        }

        // Add TLS configuration if enabled
        if (useTls) {
          redisConfig.tls = {};
          console.log('✅ Redis TLS enabled');
        }

        console.log(
          `✅ BullMQ queue configured: host=${redisHost}:${redisPort}, attempts=${jobAttempts}, timeout=${jobTimeout}ms`,
        );

        return {
          connection: redisConfig,
          defaultJobOptions: {
            removeOnComplete: true,
            removeOnFail: false,
            attempts: jobAttempts,
            timeout: jobTimeout,
          },
        };
      },
    });

    /**
     * Safe helpers - explicit typing to avoid any[] inference
     */
    const baseImports = baseMetadata.imports || [];
    const baseProviders = baseMetadata.providers || [];

    return {
      module: AnalyticsModule,
      imports: [...baseImports, bullQueueAsync],
      controllers: baseMetadata.controllers,
      providers: [...baseProviders, AnalyticsExportProcessor],
      exports: baseMetadata.exports,
    };
  }
}

// Export factory function for easier app.module integration
export function getAnalyticsModule(): DynamicModule {
  const redisHost = process.env.REDIS_HOST;
  const exportsEnabled = process.env.ANALYTICS_EXPORT_ENABLED !== 'false';

  if (redisHost && exportsEnabled) {
    console.log(
      '✅ Analytics module configured with Redis export capabilities',
    );
    return AnalyticsModule.registerWithExports();
  } else {
    console.log(
      'ℹ️  Analytics module configured without Redis (read-only analytics)',
    );
    return AnalyticsModule.register();
  }
}
