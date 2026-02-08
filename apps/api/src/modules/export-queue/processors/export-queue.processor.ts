// src/modules/export-queue/processors/export-queue.processor.ts
import { Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { ExportQueueRepository } from '../repositories/export-queue.repository';
import { AuditLogService } from '../../../shared/audit-log/audit-log.service';
import { SeverityMapper } from '../../../shared/audit-log/severity-mapper';

interface ExportJobData {
  jobId: string;
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

@Processor('export-queue', { concurrency: 3 })
export class ExportQueueProcessor {
  private readonly logger = new Logger(ExportQueueProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly exportQueueRepository: ExportQueueRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  // BullMQ uses this method name by default for processing
  async process(job: Job<ExportJobData>): Promise<any> {
    const { jobId, userId, tenantId, exportType, format, filters, options } =
      job.data;
    const startTime = Date.now();

    this.logger.log(`Starting export job ${jobId}`, {
      jobId,
      userId,
      tenantId,
      exportType,
      format,
      event: 'export_processing_started',
    });

    try {
      // 1. UPDATE JOB STATUS TO PROCESSING
      await this.exportQueueRepository.updateJob(jobId, {
        status: 'processing',
        processingStartedAt: new Date(),
      });

      // 2. FETCH DATA BASED ON EXPORT TYPE
      const exportData = await this.fetchExportData(
        exportType,
        tenantId,
        filters,
        options,
      );

      if (!exportData || exportData.length === 0) {
        throw new Error(`No data found for export type: ${exportType}`);
      }

      // 3. GENERATE FILE BASED ON FORMAT
      const fileBuffer = await this.generateExportFile(
        exportData,
        format,
        exportType,
      );

      // 4. CREATE FILE URL (PLACEHOLDER - REPLACE WITH ACTUAL STORAGE)
      const fileName = this.generateFileName(exportType, format);
      const fileUrl = this.generateFileUrl(fileName, tenantId, userId);

      // 5. UPDATE JOB AS COMPLETED
      await this.exportQueueRepository.markJobAsCompleted(
        jobId,
        fileUrl,
        fileBuffer.length,
      );

      // 6. AUDIT LOG SUCCESS
      await this.auditLogService.logEvent({
        action: 'EXPORT_COMPLETED' as any,
        entityId: jobId,
        entityType: 'EXPORT' as any,
        organizationId: tenantId,
        actorUserId: userId,
        actorEmail: await this.getUserEmail(userId),
        metadata: {
          exportType,
          format,
          recordCount: exportData.length,
          fileSize: fileBuffer.length,
          fileUrl,
          processingTime: Date.now() - startTime,
        },
        severity: SeverityMapper.forEventType('info'),
      });

      this.logger.log(`Export job ${jobId} completed successfully`, {
        jobId,
        userId,
        tenantId,
        recordCount: exportData.length,
        fileSize: fileBuffer.length,
        processingTime: Date.now() - startTime,
        event: 'export_processing_completed',
      });

      return { success: true, recordCount: exportData.length, fileUrl };
    } catch (error: any) {
      // 7. HANDLE JOB FAILURE
      const errorMessage =
        error.message || 'Unknown error during export processing';

      await this.exportQueueRepository.markJobAsFailed(jobId, errorMessage);

      // 8. AUDIT LOG FAILURE
      await this.auditLogService.logEvent({
        action: 'EXPORT_FAILED' as any,
        entityId: jobId,
        entityType: 'EXPORT' as any,
        organizationId: tenantId,
        actorUserId: userId,
        actorEmail: await this.getUserEmail(userId),
        metadata: {
          exportType,
          format,
          error: errorMessage,
          processingTime: Date.now() - startTime,
        },
        severity: SeverityMapper.forEventType('error'),
      });

      this.logger.error(
        `Export job ${jobId} failed: ${errorMessage}`,
        error.stack,
        {
          jobId,
          userId,
          tenantId,
          exportType,
          format,
          event: 'export_processing_failed',
        },
      );

      throw error;
    }
  }

  /**
   * Fetch data for export based on type
   */
  private async fetchExportData(
    exportType: string,
    tenantId: string,
    filters?: Record<string, any>,
    options?: any,
  ): Promise<any[]> {
    switch (exportType) {
      case 'contacts':
        return this.fetchContacts(tenantId, filters, options);
      case 'deals':
        return this.fetchDeals(tenantId, filters, options);
      case 'leads':
        return this.fetchLeads(tenantId, filters, options);
      case 'all':
        const [contacts, deals, leads] = await Promise.all([
          this.fetchContacts(tenantId, filters, options),
          this.fetchDeals(tenantId, filters, options),
          this.fetchLeads(tenantId, filters, options),
        ]);
        return [...contacts, ...deals, ...leads];
      default:
        throw new Error(`Unsupported export type: ${exportType}`);
    }
  }

  /**
   * Fetch contacts with tenant isolation
   */
  private async fetchContacts(tenantId: string, filters?: any, options?: any) {
    const where: any = { organizationId: tenantId };

    // Apply filters
    if (filters) {
      if (filters.status) where.status = filters.status;
      if (filters.source) where.source = filters.source;
      if (filters.search) {
        where.OR = [
          { firstName: { contains: filters.search, mode: 'insensitive' } },
          { lastName: { contains: filters.search, mode: 'insensitive' } },
          { email: { contains: filters.search, mode: 'insensitive' } },
        ];
      }
    }

    // Apply options
    if (options) {
      if (!options.includeArchived) where.isArchived = false;
      if (!options.includeDeleted) where.deletedAt = null;
      if (options.dateRange) {
        where.createdAt = {
          gte: options.dateRange.start,
          lte: options.dateRange.end,
        };
      }
    }

    return this.prisma.contact.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        title: true,
        department: true,
        company: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Fetch deals with tenant isolation
   */
  private async fetchDeals(tenantId: string, filters?: any, options?: any) {
    const where: any = { organizationId: tenantId };

    // Apply filters
    if (filters) {
      if (filters.stageId) where.stageId = filters.stageId;
      if (filters.status) where.status = filters.status;
      if (filters.amountMin || filters.amountMax) {
        where.amount = {};
        if (filters.amountMin) where.amount.gte = filters.amountMin;
        if (filters.amountMax) where.amount.lte = filters.amountMax;
      }
    }

    // Apply options
    if (options) {
      if (!options.includeArchived) where.isArchived = false;
      if (options.dateRange) {
        where.createdAt = {
          gte: options.dateRange.start,
          lte: options.dateRange.end,
        };
      }
    }

    return this.prisma.deal.findMany({
      where,
      include: {
        stage: {
          select: { name: true, pipeline: { select: { name: true } } },
        },
        contact: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  /**
   * Fetch leads with tenant isolation
   */
  private async fetchLeads(tenantId: string, filters?: any, options?: any) {
    const where: any = { organizationId: tenantId };

    // Apply filters
    if (filters) {
      if (filters.status) where.status = filters.status;
      if (filters.priority) where.priority = filters.priority;
      if (filters.search) {
        where.OR = [
          { title: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
        ];
      }
    }

    // Apply options
    if (options) {
      if (!options.includeArchived) where.isArchived = false;
      if (options.dateRange) {
        where.createdAt = {
          gte: options.dateRange.start,
          lte: options.dateRange.end,
        };
      }
    }

    return this.prisma.lead.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Generate export file in specified format
   */
  private async generateExportFile(
    data: any[],
    format: string,
    exportType: string,
  ): Promise<Buffer> {
    switch (format) {
      case 'csv':
        return this.generateCsv(data, exportType);
      case 'excel':
        return this.generateExcel(data, exportType);
      case 'pdf':
        return this.generatePdf(data, exportType);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Generate CSV file
   */
  private async generateCsv(data: any[], exportType: string): Promise<Buffer> {
    if (data.length === 0) {
      return Buffer.from('');
    }

    // Flatten nested objects for CSV
    const flattenedData = data.map((item) => this.flattenObject(item));

    const headers = Object.keys(flattenedData[0]).join(',');
    const rows = flattenedData.map((row) =>
      Object.values(row)
        .map((value) =>
          typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value,
        )
        .join(','),
    );

    const csvContent = [headers, ...rows].join('\n');
    return Buffer.from(csvContent, 'utf-8');
  }

  /**
   * Generate Excel file (simplified)
   */
  private async generateExcel(
    data: any[],
    exportType: string,
  ): Promise<Buffer> {
    // For now, generate CSV as placeholder
    // In production, implement with exceljs or similar library
    this.logger.warn(
      'Excel export using CSV placeholder - implement exceljs for production',
    );
    return this.generateCsv(data, exportType);
  }

  /**
   * Generate PDF file (simplified)
   */
  private async generatePdf(data: any[], exportType: string): Promise<Buffer> {
    // For now, generate simple text representation
    const content = JSON.stringify(data, null, 2);
    return Buffer.from(`Export: ${exportType}\n\n${content}`, 'utf-8');
  }

  /**
   * Generate file name
   */
  private generateFileName(exportType: string, format: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `${exportType}_export_${timestamp}.${format}`;
  }

  /**
   * Generate file URL (placeholder)
   */
  private generateFileUrl(
    fileName: string,
    tenantId: string,
    userId: string,
  ): string {
    // In production, upload to S3/Azure/Google Cloud Storage
    // For now, return a placeholder URL
    return `/api/exports/${tenantId}/${fileName}`;
  }

  /**
   * Flatten nested objects for CSV export
   */
  private flattenObject(obj: any, prefix = ''): any {
    return Object.keys(obj).reduce((acc, key) => {
      const pre = prefix.length ? `${prefix}.` : '';

      if (
        typeof obj[key] === 'object' &&
        obj[key] !== null &&
        !Array.isArray(obj[key])
      ) {
        Object.assign(acc, this.flattenObject(obj[key], pre + key));
      } else {
        acc[pre + key] = obj[key];
      }

      return acc;
    }, {} as any);
  }

  /**
   * Get user email for audit logging
   */
  private async getUserEmail(userId: string): Promise<string> {
    try {
      const user = await this.prisma.user.findUnique({
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
