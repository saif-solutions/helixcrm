// apps/api/src/modules/export-queue/repositories/export-queue.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { TenantAwareRepository } from '../../../shared/database/tenant-aware.repository';

interface CreateJobData {
  userId: string;
  tenantId: string;
  exportType: string;
  format: string;
  filters: Record<string, unknown>;
  options: Record<string, unknown>;
  status: string;
  requestedAt: Date;
}

interface UpdateJobData {
  status?: string;
  fileUrl?: string;
  fileSize?: number;
  error?: string;
  completedAt?: Date;
  processingStartedAt?: Date;
}

// Filters for findJobs and countJobs
interface JobFilters {
  userId?: string;
  status?: string;
}

// Temporary interface until Prisma model is created
interface ExportJob {
  id: string;
  userId: string;
  organizationId: string;
  exportType: string;
  format: string;
  filters: Record<string, unknown>;
  options: Record<string, unknown>;
  status: string;
  fileUrl?: string;
  fileSize?: number;
  error?: string;
  requestedAt: Date;
  processingStartedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class ExportQueueRepository extends TenantAwareRepository {
  private jobs: Map<string, ExportJob> = new Map();
  private jobCounter = 0;

  constructor(prisma: PrismaService) {
    super(prisma);
  }

  /**
   * Create a new export job record
   */
  createJob(data: CreateJobData): ExportJob {
    const jobId = `export_${Date.now()}_${++this.jobCounter}`;
    const job: ExportJob = {
      id: jobId,
      userId: data.userId,
      organizationId: data.tenantId,
      exportType: data.exportType,
      format: data.format,
      filters: data.filters,
      options: data.options,
      status: data.status,
      requestedAt: data.requestedAt,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.jobs.set(jobId, job);
    return job;
  }

  /**
   * Find export job by ID with tenant isolation
   */
  findJobById(jobId: string): ExportJob | null {
    const job = this.jobs.get(jobId);
    if (!job || job.organizationId !== this.tenantId) {
      return null;
    }
    return job;
  }

  /**
   * Find export jobs with pagination and filtering
   */
  findJobs(filters: JobFilters, page: number, limit: number): ExportJob[] {
    const skip = (page - 1) * limit;
    let jobs = Array.from(this.jobs.values()).filter(
      (job) => job.organizationId === this.tenantId,
    );

    // Apply filters
    if (filters.userId) {
      jobs = jobs.filter((job) => job.userId === filters.userId);
    }
    if (filters.status) {
      jobs = jobs.filter((job) => job.status === filters.status);
    }

    // Sort by requestedAt descending
    jobs.sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime());

    // Apply pagination
    return jobs.slice(skip, skip + limit);
  }

  /**
   * Count export jobs with filtering
   */
  countJobs(filters: JobFilters): number {
    let jobs = Array.from(this.jobs.values()).filter(
      (job) => job.organizationId === this.tenantId,
    );

    // Apply filters
    if (filters.userId) {
      jobs = jobs.filter((job) => job.userId === filters.userId);
    }
    if (filters.status) {
      jobs = jobs.filter((job) => job.status === filters.status);
    }

    return jobs.length;
  }

  /**
   * Count recent exports by user (for rate limiting)
   */
  countRecentExports(userId: string, hours: number): number {
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - hours);

    const jobs = Array.from(this.jobs.values()).filter(
      (job) =>
        job.organizationId === this.tenantId &&
        job.userId === userId &&
        job.requestedAt >= cutoffDate &&
        job.status !== 'cancelled',
    );

    return jobs.length;
  }

  /**
   * Update export job
   */
  updateJob(jobId: string, data: UpdateJobData): ExportJob {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    const updatedJob: ExportJob = {
      ...job,
      ...data,
      updatedAt: new Date(),
    };

    this.jobs.set(jobId, updatedJob);
    return updatedJob;
  }

  /**
   * Delete old export jobs (cleanup)
   */
  deleteOldJobs(cutoffDate: Date): number {
    let deleted = 0;

    for (const [jobId, job] of this.jobs.entries()) {
      if (
        job.organizationId === this.tenantId &&
        job.requestedAt < cutoffDate &&
        ['completed', 'failed', 'cancelled'].includes(job.status)
      ) {
        this.jobs.delete(jobId);
        deleted++;
      }
    }

    return deleted;
  }

  /**
   * Mark job as failed
   */
  markJobAsFailed(jobId: string, error: string): ExportJob {
    return this.updateJob(jobId, {
      status: 'failed',
      error,
      completedAt: new Date(),
    });
  }

  /**
   * Mark job as completed
   */
  markJobAsCompleted(
    jobId: string,
    fileUrl: string,
    fileSize: number,
  ): ExportJob {
    return this.updateJob(jobId, {
      status: 'completed',
      fileUrl,
      fileSize,
      completedAt: new Date(),
    });
  }

  /**
   * Get export job with detailed information
   */
  getJobWithDetails(jobId: string): ExportJob | null {
    return this.findJobById(jobId);
  }

  // Temporary implementations for other methods
  findPendingJobs(limit = 10): ExportJob[] {
    const jobs = Array.from(this.jobs.values())
      .filter(
        (job) =>
          job.organizationId === this.tenantId && job.status === 'pending',
      )
      .sort((a, b) => a.requestedAt.getTime() - b.requestedAt.getTime())
      .slice(0, limit);

    return jobs;
  }

  getJobStatistics(
    timeframe: 'day' | 'week' | 'month' = 'week',
  ): Record<string, unknown> {
    const jobs = Array.from(this.jobs.values()).filter(
      (job) => job.organizationId === this.tenantId,
    );

    return {
      timeframe,
      total: jobs.length,
      byStatus: {},
      byType: {},
      avgProcessingTime: 0,
    };
  }

  hasActiveExports(userId: string): boolean {
    const jobs = Array.from(this.jobs.values()).filter(
      (job) =>
        job.organizationId === this.tenantId &&
        job.userId === userId &&
        ['pending', 'processing'].includes(job.status),
    );

    return jobs.length > 0;
  }

  getRetryableJobs(limit = 5): ExportJob[] {
    const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const jobs = Array.from(this.jobs.values())
      .filter(
        (job) =>
          job.organizationId === this.tenantId &&
          job.status === 'failed' &&
          !!job.error &&
          job.completedAt &&
          job.completedAt >= cutoffDate,
      )
      .sort(
        (a, b) =>
          (b.completedAt?.getTime() || 0) - (a.completedAt?.getTime() || 0),
      )
      .slice(0, limit);

    return jobs;
  }

  retryJob(jobId: string): ExportJob {
    return this.updateJob(jobId, {
      status: 'pending',
      error: undefined,
      completedAt: undefined,
      processingStartedAt: undefined,
    });
  }
}
