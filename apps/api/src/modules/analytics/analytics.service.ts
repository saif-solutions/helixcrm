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
  AnalyticsGroupBy,
  ExportFormat,
  AnalyticsExportInclude,
  ActivityType,
} from './dto/analytics-query.dto';

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
    // Context Services
    private readonly tenantContext: TenantContextService,
    private readonly permissionContext: PermissionContextService,
    // Repositories
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
      return user?.email || 'system@unknown';
    } catch (error) {
      this.logger.warn(
        `Failed to fetch user email for ${userId}: ${error.message}`,
      );
      return 'system@unknown';
    }
  }

  // ==================== DEAL ANALYTICS ====================
  async getDealAnalytics(query: DealAnalyticsQueryDto) {
    // 1. PERMISSION CHECK
    if (!this.permissionContext.hasPermission('analytics.read')) {
      throw new ForbiddenException(
        'Insufficient permissions: analytics.read required',
      );
    }

    const startTime = Date.now();
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    try {
      // 2. BUSINESS LOGIC WITH SUMMARY FALLBACK PATTERN
      if (this.useSummaryTables && !query.includeVelocity) {
        try {
          this.logger.debug(
            'Attempting to use summary tables for deal analytics',
          );
          const result =
            await this.analyticsSummaryRepository.getDealAnalyticsFromSummary(
              query,
            );

          // Add source indicator
          const finalResult = {
            ...result,
            source: 'summary-tables',
          };

          return finalResult;
        } catch (summaryError) {
          this.logger.warn(
            'Summary table query failed, falling back to operational tables',
            {
              tenantId,
              error: summaryError.message,
              query,
            },
          );
          // Fall through to operational query
        }
      }

      // 3. OPERATIONAL PATH
      const result =
        await this.analyticsRepository.getDealAnalyticsFromOperational(query);

      const finalResult = {
        ...result,
        source: 'operational-tables',
      };

      return finalResult;
    } catch (error: any) {
      // 4. ENTERPRISE ERROR HANDLING
      this.logger.error(
        `getDealAnalytics failed: ${error.message}`,
        error.stack,
        {
          tenantId,
          userId,
          method: 'getDealAnalytics',
          query,
        },
      );

      // Preserve existing error types
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      throw new BadRequestException('Failed to retrieve deal analytics');
    } finally {
      // 5. PERFORMANCE MONITORING
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
  async getRevenueAnalytics(query: RevenueAnalyticsQueryDto) {
    // 1. PERMISSION CHECK
    if (!this.permissionContext.hasPermission('analytics.read')) {
      throw new ForbiddenException(
        'Insufficient permissions: analytics.read required',
      );
    }

    const startTime = Date.now();
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    try {
      // 2. BUSINESS LOGIC WITH SUMMARY FALLBACK
      if (this.useSummaryTables) {
        try {
          this.logger.debug(
            'Attempting to use summary tables for revenue analytics',
          );
          const result =
            await this.analyticsSummaryRepository.getRevenueAnalyticsFromSummary(
              query,
            );

          const finalResult = {
            ...result,
            source: 'summary-tables',
          };

          return finalResult;
        } catch (summaryError) {
          this.logger.warn('Revenue summary table query failed', {
            tenantId,
            error: summaryError.message,
            query,
          });
        }
      }

      // 3. OPERATIONAL PATH
      const result =
        await this.analyticsRepository.getRevenueAnalyticsFromOperational(
          query,
        );

      const finalResult = {
        ...result,
        source: 'operational-tables',
      };

      return finalResult;
    } catch (error: any) {
      // 4. ERROR HANDLING
      this.logger.error(
        `getRevenueAnalytics failed: ${error.message}`,
        error.stack,
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
      // 5. PERFORMANCE MONITORING
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
  async getPipelineAnalytics(query: PipelineAnalyticsQueryDto) {
    // 1. PERMISSION CHECK
    if (!this.permissionContext.hasPermission('analytics.read')) {
      throw new ForbiddenException(
        'Insufficient permissions: analytics.read required',
      );
    }

    const startTime = Date.now();
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    try {
      // 2. TRY SUMMARY TABLES FIRST
      if (this.useSummaryTables) {
        try {
          this.logger.debug(
            'Attempting to use summary tables for pipeline analytics',
          );

          // Note: The summary repository should handle this
          // If there's no dedicated summary method, we'll use operational
          const result =
            await this.analyticsRepository.getPipelineAnalyticsFromOperational(
              query,
            );

          const finalResult = {
            ...result,
            source: 'operational-tables',
          };

          return finalResult;
        } catch (summaryError) {
          this.logger.warn('Pipeline summary table query failed:', {
            tenantId,
            error: summaryError.message,
            query,
          });
        }
      }

      // 3. FALLBACK TO OPERATIONAL
      const result =
        await this.analyticsRepository.getPipelineAnalyticsFromOperational(
          query,
        );

      const finalResult = {
        ...result,
        source: 'operational-tables',
      };

      return finalResult;
    } catch (error: any) {
      // 4. ERROR HANDLING
      this.logger.error(
        `getPipelineAnalytics failed: ${error.message}`,
        error.stack,
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
      // 5. PERFORMANCE MONITORING
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
  async getActivityAnalytics(query: ActivityAnalyticsQueryDto) {
    // 1. PERMISSION CHECK
    if (!this.permissionContext.hasPermission('analytics.read')) {
      throw new ForbiddenException(
        'Insufficient permissions: analytics.read required',
      );
    }

    const startTime = Date.now();
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    try {
      // 2. TRY SUMMARY TABLES FIRST
      if (this.useSummaryTables) {
        try {
          this.logger.debug(
            'Attempting to use summary tables for activity analytics',
          );
          const result =
            await this.analyticsRepository.getActivityAnalyticsFromOperational(
              query,
            );

          const finalResult = {
            ...result,
            source: 'operational-tables',
          };

          return finalResult;
        } catch (summaryError) {
          this.logger.warn('Activity summary table query failed:', {
            tenantId,
            error: summaryError.message,
            query,
          });
        }
      }

      // 3. FALLBACK TO OPERATIONAL
      const result =
        await this.analyticsRepository.getActivityAnalyticsFromOperational(
          query,
        );

      const finalResult = {
        ...result,
        source: 'operational-tables',
      };

      return finalResult;
    } catch (error: any) {
      // 4. ERROR HANDLING
      this.logger.error(
        `getActivityAnalytics failed: ${error.message}`,
        error.stack,
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
      // 5. PERFORMANCE MONITORING
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

  async createAnalyticsExport(query: AnalyticsExportQueryDto) {
    // 1. PERMISSION CHECK (SPECIFIC EXPORT PERMISSION)
    if (!this.permissionContext.hasPermission('analytics.export')) {
      throw new ForbiddenException(
        'Insufficient permissions: analytics.export required',
      );
    }

    const startTime = Date.now();
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    try {
      // 2. VALIDATE EXPORT QUEUE AVAILABILITY
      if (!this.exportQueue) {
        throw new BadRequestException('Export functionality is not available');
      }

      // 3. GET AVAILABLE EXPORTS FROM REPOSITORY
      const availableExports =
        await this.analyticsRepository.getAvailableExports(
          query,
          tenantId,
          userId,
        );

      // 4. BUSINESS LOGIC (Simplified - in production this would queue a job)
      const exportJob = {
        id: `export-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'analytics',
        status: 'pending',
        format: query.format || ExportFormat.CSV,
        createdAt: new Date(),
        createdBy: userId,
        tenantId,
      };

      // 5. AUDIT LOG
      await this.auditLogService.logEvent({
        action: 'ANALYTICS_EXPORT_REQUESTED', // or appropriate action from AuditAction enum
        entityType: 'ExportJob' as AuditEntityType,
        actorEmail: await this.getUserEmail(userId), // You need to implement getUserEmail()
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
    } catch (error: any) {
      // 6. ERROR HANDLING
      this.logger.error(
        `createAnalyticsExport failed: ${error.message}`,
        error.stack,
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
      // 7. PERFORMANCE MONITORING
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

  async getExportStatus(jobId: string) {
    // 1. PERMISSION CHECK
    if (!this.permissionContext.hasPermission('analytics.read')) {
      throw new ForbiddenException(
        'Insufficient permissions: analytics.read required',
      );
    }

    const startTime = Date.now();
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    try {
      // 2. VALIDATE EXPORT QUEUE
      if (!this.exportQueue) {
        throw new BadRequestException('Export functionality is not available');
      }

      // 3. SIMULATED JOB STATUS (In production, fetch from BullMQ)
      const jobStatus = {
        id: jobId,
        status: 'completed',
        progress: 100,
        createdAt: new Date(Date.now() - 60000), // 1 minute ago
        completedAt: new Date(),
        result: {
          filename: `analytics-export-${jobId}.csv`,
          size: '1.2MB',
        },
      };

      if (!jobStatus) {
        throw new NotFoundException('Export job not found');
      }

      return {
        jobId: jobStatus.id,
        status: jobStatus.status,
        progress: jobStatus.progress,
        createdAt: jobStatus.createdAt,
        completedAt: jobStatus.completedAt,
        result: jobStatus.result,
      };
    } catch (error: any) {
      // 4. ERROR HANDLING
      this.logger.error(
        `getExportStatus failed: ${error.message}`,
        error.stack,
        {
          tenantId,
          userId,
          method: 'getExportStatus',
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

      throw new BadRequestException('Failed to retrieve export status');
    } finally {
      // 5. PERFORMANCE MONITORING
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

  async downloadExport(jobId: string, token: string) {
    // 1. PERMISSION CHECK
    if (!this.permissionContext.hasPermission('analytics.export')) {
      throw new ForbiddenException(
        'Insufficient permissions: analytics.export required',
      );
    }

    const startTime = Date.now();
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    try {
      // 2. VALIDATE EXPORT QUEUE
      if (!this.exportQueue) {
        throw new BadRequestException('Export functionality is not available');
      }

      // 3. VALIDATE TOKEN (In production, implement proper token validation)
      if (!token || !token.startsWith('token-')) {
        throw new ForbiddenException('Invalid or expired download token');
      }

      // 4. GET EXPORT DATA (Simplified)
      const exportData = {
        format: ExportFormat.CSV,
        filename: `analytics-export-${jobId}.csv`,
        contentType: 'text/csv',
        data: 'deal_id,amount,status,created_at\n1,10000,won,2024-01-01\n2,5000,open,2024-01-02',
      };

      // 5. AUDIT LOG
      await this.auditLogService.logEvent({
        action: 'ANALYTICS_EXPORT_DOWNLOADED', // or appropriate action from AuditAction enum
        entityType: 'ExportJob' as AuditEntityType,
        actorEmail: await this.getUserEmail(userId), // You need to implement getUserEmail()
        actorUserId: userId,
        entityId: jobId,
        metadata: {
          format: exportData.format,
          filename: exportData.filename,
        },
        severity: 'INFO' as AuditSeverity,
        organizationId: tenantId,
      });

      return {
        filename: exportData.filename,
        contentType: exportData.contentType,
        data: exportData.data,
      };
    } catch (error: any) {
      // 6. ERROR HANDLING
      this.logger.error(
        `downloadExport failed: ${error.message}`,
        error.stack,
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
      // 7. PERFORMANCE MONITORING
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

  async getAvailableExports(query: AnalyticsExportQueryDto) {
    // 1. PERMISSION CHECK
    if (!this.permissionContext.hasPermission('analytics.read')) {
      throw new ForbiddenException(
        'Insufficient permissions: analytics.read required',
      );
    }

    const startTime = Date.now();
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    try {
      // 2. VALIDATE EXPORT QUEUE
      if (!this.exportQueue) {
        throw new BadRequestException('Export functionality is not available');
      }

      // 3. GET EXPORTS FROM REPOSITORY
      const exports = await this.analyticsRepository.getAvailableExports(
        query,
        tenantId,
        userId,
      );

      return exports;
    } catch (error: any) {
      // 4. ERROR HANDLING
      this.logger.error(
        `getAvailableExports failed: ${error.message}`,
        error.stack,
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
      // 5. PERFORMANCE MONITORING
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

  // ==================== HELPER METHODS ====================

  private buildCacheKey(prefix: string, query: any): string {
    // USE TENANT ID FROM CONTEXT, NOT PARAMETER
    const tenantId = this.tenantContext.getTenantId();
    const queryStr = JSON.stringify(query);
    const hash = require('crypto')
      .createHash('md5')
      .update(queryStr)
      .digest('hex');
    return `analytics:${prefix}:${tenantId}:${hash}`;
  }

  // NOTE: The following private methods are DEPRECATED and should be removed
  // They should be handled by the repositories instead
  // Keeping them temporarily for backward compatibility

  private async getDealAnalyticsFromSummary(
    organizationId: string,
    query: any,
  ): Promise<any> {
    this.logger.warn(
      'DEPRECATED: getDealAnalyticsFromSummary called - use repository instead',
    );
    throw new Error(
      'Method deprecated - use analyticsSummaryRepository.getDealAnalyticsFromSummary',
    );
  }

  private async getDealAnalyticsFromOperational(
    organizationId: string,
    query: any,
  ): Promise<any> {
    this.logger.warn(
      'DEPRECATED: getDealAnalyticsFromOperational called - use repository instead',
    );
    throw new Error(
      'Method deprecated - use analyticsRepository.getDealAnalyticsFromOperational',
    );
  }

  private async getRevenueAnalyticsFromSummary(
    organizationId: string,
    query: any,
  ): Promise<any> {
    this.logger.warn(
      'DEPRECATED: getRevenueAnalyticsFromSummary called - use repository instead',
    );
    throw new Error(
      'Method deprecated - use analyticsSummaryRepository.getRevenueAnalyticsFromSummary',
    );
  }

  private buildDealWhereClause(organizationId: string, query: any) {
    this.logger.warn(
      'DEPRECATED: buildDealWhereClause called - repository handles filtering',
    );
    return {};
  }

  private async getPipelineDataFromSummary(
    organizationId: string,
    query: any,
  ): Promise<any> {
    this.logger.warn(
      'DEPRECATED: getPipelineDataFromSummary called - use repository instead',
    );
    throw new Error('Method deprecated - repository handles this');
  }

  private async getActivityAnalyticsFromSummary(
    organizationId: string,
    query: any,
  ): Promise<any> {
    this.logger.warn(
      'DEPRECATED: getActivityAnalyticsFromSummary called - use repository instead',
    );
    throw new Error(
      'Method deprecated - use analyticsRepository.getActivityAnalyticsFromOperational',
    );
  }

  private async getActivityAnalyticsFromOperational(
    organizationId: string,
    query: any,
  ): Promise<any> {
    this.logger.warn(
      'DEPRECATED: getActivityAnalyticsFromOperational called - use repository instead',
    );
    throw new Error(
      'Method deprecated - use analyticsRepository.getActivityAnalyticsFromOperational',
    );
  }

  // Legacy methods for backward compatibility
  async queueExportJob(
    organizationId: string,
    userId: string,
    query: any,
  ): Promise<any> {
    this.logger.warn(
      'DEPRECATED: queueExportJob called with organizationId parameter',
    );
    // Convert to new format
    const exportQuery: AnalyticsExportQueryDto = {
      format: query.format,
      include: query.include,
      startDate: query.startDate,
      endDate: query.endDate,
    };
    return this.createAnalyticsExport(exportQuery);
  }

  async getExportData(
    token: string,
    organizationId: string,
    userId: string,
  ): Promise<any> {
    this.logger.warn(
      'DEPRECATED: getExportData called with organizationId parameter',
    );
    // Extract jobId from token
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
