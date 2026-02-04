// apps/api/src/shared/performance/performance-metrics.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

interface PerformanceMetric {
  timestamp: Date;
  endpoint: string;
  duration: number;
  statusCode: number;
  method: string;
  userId?: string;
  organizationId?: string;
  metadata?: Record<string, any>;
}

interface SLODefinition {
  p95Latency: number;
  errorRate: number;
  throughput: number;
  concurrentUsers: number;
  duration: string;
  justification: string;
}

@Injectable()
export class PerformanceMetricsService {
  private readonly logger = new Logger(PerformanceMetricsService.name);
  private readonly metricsBuffer: PerformanceMetric[] = [];
  private bufferSize = 1000;
  private flushInterval = 60000; // 1 minute

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    // Start background flush
    setInterval(() => this.flushMetrics(), this.flushInterval);
  }

  async recordMetric(metric: Omit<PerformanceMetric, 'timestamp'>): Promise<void> {
    const fullMetric: PerformanceMetric = {
      ...metric,
      timestamp: new Date(),
    };

    this.metricsBuffer.push(fullMetric);

    // Flush if buffer is full
    if (this.metricsBuffer.length >= this.bufferSize) {
      await this.flushMetrics();
    }
  }

  private async flushMetrics(): Promise<void> {
    if (this.metricsBuffer.length === 0) return;

    const metricsToFlush = [...this.metricsBuffer];
    this.metricsBuffer.length = 0;

    try {
      // In production, you'd write to a time-series database
      // For now, we'll log and store in PostgreSQL
      this.logger.debug(`Flushing ${metricsToFlush.length} performance metrics`);
      
      // Store in audit_logs for now (we'll create a dedicated table later)
      for (const metric of metricsToFlush) {
        await this.prisma.auditLog.create({
          data: {
            action: 'PERFORMANCE_METRIC',
            entityType: 'SYSTEM',
            entityId: `metric-${Date.now()}`,
            actorEmail: 'system@helixcrm',
            actorUserId: metric.userId || 'system',
            organizationId: metric.organizationId,
            metadata: {
              ...metric.metadata,
              endpoint: metric.endpoint,
              duration: metric.duration,
              statusCode: metric.statusCode,
              method: metric.method,
            },
            severity: 'LOW',
            ipAddress: '127.0.0.1',
            userAgent: 'performance-metrics',
          },
        });
      }
    } catch (error) {
      this.logger.error(`Failed to flush performance metrics: ${error.message}`);
      // Put metrics back in buffer to retry
      this.metricsBuffer.unshift(...metricsToFlush);
    }
  }

  async getSLODefinitions(): Promise<Record<string, SLODefinition>> {
    try {
      // Load from config file
      const fs = require('fs');
      const path = require('path');
      const sloPath = path.join(process.cwd(), 'configs/performance/slo-definitions.json');
      
      if (fs.existsSync(sloPath)) {
        return JSON.parse(fs.readFileSync(sloPath, 'utf8'));
      }
    } catch (error) {
      this.logger.warn(`Failed to load SLO definitions: ${error.message}`);
    }

    // Return defaults if file not found
    return {
      salesMorningPeak: {
        p95Latency: 800,
        errorRate: 1.0,
        throughput: 100,
        concurrentUsers: 500,
        duration: '15m',
        justification: 'Default SLO for sales morning peak',
      },
    };
  }

  async checkSLOCompliance(
    scenario: string,
    metrics: {
      p95Latency?: number;
      errorRate?: number;
      throughput?: number;
    }
  ): Promise<{ compliant: boolean; violations: string[]; details: any }> {
    const sloDefinitions = await this.getSLODefinitions();
    const slo = sloDefinitions[scenario];
    
    if (!slo) {
      return {
        compliant: false,
        violations: [`No SLO definition found for scenario: ${scenario}`],
        details: null,
      };
    }

    const violations: string[] = [];

    if (metrics.p95Latency !== undefined && metrics.p95Latency > slo.p95Latency) {
      violations.push(`p95 Latency ${metrics.p95Latency}ms exceeds SLO ${slo.p95Latency}ms`);
    }

    if (metrics.errorRate !== undefined && metrics.errorRate > slo.errorRate) {
      violations.push(`Error rate ${metrics.errorRate}% exceeds SLO ${slo.errorRate}%`);
    }

    if (metrics.throughput !== undefined && metrics.throughput < slo.throughput) {
      violations.push(`Throughput ${metrics.throughput} req/sec below SLO ${slo.throughput} req/sec`);
    }

    return {
      compliant: violations.length === 0,
      violations,
      details: {
        scenario,
        slo,
        actual: metrics,
      },
    };
  }

  async getPerformanceBaseline(scenario: string): Promise<any> {
    // Get recent performance data for this scenario
    const metrics = await this.prisma.auditLog.findMany({
      where: {
        action: 'PERFORMANCE_METRIC',
        metadata: {
          path: ['scenario'],
          equals: scenario,
        } as any,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    if (metrics.length === 0) {
      return null;
    }

    // Calculate baseline statistics
    const durations = metrics.map(m => (m.metadata as any)?.duration || 0);
    const statusCodes = metrics.map(m => (m.metadata as any)?.statusCode || 200);

    const meanDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const sortedDurations = [...durations].sort((a, b) => a - b);
    const p95Duration = sortedDurations[Math.floor(sortedDurations.length * 0.95)];
    const errorCount = statusCodes.filter(code => code >= 400).length;
    const errorRate = (errorCount / statusCodes.length) * 100;

    return {
      scenario,
      sampleSize: metrics.length,
      meanDuration,
      p95Duration,
      errorRate,
      lastUpdated: new Date(),
    };
  }
}