import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // 1 second

  constructor(private configService: ConfigService) {
    // super() MUST be called first
    super({
      log:
        configService.get('NODE_ENV') === 'development'
          ? ['query', 'error', 'info', 'warn']
          : ['error'],
    });

    // Now we can use this.configService
    this.initializeLogging();
  }

  /**
   * Initialize query logging in development mode
   */
  private initializeLogging(): void {
    if (this.configService.get('NODE_ENV') === 'development') {
      this.$on('query' as never, (e: any) => {
        this.logger.debug(`Query: ${e.query}`);
        this.logger.debug(`Duration: ${e.duration}ms`);
      });
    }
  }

  async onModuleInit() {
    await this.connectWithRetry();
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Prisma connection closed');
  }

  /**
   * Connect to database with retry logic
   */
  private async connectWithRetry(retryCount = 0): Promise<void> {
    try {
      await this.$connect();
      this.logger.log('Successfully connected to database');

      // Set statement timeout for long-running queries
      await this.$executeRaw`SET statement_timeout = 30000`; // 30 seconds

      // Set application name for debugging
      await this.$executeRaw`SET application_name = 'helix-crm-api'`;

      // Run health check
      const health = await this.healthCheck();
      this.logger.log(
        `Database health: ${health.status} (${health.responseTime}ms)`,
      );
    } catch (error) {
      if (retryCount < this.maxRetries) {
        this.logger.warn(
          `Failed to connect to database (attempt ${retryCount + 1}/${this.maxRetries + 1}). Retrying in ${this.retryDelay}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, this.retryDelay));
        return this.connectWithRetry(retryCount + 1);
      }

      this.logger.error(
        `Failed to connect to database after ${this.maxRetries + 1} attempts:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Health check for database connection
   */
  async healthCheck(): Promise<{
    status: string;
    timestamp: Date;
    responseTime?: number;
  }> {
    const start = Date.now();
    try {
      await this.$queryRaw`SELECT 1`;
      const responseTime = Date.now() - start;

      return {
        status: 'healthy',
        timestamp: new Date(),
        responseTime,
      };
    } catch (error) {
      this.logger.error('Database health check failed:', error);
      return {
        status: 'unhealthy',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Execute raw SQL with better error handling
   */
  async executeRawSafe<T = any>(sql: string, params: any[] = []): Promise<T> {
    try {
      // Use $executeRaw for DDL/DML queries that don't return data
      // Use $queryRaw for SELECT queries that return data
      if (sql.trim().toUpperCase().startsWith('SELECT')) {
        return (await this.$queryRawUnsafe(sql, ...params)) as T;
      } else {
        return (await this.$executeRawUnsafe(sql, ...params)) as T;
      }
    } catch (error) {
      this.logger.error(`Raw SQL execution failed: ${sql}`, error);
      throw error;
    }
  }

  /**
   * Execute raw SQL that returns data (SELECT queries)
   */
  async queryRaw<T = any>(sql: string, params: any[] = []): Promise<T> {
    try {
      return (await this.$queryRawUnsafe(sql, ...params)) as T;
    } catch (error) {
      this.logger.error(`Raw query failed: ${sql}`, error);
      throw error;
    }
  }

  /**
   * Execute raw SQL that doesn't return data (INSERT, UPDATE, DELETE, DDL)
   */
  async executeRaw(sql: string, params: any[] = []): Promise<number> {
    try {
      const result = (await this.$executeRawUnsafe(sql, ...params)) as any;
      // Return the number of affected rows if available
      return result?.count || 0;
    } catch (error) {
      this.logger.error(`Raw execute failed: ${sql}`, error);
      throw error;
    }
  }

  /**
   * Get database statistics
   */
  async getDatabaseStats(): Promise<{
    connectionCount: number;
    activeConnections: number;
    maxConnections: number;
  }> {
    try {
      const result = await this.$queryRaw<
        Array<{
          connection_count: string;
          active_connections: string;
          max_connections: string;
        }>
      >`
        SELECT 
          (SELECT count(*) FROM pg_stat_activity) as connection_count,
          (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') as active_connections,
          (SELECT setting FROM pg_settings WHERE name = 'max_connections') as max_connections
      `;

      return {
        connectionCount: parseInt(result[0]?.connection_count || '0'),
        activeConnections: parseInt(result[0]?.active_connections || '0'),
        maxConnections: parseInt(result[0]?.max_connections || '100'),
      };
    } catch (error) {
      this.logger.error('Failed to get database stats:', error);
      return {
        connectionCount: 0,
        activeConnections: 0,
        maxConnections: 100,
      };
    }
  }
}
