import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { AuditLogService, AuditAction, AuditSeverity, AuditEntityType } from '../../../shared/audit-log/audit-log.service';

export interface AnalyticsExportJobData {
  exportId: string;
  organizationId: string;
  userId: string;
  format: 'csv' | 'json';
  queryParams: any;
  downloadToken: string;
  requestedAt: string;
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

  async process(job: Job<AnalyticsExportJobData>): Promise<any> {
    const { 
      exportId, 
      organizationId, 
      userId, 
      format, 
      queryParams, 
      downloadToken 
    } = job.data;
    
    this.logger.log(`Processing export job ${job.id} for organization ${organizationId}`);
    
    try {
      // 1. Get user email for audit logging
      const actorEmail = await this.getUserEmail(userId);
      
      // 2. Update export status to processing
      await this.updateExportStatus(exportId, 'processing');
      
      // 3. Fetch analytics data based on queryParams
      const exportData = await this.generateExportData(organizationId, queryParams, format);
      
      // 4. Store export result (in Phase 3.4 - in-memory; Phase 3.6+ - S3/filesystem)
      const filePath = await this.storeExport(exportId, exportData, format);
      
      // 5. Update export record with completion details
      await this.completeExport(exportId, filePath, exportData.recordCount);
      
      // 6. Log completion
      await this.auditLogService.logEvent({
        action: AuditAction.ANALYTICS_EXPORT_COMPLETED,
        entityId: exportId,
        entityType: AuditEntityType.SYSTEM,
        organizationId,
        actorUserId: userId,
        actorEmail,
        metadata: {
          jobId: job.id,
          format,
          fileSize: exportData.fileSize,
          recordCount: exportData.recordCount,
        },
        severity: AuditSeverity.LOW,
      });

      this.logger.log(`Export job ${job.id} completed successfully for export ${exportId}`);
      
      return {
        success: true,
        exportId,
        fileSize: exportData.fileSize,
        recordCount: exportData.recordCount,
      };
    } catch (error) {
      this.logger.error(`Export job ${job.id} failed: ${error.message}`, error.stack);
      
      // Get user email for error logging
      const actorEmail = await this.getUserEmail(userId);
      
      // Update export status to failed
      await this.updateExportStatus(exportId, 'failed', error.message);
      
      await this.auditLogService.logEvent({
        action: AuditAction.ANALYTICS_EXPORT_FAILED,
        entityId: exportId,
        entityType: AuditEntityType.SYSTEM,
        organizationId,
        actorUserId: userId,
        actorEmail,
        metadata: {
          jobId: job.id,
          error: error.message,
        },
        severity: AuditSeverity.HIGH,
      });

      throw error; // Will trigger retry based on job configuration
    }
  }

  @OnWorkerEvent('completed')
  onJobCompleted(job: Job) {
    this.logger.debug(`Job ${job.id} completed successfully`);
  }

  @OnWorkerEvent('failed')
  onJobFailed(job: Job, error: Error) {
    this.logger.error(`Job ${job.id} failed: ${error.message}`);
  }

  // ============= PRIVATE HELPER METHODS =============
  
  private async getUserEmail(userId: string): Promise<string> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true }
      });
      return user?.email || `user-${userId}@unknown.example.com`;
    } catch (error) {
      this.logger.warn(`Failed to fetch email for user ${userId}: ${error.message}`);
      return `user-${userId}@error.example.com`;
    }
  }

  private async updateExportStatus(
    exportId: string, 
    status: 'pending' | 'processing' | 'completed' | 'failed',
    errorMessage?: string
  ): Promise<void> {
    // In Phase 3.4: In-memory tracking
    // In Phase 3.6+: Database update
    this.logger.debug(`Export ${exportId} status updated to: ${status}`);
  }

  private async generateExportData(
    organizationId: string,
    queryParams: any,
    format: 'csv' | 'json'
  ): Promise<{ data: any; fileSize: number; recordCount: number }> {
    // TODO: Implement actual data fetching based on queryParams
    // For Phase 3.4: Return mock data
    // For Phase 3.6+: Query database with proper filters
    
    const mockData = format === 'csv' 
      ? 'deal_id,name,amount,status,created_at\n1,Test Deal 1,10000,open,2024-01-01\n2,Test Deal 2,25000,won,2024-01-02'
      : JSON.stringify([{ deal_id: 1, name: 'Test Deal 1', amount: 10000, status: 'open' }]);
    
    return {
      data: mockData,
      fileSize: Buffer.byteLength(mockData, 'utf8'),
      recordCount: 2,
    };
  }

  private async storeExport(
    exportId: string,
    data: any,
    format: 'csv' | 'json'
  ): Promise<string> {
    // In Phase 3.4: Store in memory/filesystem
    // In Phase 3.6+: Upload to S3 or cloud storage
    
    const fileName = `export_${exportId}.${format}`;
    const filePath = `/tmp/exports/${fileName}`; // Temporary storage
    
    this.logger.debug(`Export stored at: ${filePath}`);
    return filePath;
  }

  private async completeExport(
    exportId: string,
    filePath: string,
    recordCount: number
  ): Promise<void> {
    // Update export record with completion details
    this.logger.debug(`Export ${exportId} completed with ${recordCount} records`);
  }
}