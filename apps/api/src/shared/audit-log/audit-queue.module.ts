import { Module, DynamicModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { AuditQueueService } from './audit-queue.service';
import { AuditQueueProcessor } from './audit-queue.processor';
import { PrismaModule } from '../prisma/prisma.module';

@Module({})
export class AuditQueueModule {
  static register(): DynamicModule {
    return {
      module: AuditQueueModule,
      imports: [
        ConfigModule,
        PrismaModule,
        // Configure BullMQ queue for audit events
        BullModule.registerQueueAsync({
          name: 'audit-queue',
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: async (configService: ConfigService) => {
            const redisHost = configService.get('REDIS_HOST', 'localhost');
            const redisPort = configService.get<number>('REDIS_PORT', 6379);
            const redisPassword = configService.get('REDIS_PASSWORD');
            const useTls = configService.get('REDIS_TLS', 'false') === 'true';
            const jobAttempts = configService.get<number>('AUDIT_JOB_ATTEMPTS', 3);
            const jobTimeout = configService.get<number>('AUDIT_JOB_TIMEOUT', 30000); // 30 seconds

            const redisConfig: any = {
              host: redisHost,
              port: redisPort,
              maxRetriesPerRequest: null, // Important for BullMQ
              enableReadyCheck: false,
            };

            // Add Redis password if configured
            if (redisPassword) {
              redisConfig.password = redisPassword;
            }

            // Add TLS configuration if enabled
            if (useTls) {
              redisConfig.tls = {};
            }

            return {
              connection: redisConfig,
              defaultJobOptions: {
                removeOnComplete: 100, // Keep last 100 completed jobs
                removeOnFail: 50, // Keep last 50 failed jobs
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
      providers: [
        AuditQueueService,
        AuditQueueProcessor,
      ],
      exports: [
        AuditQueueService,
        BullModule, // Export BullModule to make queue injectable
      ],
    };
  }

  static registerWithAsync(): DynamicModule {
    const baseModule = this.register();

    // Enable async processing (processor will automatically start)
    return {
      ...baseModule,
      providers: [
        ...baseModule.providers,
      ],
    };
  }
}
