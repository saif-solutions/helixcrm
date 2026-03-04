// src/modules/export-queue/export-queue.service.ts
import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, JobsOptions } from 'bullmq';
import { SeverityMapper } from '../../shared/audit-log/severity-mapper';
import { AuditSeverity } from '../../shared/audit-log/audit-log.service';
import { ExportQueueRepository } from './repositories/export-queue.repository';
import { TenantContextService } from '../../shared/tenant/context/tenant-context.service';
import { PermissionContextService } from '../../shared/permissions/context/permission-context.service';
import {
  AuditLogService,
  AuditAction,
  AuditEntityType,
} from '../../shared/audit-log/audit-log.service';

export interface ExportJobData {
  userId: string;
  tenantId: string;
  exportType: 'contacts' | 'deals' | 'leads' | 'all';
  format: 'csv' | 'excel' | 'pdf';
  filters?: Record<string, any>;
  options?: {
    includeArchived?: boolean;
    includeDeleted?: boolean;
    dateRange?: {
      start: Date;
      end: Date;
    };
  };
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

@Injectable()
export class ExportQueueService {
  private readonly logger = new Logger(ExportQueueService.name);

  constructor(
    @InjectQueue('export-queue') private readonly exportQueue: Queue,
    private readonly exportQueueRepository: ExportQueueRepository,
    private readonly tenantContext: TenantContextService,
    private readonly permissionContext: PermissionContextService,
    private readonly auditLogService: AuditLogService,
  ) {}

  /**
   * Request a new export job
   */
  async requestExport(
    exportType: ExportJobData['exportType'],
    format: ExportJobData['format'],
    filters?: Record<string, any>,
    options?: ExportJobData['options'],
  ): Promise<{ jobId: string; message: string; estimatedTime?: number }> {
    // 1. PERMISSION CHECK - FIXED: 'export.${exportType}' → 'export:${exportType}'
    if (!this.permissionContext.hasPermission(`export:${exportType}`)) {
      throw new ForbiddenException(
        `Insufficient permissions: export:${exportType} required`,
      );
    }

    const startTime = Date.now();
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    try {
      // 2. VALIDATE EXPORT LIMITS (PREVENT ABUSE)
      const recentExports = await this.exportQueueRepository.countRecentExports(
        userId,
        24,
      );
      if (recentExports >= 10) {
        throw new ConflictException(
          'Export limit exceeded. Maximum 10 exports per 24 hours.',
        );
      }

      // 3. CHECK FOR DUPLICATE PENDING EXPORTS
      const hasActiveExports =
        await this.exportQueueRepository.hasActiveExports(userId);
      if (hasActiveExports) {
        this.logger.warn(`User ${userId} has active exports`, {
          userId,
          tenantId,
        });
      }

      // 4. CREATE JOB RECORD IN DATABASE
      const jobRecord = await this.exportQueueRepository.createJob({
        userId,
        tenantId,
        exportType,
        format,
        filters: filters || {},
        options: options || {},
        status: 'pending',
        requestedAt: new Date(),
      });

      // 5. QUEUE BACKGROUND JOB WITH BULLMQ
      const jobOptions: JobsOptions = {
        jobId: jobRecord.id,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: {
          count: 100, // Keep last 100 completed jobs
          age: 24 * 3600, // 24 hours in seconds
        },
        removeOnFail: {
          count: 50, // Keep last 50 failed jobs
          age: 7 * 24 * 3600, // 7 days in seconds
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

      // 6. AUDIT LOGGING
      await this.auditLogService.logEvent({
        action: 'EXPORT_REQUESTED' as any,
        entityId: jobRecord.id,
        entityType: 'EXPORT' as any,
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
        severity: SeverityMapper.forEventType('info'),
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

      // 7. ESTIMATED TIME BASED ON EXPORT TYPE
      const estimatedTime = this.getEstimatedTime(exportType);

      return {
        jobId: jobRecord.id,
        message: 'Export job queued successfully',
        estimatedTime,
      };
    } catch (error: any) {
      // 8. ENTERPRISE ERROR HANDLING
      this.logger.error(
        `Export request failed: ${error.message}`,
        error.stack,
        {
          tenantId,
          userId,
          exportType,
          format,
          method: 'requestExport',
          processingTime: Date.now() - startTime,
        },
      );

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
    // 1. PERMISSION CHECK - FIXED: 'export.read' → 'export:read'
    if (!this.permissionContext.hasPermission('export:read')) {
      throw new ForbiddenException(
        'Insufficient permissions: export:read required',
      );
    }

    const startTime = Date.now();
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    try {
      // 2. GET JOB FROM REPOSITORY
      const job = await this.exportQueueRepository.findJobById(jobId);

      if (!job) {
        throw new NotFoundException(`Export job ${jobId} not found`);
      }

      // 3. VALIDATE TENANT ACCESS
      if (job.organizationId !== tenantId) {
        throw new ForbiddenException('Access denied to this export job');
      }

      // 4. VALIDATE USER ACCESS (unless admin) - FIXED: 'export.manage' → 'export:manage'
      if (
        !this.permissionContext.hasPermission('export:manage') &&
        job.userId !== userId
      ) {
        throw new ForbiddenException('Can only view your own export jobs');
      }

      // 5. GET JOB STATUS FROM BULLMQ QUEUE
      const queueJob = await this.exportQueue.getJob(jobId);
      let status: ExportJobResult['status'] = job.status as any;

      if (queueJob) {
        const queueState = await queueJob.getState();
        status = this.mapBullMQStateToStatus(queueState);

        // Update database if status changed
        if (status !== job.status) {
          await this.exportQueueRepository.updateJob(jobId, { status });
        }
      }

      // 6. BUILD RESPONSE
      const result: ExportJobResult = {
        jobId: job.id,
        status,
        exportType: job.exportType,
        format: job.format,
        fileUrl: job.fileUrl || undefined,
        fileSize: job.fileSize || undefined,
        error: job.error || undefined,
        createdAt: job.requestedAt,
        startedAt: job.processingStartedAt || undefined,
        completedAt: job.completedAt || undefined,
      };

      this.logger.debug(`Job status retrieved`, {
        jobId,
        status,
        tenantId,
        userId,
        processingTime: Date.now() - startTime,
      });

      return result;
    } catch (error: any) {
      // 7. ERROR HANDLING
      this.logger.error(
        `Get job status failed: ${error.message}`,
        error.stack,
        {
          tenantId,
          userId,
          jobId,
          method: 'getJobStatus',
          processingTime: Date.now() - startTime,
        },
      );

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
  async listUserJobs(
    page = 1,
    limit = 20,
    status?: string,
  ): Promise<{ data: ExportJobResult[]; meta: any }> {
    // 1. PERMISSION CHECK - FIXED: 'export.read' → 'export:read'
    if (!this.permissionContext.hasPermission('export:read')) {
      throw new ForbiddenException(
        'Insufficient permissions: export:read required',
      );
    }

    const startTime = Date.now();
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    try {
      // 2. BUILD QUERY FILTERS
      const filters: any = { tenantId };

      // Regular users can only see their own jobs - FIXED: 'export.manage' → 'export:manage'
      if (!this.permissionContext.hasPermission('export:manage')) {
        filters.userId = userId;
      }

      if (status) {
        filters.status = status;
      }

      // 3. GET JOBS FROM REPOSITORY
      const [jobs, total] = await Promise.all([
        this.exportQueueRepository.findJobs(filters, page, limit),
        this.exportQueueRepository.countJobs(filters),
      ]);

      // 4. TRANSFORM TO RESPONSE FORMAT
      const data = jobs.map((job) => ({
        jobId: job.id,
        status: job.status as ExportJobResult['status'],
        exportType: job.exportType,
        format: job.format,
        fileUrl: job.fileUrl || undefined,
        fileSize: job.fileSize || undefined,
        error: job.error || undefined,
        createdAt: job.requestedAt,
        startedAt: job.processingStartedAt || undefined,
        completedAt: job.completedAt || undefined,
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
    } catch (error: any) {
      // 5. ERROR HANDLING
      this.logger.error(
        `List user jobs failed: ${error.message}`,
        error.stack,
        {
          tenantId,
          userId,
          page,
          limit,
          status,
          method: 'listUserJobs',
          processingTime: Date.now() - startTime,
        },
      );

      throw new BadRequestException('Failed to list export jobs');
    }
  }

  /**
   * Cancel an export job
   */
  async cancelJob(jobId: string): Promise<{ message: string }> {
    // 1. PERMISSION CHECK - FIXED: 'export.manage' → 'export:manage'
    if (!this.permissionContext.hasPermission('export:manage')) {
      throw new ForbiddenException(
        'Insufficient permissions: export:manage required',
      );
    }

    const startTime = Date.now();
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    try {
      // 2. GET JOB FROM REPOSITORY
      const job = await this.exportQueueRepository.findJobById(jobId);

      if (!job) {
        throw new NotFoundException(`Export job ${jobId} not found`);
      }

      // 3. VALIDATE TENANT ACCESS
      if (job.organizationId !== tenantId) {
        throw new ForbiddenException('Access denied to this export job');
      }

      // 4. CHECK IF JOB CAN BE CANCELLED
      if (job.status === 'completed' || job.status === 'failed') {
        throw new ConflictException(
          `Cannot cancel job with status: ${job.status}`,
        );
      }

      // 5. ATTEMPT TO CANCEL BULLMQ JOB
      const queueJob = await this.exportQueue.getJob(jobId);
      if (queueJob) {
        await queueJob.remove();
      }

      // 6. UPDATE JOB STATUS IN DATABASE
      await this.exportQueueRepository.updateJob(jobId, {
        status: 'cancelled',
        completedAt: new Date(),
        error: 'Job cancelled by user',
      });

      // 7. AUDIT LOGGING
      await this.auditLogService.logEvent({
        action: 'EXPORT_CANCELLED' as any,
        entityId: jobId,
        entityType: 'EXPORT' as any,
        organizationId: tenantId,
        actorUserId: userId,
        actorEmail: await this.getUserEmail(userId),
        metadata: {
          originalStatus: job.status,
          jobId,
          cancelledBy: userId,
        },
        severity: SeverityMapper.forEventType('warning'),
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
    } catch (error: any) {
      // 8. ERROR HANDLING
      this.logger.error(`Cancel job failed: ${error.message}`, error.stack, {
        tenantId,
        userId,
        jobId,
        method: 'cancelJob',
        processingTime: Date.now() - startTime,
      });

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
    // 1. PERMISSION CHECK - FIXED: 'export.read' → 'export:read'
    if (!this.permissionContext.hasPermission('export:read')) {
      throw new ForbiddenException(
        'Insufficient permissions: export:read required',
      );
    }

    const startTime = Date.now();
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    try {
      // 2. GET JOB FROM REPOSITORY
      const job = await this.exportQueueRepository.findJobById(jobId);

      if (!job) {
        throw new NotFoundException(`Export job ${jobId} not found`);
      }

      // 3. VALIDATE TENANT ACCESS
      if (job.organizationId !== tenantId) {
        throw new ForbiddenException('Access denied to this export job');
      }

      // 4. VALIDATE USER ACCESS - FIXED: 'export.manage' → 'export:manage'
      if (
        !this.permissionContext.hasPermission('export:manage') &&
        job.userId !== userId
      ) {
        throw new ForbiddenException('Can only download your own export files');
      }

      // 5. CHECK IF JOB IS COMPLETED
      if (job.status !== 'completed') {
        throw new ConflictException(
          `Export job is not ready. Current status: ${job.status}`,
        );
      }

      // 6. CHECK IF FILE EXISTS
      if (!job.fileUrl || !job.fileSize) {
        throw new NotFoundException('Export file not found or corrupted');
      }

      // 7. AUDIT LOGGING
      await this.auditLogService.logEvent({
        action: 'EXPORT_DOWNLOADED' as any,
        entityId: jobId,
        entityType: 'EXPORT' as any,
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
        severity: SeverityMapper.forEventType('info'),
      });

      // 8. GENERATE FILE NAME AND CONTENT TYPE
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
    } catch (error: any) {
      // 9. ERROR HANDLING
      this.logger.error(
        `Download export failed: ${error.message}`,
        error.stack,
        {
          tenantId,
          userId,
          jobId,
          method: 'downloadExport',
          processingTime: Date.now() - startTime,
        },
      );

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
  async cleanupOldJobs(daysToKeep: number = 30): Promise<{
    deleted: number;
    message: string;
    details: {
      completed: number;
      failed: number;
      cancelled: number;
    };
  }> {
    // 1. PERMISSION CHECK - SYSTEM ADMIN ONLY - FIXED: 'system.admin' → 'system:admin'
    if (!this.permissionContext.hasPermission('system:admin')) {
      throw new ForbiddenException(
        'Insufficient permissions: system:admin required',
      );
    }

    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();
    const startTime = Date.now();

    try {
      // 2. CALCULATE CUTOFF DATE
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      // 3. DELETE OLD JOBS
      const deleted =
        await this.exportQueueRepository.deleteOldJobs(cutoffDate);

      // 4. AUDIT LOGGING
      await this.auditLogService.logEvent({
        action: 'EXPORT_CLEANUP' as any,
        entityType: 'SYSTEM' as any,
        organizationId: tenantId,
        actorUserId: userId,
        actorEmail: await this.getUserEmail(userId),
        metadata: {
          cutoffDate: cutoffDate.toISOString(),
          deletedCount: deleted,
          daysToKeep,
          tenantId,
        },
        severity: SeverityMapper.forEventType('info'),
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
          completed: 0, // Would need separate counts in repository
          failed: 0,
          cancelled: 0,
        },
      };
    } catch (error: any) {
      this.logger.error(
        `Cleanup old jobs failed: ${error.message}`,
        error.stack,
        {
          tenantId,
          userId,
          daysToKeep,
          method: 'cleanupOldJobs',
          processingTime: Date.now() - startTime,
        },
      );
      throw new BadRequestException('Failed to cleanup old export jobs');
    }
  }

  /**
   * Get export queue statistics
   */
  async getStatistics(
    timeframe: 'day' | 'week' | 'month' = 'week',
  ): Promise<any> {
    // 1. PERMISSION CHECK - FIXED: 'export.manage' → 'export:manage'
    if (!this.permissionContext.hasPermission('export:manage')) {
      throw new ForbiddenException(
        'Insufficient permissions: export:manage required',
      );
    }

    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    try {
      return await this.exportQueueRepository.getJobStatistics(timeframe);
    } catch (error: any) {
      this.logger.error(
        `Get statistics failed: ${error.message}`,
        error.stack,
        {
          tenantId,
          userId,
          timeframe,
          method: 'getStatistics',
        },
      );
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

  private estimateExportSize(exportType: string, filters?: any): string {
    // Simple estimation logic
    switch (exportType) {
      case 'contacts':
        return filters?.search ? 'medium' : 'large';
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
    // Estimated processing time in seconds
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
      // TODO: Move to a UserRepository
      const user = await this.exportQueueRepository['prisma'].user.findUnique({
        where: { id: userId },
        select: { email: true },
      });
      return user?.email || `user-${userId}@unknown.example.com`;
    } catch (error) {
      this.logger.warn(
        `Failed to fetch email for user ${userId}: ${error.message}`,
      );
      return `user-${userId}@error.example.com`;
    }
  }
}