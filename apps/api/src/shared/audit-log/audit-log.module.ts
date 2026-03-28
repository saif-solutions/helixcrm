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
    AuditLogsModule,
    PrismaModule,
    ConfigModule,
    BullModule.registerQueueAsync({
      name: 'audit-queue',
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisHost = configService.get<string>('REDIS_HOST', 'localhost');
        const redisPort = configService.get<number>('REDIS_PORT', 6379);
        const redisPassword = configService.get<string>('REDIS_PASSWORD');
        const useTls =
          configService.get<string>('REDIS_TLS', 'false') === 'true';
        const jobAttempts = configService.get<number>('AUDIT_JOB_ATTEMPTS', 3);
        const jobTimeout = configService.get<number>(
          'AUDIT_JOB_TIMEOUT',
          30000,
        );

        const redisConfig: Record<string, unknown> = {
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
  controllers: [AuditTestController],
  providers: [
    AuditLogService,
    AuditPermissionInterceptor,
    AuditQueueService,
    AuditQueueProcessor,
  ],
  exports: [AuditLogService, AuditPermissionInterceptor, AuditQueueService],
})
export class AuditLogModule {}
