// apps/api/src/modules/export-queue/export-queue.service.ts
import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, JobsOptions } from 'bullmq';
import { ExportQueueRepository } from './repositories/export-queue.repository';
import { TenantContextService } from '../../shared/tenant/context/tenant-context.service';
import { PermissionContextService } from '../../shared/permissions/context/permission-context.service';
import { AuditLogService } from '../../shared/audit-log/audit-log.service';
import { SeverityMapper } from '../../shared/audit-log/severity-mapper';
import { PrismaService } from '../../shared/prisma/prisma.service';

// Helper functions (same as in email-templates)
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return 'Unknown error occurred';
  }
}

function getErrorStack(error: unknown): string {
  return error instanceof Error && error.stack ? error.stack : '';
}

function getSeverity(level: 'info' | 'warning' | 'error'): string {
  return SeverityMapper.forEventType(level) as string;
}

// Local interface for permission context
interface PermissionContextWithHasPermission {
  hasPermission(permission: string): boolean;
}

// Local types
interface DateRange {
  start: Date;
  end: Date;
}

interface ExportOptions {
  includeArchived?: boolean;
  includeDeleted?: boolean;
  dateRange?: DateRange;
}

export interface ExportJobData {
  userId: string;
  tenantId: string;
  exportType: 'contacts' | 'deals' | 'leads' | 'all';
  format: 'csv' | 'excel' | 'pdf';
  filters?: Record<string, unknown>;
  options?: ExportOptions;
}

export interface ExportJobResult {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  recordCount?: number;
  exportType: string;
  format: string;
}

// Job filters for repository calls
interface JobFilters {
  userId?: string;
  status?: string;
}

@Injectable()
export class ExportQueueService {
  private readonly logger = new Logger(ExportQueueService.name);

  constructor(
    @InjectQueue('export-queue') private readonly exportQueue: Queue,
    private readonly exportQueueRepository: ExportQueueRepository,
    private readonly tenantContext: TenantContextService,
    private readonly permissionContext: PermissionContextService,
    private readonly auditLogService: AuditLogService,
    private readonly prisma: PrismaService,
  ) {}

  // Type-safe permission check
  private checkPermission(permission: string): boolean {
    const context: unknown = this.permissionContext;
    if (this.isPermissionContext(context)) {
      try {
        return context.hasPermission(permission) === true;
      } catch {
        this.logger.debug(
          `Permission check failed for ${permission}, relying on guard`,
        );
        return true;
      }
    }
    this.logger.debug(
      `Permission context not ready for ${permission}, relying on guard`,
    );
    return true;
  }

  private isPermissionContext(
    context: unknown,
  ): context is PermissionContextWithHasPermission {
    return (
      typeof context === 'object' &&
      context !== null &&
      typeof (context as PermissionContextWithHasPermission).hasPermission ===
        'function'
    );
  }

  private getTenantId(): string {
    const id = this.tenantContext.getTenantId();
    return typeof id === 'string' ? id : String(id ?? '');
  }

  private getUserId(): string {
    const id = this.tenantContext.getUserId();
    return typeof id === 'string' ? id : String(id ?? '');
  }

  /**
   * Request a new export job
   */
  async requestExport(
    exportType: ExportJobData['exportType'],
    format: ExportJobData['format'],
    filters?: Record<string, unknown>,
    options?: ExportOptions,
  ): Promise<{ jobId: string; message: string; estimatedTime?: number }> {
    if (!this.checkPermission(`export:${exportType}`)) {
      throw new ForbiddenException(
        `Insufficient permissions: export:${exportType} required`,
      );
    }

    const startTime = Date.now();
    const tenantId = this.getTenantId();
    const userId = this.getUserId();

    try {
      // Repository methods are synchronous now
      const recentExports = this.exportQueueRepository.countRecentExports(
        userId,
        24,
      );
      if (recentExports >= 10) {
        throw new ConflictException(
          'Export limit exceeded. Maximum 10 exports per 24 hours.',
        );
      }

      const hasActiveExports =
        this.exportQueueRepository.hasActiveExports(userId);
      if (hasActiveExports) {
        this.logger.warn(`User ${userId} has active exports`, {
          userId,
          tenantId,
        });
      }

      const jobRecord = this.exportQueueRepository.createJob({
        userId,
        tenantId,
        exportType,
        format,
        filters: filters || {},
        options: options || {},
        status: 'pending',
        requestedAt: new Date(),
      });

      const jobOptions: JobsOptions = {
        jobId: jobRecord.id,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: {
          count: 100,
          age: 24 * 3600,
        },
        removeOnFail: {
          count: 50,
          age: 7 * 24 * 3600,
        },
      };

      await this.exportQueue.add(
        'process-export',
        {
          jobId: jobRecord.id,
          userId,
          tenantId,
          exportType,
          format,
          filters,
          options,
        },
        jobOptions,
      );

      await this.auditLogService.logEvent({
        action: 'EXPORT_REQUESTED',
        entityId: jobRecord.id,
        entityType: 'EXPORT',
        organizationId: tenantId,
        actorUserId: userId,
        actorEmail: await this.getUserEmail(userId),
        metadata: {
          exportType,
          format,
          filters,
          options,
          jobId: jobRecord.id,
          estimatedSize: this.estimateExportSize(exportType, filters),
        },
        severity: getSeverity('info'),
      });

      this.logger.log(`Export job requested successfully`, {
        jobId: jobRecord.id,
        tenantId,
        userId,
        exportType,
        format,
        event: 'export_requested',
        processingTime: Date.now() - startTime,
      });

      const estimatedTime = this.getEstimatedTime(exportType);

      return {
        jobId: jobRecord.id,
        message: 'Export job queued successfully',
        estimatedTime,
      };
    } catch (error: unknown) {
      const errMsg = getErrorMessage(error);
      const errStack = getErrorStack(error);
      this.logger.error(`Export request failed: ${errMsg}`, errStack, {
        tenantId,
        userId,
        exportType,
        format,
        method: 'requestExport',
        processingTime: Date.now() - startTime,
      } as Record<string, unknown>);

      if (
        error instanceof ForbiddenException ||
        error instanceof ConflictException
      ) {
        throw error;
      }

      throw new BadRequestException(
        'Failed to queue export job. Please try again later.',
      );
    }
  }

  /**
   * Get status of an export job
   */
  async getJobStatus(jobId: string): Promise<ExportJobResult> {
    if (!this.checkPermission('export:read')) {
      throw new ForbiddenException(
        'Insufficient permissions: export:read required',
      );
    }

    const startTime = Date.now();
    const tenantId = this.getTenantId();
    const userId = this.getUserId();

    try {
      const job = this.exportQueueRepository.findJobById(jobId);

      if (!job) {
        throw new NotFoundException(`Export job ${jobId} not found`);
      }

      if (job.organizationId !== tenantId) {
        throw new ForbiddenException('Access denied to this export job');
      }

      if (!this.checkPermission('export:manage') && job.userId !== userId) {
        throw new ForbiddenException('Can only view your own export jobs');
      }

      const queueJob = await this.exportQueue.getJob(jobId);
      let status: ExportJobResult['status'] =
        job.status as ExportJobResult['status'];

      if (queueJob) {
        const queueState = await queueJob.getState();
        status = this.mapBullMQStateToStatus(queueState);

        if (status !== job.status) {
          this.exportQueueRepository.updateJob(jobId, { status });
        }
      }

      const result: ExportJobResult = {
        jobId: job.id,
        status,
        exportType: job.exportType,
        format: job.format,
        fileUrl: job.fileUrl,
        fileSize: job.fileSize,
        error: job.error,
        createdAt: job.requestedAt,
        startedAt: job.processingStartedAt,
        completedAt: job.completedAt,
      };

      this.logger.debug(`Job status retrieved`, {
        jobId,
        status,
        tenantId,
        userId,
        processingTime: Date.now() - startTime,
      });

      return result;
    } catch (error: unknown) {
      const errMsg = getErrorMessage(error);
      const errStack = getErrorStack(error);
      this.logger.error(`Get job status failed: ${errMsg}`, errStack, {
        tenantId,
        userId,
        jobId,
        method: 'getJobStatus',
        processingTime: Date.now() - startTime,
      } as Record<string, unknown>);

      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      throw new BadRequestException('Failed to get export job status');
    }
  }

  /**
   * List user's export jobs
   */
  listUserJobs(
    page = 1,
    limit = 20,
    status?: string,
  ): { data: ExportJobResult[]; meta: Record<string, unknown> } {
    if (!this.checkPermission('export:read')) {
      throw new ForbiddenException(
        'Insufficient permissions: export:read required',
      );
    }

    const startTime = Date.now();
    const tenantId = this.getTenantId();
    const userId = this.getUserId();

    try {
      const filters: JobFilters = {};

      if (!this.checkPermission('export:manage')) {
        filters.userId = userId;
      }

      if (status) {
        filters.status = status;
      }

      const jobs = this.exportQueueRepository.findJobs(filters, page, limit);
      const total = this.exportQueueRepository.countJobs(filters);

      const data = jobs.map((job) => ({
        jobId: job.id,
        status: job.status as ExportJobResult['status'],
        exportType: job.exportType,
        format: job.format,
        fileUrl: job.fileUrl,
        fileSize: job.fileSize,
        error: job.error,
        createdAt: job.requestedAt,
        startedAt: job.processingStartedAt,
        completedAt: job.completedAt,
      }));

      this.logger.debug(`Listed export jobs`, {
        tenantId,
        userId,
        page,
        limit,
        total,
        processingTime: Date.now() - startTime,
      });

      return {
        data,
        meta: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasMore: page * limit < total,
        },
      };
    } catch (error: unknown) {
      const errMsg = getErrorMessage(error);
      const errStack = getErrorStack(error);
      this.logger.error(`List user jobs failed: ${errMsg}`, errStack, {
        tenantId,
        userId,
        page,
        limit,
        status,
        method: 'listUserJobs',
        processingTime: Date.now() - startTime,
      } as Record<string, unknown>);

      throw new BadRequestException('Failed to list export jobs');
    }
  }

  /**
   * Cancel an export job
   */
  async cancelJob(jobId: string): Promise<{ message: string }> {
    if (!this.checkPermission('export:manage')) {
      throw new ForbiddenException(
        'Insufficient permissions: export:manage required',
      );
    }

    const startTime = Date.now();
    const tenantId = this.getTenantId();
    const userId = this.getUserId();

    try {
      const job = this.exportQueueRepository.findJobById(jobId);

      if (!job) {
        throw new NotFoundException(`Export job ${jobId} not found`);
      }

      if (job.organizationId !== tenantId) {
        throw new ForbiddenException('Access denied to this export job');
      }

      if (job.status === 'completed' || job.status === 'failed') {
        throw new ConflictException(
          `Cannot cancel job with status: ${job.status}`,
        );
      }

      const queueJob = await this.exportQueue.getJob(jobId);
      if (queueJob) {
        await queueJob.remove();
      }

      this.exportQueueRepository.updateJob(jobId, {
        status: 'cancelled',
        completedAt: new Date(),
        error: 'Job cancelled by user',
      });

      await this.auditLogService.logEvent({
        action: 'EXPORT_CANCELLED',
        entityId: jobId,
        entityType: 'EXPORT',
        organizationId: tenantId,
        actorUserId: userId,
        actorEmail: await this.getUserEmail(userId),
        metadata: {
          originalStatus: job.status,
          jobId,
          cancelledBy: userId,
        },
        severity: getSeverity('warning'),
      });

      this.logger.log(`Export job cancelled successfully`, {
        jobId,
        tenantId,
        userId,
        originalStatus: job.status,
        event: 'export_cancelled',
        processingTime: Date.now() - startTime,
      });

      return { message: 'Export job cancelled successfully' };
    } catch (error: unknown) {
      const errMsg = getErrorMessage(error);
      const errStack = getErrorStack(error);
      this.logger.error(`Cancel job failed: ${errMsg}`, errStack, {
        tenantId,
        userId,
        jobId,
        method: 'cancelJob',
        processingTime: Date.now() - startTime,
      } as Record<string, unknown>);

      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof ConflictException
      ) {
        throw error;
      }

      throw new BadRequestException('Failed to cancel export job');
    }
  }

  /**
   * Download exported file
   */
  async downloadExport(jobId: string): Promise<{
    fileUrl: string;
    fileName: string;
    fileSize: number;
    contentType: string;
  }> {
    if (!this.checkPermission('export:read')) {
      throw new ForbiddenException(
        'Insufficient permissions: export:read required',
      );
    }

    const startTime = Date.now();
    const tenantId = this.getTenantId();
    const userId = this.getUserId();

    try {
      const job = this.exportQueueRepository.findJobById(jobId);

      if (!job) {
        throw new NotFoundException(`Export job ${jobId} not found`);
      }

      if (job.organizationId !== tenantId) {
        throw new ForbiddenException('Access denied to this export job');
      }

      if (!this.checkPermission('export:manage') && job.userId !== userId) {
        throw new ForbiddenException('Can only download your own export files');
      }

      if (job.status !== 'completed') {
        throw new ConflictException(
          `Export job is not ready. Current status: ${job.status}`,
        );
      }

      if (!job.fileUrl || !job.fileSize) {
        throw new NotFoundException('Export file not found or corrupted');
      }

      await this.auditLogService.logEvent({
        action: 'EXPORT_DOWNLOADED',
        entityId: jobId,
        entityType: 'EXPORT',
        organizationId: tenantId,
        actorUserId: userId,
        actorEmail: await this.getUserEmail(userId),
        metadata: {
          jobId,
          fileUrl: job.fileUrl,
          fileSize: job.fileSize,
          exportType: job.exportType,
          format: job.format,
        },
        severity: getSeverity('info'),
      });

      const fileName = this.generateFileName(
        job.exportType,
        job.format,
        job.requestedAt,
      );
      const contentType = this.getContentType(job.format);

      this.logger.log(`Export file downloaded`, {
        jobId,
        tenantId,
        userId,
        fileSize: job.fileSize,
        exportType: job.exportType,
        format: job.format,
        event: 'export_downloaded',
        processingTime: Date.now() - startTime,
      });

      return {
        fileUrl: job.fileUrl,
        fileName,
        fileSize: job.fileSize,
        contentType,
      };
    } catch (error: unknown) {
      const errMsg = getErrorMessage(error);
      const errStack = getErrorStack(error);
      this.logger.error(`Download export failed: ${errMsg}`, errStack, {
        tenantId,
        userId,
        jobId,
        method: 'downloadExport',
        processingTime: Date.now() - startTime,
      } as Record<string, unknown>);

      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof ConflictException
      ) {
        throw error;
      }

      throw new BadRequestException('Failed to download export file');
    }
  }

  /**
   * Clean up old export jobs (admin only)
   */
  async cleanupOldJobs(daysToKeep = 30): Promise<{
    deleted: number;
    message: string;
    details: {
      completed: number;
      failed: number;
      cancelled: number;
    };
  }> {
    if (!this.checkPermission('system:admin')) {
      throw new ForbiddenException(
        'Insufficient permissions: system:admin required',
      );
    }

    const tenantId = this.getTenantId();
    const userId = this.getUserId();
    const startTime = Date.now();

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const deleted = this.exportQueueRepository.deleteOldJobs(cutoffDate);

      await this.auditLogService.logEvent({
        action: 'EXPORT_CLEANUP',
        entityType: 'SYSTEM',
        organizationId: tenantId,
        actorUserId: userId,
        actorEmail: await this.getUserEmail(userId),
        metadata: {
          cutoffDate: cutoffDate.toISOString(),
          deletedCount: deleted,
          daysToKeep,
          tenantId,
        },
        severity: getSeverity('info'),
      });

      this.logger.log(`Old export jobs cleaned up`, {
        tenantId,
        userId,
        deleted,
        daysToKeep,
        cutoffDate: cutoffDate.toISOString(),
        event: 'export_cleanup',
        processingTime: Date.now() - startTime,
      });

      return {
        deleted,
        message: `Successfully deleted ${deleted} old export jobs older than ${daysToKeep} days`,
        details: {
          completed: 0,
          failed: 0,
          cancelled: 0,
        },
      };
    } catch (error: unknown) {
      const errMsg = getErrorMessage(error);
      const errStack = getErrorStack(error);
      this.logger.error(`Cleanup old jobs failed: ${errMsg}`, errStack, {
        tenantId,
        userId,
        daysToKeep,
        method: 'cleanupOldJobs',
        processingTime: Date.now() - startTime,
      } as Record<string, unknown>);
      throw new BadRequestException('Failed to cleanup old export jobs');
    }
  }

  /**
   * Get export queue statistics
   */
  getStatistics(
    timeframe: 'day' | 'week' | 'month' = 'week',
  ): Record<string, unknown> {
    if (!this.checkPermission('export:manage')) {
      throw new ForbiddenException(
        'Insufficient permissions: export:manage required',
      );
    }

    const tenantId = this.getTenantId();
    const userId = this.getUserId();

    try {
      return this.exportQueueRepository.getJobStatistics(timeframe);
    } catch (error: unknown) {
      const errMsg = getErrorMessage(error);
      const errStack = getErrorStack(error);
      this.logger.error(`Get statistics failed: ${errMsg}`, errStack, {
        tenantId,
        userId,
        timeframe,
        method: 'getStatistics',
      } as Record<string, unknown>);
      throw new BadRequestException('Failed to get export statistics');
    }
  }

  // ==================== HELPER METHODS ====================

  private mapBullMQStateToStatus(
    queueState: string,
  ): ExportJobResult['status'] {
    switch (queueState) {
      case 'waiting':
      case 'delayed':
        return 'pending';
      case 'active':
      case 'stalled':
        return 'processing';
      case 'completed':
        return 'completed';
      case 'failed':
        return 'failed';
      default:
        return 'pending';
    }
  }

  private generateFileName(
    exportType: string,
    format: string,
    date: Date,
  ): string {
    const dateStr = date.toISOString().split('T')[0];
    const timeStr = date
      .toISOString()
      .split('T')[1]
      .split('.')[0]
      .replace(/:/g, '-');
    return `${exportType}_export_${dateStr}_${timeStr}.${format}`;
  }

  private getContentType(format: string): string {
    switch (format) {
      case 'csv':
        return 'text/csv';
      case 'excel':
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case 'pdf':
        return 'application/pdf';
      default:
        return 'application/octet-stream';
    }
  }

  private estimateExportSize(
    exportType: string,
    filters?: Record<string, unknown>,
  ): string {
    if (filters?.search) {
      return 'medium';
    }
    switch (exportType) {
      case 'contacts':
        return 'large';
      case 'deals':
        return 'medium';
      case 'leads':
        return 'small';
      case 'all':
        return 'very-large';
      default:
        return 'unknown';
    }
  }

  private getEstimatedTime(exportType: string): number {
    switch (exportType) {
      case 'contacts':
        return 30;
      case 'deals':
        return 45;
      case 'leads':
        return 20;
      case 'all':
        return 120;
      default:
        return 60;
    }
  }

  private async getUserEmail(userId: string): Promise<string> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });
      return user?.email ?? `user-${userId}@unknown.example.com`;
    } catch (error) {
      this.logger.warn(
        `Failed to fetch email for user ${userId}: ${getErrorMessage(error)}`,
      );
      return `user-${userId}@error.example.com`;
    }
  }
}
