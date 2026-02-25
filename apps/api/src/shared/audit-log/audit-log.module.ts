import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { AuditLogsModule } from '../../modules/audit-logs/audit-logs.module';
import { AuditLogService } from './audit-log.service';
import { AuditPermissionInterceptor } from '../../modules/audit-logs/presentation/interceptors/audit-permission.interceptor';
import { AuditQueueService } from './audit-queue.service';
import { AuditQueueProcessor } from './audit-queue.processor';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditTestController } from './audit-test.controller';

@Module({
  imports: [
    AuditLogsModule, // Domain module
    PrismaModule,
    ConfigModule,
    // Conditionally register BullMQ queue if Redis is available
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
        const jobTimeout = configService.get<number>(
          'AUDIT_JOB_TIMEOUT',
          30000,
        );

        const redisConfig: any = {
          host: redisHost,
          port: redisPort,
          maxRetriesPerRequest: null,
          enableReadyCheck: false,
        };

        if (redisPassword) {
          redisConfig.password = redisPassword;
        }

        if (useTls) {
          redisConfig.tls = {};
        }

        return {
          connection: redisConfig,
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
  controllers: [
    AuditTestController, // Test controller for async audit verification
  ],
  providers: [
    AuditLogService, // Main service (will use queue when available)
    AuditPermissionInterceptor,
    AuditQueueService, // Queue service
    AuditQueueProcessor, // Queue processor (automatically starts)
  ],
  exports: [
    AuditLogService,
    AuditPermissionInterceptor,
    AuditQueueService, // Export for advanced usage
  ],
})
export class AuditLogModule {}
