// apps/api/src/modules/analytics/processors/analytics-export.processor.ts

import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import {
  AuditLogService,
  AuditAction,
  AuditSeverity,
  AuditEntityType,
} from '../../../shared/audit-log/audit-log.service';

// Define types for export job data
export interface AnalyticsExportJobData {
  exportId: string;
  organizationId: string;
  userId: string;
  format: 'csv' | 'json';
  queryParams: Record<string, unknown>;
  downloadToken: string;
  requestedAt: string;
}

// Define types for export data result
interface ExportDataResult {
  data: string;
  fileSize: number;
  recordCount: number;
}

// Mock export configuration
const MOCK_EXPORT_CONFIG = {
  CSV_HEADER: 'deal_id,name,amount,status,created_at\n',
  CSV_ROW_1: '1,Test Deal 1,10000,open,2024-01-01\n',
  CSV_ROW_2: '2,Test Deal 2,25000,won,2024-01-02',
  JSON_DATA: JSON.stringify([
    { deal_id: 1, name: 'Test Deal 1', amount: 10000, status: 'open' },
    { deal_id: 2, name: 'Test Deal 2', amount: 25000, status: 'won' },
  ]),
  MOCK_RECORD_COUNT: 2,
  EXPORT_PATH_PREFIX: '/tmp/exports/',
} as const;

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

@Processor('analytics-export')
@Injectable()
export class AnalyticsExportProcessor extends WorkerHost {
  private readonly logger = new Logger(AnalyticsExportProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {
    super();
  }

  async process(
    job: Job<AnalyticsExportJobData>,
  ): Promise<Record<string, unknown>> {
    const { exportId, organizationId, userId, format, queryParams } = job.data;

    this.logger.log(
      `Processing export job ${job.id} for organization ${organizationId}`,
    );

    try {
      // 1. Get user email for audit logging
      const actorEmail = await this.getUserEmail(userId);

      // 2. Update export status to processing
      await this.updateExportStatus(exportId, 'processing');

      // 3. Fetch analytics data based on queryParams (synchronous)
      const exportData = this.generateExportData(
        organizationId,
        queryParams,
        format,
      );

      // 4. Store export result (in Phase 3.4 - in-memory; Phase 3.6+ - S3/filesystem)
      const filePath = await this.storeExport(
        exportId,
        exportData.data,
        format,
      );

      // 5. Update export record with completion details
      await this.completeExport(exportId, filePath, exportData.recordCount);

      // 6. Log completion - use enum values directly
      await this.auditLogService.logEvent({
        action: 'ANALYTICS_EXPORT_COMPLETED' as AuditAction,
        entityId: exportId,
        entityType: 'SYSTEM' as AuditEntityType,
        organizationId,
        actorUserId: userId,
        actorEmail,
        metadata: {
          jobId: job.id,
          format,
          fileSize: exportData.fileSize,
          recordCount: exportData.recordCount,
        },
        severity: 'LOW' as AuditSeverity,
      });

      this.logger.log(
        `Export job ${job.id} completed successfully for export ${exportId}`,
      );

      return {
        success: true,
        exportId,
        fileSize: exportData.fileSize,
        recordCount: exportData.recordCount,
      };
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Export job ${job.id} failed: ${errorMessage}`,
        errorStack,
      );

      // Get user email for error logging
      const actorEmail = await this.getUserEmail(userId);

      // Update export status to failed
      await this.updateExportStatus(exportId, 'failed', errorMessage);

      await this.auditLogService.logEvent({
        action: 'ANALYTICS_EXPORT_FAILED' as AuditAction,
        entityId: exportId,
        entityType: 'SYSTEM' as AuditEntityType,
        organizationId,
        actorUserId: userId,
        actorEmail,
        metadata: {
          jobId: job.id,
          error: errorMessage,
        },
        severity: 'HIGH' as AuditSeverity,
      });

      throw error; // Will trigger retry based on job configuration
    }
  }

  @OnWorkerEvent('completed')
  onJobCompleted(job: Job): void {
    this.logger.debug(`Job ${job.id} completed successfully`);
  }

  @OnWorkerEvent('failed')
  onJobFailed(job: Job, error: Error): void {
    this.logger.error(`Job ${job.id} failed: ${error.message}`);
  }

  // ============= PRIVATE HELPER METHODS =============

  private async getUserEmail(userId: string): Promise<string> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });
      return user?.email || `user-${userId}@unknown.example.com`;
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.warn(
        `Failed to fetch email for user ${userId}: ${errorMessage}`,
      );
      return `user-${userId}@error.example.com`;
    }
  }

  private async updateExportStatus(
    exportId: string,
    status: 'pending' | 'processing' | 'completed' | 'failed',
    errorMessage?: string,
  ): Promise<void> {
    // In Phase 3.4: In-memory tracking
    // In Phase 3.6+: Database update
    // Mark errorMessage as intentionally unused for now
    void errorMessage;

    this.logger.debug(`Export ${exportId} status updated to: ${status}`);

    // Simulate async operation for consistency
    return Promise.resolve();
  }

  private generateExportData(
    organizationId: string,
    queryParams: Record<string, unknown>,
    format: 'csv' | 'json',
  ): ExportDataResult {
    // Mark parameters as intentionally unused for now
    void organizationId;
    void queryParams;

    // TODO: Implement actual data fetching based on queryParams
    // For Phase 3.4: Return mock data
    // For Phase 3.6+: Query database with proper filters

    const mockData =
      format === 'csv'
        ? MOCK_EXPORT_CONFIG.CSV_HEADER +
          MOCK_EXPORT_CONFIG.CSV_ROW_1 +
          MOCK_EXPORT_CONFIG.CSV_ROW_2
        : MOCK_EXPORT_CONFIG.JSON_DATA;

    return {
      data: mockData,
      fileSize: Buffer.byteLength(mockData, 'utf8'),
      recordCount: MOCK_EXPORT_CONFIG.MOCK_RECORD_COUNT,
    };
  }

  private async storeExport(
    exportId: string,
    data: string,
    format: 'csv' | 'json',
  ): Promise<string> {
    // In Phase 3.4: Store in memory/filesystem
    // In Phase 3.6+: Upload to S3 or cloud storage

    const fileName = `export_${exportId}.${format}`;
    const filePath = `${MOCK_EXPORT_CONFIG.EXPORT_PATH_PREFIX}${fileName}`;

    this.logger.debug(`Export stored at: ${filePath}`);

    // Simulate async operation for consistency
    return Promise.resolve(filePath);
  }

  private async completeExport(
    exportId: string,
    filePath: string,
    recordCount: number,
  ): Promise<void> {
    // Update export record with completion details
    this.logger.debug(
      `Export ${exportId} completed with ${recordCount} records at ${filePath}`,
    );

    // Simulate async operation for consistency
    return Promise.resolve();
  }
}
