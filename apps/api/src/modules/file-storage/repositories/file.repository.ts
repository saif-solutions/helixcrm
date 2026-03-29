// apps/api/src/modules/file-storage/repositories/file.repository.ts
import { Injectable } from '@nestjs/common';
import { TenantAwareRepository } from '../../../shared/database/tenant-aware.repository';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { Prisma } from '@prisma/client';

interface CreateFileData {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  metadata?: Record<string, unknown>;
}

interface UpdateFileData {
  filename?: string;
  originalName?: string;
  mimeType?: string;
  size?: number;
  path?: string;
  metadata?: Record<string, unknown>;
  deletedAt?: Date | null;
}

interface FindAllFilesOptions {
  skip?: number;
  take?: number;
  where?: Prisma.FileWhereInput;
  orderBy?: Prisma.FileOrderByWithRelationInput;
}

interface CountFilesWhereInput extends Prisma.FileWhereInput {
  organizationId: string;
  deletedAt: null;
}

interface PaginationOptions {
  skip?: number;
  take?: number;
}

@Injectable()
export class FileRepository extends TenantAwareRepository {
  constructor(protected readonly prisma: PrismaService) {
    super(prisma);
  }

  /**
   * Create a new file record
   */
  async createFile(data: CreateFileData) {
    return this.prisma.file.create({
      data: {
        ...data,
        organizationId: this.tenantId,
        metadata: data.metadata || {},
      },
    });
  }

  /**
   * Find file by ID with tenant isolation
   */
  async findFileById(id: string) {
    return this.prisma.file.findFirst({
      where: {
        id,
        organizationId: this.tenantId,
        deletedAt: null,
      },
    });
  }

  /**
   * Find all files for current tenant
   */
  async findAllFiles(options?: FindAllFilesOptions) {
    const where: Prisma.FileWhereInput = {
      organizationId: this.tenantId,
      deletedAt: null,
      ...options?.where,
    };

    return this.prisma.file.findMany({
      where,
      skip: options?.skip,
      take: options?.take,
      orderBy: options?.orderBy || { createdAt: 'desc' },
    });
  }

  /**
   * Update file record
   */
  async updateFile(id: string, data: UpdateFileData) {
    return this.prisma.file.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Soft delete file (mark as deleted)
   */
  async softDeleteFile(id: string) {
    return this.prisma.file.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Count files for current tenant
   */
  async countFiles(where?: Prisma.FileWhereInput) {
    const baseWhere: CountFilesWhereInput = {
      organizationId: this.tenantId,
      deletedAt: null,
    };

    const finalWhere = where ? { ...baseWhere, ...where } : baseWhere;

    return this.prisma.file.count({
      where: finalWhere,
    });
  }

  /**
   * Find files by uploader/user ID
   */
  async findFilesByUserId(userId: string, options?: PaginationOptions) {
    return this.prisma.file.findMany({
      where: {
        organizationId: this.tenantId,
        userId,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
      skip: options?.skip,
      take: options?.take,
    });
  }

  /**
   * Find files by mime type
   */
  async findFilesByMimeType(mimeType: string, options?: PaginationOptions) {
    return this.prisma.file.findMany({
      where: {
        organizationId: this.tenantId,
        mimeType: {
          contains: mimeType,
          mode: 'insensitive',
        },
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
      skip: options?.skip,
      take: options?.take,
    });
  }
}
