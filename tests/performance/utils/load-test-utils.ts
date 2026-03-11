// tests/performance/utils/load-test-utils.ts
import { Logger } from '@nestjs/common';

export interface TestConfiguration {
  scenario: string;
  concurrentUsers: number;
  duration: string; // e.g., "15m", "1h"
  warmUpTime: number; // seconds
  coolDownTime: number; // seconds
  thinkTime: {
    min: number;
    max: number;
  };
  dataVariation: 'small' | 'medium' | 'large';
}

export interface TestResult {
  configuration: TestConfiguration;
  startTime: Date;
  endTime: Date;
  metrics: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    p50Latency: number;
    p95Latency: number;
    p99Latency: number;
    errorRate: number;
    throughput: number;
    concurrentUsers: number;
  };
  violations: string[];
  compliant: boolean;
  baselineComparison?: {
    deviation: number;
    withinThreshold: boolean;
    threshold: number;
  };
}

export class LoadTestUtils {
  private readonly logger = new Logger(LoadTestUtils.name);

  /**
   * Parse duration string to milliseconds
   */
  parseDuration(duration: string): number {
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new Error(`Invalid duration format: ${duration}. Use format like "15m", "1h", "30s"`);
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value * 1000;
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      default:
        throw new Error(`Unknown duration unit: ${unit}`);
    }
  }

  /**
   * Calculate percentiles from array of values
   */
  calculatePercentiles(values: number[], percentiles: number[]): Record<number, number> {
    if (values.length === 0) {
      return percentiles.reduce((acc, p) => ({ ...acc, [p]: 0 }), {});
    }

    const sorted = [...values].sort((a, b) => a - b);
    const result: Record<number, number> = {};

    for (const percentile of percentiles) {
      const index = Math.floor((sorted.length - 1) * (percentile / 100));
      result[percentile] = sorted[index];
    }

    return result;
  }

  /**
   * Generate realistic think time with variability
   */
  generateThinkTime(config: TestConfiguration): number {
    const { min, max } = config.thinkTime;
    // Add some randomness with normal distribution around the mean
    const mean = (min + max) / 2;
    const stdDev = (max - min) / 4;

    // Generate normal distribution using Box-Muller transform
    let u1 = 0,
      u2 = 0;
    while (u1 === 0) u1 = Math.random();
    while (u2 === 0) u2 = Math.random();

    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    const value = mean + stdDev * z0;

    // Clamp to min/max
    return Math.max(min, Math.min(max, value));
  }

  /**
   * Validate test configuration
   */
  validateConfiguration(config: TestConfiguration): string[] {
    const errors: string[] = [];

    if (config.concurrentUsers <= 0) {
      errors.push('concurrentUsers must be greater than 0');
    }

    if (config.concurrentUsers > 10000) {
      errors.push('concurrentUsers cannot exceed 10000 (sanity check)');
    }

    try {
      const durationMs = this.parseDuration(config.duration);
      if (durationMs < 1000) {
        errors.push('duration must be at least 1 second');
      }
      if (durationMs > 24 * 60 * 60 * 1000) {
        errors.push('duration cannot exceed 24 hours');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push(`Invalid duration: ${errorMessage}`);
    }

    if (config.thinkTime.min < 0) {
      errors.push('thinkTime.min cannot be negative');
    }

    if (config.thinkTime.max <= config.thinkTime.min) {
      errors.push('thinkTime.max must be greater than thinkTime.min');
    }

    if (config.warmUpTime < 0) {
      errors.push('warmUpTime cannot be negative');
    }

    if (config.coolDownTime < 0) {
      errors.push('coolDownTime cannot be negative');
    }

    if (!['small', 'medium', 'large'].includes(config.dataVariation)) {
      errors.push('dataVariation must be one of: small, medium, large');
    }

    return errors;
  }

  /**
   * Generate test data based on variation
   */
  getTestDataVariation(variation: 'small' | 'medium' | 'large'): {
    contacts: number;
    deals: number;
    leads: number;
    activities: number;
  } {
    switch (variation) {
      case 'small':
        return {
          contacts: 1000,
          deals: 100,
          leads: 500,
          activities: 2000,
        };
      case 'medium':
        return {
          contacts: 10000,
          deals: 1000,
          leads: 5000,
          activities: 20000,
        };
      case 'large':
        return {
          contacts: 100000,
          deals: 10000,
          leads: 50000,
          activities: 200000,
        };
    }
  }

  /**
   * Compare results with baseline
   */
  compareWithBaseline(
    currentResult: TestResult,
    baseline?: TestResult,
  ): TestResult['baselineComparison'] {
    if (!baseline) {
      return undefined;
    }

    const currentP95 = currentResult.metrics.p95Latency;
    const baselineP95 = baseline.metrics.p95Latency;

    if (baselineP95 === 0) {
      return {
        deviation: 0,
        withinThreshold: true,
        threshold: 20, // 20% default threshold
      };
    }

    const deviation = ((currentP95 - baselineP95) / baselineP95) * 100;
    const threshold = 20; // 20% deviation allowed

    return {
      deviation,
      withinThreshold: Math.abs(deviation) <= threshold,
      threshold,
    };
  }

  /**
   * Format duration for display
   */
  formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Generate a test report
   */
  generateReport(result: TestResult): string {
    const duration = this.formatDuration(result.endTime.getTime() - result.startTime.getTime());

    const report = `
=== PERFORMANCE TEST REPORT ===
Scenario: ${result.configuration.scenario}
Duration: ${duration}
Data Variation: ${result.configuration.dataVariation}
Concurrent Users: ${result.configuration.concurrentUsers}

=== METRICS ===
Total Requests: ${result.metrics.totalRequests}
Successful: ${result.metrics.successfulRequests} (${((result.metrics.successfulRequests / result.metrics.totalRequests) * 100).toFixed(1)}%)
Failed: ${result.metrics.failedRequests} (${result.metrics.errorRate.toFixed(2)}%)
Throughput: ${result.metrics.throughput.toFixed(2)} req/sec

=== LATENCY ===
p50: ${result.metrics.p50Latency.toFixed(2)}ms
p95: ${result.metrics.p95Latency.toFixed(2)}ms
p99: ${result.metrics.p99Latency.toFixed(2)}ms

=== SLO COMPLIANCE ===
Status: ${result.compliant ? '✅ COMPLIANT' : '❌ NON-COMPLIANT'}
${result.violations.length > 0 ? 'Violations:' : 'No violations'}
${result.violations.map((v) => `  - ${v}`).join('\n')}

${
  result.baselineComparison
    ? `
=== BASELINE COMPARISON ===
Deviation from baseline: ${result.baselineComparison.deviation.toFixed(2)}%
Threshold: ±${result.baselineComparison.threshold}%
Status: ${result.baselineComparison.withinThreshold ? '✅ WITHIN THRESHOLD' : '❌ EXCEEDS THRESHOLD'}
`
    : ''
}

Test completed at: ${result.endTime.toISOString()}
=== END REPORT ===
`;

    return report;
  }
}
