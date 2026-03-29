// apps/api/src/modules/export-queue/processors/export-queue.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { ExportQueueRepository } from '../repositories/export-queue.repository';
import { AuditLogService } from '../../../shared/audit-log/audit-log.service';
import { SeverityMapper } from '../../../shared/audit-log/severity-mapper';

// ========== Type Definitions ==========

interface DateRange {
  start: Date;
  end: Date;
}

interface ExportOptions {
  includeArchived?: boolean;
  includeDeleted?: boolean;
  dateRange?: DateRange;
}

interface ExportFilters {
  status?: string;
  source?: string;
  search?: string;
  stageId?: string;
  amountMin?: number;
  amountMax?: number;
  priority?: string;
}

export interface ExportJobData {
  jobId: string;
  userId: string;
  tenantId: string;
  exportType: 'contacts' | 'deals' | 'leads' | 'all';
  format: 'csv' | 'excel' | 'pdf';
  filters?: ExportFilters;
  options?: ExportOptions;
}

// Helper: safe error message extraction
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return 'Unknown error occurred';
  }
}

// Helper: safe stack trace extraction
function getErrorStack(error: unknown): string {
  return error instanceof Error && error.stack ? error.stack : '';
}

// Helper: type‑safe severity mapping
function getSeverity(level: 'info' | 'warning' | 'error'): string {
  return SeverityMapper.forEventType(level) as string;
}

// Flatten nested objects for CSV (type‑safe version)
type FlattenedObject = Record<string, unknown>;

function flattenObject(
  obj: Record<string, unknown>,
  prefix = '',
): FlattenedObject {
  const result: FlattenedObject = {};

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(
        result,
        flattenObject(value as Record<string, unknown>, newKey),
      );
    } else {
      result[newKey] = value;
    }
  }

  return result;
}

// Helper to safely stringify any value for CSV
function safeStringify(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return `"${value.replace(/"/g, '""')}"`;
  if (typeof value === 'number' || typeof value === 'boolean')
    return String(value);
  if (value instanceof Date) return value.toISOString();
  // For objects, convert to JSON string (but avoid large nested objects)
  return JSON.stringify(value);
}

@Processor('export-queue', { concurrency: 3 })
export class ExportQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(ExportQueueProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly exportQueueRepository: ExportQueueRepository,
    private readonly auditLogService: AuditLogService,
  ) {
    super();
  }

  async process(
    job: Job<ExportJobData>,
  ): Promise<{ success: boolean; recordCount: number; fileUrl: string }> {
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
      this.exportQueueRepository.updateJob(jobId, {
        status: 'processing',
        processingStartedAt: new Date(),
      });

      const exportData = await this.fetchExportData(
        exportType,
        tenantId,
        filters,
        options,
      );

      if (!exportData.length) {
        throw new Error(`No data found for export type: ${exportType}`);
      }

      const fileBuffer = this.generateExportFile(
        exportData,
        format,
        exportType,
      ); // removed await

      const fileName = this.generateFileName(exportType, format);
      const fileUrl = this.generateFileUrl(fileName, tenantId);

      this.exportQueueRepository.markJobAsCompleted(
        jobId,
        fileUrl,
        fileBuffer.length,
      );

      await this.auditLogService.logEvent({
        action: 'EXPORT_COMPLETED',
        entityId: jobId,
        entityType: 'EXPORT',
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
        severity: getSeverity('info'),
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
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      const errorStack = getErrorStack(error);

      this.exportQueueRepository.markJobAsFailed(jobId, errorMessage);

      await this.auditLogService.logEvent({
        action: 'EXPORT_FAILED',
        entityId: jobId,
        entityType: 'EXPORT',
        organizationId: tenantId,
        actorUserId: userId,
        actorEmail: await this.getUserEmail(userId),
        metadata: {
          exportType,
          format,
          error: errorMessage,
          processingTime: Date.now() - startTime,
        },
        severity: getSeverity('error'),
      });

      this.logger.error(
        `Export job ${jobId} failed: ${errorMessage}`,
        errorStack,
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

  // ========== Data Fetching ==========

  private async fetchExportData(
    exportType: ExportJobData['exportType'],
    tenantId: string,
    filters?: ExportFilters,
    options?: ExportOptions,
  ): Promise<unknown[]> {
    switch (exportType) {
      case 'contacts':
        return this.fetchContacts(tenantId, filters, options);
      case 'deals':
        return this.fetchDeals(tenantId, filters, options);
      case 'leads':
        return this.fetchLeads(tenantId, filters, options);
      case 'all': {
        const [contacts, deals, leads] = await Promise.all([
          this.fetchContacts(tenantId, filters, options),
          this.fetchDeals(tenantId, filters, options),
          this.fetchLeads(tenantId, filters, options),
        ]);
        return [...contacts, ...deals, ...leads];
      }
      default:
        // TypeScript infers exportType as 'never' here, so we convert to string
        throw new Error(`Unsupported export type: ${String(exportType)}`);
    }
  }

  private async fetchContacts(
    tenantId: string,
    filters?: ExportFilters,
    options?: ExportOptions,
  ): Promise<unknown[]> {
    const where: Record<string, unknown> = { organizationId: tenantId };

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

  private async fetchDeals(
    tenantId: string,
    filters?: ExportFilters,
    options?: ExportOptions,
  ): Promise<unknown[]> {
    const where: Record<string, unknown> = { organizationId: tenantId };

    if (filters) {
      if (filters.stageId) where.stageId = filters.stageId;
      if (filters.status) where.status = filters.status;
      if (filters.amountMin !== undefined || filters.amountMax !== undefined) {
        where.amount = {} as Record<string, number>;
        if (filters.amountMin !== undefined)
          (where.amount as Record<string, number>).gte = filters.amountMin;
        if (filters.amountMax !== undefined)
          (where.amount as Record<string, number>).lte = filters.amountMax;
      }
    }

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

  private async fetchLeads(
    tenantId: string,
    filters?: ExportFilters,
    options?: ExportOptions,
  ): Promise<unknown[]> {
    const where: Record<string, unknown> = { organizationId: tenantId };

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

  // ========== File Generation ==========

  // Removed async because no await inside
  private generateExportFile(
    data: unknown[],
    format: string,
    exportType: string,
  ): Buffer {
    switch (format) {
      case 'csv':
        return this.generateCsv(data);
      case 'excel':
        return this.generateExcel(data);
      case 'pdf':
        return this.generatePdf(data, exportType);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  private generateCsv(data: unknown[]): Buffer {
    if (data.length === 0) return Buffer.from('');

    const flattenedData: FlattenedObject[] = data.map((item) =>
      flattenObject(item as Record<string, unknown>),
    );

    const headers = Object.keys(flattenedData[0]).join(',');
    const rows = flattenedData.map((row) => {
      return Object.values(row)
        .map((value) => safeStringify(value))
        .join(',');
    });

    const csvContent = [headers, ...rows].join('\n');
    return Buffer.from(csvContent, 'utf-8');
  }

  private generateExcel(data: unknown[]): Buffer {
    // Placeholder – implement with exceljs or similar in production
    this.logger.warn(
      'Excel export using CSV placeholder – implement exceljs for production',
    );
    return this.generateCsv(data);
  }

  private generatePdf(data: unknown[], exportType: string): Buffer {
    // Placeholder – implement PDF generation (e.g., with pdfmake)
    const content = JSON.stringify(data, null, 2);
    return Buffer.from(`Export: ${exportType}\n\n${content}`, 'utf-8');
  }

  private generateFileName(exportType: string, format: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    // Explicit string conversion to avoid "never" type issues
    return `${String(exportType)}_export_${timestamp}.${String(format)}`;
  }

  private generateFileUrl(fileName: string, tenantId: string): string {
    // Explicit string conversion for safety
    return `/api/exports/${String(tenantId)}/${String(fileName)}`;
  }

  // ========== Utilities ==========

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
