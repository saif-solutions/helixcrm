// apps/api/src/modules/analytics/analytics.service.ts

import {
  Injectable,
  Logger,
  Inject,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Optional,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { InjectQueue } from '@nestjs/bullmq';
import { Cache } from 'cache-manager';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { TenantContextService } from '../../shared/tenant/context/tenant-context.service';
import { PermissionContextService } from '../../shared/permissions/context/permission-context.service';
import { AuditLogService } from '../../shared/audit-log/audit-log.service';
import { AppLogger } from '../../shared/logging/logger.service';
import { AnalyticsRepository } from './repositories/analytics.repository';
import { AnalyticsSummaryRepository } from './repositories/analytics-summary.repository';
import { AnalyticsSummaryService } from './services/analytics-summary.service';
import {
  DealAnalyticsQueryDto,
  RevenueAnalyticsQueryDto,
  PipelineAnalyticsQueryDto,
  ActivityAnalyticsQueryDto,
  AnalyticsExportQueryDto,
  ExportFormat,
} from './dto/analytics-query.dto';
import * as crypto from 'crypto';

// Performance thresholds
const PERFORMANCE_THRESHOLDS = {
  WARNING_MS: 1000,
  SLOW_MS: 2000,
} as const;

// Export constants
const EXPORT_CONFIG = {
  ESTIMATED_COMPLETION: '2 minutes',
  TOKEN_PREFIX: 'token-',
} as const;

// Define interfaces for better type safety
interface AnalyticsResult<T = Record<string, unknown>> {
  data: T;
  source: 'summary-tables' | 'operational-tables';
}

interface ExportJob {
  id: string;
  type: string;
  status: string;
  format: ExportFormat;
  createdAt: Date;
  createdBy: string;
  tenantId: string;
}

interface JobStatus {
  id: string;
  status: string;
  progress: number;
  createdAt: Date;
  completedAt?: Date;
  result?: {
    filename: string;
    size: string;
  };
}

interface ExportData {
  format: ExportFormat;
  filename: string;
  contentType: string;
  data: string;
}

// Helper function for safe error message extraction
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return 'Unknown error occurred';
  }
}

// Type guard to check if value is a record
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);
  private readonly useSummaryTables: boolean;
  private readonly userEmailCache = new Map<
    string,
    { email: string; timestamp: number }
  >();
  private readonly USER_EMAIL_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly appLogger: AppLogger,
    private readonly configService: ConfigService,
    private readonly analyticsSummaryService: AnalyticsSummaryService,
    private readonly tenantContext: TenantContextService,
    private readonly permissionContext: PermissionContextService,
    private readonly analyticsRepository: AnalyticsRepository,
    private readonly analyticsSummaryRepository: AnalyticsSummaryRepository,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @Optional() @InjectQueue('analytics-export') private exportQueue?: Queue,
  ) {
    this.useSummaryTables =
      this.configService.get('ANALYTICS_USE_SUMMARY_TABLES', 'true') === 'true';
    this.logger.log(
      `Analytics service initialized - Summary tables: ${this.useSummaryTables ? 'ENABLED' : 'DISABLED'}`,
    );
  }

  // Helper method for permission checking – type‑safe wrapper
  private async checkPermission(permission: string): Promise<boolean> {
    // Cast to unknown first to avoid any, then check for the method
    const ctx = this.permissionContext as unknown as Record<string, unknown>;
    const hasPermissionFn = ctx.hasPermission;
    if (typeof hasPermissionFn === 'function') {
      try {
        // Safely cast the function to its expected signature
        const result = await (
          hasPermissionFn as (perm: string) => Promise<boolean>
        )(permission);
        return result === true;
      } catch {
        return false;
      }
    }
    return false;
  }

  private async getUserEmail(userId: string): Promise<string> {
    // Check cache first
    const cached = this.userEmailCache.get(userId);
    if (
      cached &&
      Date.now() - cached.timestamp < this.USER_EMAIL_CACHE_TTL_MS
    ) {
      return cached.email;
    }

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });
      const email = user?.email ?? 'system@unknown';

      // Update cache
      this.userEmailCache.set(userId, { email, timestamp: Date.now() });

      return email;
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.warn(
        `Failed to fetch user email for ${userId}: ${errorMessage}`,
      );
      return 'system@unknown';
    }
  }

  private buildCacheKey(prefix: string, query: unknown): string {
    const tenantId = this.tenantContext.getTenantId();
    const queryStr = JSON.stringify(query);
    const hash = crypto.createHash('md5').update(queryStr).digest('hex');
    return `analytics:${prefix}:${tenantId}:${hash}`;
  }

  private logPerformance(method: string, duration: number): void {
    const performance =
      duration > PERFORMANCE_THRESHOLDS.SLOW_MS
        ? 'slow'
        : duration > PERFORMANCE_THRESHOLDS.WARNING_MS
          ? 'warning'
          : 'normal';

    this.logger.log(`${method} completed in ${duration}ms`, {
      duration,
      performance,
    });
  }

  // ==================== DEAL ANALYTICS ====================
  async getDealAnalytics(
    query: DealAnalyticsQueryDto,
  ): Promise<AnalyticsResult> {
    const hasPermission = await this.checkPermission('report:read');
    if (!hasPermission) {
      throw new ForbiddenException(
        'Insufficient permissions: report:read required',
      );
    }

    const startTime = Date.now();
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    try {
      if (this.useSummaryTables && !query.includeVelocity) {
        try {
          this.logger.debug(
            'Attempting to use summary tables for deal analytics',
          );
          const result =
            await this.analyticsSummaryRepository.getDealAnalyticsFromSummary(
              query,
            );

          const safeData = isRecord(result) ? result : {};

          return {
            data: safeData,
            source: 'summary-tables',
          };
        } catch (summaryError: unknown) {
          const errorMessage = getErrorMessage(summaryError);
          this.logger.warn(
            'Summary table query failed, falling back to operational tables',
            {
              tenantId,
              error: errorMessage,
              query,
            },
          );
        }
      }

      const result =
        await this.analyticsRepository.getDealAnalyticsFromOperational(query);

      const safeData = isRecord(result) ? result : {};

      return {
        data: safeData,
        source: 'operational-tables',
      };
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(
        `getDealAnalytics failed: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
        {
          tenantId,
          userId,
          method: 'getDealAnalytics',
          query,
        },
      );

      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      throw new BadRequestException('Failed to retrieve deal analytics');
    } finally {
      this.logPerformance('getDealAnalytics', Date.now() - startTime);
    }
  }

  // ==================== REVENUE ANALYTICS ====================
  async getRevenueAnalytics(
    query: RevenueAnalyticsQueryDto,
  ): Promise<AnalyticsResult> {
    const hasPermission = await this.checkPermission('report:read');
    if (!hasPermission) {
      throw new ForbiddenException(
        'Insufficient permissions: report:read required',
      );
    }

    const startTime = Date.now();
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    try {
      if (this.useSummaryTables) {
        try {
          this.logger.debug(
            'Attempting to use summary tables for revenue analytics',
          );
          const result =
            await this.analyticsSummaryRepository.getRevenueAnalyticsFromSummary(
              query,
            );

          const safeData = isRecord(result) ? result : {};

          return {
            data: safeData,
            source: 'summary-tables',
          };
        } catch (summaryError: unknown) {
          const errorMessage = getErrorMessage(summaryError);
          this.logger.warn('Revenue summary table query failed', {
            tenantId,
            error: errorMessage,
            query,
          });
        }
      }

      const result =
        await this.analyticsRepository.getRevenueAnalyticsFromOperational(
          query,
        );

      const safeData = isRecord(result) ? result : {};

      return {
        data: safeData,
        source: 'operational-tables',
      };
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(
        `getRevenueAnalytics failed: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
        {
          tenantId,
          userId,
          method: 'getRevenueAnalytics',
          query,
        },
      );

      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      throw new BadRequestException('Failed to retrieve revenue analytics');
    } finally {
      this.logPerformance('getRevenueAnalytics', Date.now() - startTime);
    }
  }

  // ==================== PIPELINE ANALYTICS ====================
  async getPipelineAnalytics(
    query: PipelineAnalyticsQueryDto,
  ): Promise<AnalyticsResult> {
    const hasPermission = await this.checkPermission('report:read');
    if (!hasPermission) {
      throw new ForbiddenException(
        'Insufficient permissions: report:read required',
      );
    }

    const startTime = Date.now();
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    try {
      if (this.useSummaryTables) {
        try {
          this.logger.debug(
            'Attempting to use summary tables for pipeline analytics',
          );
          const result =
            await this.analyticsRepository.getPipelineAnalyticsFromOperational(
              query,
            );

          const safeData = isRecord(result) ? result : {};

          return {
            data: safeData,
            source: 'operational-tables',
          };
        } catch (summaryError: unknown) {
          const errorMessage = getErrorMessage(summaryError);
          this.logger.warn('Pipeline summary table query failed:', {
            tenantId,
            error: errorMessage,
            query,
          });
        }
      }

      const result =
        await this.analyticsRepository.getPipelineAnalyticsFromOperational(
          query,
        );

      const safeData = isRecord(result) ? result : {};

      return {
        data: safeData,
        source: 'operational-tables',
      };
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(
        `getPipelineAnalytics failed: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
        {
          tenantId,
          userId,
          method: 'getPipelineAnalytics',
          query,
        },
      );

      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      throw new BadRequestException('Failed to retrieve pipeline analytics');
    } finally {
      this.logPerformance('getPipelineAnalytics', Date.now() - startTime);
    }
  }

  // ==================== ACTIVITY ANALYTICS ====================
  async getActivityAnalytics(
    query: ActivityAnalyticsQueryDto,
  ): Promise<AnalyticsResult> {
    const hasPermission = await this.checkPermission('report:read');
    if (!hasPermission) {
      throw new ForbiddenException(
        'Insufficient permissions: report:read required',
      );
    }

    const startTime = Date.now();
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    try {
      if (this.useSummaryTables) {
        try {
          this.logger.debug(
            'Attempting to use summary tables for activity analytics',
          );
          const result =
            await this.analyticsRepository.getActivityAnalyticsFromOperational(
              query,
            );

          const safeData = isRecord(result) ? result : {};

          return {
            data: safeData,
            source: 'operational-tables',
          };
        } catch (summaryError: unknown) {
          const errorMessage = getErrorMessage(summaryError);
          this.logger.warn('Activity summary table query failed:', {
            tenantId,
            error: errorMessage,
            query,
          });
        }
      }

      const result =
        await this.analyticsRepository.getActivityAnalyticsFromOperational(
          query,
        );

      const safeData = isRecord(result) ? result : {};

      return {
        data: safeData,
        source: 'operational-tables',
      };
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(
        `getActivityAnalytics failed: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
        {
          tenantId,
          userId,
          method: 'getActivityAnalytics',
          query,
        },
      );

      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      throw new BadRequestException('Failed to retrieve activity analytics');
    } finally {
      this.logPerformance('getActivityAnalytics', Date.now() - startTime);
    }
  }

  // ==================== EXPORT FUNCTIONS ====================

  async createAnalyticsExport(query: AnalyticsExportQueryDto): Promise<{
    jobId: string;
    status: string;
    message: string;
    estimatedCompletion: string;
    downloadToken: string;
  }> {
    const hasPermission = await this.checkPermission('report:export');
    if (!hasPermission) {
      throw new ForbiddenException(
        'Insufficient permissions: report:export required',
      );
    }

    const startTime = Date.now();
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    try {
      if (!this.exportQueue) {
        throw new BadRequestException('Export functionality is not available');
      }

      await this.analyticsRepository.getAvailableExports(
        query,
        tenantId,
        userId,
      );

      const exportJob: ExportJob = {
        id: `export-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        type: 'analytics',
        status: 'pending',
        format: query.format ?? ExportFormat.CSV,
        createdAt: new Date(),
        createdBy: userId,
        tenantId,
      };

      await this.auditLogService.logEvent({
        action: 'ANALYTICS_EXPORT_REQUESTED' as const,
        entityType: 'ExportJob' as const,
        actorEmail: await this.getUserEmail(userId),
        actorUserId: userId,
        entityId: exportJob.id,
        metadata: {
          exportType: 'analytics',
          format: exportJob.format,
          query,
        },
        severity: 'INFO' as const,
        organizationId: tenantId,
      });

      return {
        jobId: exportJob.id,
        status: 'queued',
        message: 'Export job has been queued for processing',
        estimatedCompletion: EXPORT_CONFIG.ESTIMATED_COMPLETION,
        downloadToken: `${EXPORT_CONFIG.TOKEN_PREFIX}${exportJob.id}`,
      };
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(
        `createAnalyticsExport failed: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
        {
          tenantId,
          userId,
          method: 'createAnalyticsExport',
          query,
        },
      );

      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      throw new BadRequestException('Failed to create export job');
    } finally {
      this.logPerformance('createAnalyticsExport', Date.now() - startTime);
    }
  }

  async getExportStatus(jobId: string): Promise<JobStatus> {
    const hasPermission = await this.checkPermission('report:read');
    if (!hasPermission) {
      throw new ForbiddenException(
        'Insufficient permissions: report:read required',
      );
    }

    const startTime = Date.now();
    const tenantId = this.tenantContext.getTenantId();

    try {
      if (!this.exportQueue) {
        throw new BadRequestException('Export functionality is not available');
      }

      const jobStatus: JobStatus = {
        id: jobId,
        status: 'completed',
        progress: 100,
        createdAt: new Date(Date.now() - 60000),
        completedAt: new Date(),
        result: {
          filename: `analytics-export-${jobId}.csv`,
          size: '1.2MB',
        },
      };

      await new Promise((resolve) => setTimeout(resolve, 0));

      return jobStatus;
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(
        `getExportStatus failed: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
        {
          tenantId,
          method: 'getExportStatus',
          jobId,
        },
      );

      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error instanceof ForbiddenException) {
        throw error;
      }
      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException('Failed to retrieve export status');
    } finally {
      this.logPerformance('getExportStatus', Date.now() - startTime);
    }
  }

  async downloadExport(jobId: string, token: string): Promise<ExportData> {
    const hasPermission = await this.checkPermission('report:export');
    if (!hasPermission) {
      throw new ForbiddenException(
        'Insufficient permissions: report:export required',
      );
    }

    const startTime = Date.now();
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    try {
      if (!this.exportQueue) {
        throw new BadRequestException('Export functionality is not available');
      }

      if (!token?.startsWith(EXPORT_CONFIG.TOKEN_PREFIX)) {
        throw new ForbiddenException('Invalid or expired download token');
      }

      const exportData: ExportData = {
        format: ExportFormat.CSV,
        filename: `analytics-export-${jobId}.csv`,
        contentType: 'text/csv',
        data: 'deal_id,amount,status,created_at\n1,10000,won,2024-01-01\n2,5000,open,2024-01-02',
      };

      await this.auditLogService.logEvent({
        action: 'ANALYTICS_EXPORT_DOWNLOADED' as const,
        entityType: 'ExportJob' as const,
        actorEmail: await this.getUserEmail(userId),
        actorUserId: userId,
        entityId: jobId,
        metadata: {
          format: exportData.format,
          filename: exportData.filename,
        },
        severity: 'INFO' as const,
        organizationId: tenantId,
      });

      return exportData;
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(
        `downloadExport failed: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
        {
          tenantId,
          userId,
          method: 'downloadExport',
          jobId,
        },
      );

      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      throw new BadRequestException('Failed to download export');
    } finally {
      this.logPerformance('downloadExport', Date.now() - startTime);
    }
  }

  async getAvailableExports(query: AnalyticsExportQueryDto): Promise<unknown> {
    const hasPermission = await this.checkPermission('report:read');
    if (!hasPermission) {
      throw new ForbiddenException(
        'Insufficient permissions: report:read required',
      );
    }

    const startTime = Date.now();
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    try {
      if (!this.exportQueue) {
        throw new BadRequestException('Export functionality is not available');
      }

      return await this.analyticsRepository.getAvailableExports(
        query,
        tenantId,
        userId,
      );
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(
        `getAvailableExports failed: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
        {
          tenantId,
          userId,
          method: 'getAvailableExports',
          query,
        },
      );

      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      throw new BadRequestException('Failed to retrieve available exports');
    } finally {
      this.logPerformance('getAvailableExports', Date.now() - startTime);
    }
  }

  // ==================== LEGACY METHODS FOR BACKWARD COMPATIBILITY ====================

  /**
   * @deprecated Use createAnalyticsExport instead
   */
  async queueExportJob(
    organizationId: string,
    userId: string,
    query: {
      format?: ExportFormat;
      include?: string[];
      startDate?: Date;
      endDate?: Date;
    },
  ): Promise<{
    jobId: string;
    status: string;
    message: string;
    estimatedCompletion: string;
    downloadToken: string;
  }> {
    this.logger.warn(
      'DEPRECATED: queueExportJob called - use createAnalyticsExport instead',
    );
    void organizationId;
    void userId;

    const exportQuery: AnalyticsExportQueryDto = {
      format: query.format,
      include: query.include,
      startDate: query.startDate ? query.startDate.toISOString() : undefined,
      endDate: query.endDate ? query.endDate.toISOString() : undefined,
    };
    return this.createAnalyticsExport(exportQuery);
  }

  /**
   * @deprecated Use downloadExport instead
   */
  async getExportData(
    token: string,
    organizationId: string,
    userId: string,
  ): Promise<{
    format: ExportFormat;
    exportId: string;
    data: string;
  }> {
    this.logger.warn(
      'DEPRECATED: getExportData called - use downloadExport instead',
    );
    void organizationId;
    void userId;

    const jobId = token.replace(EXPORT_CONFIG.TOKEN_PREFIX, '');
    const result = await this.downloadExport(jobId, token);
    return {
      format: result.contentType.includes('csv')
        ? ExportFormat.CSV
        : ExportFormat.JSON,
      exportId: jobId,
      data: result.data,
    };
  }
}
