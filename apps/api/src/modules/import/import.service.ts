// apps/api/src/modules/import/import.service.ts
import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ImportJobRepository } from './repositories/import-job.repository';
import { CreateImportJobDto } from './dto/create-import-job.dto';
import { TenantContextService } from '../../shared/tenant/context/tenant-context.service';
import { PermissionContextService } from '../../shared/permissions/context/permission-context.service';
import { AuditLogService } from '../../shared/audit-log/audit-log.service';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { SeverityMapper } from '../../shared/audit-log/severity-mapper';

// Helper functions
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

// Permission context type guard
interface PermissionContextWithHasPermission {
  hasPermission(permission: string): boolean;
}

@Injectable()
export class ImportService {
  private readonly logger = new Logger(ImportService.name);

  constructor(
    private readonly importJobRepository: ImportJobRepository,
    private readonly tenantContext: TenantContextService,
    private readonly permissionContext: PermissionContextService,
    private readonly auditLogService: AuditLogService,
    private readonly prisma: PrismaService,
  ) {}

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
   * Create a new import job
   */
  async createImportJob(data: CreateImportJobDto, userId: string) {
    if (!this.checkPermission('import:manage')) {
      throw new ForbiddenException(
        'Insufficient permissions: import:manage required',
      );
    }

    const startTime = Date.now();
    const tenantId = this.getTenantId();

    try {
      const job = await this.importJobRepository.create({
        type: data.type,
        source: data.source,
        fileName: data.fileName,
        fileSize: data.fileSize,
        metadata: data.metadata,
        userId,
        status: 'pending',
      });

      await this.auditLogService.logEvent({
        action: 'IMPORT_JOB_CREATED',
        entityId: job.id,
        entityType: 'IMPORT_JOB',
        organizationId: tenantId,
        actorUserId: userId,
        actorEmail: await this.getUserEmail(userId),
        metadata: {
          jobId: job.id,
          type: job.type,
          source: job.source,
          status: job.status,
        },
        severity: getSeverity('info'),
      });

      this.logger.log(`Import job created successfully`, {
        jobId: job.id,
        tenantId,
        userId,
        type: job.type,
        eventType: 'import_job_created',
        processingTime: Date.now() - startTime,
      });

      return job;
    } catch (error: unknown) {
      const errMsg = getErrorMessage(error);
      const errStack = getErrorStack(error);
      this.logger.error(`Create import job failed: ${errMsg}`, errStack, {
        tenantId,
        userId,
        data,
        method: 'createImportJob',
        processingTime: Date.now() - startTime,
      } as Record<string, unknown>);

      if (error instanceof ForbiddenException) {
        throw error;
      }

      throw new BadRequestException('Failed to create import job');
    }
  }

  /**
   * Get all import jobs for current tenant
   */
  async getImportJobs() {
    if (!this.checkPermission('import:read')) {
      throw new ForbiddenException(
        'Insufficient permissions: import:read required',
      );
    }

    const tenantId = this.getTenantId();
    const userId = this.getUserId();

    try {
      const jobs = await this.importJobRepository.findAll();

      this.logger.debug(`Retrieved import jobs`, {
        tenantId,
        userId,
        count: jobs.length,
      });

      return jobs;
    } catch (error: unknown) {
      const errMsg = getErrorMessage(error);
      const errStack = getErrorStack(error);
      this.logger.error(`Get import jobs failed: ${errMsg}`, errStack, {
        tenantId,
        userId,
        method: 'getImportJobs',
      } as Record<string, unknown>);

      if (error instanceof ForbiddenException) {
        throw error;
      }

      throw new BadRequestException('Failed to retrieve import jobs');
    }
  }

  /**
   * Get import job by ID
   */
  async getImportJobById(id: string) {
    if (!this.checkPermission('import:read')) {
      throw new ForbiddenException(
        'Insufficient permissions: import:read required',
      );
    }

    const tenantId = this.getTenantId();

    try {
      const job = await this.importJobRepository.findById(id);

      if (!job) {
        throw new NotFoundException(`Import job ${id} not found`);
      }

      return job;
    } catch (error: unknown) {
      const errMsg = getErrorMessage(error);
      const errStack = getErrorStack(error);
      this.logger.error(`Get import job by ID failed: ${errMsg}`, errStack, {
        tenantId,
        id,
        method: 'getImportJobById',
      } as Record<string, unknown>);

      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      throw new BadRequestException('Failed to fetch import job');
    }
  }

  /**
   * Cancel an import job
   */
  async cancelImportJob(id: string) {
    if (!this.checkPermission('import:manage')) {
      throw new ForbiddenException(
        'Insufficient permissions: import:manage required',
      );
    }

    const startTime = Date.now();
    const tenantId = this.getTenantId();
    const userId = this.getUserId();

    try {
      const existingJob = await this.importJobRepository.findById(id);

      if (!existingJob) {
        throw new NotFoundException(`Import job ${id} not found`);
      }

      if (
        existingJob.status !== 'pending' &&
        existingJob.status !== 'processing'
      ) {
        throw new BadRequestException(
          `Cannot cancel job with status: ${existingJob.status}`,
        );
      }

      const updatedJob = await this.importJobRepository.update(id, {
        status: 'cancelled',
        errorMessage: 'Job cancelled by user',
        completedAt: new Date(),
      });

      await this.auditLogService.logEvent({
        action: 'IMPORT_JOB_CANCELLED',
        entityId: id,
        entityType: 'IMPORT_JOB',
        organizationId: tenantId,
        actorUserId: userId,
        actorEmail: await this.getUserEmail(userId),
        metadata: {
          jobId: id,
          originalStatus: existingJob.status,
          type: existingJob.type,
        },
        severity: getSeverity('warning'),
      });

      this.logger.log(`Import job cancelled`, {
        jobId: id,
        tenantId,
        userId,
        eventType: 'import_job_cancelled',
        processingTime: Date.now() - startTime,
      });

      return updatedJob;
    } catch (error: unknown) {
      const errMsg = getErrorMessage(error);
      const errStack = getErrorStack(error);
      this.logger.error(`Cancel import job failed: ${errMsg}`, errStack, {
        tenantId,
        userId,
        id,
        method: 'cancelImportJob',
        processingTime: Date.now() - startTime,
      } as Record<string, unknown>);

      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      throw new BadRequestException('Failed to cancel import job');
    }
  }

  // ==================== HELPER METHODS ====================

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
