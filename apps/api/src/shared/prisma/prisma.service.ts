// apps/api/src/shared/prisma/prisma.service.ts

import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

// ==================== INTERFACES ====================

/**
 * Database health check result
 */
interface HealthCheckResult {
  status: 'healthy' | 'unhealthy';
  timestamp: Date;
  responseTime?: number;
  error?: string;
}

/**
 * Database statistics
 */
interface DatabaseStats {
  connectionCount: number;
  activeConnections: number;
  maxConnections: number;
  idleConnections?: number;
  waitingConnections?: number;
}

/**
 * Query log event from Prisma
 */
interface QueryEvent {
  query: string;
  params: string;
  duration: number;
  target: string;
  timestamp: Date;
}

/**
 * Raw SQL execution result
 */
interface RawSqlResult {
  affectedRows?: number;
  data?: unknown;
  [key: string]: unknown;
}

// ==================== TYPE GUARDS ====================

/**
 * Type guard for QueryEvent
 */
function isQueryEvent(event: unknown): event is QueryEvent {
  return (
    typeof event === 'object' &&
    event !== null &&
    'query' in event &&
    'duration' in event
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
 * Sanitize query for logging (remove sensitive data)
 */
function sanitizeQuery(query: string): string {
  // Remove potential sensitive data from logs
  return query
    .replace(
      /\b(password|token|secret|key)\s*=\s*'[^']*'/gi,
      "$1 = '***REDACTED***'",
    )
    .replace(
      /\b(password|token|secret|key)\s*=\s*"[^"]*"/gi,
      '$1 = "***REDACTED***"',
    );
}

// ==================== PRISMA SERVICE ====================

@Injectable()
export class PrismaService
  extends PrismaClient<
    Prisma.PrismaClientOptions,
    'query' | 'error' | 'info' | 'warn'
  >
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // 1 second
  private readonly statementTimeout = 30000; // 30 seconds
  private readonly isDevelopment: boolean;

  constructor(private configService: ConfigService) {
    const nodeEnv = configService.get<string>('NODE_ENV', 'development');
    const isDevelopment = nodeEnv === 'development';

    // Configure Prisma client
    super({
      log: isDevelopment
        ? [
            { emit: 'event', level: 'query' },
            { emit: 'stdout', level: 'error' },
            { emit: 'stdout', level: 'info' },
            { emit: 'stdout', level: 'warn' },
          ]
        : [{ emit: 'stdout', level: 'error' }],
      errorFormat: isDevelopment ? 'colorless' : 'minimal',
    });

    this.isDevelopment = isDevelopment;

    // Set up event listeners
    if (isDevelopment) {
      this.setupQueryLogging();
    }

    this.setupErrorLogging();
  }

  /**
   * Set up query logging for development
   */
  private setupQueryLogging(): void {
    this.$on('query' as never, (event: unknown) => {
      if (isQueryEvent(event)) {
        const sanitizedQuery = sanitizeQuery(event.query);
        this.logger.debug(`Query: ${sanitizedQuery.substring(0, 500)}`);
        this.logger.debug(`Duration: ${event.duration}ms`);
        if (event.params && event.params !== '[]') {
          this.logger.debug(`Params: ${event.params.substring(0, 200)}`);
        }
      }
    });
  }

  /**
   * Set up error logging for Prisma events
   */
  private setupErrorLogging(): void {
    this.$on('error' as never, (event: unknown) => {
      const error = event as { message: string; target?: string };
      this.logger.error(`Prisma error: ${error.message}`, error.target);
    });
  }

  /**
   * Initialize module - connect to database with retry
   */
  async onModuleInit(): Promise<void> {
    await this.connectWithRetry();
  }

  /**
   * Clean up on module destroy
   */
  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('Prisma connection closed gracefully');
  }

  /**
   * Connect to database with retry logic
   */
  private async connectWithRetry(retryCount = 0): Promise<void> {
    try {
      await this.$connect();
      this.logger.log('Successfully connected to database');

      // Set statement timeout for long-running queries
      await this.$executeRaw`SET statement_timeout = ${this.statementTimeout}`;
      this.logger.debug(`Statement timeout set to ${this.statementTimeout}ms`);

      // Set application name for debugging
      await this.$executeRaw`SET application_name = 'helix-crm-api'`;
      this.logger.debug('Application name set to helix-crm-api');

      // Run health check
      const health = await this.healthCheck();
      this.logger.log(
        `Database health: ${health.status} (${health.responseTime ?? 'N/A'}ms)`,
      );

      // Log connection pool stats in development
      if (this.isDevelopment) {
        const stats = await this.getDatabaseStats();
        this.logger.debug(
          `Connection pool: ${stats.activeConnections}/${stats.connectionCount} active connections`,
        );
      }
    } catch (error) {
      const errorMessage = getErrorMessage(error);

      if (retryCount < this.maxRetries) {
        this.logger.warn(
          `Failed to connect to database (attempt ${retryCount + 1}/${this.maxRetries}). ` +
            `Error: ${errorMessage}. Retrying in ${this.retryDelay}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, this.retryDelay));
        return this.connectWithRetry(retryCount + 1);
      }

      this.logger.error(
        `Failed to connect to database after ${this.maxRetries} attempts: ${errorMessage}`,
      );
      throw error;
    }
  }

  /**
   * Health check for database connection
   */
  async healthCheck(): Promise<HealthCheckResult> {
    const start = Date.now();
    try {
      await this.$queryRaw`SELECT 1 AS health_check`;
      const responseTime = Date.now() - start;

      return {
        status: 'healthy',
        timestamp: new Date(),
        responseTime,
      };
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(`Database health check failed: ${errorMessage}`);

      return {
        status: 'unhealthy',
        timestamp: new Date(),
        error: errorMessage,
      };
    }
  }

  /**
   * Execute raw SQL that returns data (SELECT queries)
   */
  async queryRaw<T = Record<string, unknown>>(
    sql: string,
    params: unknown[] = [],
  ): Promise<T[]> {
    try {
      if (params.length === 0) {
        return await this.$queryRawUnsafe<T[]>(sql);
      }
      return await this.$queryRawUnsafe<T[]>(sql, ...params);
    } catch (error) {
      this.logger.error(
        `Raw query failed: ${sql.substring(0, 200)}`,
        getErrorMessage(error),
      );
      throw error;
    }
  }

  /**
   * Execute raw SQL that doesn't return data (INSERT, UPDATE, DELETE, DDL)
   */
  async executeRaw(sql: string, params: unknown[] = []): Promise<number> {
    try {
      let result: unknown;
      if (params.length === 0) {
        result = await this.$executeRawUnsafe(sql);
      } else {
        result = await this.$executeRawUnsafe(sql, ...params);
      }

      // Extract affected rows count from result
      const rawResult = result as RawSqlResult;
      if (rawResult && typeof rawResult === 'object' && 'count' in rawResult) {
        return typeof rawResult.count === 'number' ? rawResult.count : 0;
      }

      return 0;
    } catch (error) {
      this.logger.error(
        `Raw execute failed: ${sql.substring(0, 200)}`,
        getErrorMessage(error),
      );
      throw error;
    }
  }

  /**
   * Execute raw SQL with type-safe parameters (using template literals)
   */
  async queryRawSafe<T = Record<string, unknown>>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<T[]> {
    try {
      return await this.$queryRaw<T[]>(strings, ...values);
    } catch (error) {
      const query = strings.join('?').substring(0, 200);
      this.logger.error(`Safe query failed: ${query}`, getErrorMessage(error));
      throw error;
    }
  }

  /**
   * Execute raw SQL with type-safe parameters (using template literals)
   */
  async executeRawSafe(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<number> {
    try {
      const result = await this.$executeRaw(strings, ...values);
      return typeof result === 'number' ? result : 0;
    } catch (error) {
      const query = strings.join('?').substring(0, 200);
      this.logger.error(
        `Safe execute failed: ${query}`,
        getErrorMessage(error),
      );
      throw error;
    }
  }

  /**
   * Get database statistics
   */
  async getDatabaseStats(): Promise<DatabaseStats> {
    try {
      const result = await this.$queryRaw<Array<Record<string, unknown>>>`
        SELECT 
          (SELECT count(*) FROM pg_stat_activity) as connection_count,
          (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') as active_connections,
          (SELECT count(*) FROM pg_stat_activity WHERE state = 'idle') as idle_connections,
          (SELECT count(*) FROM pg_stat_activity WHERE wait_event IS NOT NULL) as waiting_connections,
          (SELECT setting FROM pg_settings WHERE name = 'max_connections') as max_connections
      `;

      const stats = result[0] || {};

      return {
        connectionCount: this.parseNumber(stats.connection_count),
        activeConnections: this.parseNumber(stats.active_connections),
        maxConnections: this.parseNumber(stats.max_connections, 100),
        idleConnections: this.parseNumber(stats.idle_connections),
        waitingConnections: this.parseNumber(stats.waiting_connections),
      };
    } catch (error) {
      this.logger.error(
        `Failed to get database stats: ${getErrorMessage(error)}`,
      );
      return {
        connectionCount: 0,
        activeConnections: 0,
        maxConnections: 100,
      };
    }
  }

  /**
   * Parse number from unknown value
   */
  private parseNumber(value: unknown, defaultValue: number = 0): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseInt(value, 10);
      return isNaN(parsed) ? defaultValue : parsed;
    }
    return defaultValue;
  }

  /**
   * Check if database is reachable
   */
  async isReachable(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get database version
   */
  async getDatabaseVersion(): Promise<string | null> {
    try {
      const result = await this.$queryRaw<Array<{ version: string }>>`
        SELECT version()
      `;
      return result[0]?.version || null;
    } catch (error) {
      this.logger.error(
        `Failed to get database version: ${getErrorMessage(error)}`,
      );
      return null;
    }
  }

  /**
   * Reset database connection (useful for testing)
   */
  async resetConnection(): Promise<void> {
    try {
      await this.$disconnect();
      await this.$connect();
      this.logger.log('Database connection reset successfully');
    } catch (error) {
      this.logger.error(
        `Failed to reset database connection: ${getErrorMessage(error)}`,
      );
      throw error;
    }
  }
}
