import { SetMetadata, CustomDecorator } from '@nestjs/common';

/**
 * Performance monitoring options
 */
export interface PerformanceMonitorOptions {
  /**
   * Operation name for tracking
   * @example 'create-deal'
   */
  operation: string;

  /**
   * Whether to track database queries
   * @default true
   */
  trackQueries?: boolean;

  /**
   * Whether to track external API calls
   * @default false
   */
  trackExternalCalls?: boolean;

  /**
   * Warning threshold in milliseconds
   * Logs warning if execution exceeds this time
   * @default 1000
   */
  warnThresholdMs?: number;

  /**
   * Critical threshold in milliseconds
   * Logs error if execution exceeds this time
   * @default 5000
   */
  criticalThresholdMs?: number;

  /**
   * Whether to track memory usage
   * @default false
   */
  trackMemory?: boolean;

  /**
   * Whether to track CPU usage
   * @default false
   */
  trackCpu?: boolean;

  /**
   * Custom tags for better categorization
   * @example ['module:deals', 'critical:true']
   */
  tags?: string[];

  /**
   * Whether to skip monitoring for this operation
   * @default false
   */
  skip?: boolean;
}

/**
 * Metadata key for performance monitoring
 */
export const PERFORMANCE_MONITOR_KEY = 'performance-monitor';

/**
 * Decorator to monitor performance of a route or method
 * Tracks execution time, database queries, and optionally memory/CPU usage
 *
 * @param operation - Operation name or performance monitor options
 * @returns Custom decorator with performance monitoring metadata
 *
 * @example
 * ```typescript
 * // Basic usage with operation name
 * @PerformanceMonitor('create-deal')
 * @Post()
 * createDeal() { ... }
 *
 * // Advanced usage with options
 * @PerformanceMonitor({
 *   operation: 'bulk-import-deals',
 *   warnThresholdMs: 2000,
 *   criticalThresholdMs: 10000,
 *   trackQueries: true,
 *   trackExternalCalls: true,
 *   trackMemory: true,
 *   tags: ['bulk-operation', 'import']
 * })
 * @Post('bulk-import')
 * bulkImportDeals() { ... }
 *
 * // Skip monitoring for specific endpoints
 * @PerformanceMonitor({ operation: 'health-check', skip: true })
 * @Get('health')
 * healthCheck() { ... }
 * ```
 */
export const PerformanceMonitor = (
  operation: string | PerformanceMonitorOptions,
): CustomDecorator<string> => {
  // Normalize options
  let options: PerformanceMonitorOptions;

  if (typeof operation === 'string') {
    // Simple string usage
    options = {
      operation,
      trackQueries: true,
      trackExternalCalls: false,
      warnThresholdMs: 1000,
      criticalThresholdMs: 5000,
      trackMemory: false,
      trackCpu: false,
      tags: [],
      skip: false,
    };
  } else {
    // Object usage with validation
    options = operation;

    // Validate in development
    if (process.env.NODE_ENV !== 'production') {
      if (!options.operation) {
        throw new Error('PerformanceMonitor: operation name is required');
      }

      if (options.operation.length > 100) {
        throw new Error(
          `PerformanceMonitor: operation name too long (max 100 chars), got ${options.operation.length}`,
        );
      }

      if (
        options.warnThresholdMs !== undefined &&
        options.warnThresholdMs <= 0
      ) {
        throw new Error(
          `PerformanceMonitor: warnThresholdMs must be positive, got ${options.warnThresholdMs}`,
        );
      }

      if (
        options.criticalThresholdMs !== undefined &&
        options.criticalThresholdMs <= 0
      ) {
        throw new Error(
          `PerformanceMonitor: criticalThresholdMs must be positive, got ${options.criticalThresholdMs}`,
        );
      }

      if (
        options.warnThresholdMs &&
        options.criticalThresholdMs &&
        options.warnThresholdMs >= options.criticalThresholdMs
      ) {
        throw new Error(
          `PerformanceMonitor: warnThresholdMs (${options.warnThresholdMs}) must be less than criticalThresholdMs (${options.criticalThresholdMs})`,
        );
      }

      if (options.tags && !Array.isArray(options.tags)) {
        throw new Error(
          `PerformanceMonitor: tags must be an array, got ${typeof options.tags}`,
        );
      }

      // Validate tag format (key:value or just key)
      if (options.tags) {
        for (const tag of options.tags) {
          if (typeof tag !== 'string') {
            throw new Error(
              `PerformanceMonitor: tag must be a string, got ${typeof tag}`,
            );
          }
          if (tag.includes(' ') && !tag.includes(':')) {
            throw new Error(
              `PerformanceMonitor: invalid tag format "${tag}". Use "key:value" or "key" format`,
            );
          }
        }
      }
    }

    // Set defaults for missing fields
    options = {
      trackQueries: true,
      trackExternalCalls: false,
      warnThresholdMs: 1000,
      criticalThresholdMs: 5000,
      trackMemory: false,
      trackCpu: false,
      tags: [],
      skip: false,
      ...options,
    };
  }

  return SetMetadata(PERFORMANCE_MONITOR_KEY, options);
};

/**
 * Helper decorator for critical operations
 * Lower thresholds and stricter monitoring
 *
 * @param operation - Operation name
 * @returns Custom decorator with performance monitoring metadata
 *
 * @example
 * ```typescript
 * @CriticalPerformanceMonitor('payment-processing')
 * @Post('process-payment')
 * processPayment() { ... }
 * ```
 */
export const CriticalPerformanceMonitor = (
  operation: string,
): CustomDecorator<string> => {
  return PerformanceMonitor({
    operation,
    warnThresholdMs: 500,
    criticalThresholdMs: 2000,
    trackQueries: true,
    trackExternalCalls: true,
    trackMemory: true,
    trackCpu: true,
    tags: ['critical', 'high-priority'],
  });
};

/**
 * Helper decorator for background jobs and batch operations
 * Higher thresholds for long-running operations
 *
 * @param operation - Operation name
 * @returns Custom decorator with performance monitoring metadata
 *
 * @example
 * ```typescript
 * @BatchPerformanceMonitor('daily-report-generation')
 * @Post('generate-reports')
 * generateDailyReports() { ... }
 * ```
 */
export const BatchPerformanceMonitor = (
  operation: string,
): CustomDecorator<string> => {
  return PerformanceMonitor({
    operation,
    warnThresholdMs: 10000,
    criticalThresholdMs: 60000,
    trackQueries: true,
    trackExternalCalls: true,
    trackMemory: true,
    trackCpu: true,
    tags: ['batch', 'background'],
  });
};

/**
 * Helper decorator for read-only operations
 * Minimal monitoring for high-traffic read endpoints
 *
 * @param operation - Operation name
 * @returns Custom decorator with performance monitoring metadata
 *
 * @example
 * ```typescript
 * @ReadOnlyPerformanceMonitor('get-deals')
 * @Get()
 * getDeals() { ... }
 * ```
 */
export const ReadOnlyPerformanceMonitor = (
  operation: string,
): CustomDecorator<string> => {
  return PerformanceMonitor({
    operation,
    warnThresholdMs: 500,
    criticalThresholdMs: 2000,
    trackQueries: true,
    trackExternalCalls: false,
    trackMemory: false,
    trackCpu: false,
    tags: ['read-only', 'high-traffic'],
  });
};

/**
 * Helper decorator for API endpoints that make external calls
 * Monitors external service latency
 *
 * @param operation - Operation name
 * @returns Custom decorator with performance monitoring metadata
 *
 * @example
 * ```typescript
 * @ExternalAPIPerformanceMonitor('send-webhook')
 * @Post('webhook')
 * sendWebhook() { ... }
 * ```
 */
export const ExternalAPIPerformanceMonitor = (
  operation: string,
): CustomDecorator<string> => {
  return PerformanceMonitor({
    operation,
    warnThresholdMs: 3000,
    criticalThresholdMs: 10000,
    trackQueries: true,
    trackExternalCalls: true,
    trackMemory: false,
    trackCpu: false,
    tags: ['external-api', 'network'],
  });
};

/**
 * Type guard to check if options are in object format
 */
export const isPerformanceMonitorOptions = (
  options: string | PerformanceMonitorOptions,
): options is PerformanceMonitorOptions => {
  return typeof options === 'object' && 'operation' in options;
};
