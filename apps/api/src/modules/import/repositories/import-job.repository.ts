// apps/api/src/modules/import/repositories/import-job.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { TenantAwareRepository } from '../../../shared/database/tenant-aware.repository';
import { ImportJob } from '@prisma/client';

interface CreateImportJobData {
  type: string;
  source: string;
  fileName?: string;
  fileSize?: number;
  status?: string;
  totalRecords?: number;
  processedRecords?: number;
  failedRecords?: number;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
  userId?: string;
}

interface UpdateImportJobData {
  status?: string;
  totalRecords?: number;
  processedRecords?: number;
  failedRecords?: number;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
  completedAt?: Date;
  startedAt?: Date;
}

@Injectable()
export class ImportJobRepository extends TenantAwareRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  /**
   * Create a new import job
   */
  async create(data: CreateImportJobData): Promise<ImportJob> {
    return this.prisma.importJob.create({
      data: {
        ...data,
        organizationId: this.tenantId,
        status: data.status ?? 'pending',
        metadata: data.metadata ?? {},
      },
    });
  }

  /**
   * Find import job by ID with tenant isolation
   */
  async findById(id: string): Promise<ImportJob | null> {
    return this.prisma.importJob.findFirst({
      where: {
        id,
        organizationId: this.tenantId,
      },
    });
  }

  /**
   * Find all import jobs for current tenant
   */
  async findAll(): Promise<ImportJob[]> {
    return this.prisma.importJob.findMany({
      where: {
        organizationId: this.tenantId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Update import job
   */
  async update(id: string, data: UpdateImportJobData): Promise<ImportJob> {
    return this.prisma.importJob.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Delete import job
   */
  async delete(id: string): Promise<ImportJob> {
    return this.prisma.importJob.delete({
      where: { id },
    });
  }

  /**
   * Find import jobs by status
   */
  async findByStatus(status: string): Promise<ImportJob[]> {
    return this.prisma.importJob.findMany({
      where: {
        organizationId: this.tenantId,
        status,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Count import jobs by status
   */
  async countByStatus(status: string): Promise<number> {
    return this.prisma.importJob.count({
      where: {
        organizationId: this.tenantId,
        status,
      },
    });
  }
}
