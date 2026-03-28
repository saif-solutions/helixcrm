// apps/api/src/shared/performance/performance-metrics.module.ts

import { Module, Global, Logger } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PerformanceMetricsService } from './performance-metrics.service';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * Performance Metrics Module
 *
 * Provides performance monitoring and SLO compliance checking.
 * Marked as @Global() for easy access across the application.
 *
 * @example
 * ```typescript
 * // In app.module.ts
 * @Module({
 *   imports: [PerformanceMetricsModule],
 * })
 * export class AppModule {}
 *
 * // In any service
 * constructor(private performanceMetrics: PerformanceMetricsService) {}
 * ```
 */
@Global()
@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [PerformanceMetricsService],
  exports: [PerformanceMetricsService],
})
export class PerformanceMetricsModule {
  private readonly logger = new Logger(PerformanceMetricsModule.name);

  constructor() {
    this.logger.log('PerformanceMetricsModule initialized');
  }
}
