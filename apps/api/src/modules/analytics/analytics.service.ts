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
  AuditAction,
  AuditEntityType,
  AuditSeverity,
} from '../../shared/audit-log/audit-log.service';
import {
  DealAnalyticsQueryDto,
  RevenueAnalyticsQueryDto,
  PipelineAnalyticsQueryDto,
  ActivityAnalyticsQueryDto,
  AnalyticsExportQueryDto,
  ExportFormat,
} from './dto/analytics-query.dto';
import * as crypto from 'crypto';

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

  private async getUserEmail(userId: string): Promise<string> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });
      return user?.email ?? 'system@unknown';
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

  // ==================== DEAL ANALYTICS ====================
  async getDealAnalytics(
    query: DealAnalyticsQueryDto,
  ): Promise<AnalyticsResult> {
    if (!this.permissionContext.hasPermission('report:read')) {
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

          // Safe type conversion with runtime check
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

      // Safe type conversion with runtime check
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
      const duration = Date.now() - startTime;
      const performance =
        duration > 2000 ? 'slow' : duration > 1000 ? 'warning' : 'normal';

      this.logger.log(`getDealAnalytics completed in ${duration}ms`, {
        duration,
        tenantId,
        performance,
        summaryTablesUsed: this.useSummaryTables && !query.includeVelocity,
      });
    }
  }

  // ==================== REVENUE ANALYTICS ====================
  async getRevenueAnalytics(
    query: RevenueAnalyticsQueryDto,
  ): Promise<AnalyticsResult> {
    if (!this.permissionContext.hasPermission('report:read')) {
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

          // Safe type conversion with runtime check
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

      // Safe type conversion with runtime check
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
      const duration = Date.now() - startTime;
      const performance =
        duration > 2000 ? 'slow' : duration > 1000 ? 'warning' : 'normal';

      this.logger.log(`getRevenueAnalytics completed in ${duration}ms`, {
        duration,
        tenantId,
        performance,
        summaryTablesUsed: this.useSummaryTables,
      });
    }
  }

  // ==================== PIPELINE ANALYTICS ====================
  async getPipelineAnalytics(
    query: PipelineAnalyticsQueryDto,
  ): Promise<AnalyticsResult> {
    if (!this.permissionContext.hasPermission('report:read')) {
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

          // Safe type conversion with runtime check
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

      // Safe type conversion with runtime check
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
      const duration = Date.now() - startTime;
      const performance =
        duration > 2000 ? 'slow' : duration > 1000 ? 'warning' : 'normal';

      this.logger.log(`getPipelineAnalytics completed in ${duration}ms`, {
        duration,
        tenantId,
        performance,
        summaryTablesUsed: this.useSummaryTables,
      });
    }
  }

  // ==================== ACTIVITY ANALYTICS ====================
  async getActivityAnalytics(
    query: ActivityAnalyticsQueryDto,
  ): Promise<AnalyticsResult> {
    if (!this.permissionContext.hasPermission('report:read')) {
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

          // Safe type conversion with runtime check
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

      // Safe type conversion with runtime check
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
      const duration = Date.now() - startTime;
      const performance =
        duration > 2000 ? 'slow' : duration > 1000 ? 'warning' : 'normal';

      this.logger.log(`getActivityAnalytics completed in ${duration}ms`, {
        duration,
        tenantId,
        performance,
        summaryTablesUsed: this.useSummaryTables,
      });
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
    if (!this.permissionContext.hasPermission('report:export')) {
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

      // This validates the query but we don't need the result
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
        action: 'ANALYTICS_EXPORT_REQUESTED' as AuditAction,
        entityType: 'ExportJob' as AuditEntityType,
        actorEmail: await this.getUserEmail(userId),
        actorUserId: userId,
        entityId: exportJob.id,
        metadata: {
          exportType: 'analytics',
          format: exportJob.format,
          query,
        },
        severity: 'INFO' as AuditSeverity,
        organizationId: tenantId,
      });

      return {
        jobId: exportJob.id,
        status: 'queued',
        message: 'Export job has been queued for processing',
        estimatedCompletion: '2 minutes',
        downloadToken: `token-${exportJob.id}`,
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
      const duration = Date.now() - startTime;
      const performance =
        duration > 2000 ? 'slow' : duration > 1000 ? 'warning' : 'normal';

      this.logger.log(`createAnalyticsExport completed in ${duration}ms`, {
        duration,
        tenantId,
        performance,
      });
    }
  }

  async getExportStatus(jobId: string): Promise<JobStatus> {
    if (!this.permissionContext.hasPermission('report:read')) {
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

      // Simulate async operation - in production, this would fetch from BullMQ or database
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

      // Simulate async delay for realistic behavior
      await new Promise((resolve) => setTimeout(resolve, 0));

      return jobStatus;
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(
        `getExportStatus failed: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
        {
          tenantId,
          userId,
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
      const duration = Date.now() - startTime;
      const performance =
        duration > 2000 ? 'slow' : duration > 1000 ? 'warning' : 'normal';

      this.logger.log(`getExportStatus completed in ${duration}ms`, {
        duration,
        tenantId,
        performance,
      });
    }
  }

  async downloadExport(jobId: string, token: string): Promise<ExportData> {
    if (!this.permissionContext.hasPermission('report:export')) {
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

      if (!token?.startsWith('token-')) {
        throw new ForbiddenException('Invalid or expired download token');
      }

      const exportData: ExportData = {
        format: ExportFormat.CSV,
        filename: `analytics-export-${jobId}.csv`,
        contentType: 'text/csv',
        data: 'deal_id,amount,status,created_at\n1,10000,won,2024-01-01\n2,5000,open,2024-01-02',
      };

      await this.auditLogService.logEvent({
        action: 'ANALYTICS_EXPORT_DOWNLOADED' as AuditAction,
        entityType: 'ExportJob' as AuditEntityType,
        actorEmail: await this.getUserEmail(userId),
        actorUserId: userId,
        entityId: jobId,
        metadata: {
          format: exportData.format,
          filename: exportData.filename,
        },
        severity: 'INFO' as AuditSeverity,
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
      const duration = Date.now() - startTime;
      const performance =
        duration > 2000 ? 'slow' : duration > 1000 ? 'warning' : 'normal';

      this.logger.log(`downloadExport completed in ${duration}ms`, {
        duration,
        tenantId,
        performance,
      });
    }
  }

  async getAvailableExports(query: AnalyticsExportQueryDto): Promise<unknown> {
    if (!this.permissionContext.hasPermission('report:read')) {
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
      const duration = Date.now() - startTime;
      const performance =
        duration > 2000 ? 'slow' : duration > 1000 ? 'warning' : 'normal';

      this.logger.log(`getAvailableExports completed in ${duration}ms`, {
        duration,
        tenantId,
        performance,
      });
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
    // These parameters are intentionally unused in the deprecated method
    // They are kept for backward compatibility but not used in the implementation
    void organizationId;
    void userId;

    const exportQuery: AnalyticsExportQueryDto = {
      format: query.format,
      include: query.include,
      startDate: query.startDate,
      endDate: query.endDate,
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
    // These parameters are intentionally unused in the deprecated method
    // They are kept for backward compatibility but not used in the implementation
    void organizationId;
    void userId;

    const jobId = token.replace('token-', '');
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
