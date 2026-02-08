// apps/api/src/shared/performance/performance-metrics.module.ts
import { Module } from '@nestjs/common';
import { PerformanceMetricsService } from './performance-metrics.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [PerformanceMetricsService],
  exports: [PerformanceMetricsService],
})
export class PerformanceMetricsModule {}
