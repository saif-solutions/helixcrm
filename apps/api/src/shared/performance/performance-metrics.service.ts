// apps/api/src/shared/performance/performance-metrics.service.ts

import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

// ==================== INTERFACES ====================

/**
 * Performance metric interface
 */
export interface PerformanceMetric {
  timestamp: Date;
  endpoint: string;
  duration: number;
  statusCode: number;
  method: string;
  userId?: string;
  organizationId?: string;
  scenario?: string;
  metadata?: Record<string, unknown>;
}

/**
 * SLO (Service Level Objective) definition
 */
export interface SLODefinition {
  description?: string;
  p95Latency: number;
  errorRate: number;
  throughput: number;
  concurrentUsers: number;
  duration: string;
  justification: string;
}

/**
 * SLO Compliance result
 */
export interface SLOComplianceResult {
  compliant: boolean;
  violations: string[];
  details: {
    scenario: string;
    slo: SLODefinition;
    actual: {
      p95Latency?: number;
      errorRate?: number;
      throughput?: number;
    };
  } | null;
}

/**
 * Performance baseline statistics
 */
export interface PerformanceBaseline {
  scenario: string;
  sampleSize: number;
  meanDuration: number;
  p95Duration: number;
  errorRate: number;
  lastUpdated: Date;
}

/**
 * Metric metadata for database storage
 */
interface MetricMetadata {
  endpoint: string;
  duration: number;
  statusCode: number;
  method: string;
  scenario?: string;
  [key: string]: unknown;
}

// ==================== TYPE GUARDS ====================

/**
 * Type guard for metric metadata
 */
function isMetricMetadata(metadata: unknown): metadata is MetricMetadata {
  if (!metadata || typeof metadata !== 'object') return false;
  const obj = metadata as Record<string, unknown>;
  return (
    'endpoint' in obj &&
    'duration' in obj &&
    'statusCode' in obj &&
    'method' in obj
  );
}

/**
 * Type guard for error with message
 */
function hasErrorMessage(error: unknown): error is { message: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  );
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Safely extract error message
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (hasErrorMessage(error)) return error.message;
  if (typeof error === 'string') return error;
  return 'Unknown error occurred';
}

/**
 * Calculate p95 percentile from duration array
 */
function calculateP95(durations: number[]): number {
  if (durations.length === 0) return 0;
  const sorted = [...durations].sort((a, b) => a - b);
  const index = Math.floor(sorted.length * 0.95);
  return sorted[index];
}

/**
 * Calculate mean from number array
 */
function calculateMean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

// ==================== SERVICE ====================

@Injectable()
export class PerformanceMetricsService implements OnModuleDestroy {
  private readonly logger = new Logger(PerformanceMetricsService.name);
  private readonly metricsBuffer: PerformanceMetric[] = [];
  private readonly bufferSize = 1000;
  private readonly flushIntervalMs = 60000; // 1 minute
  private flushTimer: NodeJS.Timeout;
  private isShuttingDown = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    // Start background flush
    this.flushTimer = setInterval(() => {
      this.flushMetrics().catch((error) => {
        this.logger.error(`Flush error: ${getErrorMessage(error)}`);
      });
    }, this.flushIntervalMs);
  }

  /**
   * Clean up on module destruction
   */
  async onModuleDestroy(): Promise<void> {
    this.isShuttingDown = true;
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    // Flush remaining metrics before shutdown
    await this.flushMetrics();
  }

  /**
   * Record a performance metric
   */
  async recordMetric(
    metric: Omit<PerformanceMetric, 'timestamp'>,
  ): Promise<void> {
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

  /**
   * Flush metrics buffer to database
   */
  private async flushMetrics(): Promise<void> {
    if (this.metricsBuffer.length === 0) return;

    const metricsToFlush = [...this.metricsBuffer];
    this.metricsBuffer.length = 0;

    try {
      this.logger.debug(
        `Flushing ${metricsToFlush.length} performance metrics`,
      );

      // Store metrics in audit_logs table
      for (const metric of metricsToFlush) {
        const metadata: MetricMetadata = {
          endpoint: metric.endpoint,
          duration: metric.duration,
          statusCode: metric.statusCode,
          method: metric.method,
          scenario: metric.scenario,
          ...metric.metadata,
        };

        await this.prisma.auditLog.create({
          data: {
            action: 'PERFORMANCE_METRIC',
            entityType: 'SYSTEM',
            entityId: `metric-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
            actorEmail: 'system@helixcrm',
            actorUserId: metric.userId || 'system',
            organizationId: metric.organizationId,
            metadata: metadata as Record<string, unknown>,
            severity: 'LOW',
            ipAddress: '127.0.0.1',
            userAgent: 'performance-metrics',
          },
        });
      }
    } catch (error) {
      this.logger.error(
        `Failed to flush performance metrics: ${getErrorMessage(error)}`,
      );

      // Put metrics back in buffer to retry (unless shutting down)
      if (!this.isShuttingDown) {
        this.metricsBuffer.unshift(...metricsToFlush);
      }
    }
  }

  /**
   * Get SLO definitions from config file
   * Synchronous operation - reads from file system
   */
  getSLODefinitions(): Record<string, SLODefinition> {
    try {
      const sloPath = path.join(
        process.cwd(),
        'configs',
        'performance',
        'slo-definitions.json',
      );

      if (fs.existsSync(sloPath)) {
        const fileContent = fs.readFileSync(sloPath, 'utf8');
        const definitions = JSON.parse(fileContent) as Record<
          string,
          SLODefinition
        >;
        return definitions;
      }
    } catch (error) {
      this.logger.warn(
        `Failed to load SLO definitions: ${getErrorMessage(error)}`,
      );
    }

    // Return defaults if file not found
    return this.getDefaultSLODefinitions();
  }

  /**
   * Get default SLO definitions (fallback)
   */
  private getDefaultSLODefinitions(): Record<string, SLODefinition> {
    return {
      salesMorningPeak: {
        description: 'Default sales morning peak SLO',
        p95Latency: 800,
        errorRate: 1.0,
        throughput: 100,
        concurrentUsers: 500,
        duration: '15m',
        justification: 'Default SLO for sales morning peak',
      },
      apiDefault: {
        description: 'Default API endpoint SLO',
        p95Latency: 500,
        errorRate: 0.5,
        throughput: 50,
        concurrentUsers: 200,
        duration: '5m',
        justification: 'Default SLO for API endpoints',
      },
    };
  }

  /**
   * Check SLO compliance for a scenario
   * Synchronous operation - performs calculations only
   */
  checkSLOCompliance(
    scenario: string,
    metrics: {
      p95Latency?: number;
      errorRate?: number;
      throughput?: number;
    },
  ): SLOComplianceResult {
    const sloDefinitions = this.getSLODefinitions();
    const slo = sloDefinitions[scenario];

    if (!slo) {
      return {
        compliant: false,
        violations: [`No SLO definition found for scenario: ${scenario}`],
        details: null,
      };
    }

    const violations: string[] = [];

    if (
      metrics.p95Latency !== undefined &&
      metrics.p95Latency > slo.p95Latency
    ) {
      violations.push(
        `p95 Latency ${metrics.p95Latency}ms exceeds SLO ${slo.p95Latency}ms`,
      );
    }

    if (metrics.errorRate !== undefined && metrics.errorRate > slo.errorRate) {
      violations.push(
        `Error rate ${metrics.errorRate}% exceeds SLO ${slo.errorRate}%`,
      );
    }

    if (
      metrics.throughput !== undefined &&
      metrics.throughput < slo.throughput
    ) {
      violations.push(
        `Throughput ${metrics.throughput} req/sec below SLO ${slo.throughput} req/sec`,
      );
    }

    return {
      compliant: violations.length === 0,
      violations,
      details: {
        scenario,
        slo,
        actual: {
          p95Latency: metrics.p95Latency,
          errorRate: metrics.errorRate,
          throughput: metrics.throughput,
        },
      },
    };
  }

  /**
   * Get performance baseline for a scenario
   * Asynchronous - queries database
   */
  async getPerformanceBaseline(
    scenario: string,
  ): Promise<PerformanceBaseline | null> {
    try {
      // Get recent performance data for this scenario
      const metrics = await this.prisma.auditLog.findMany({
        where: {
          action: 'PERFORMANCE_METRIC',
          metadata: {
            path: ['scenario'],
            equals: scenario,
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });

      if (metrics.length === 0) {
        return null;
      }

      // Extract durations and status codes safely
      const durations: number[] = [];
      const statusCodes: number[] = [];

      for (const metric of metrics) {
        const metadata = metric.metadata;
        if (isMetricMetadata(metadata)) {
          durations.push(metadata.duration);
          statusCodes.push(metadata.statusCode);
        }
      }

      if (durations.length === 0) {
        return null;
      }

      // Calculate statistics
      const meanDuration = calculateMean(durations);
      const p95Duration = calculateP95(durations);
      const errorCount = statusCodes.filter((code) => code >= 400).length;
      const errorRate = (errorCount / statusCodes.length) * 100;

      return {
        scenario,
        sampleSize: durations.length,
        meanDuration,
        p95Duration,
        errorRate,
        lastUpdated: new Date(),
      };
    } catch (error) {
      this.logger.error(
        `Failed to get performance baseline: ${getErrorMessage(error)}`,
      );
      return null;
    }
  }

  /**
   * Get recent metrics for an endpoint
   * Asynchronous - queries database
   */
  async getMetricsForEndpoint(
    endpoint: string,
    limit: number = 100,
  ): Promise<PerformanceMetric[]> {
    try {
      const metrics = await this.prisma.auditLog.findMany({
        where: {
          action: 'PERFORMANCE_METRIC',
          metadata: {
            path: ['endpoint'],
            equals: endpoint,
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return metrics
        .map((metric) => {
          const metadata = metric.metadata;
          if (!isMetricMetadata(metadata)) return null;

          return {
            timestamp: metric.createdAt,
            endpoint: metadata.endpoint,
            duration: metadata.duration,
            statusCode: metadata.statusCode,
            method: metadata.method,
            userId:
              metric.actorUserId === 'system' ? undefined : metric.actorUserId,
            organizationId: metric.organizationId || undefined,
            scenario: metadata.scenario,
            metadata: metadata,
          } as PerformanceMetric;
        })
        .filter((m): m is PerformanceMetric => m !== null);
    } catch (error) {
      this.logger.error(
        `Failed to get metrics for endpoint: ${getErrorMessage(error)}`,
      );
      return [];
    }
  }

  /**
   * Get average latency by endpoint
   * Asynchronous - queries database
   */
  async getAverageLatencyByEndpoint(
    hours: number = 24,
  ): Promise<Map<string, number>> {
    try {
      const cutoffDate = new Date(Date.now() - hours * 60 * 60 * 1000);

      const metrics = await this.prisma.auditLog.findMany({
        where: {
          action: 'PERFORMANCE_METRIC',
          createdAt: { gte: cutoffDate },
        },
      });

      const latencyByEndpoint = new Map<
        string,
        { total: number; count: number }
      >();

      for (const metric of metrics) {
        const metadata = metric.metadata;
        if (!isMetricMetadata(metadata)) continue;

        const endpoint = metadata.endpoint;
        const duration = metadata.duration;

        const existing = latencyByEndpoint.get(endpoint);
        if (existing) {
          existing.total += duration;
          existing.count++;
        } else {
          latencyByEndpoint.set(endpoint, { total: duration, count: 1 });
        }
      }

      const result = new Map<string, number>();
      for (const [endpoint, data] of latencyByEndpoint.entries()) {
        result.set(endpoint, data.total / data.count);
      }

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to get average latency: ${getErrorMessage(error)}`,
      );
      return new Map();
    }
  }
}
