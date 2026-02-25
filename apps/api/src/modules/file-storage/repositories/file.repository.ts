import { Injectable } from '@nestjs/common';
import { TenantAwareRepository } from '../../../shared/database/tenant-aware.repository';
import { PrismaService } from '../../../shared/prisma/prisma.service';

interface CreateFileData {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  metadata?: Record<string, any>;
}

interface UpdateFileData {
  filename?: string;
  originalName?: string;
  mimeType?: string;
  size?: number;
  path?: string;
  metadata?: Record<string, any>;
  deletedAt?: Date | null;
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
  async findAllFiles(options?: {
    skip?: number;
    take?: number;
    where?: any;
    orderBy?: any;
  }) {
    const where = {
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
  async countFiles(where?: any) {
    const baseWhere = {
      organizationId: this.tenantId,
      deletedAt: null,
    };

    return this.prisma.file.count({
      where: where ? { ...baseWhere, ...where } : baseWhere,
    });
  }

  /**
   * Find files by uploader/user ID
   */
  async findFilesByUserId(
    userId: string,
    options?: {
      skip?: number;
      take?: number;
    },
  ) {
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
  async findFilesByMimeType(
    mimeType: string,
    options?: {
      skip?: number;
      take?: number;
    },
  ) {
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
