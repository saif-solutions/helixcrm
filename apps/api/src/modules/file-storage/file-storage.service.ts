// apps/api/src/modules/file-storage/file-storage.service.ts
import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { FileRepository } from './repositories/file.repository';
import { TenantContextService } from '../../shared/tenant/context/tenant-context.service';
import { PermissionContextService } from '../../shared/permissions/context/permission-context.service';
import { AuditLogService } from '../../shared/audit-log/audit-log.service';
import { SeverityMapper } from '../../shared/audit-log/severity-mapper';
import { PrismaService } from '../../shared/prisma/prisma.service';

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

export interface UploadFileDto {
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateFileDto {
  originalName?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class FileStorageService {
  private readonly logger = new Logger(FileStorageService.name);

  constructor(
    private readonly fileRepository: FileRepository,
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
   * Upload a new file
   */
  async uploadFile(uploadDto: UploadFileDto) {
    if (!this.checkPermission('file:upload')) {
      throw new ForbiddenException(
        'Insufficient permissions: file:upload required',
      );
    }

    const tenantId = this.getTenantId();
    const userId = this.getUserId();

    try {
      const filename = this.generateUniqueFilename(uploadDto.originalName);

      const file = await this.fileRepository.createFile({
        filename,
        originalName: uploadDto.originalName,
        mimeType: uploadDto.mimeType,
        size: uploadDto.size,
        path: uploadDto.path,
        metadata: uploadDto.metadata,
      });

      await this.auditLogService.logEvent({
        action: 'FILE_UPLOADED',
        entityId: file.id,
        entityType: 'FILE',
        organizationId: tenantId,
        actorUserId: userId,
        actorEmail: await this.getUserEmail(userId),
        metadata: {
          fileId: file.id,
          filename: file.filename,
          originalName: file.originalName,
          mimeType: file.mimeType,
          size: file.size,
        },
        severity: getSeverity('info'),
      });

      this.logger.log(`File uploaded successfully`, {
        fileId: file.id,
        tenantId,
        userId,
        filename: file.filename,
        size: file.size,
      });

      return file;
    } catch (error: unknown) {
      const errMsg = getErrorMessage(error);
      const errStack = getErrorStack(error);
      this.logger.error(`Upload file failed: ${errMsg}`, errStack, {
        tenantId,
        userId,
        data: uploadDto,
      } as Record<string, unknown>);

      if (error instanceof ForbiddenException) {
        throw error;
      }

      throw new BadRequestException('Failed to upload file');
    }
  }

  /**
   * Get file by ID
   */
  async getFileById(id: string) {
    if (!this.checkPermission('file:download')) {
      throw new ForbiddenException(
        'Insufficient permissions: file:download required',
      );
    }

    const tenantId = this.getTenantId();

    try {
      const file = await this.fileRepository.findFileById(id);

      if (!file) {
        throw new NotFoundException(`File ${id} not found`);
      }

      return file;
    } catch (error: unknown) {
      const errMsg = getErrorMessage(error);
      const errStack = getErrorStack(error);
      this.logger.error(`Get file by ID failed: ${errMsg}`, errStack, {
        tenantId,
        id,
      } as Record<string, unknown>);

      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      throw new BadRequestException('Failed to fetch file');
    }
  }

  /**
   * Get all files for current tenant
   */
  async getAllFiles(options?: { skip?: number; take?: number }) {
    if (!this.checkPermission('file:read')) {
      throw new ForbiddenException(
        'Insufficient permissions: file:read required',
      );
    }

    const tenantId = this.getTenantId();

    try {
      const [files, total] = await Promise.all([
        this.fileRepository.findAllFiles(options),
        this.fileRepository.countFiles(),
      ]);

      const page = options?.skip
        ? Math.floor(options.skip / (options.take || 20)) + 1
        : 1;
      const limit = options?.take || 20;
      const pages = Math.ceil(total / limit);

      return {
        data: files,
        meta: {
          page,
          limit,
          total,
          pages,
        },
      };
    } catch (error: unknown) {
      const errMsg = getErrorMessage(error);
      const errStack = getErrorStack(error);
      this.logger.error(`Get all files failed: ${errMsg}`, errStack, {
        tenantId,
        options,
      } as Record<string, unknown>);

      if (error instanceof ForbiddenException) {
        throw error;
      }

      throw new BadRequestException('Failed to fetch files');
    }
  }

  /**
   * Delete file (soft delete)
   */
  async deleteFile(id: string) {
    if (!this.checkPermission('file:manage')) {
      throw new ForbiddenException(
        'Insufficient permissions: file:manage required',
      );
    }

    const tenantId = this.getTenantId();
    const userId = this.getUserId();

    try {
      const existingFile = await this.fileRepository.findFileById(id);
      if (!existingFile) {
        throw new NotFoundException(`File ${id} not found`);
      }

      await this.fileRepository.softDeleteFile(id);

      await this.auditLogService.logEvent({
        action: 'FILE_DELETED',
        entityId: id,
        entityType: 'FILE',
        organizationId: tenantId,
        actorUserId: userId,
        actorEmail: await this.getUserEmail(userId),
        metadata: {
          fileId: id,
          filename: existingFile.filename,
          originalName: existingFile.originalName,
          wasPermanentlyDeleted: false,
        },
        severity: getSeverity('warning'),
      });

      this.logger.log(`File soft deleted successfully`, {
        fileId: id,
        tenantId,
        userId,
        filename: existingFile.filename,
      });

      return { message: 'File deleted successfully' };
    } catch (error: unknown) {
      const errMsg = getErrorMessage(error);
      const errStack = getErrorStack(error);
      this.logger.error(`Delete file failed: ${errMsg}`, errStack, {
        tenantId,
        userId,
        id,
      } as Record<string, unknown>);

      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      throw new BadRequestException('Failed to delete file');
    }
  }

  // ==================== HELPER METHODS ====================

  private generateUniqueFilename(originalName: string): string {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = originalName.includes('.')
      ? originalName.substring(originalName.lastIndexOf('.'))
      : '';
    const baseName = originalName.includes('.')
      ? originalName.substring(0, originalName.lastIndexOf('.'))
      : originalName;

    return `${baseName}_${timestamp}_${randomString}${extension}`;
  }

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
