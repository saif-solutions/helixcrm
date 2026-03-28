import { Module, DynamicModule, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { AuditQueueService } from './audit-queue.service';
import { AuditQueueProcessor } from './audit-queue.processor';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * Redis connection configuration
 */
interface RedisConnectionConfig {
  host: string;
  port: number;
  password?: string;
  tls?: Record<string, unknown>;
  maxRetriesPerRequest: number | null;
  enableReadyCheck: boolean;
}

/**
 * BullMQ queue configuration
 */
interface BullQueueConfig {
  connection: RedisConnectionConfig;
  defaultJobOptions: {
    removeOnComplete: number;
    removeOnFail: number;
    attempts: number;
    timeout: number;
    backoff: {
      type: string;
      delay: number;
    };
  };
}

@Module({})
export class AuditQueueModule {
  private static readonly logger = new Logger(AuditQueueModule.name);

  static register(): DynamicModule {
    return {
      module: AuditQueueModule,
      imports: [
        ConfigModule,
        PrismaModule,
        BullModule.registerQueueAsync({
          name: 'audit-queue',
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (configService: ConfigService): BullQueueConfig => {
            // Type-safe config extraction
            const redisHost = configService.get<string>(
              'REDIS_HOST',
              'localhost',
            );
            const redisPort = configService.get<number>('REDIS_PORT', 6379);
            const redisPassword = configService.get<string | undefined>(
              'REDIS_PASSWORD',
            );
            const useTls =
              configService.get<string>('REDIS_TLS', 'false') === 'true';
            const jobAttempts = configService.get<number>(
              'AUDIT_JOB_ATTEMPTS',
              3,
            );
            const jobTimeout = configService.get<number>(
              'AUDIT_JOB_TIMEOUT',
              30000,
            );

            // Build Redis configuration with proper typing
            const connection: RedisConnectionConfig = {
              host: redisHost,
              port: redisPort,
              maxRetriesPerRequest: null,
              enableReadyCheck: false,
            };

            // Add Redis password if configured (type-safe check)
            if (
              redisPassword !== undefined &&
              redisPassword !== null &&
              redisPassword !== ''
            ) {
              connection.password = redisPassword;
            }

            // Add TLS configuration if enabled
            if (useTls) {
              connection.tls = {};
            }

            AuditQueueModule.logger.debug(
              `Configuring audit queue with Redis at ${redisHost}:${redisPort}`,
            );

            return {
              connection,
              defaultJobOptions: {
                removeOnComplete: 100,
                removeOnFail: 50,
                attempts: jobAttempts,
                timeout: jobTimeout,
                backoff: {
                  type: 'exponential',
                  delay: 1000,
                },
              },
            };
          },
        }),
      ],
      providers: [AuditQueueService, AuditQueueProcessor],
      exports: [AuditQueueService, BullModule],
    };
  }

  static registerWithAsync(): DynamicModule {
    const baseModule = this.register();

    return {
      ...baseModule,
      providers: [...(baseModule.providers || [])],
    };
  }
}
